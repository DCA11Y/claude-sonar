/**
 * File-based announcement queue.
 *
 * Each `claude-sonar format` invocation is a short-lived process. When many
 * hook events fire in rapid succession, multiple `say` and `afplay` processes
 * would otherwise overlap, producing unintelligible audio. This queue
 * serializes earcons + TTS across processes using a JSONL queue file and an
 * exclusive lock file in the state directory.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { SonarConfig } from "../config/types.js";
import { getStateDir } from "../config/index.js";
import { speakSync } from "../tts/index.js";
import { playEarconSync } from "../earcon/index.js";

export interface QueueEntry {
  earcon: string | null;
  ttsText: string | null;
  timestamp: number;
}

const QUEUE_FILENAME = "tts-queue.jsonl";
const LOCK_FILENAME = "tts.lock";
const STALE_LOCK_MS = 30_000;

function queuePath(stateDir: string): string {
  return path.join(stateDir, QUEUE_FILENAME);
}

function lockPath(stateDir: string): string {
  return path.join(stateDir, LOCK_FILENAME);
}

/**
 * Append an announcement entry to the queue file. Atomic on POSIX for
 * sufficiently small writes.
 */
export function enqueueAnnouncement(entry: QueueEntry, stateDir?: string): void {
  const dir = stateDir ?? getStateDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(queuePath(dir), line, "utf-8");
  } catch {
    // Never fatal — losing an announcement is preferable to crashing.
  }
}

/**
 * Sleep synchronously for the given milliseconds using Atomics.wait.
 */
function sleepSync(ms: number): void {
  if (ms <= 0) return;
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    // Some environments disable SharedArrayBuffer; fall back to a busy-ish wait.
    const end = Date.now() + ms;
    while (Date.now() < end) {
      // no-op
    }
  }
}

/**
 * Attempt to drain the queue. If another process already holds the lock,
 * return immediately. Plays each queued (earcon, ttsText) pair sequentially
 * with `config.queue.gapMs` between them.
 */
export function tryDrainQueue(config: SonarConfig, stateDir?: string): void {
  const dir = stateDir ?? getStateDir();
  const lp = lockPath(dir);
  const qp = queuePath(dir);

  // Step 1: clear stale lock
  try {
    const stat = fs.statSync(lp);
    if (Date.now() - stat.mtimeMs > STALE_LOCK_MS) {
      try {
        fs.unlinkSync(lp);
      } catch {
        // Race with another cleaner — fine.
      }
    }
  } catch {
    // No lock file — nothing to clean.
  }

  // Step 2: acquire lock (exclusive create)
  let lockFd: number;
  try {
    fs.mkdirSync(dir, { recursive: true });
    lockFd = fs.openSync(
      lp,
      fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
    );
  } catch {
    // EEXIST or any other error — another process is draining.
    return;
  }

  // Step 3: write owner metadata, then close fd
  try {
    fs.writeSync(lockFd, JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
  } catch {
    // Best effort — lock semantics depend on file existence, not contents.
  }
  try {
    fs.closeSync(lockFd);
  } catch {
    // ignore
  }

  try {
    // Step 4: atomically claim the queue contents by renaming.
    const drainPath = qp + ".drain";
    let raw: string;
    try {
      fs.renameSync(qp, drainPath);
      raw = fs.readFileSync(drainPath, "utf-8");
      try {
        fs.unlinkSync(drainPath);
      } catch {
        // ignore
      }
    } catch {
      // Queue file doesn't exist — nothing to do.
      return;
    }

    const entries: QueueEntry[] = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as QueueEntry;
        entries.push(parsed);
      } catch {
        // Skip malformed lines silently.
      }
    }

    // Step 5: play each entry sequentially with gap between
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      try {
        if (entry.earcon && config.earcon.enabled) {
          playEarconSync(entry.earcon, config.earcon);
        }
        if (entry.ttsText && config.tts.enabled) {
          speakSync(entry.ttsText, config.tts);
        }
      } catch {
        // A single bad entry never aborts the drain.
      }
      if (i < entries.length - 1) {
        sleepSync(config.queue.gapMs);
      }
    }
  } finally {
    // Step 6: release lock (always)
    try {
      fs.unlinkSync(lp);
    } catch {
      // ignore
    }
  }
}
