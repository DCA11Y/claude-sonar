import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  enqueueAnnouncement,
  tryDrainQueue,
} from "../../src/core/announcement-queue.js";
import { DEFAULT_CONFIG } from "../../src/config/index.js";
import type { SonarConfig } from "../../src/config/types.js";

function makeConfig(overrides: Partial<SonarConfig> = {}): SonarConfig {
  const base = structuredClone(DEFAULT_CONFIG) as SonarConfig;
  // Disable TTS and earcon by default so drain doesn't try to play audio in tests.
  base.tts.enabled = false;
  base.earcon.enabled = false;
  base.queue.enabled = true;
  base.queue.gapMs = 0;
  return { ...base, ...overrides };
}

describe("announcement-queue", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sonar-queue-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("enqueueAnnouncement", () => {
    it("creates the queue file and appends valid JSONL", () => {
      enqueueAnnouncement(
        { earcon: "edit-complete", ttsText: "hello", timestamp: 1 },
        tmpDir,
      );
      const content = fs.readFileSync(path.join(tmpDir, "tts-queue.jsonl"), "utf-8");
      expect(content.endsWith("\n")).toBe(true);
      const parsed = JSON.parse(content.trim());
      expect(parsed).toEqual({
        earcon: "edit-complete",
        ttsText: "hello",
        timestamp: 1,
      });
    });

    it("appends multiple lines across calls", () => {
      enqueueAnnouncement({ earcon: null, ttsText: "one", timestamp: 1 }, tmpDir);
      enqueueAnnouncement({ earcon: null, ttsText: "two", timestamp: 2 }, tmpDir);
      enqueueAnnouncement({ earcon: null, ttsText: "three", timestamp: 3 }, tmpDir);
      const content = fs.readFileSync(path.join(tmpDir, "tts-queue.jsonl"), "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());
      expect(lines).toHaveLength(3);
      expect(JSON.parse(lines[0]!).ttsText).toBe("one");
      expect(JSON.parse(lines[2]!).ttsText).toBe("three");
    });

    it("creates the state dir if missing", () => {
      const nested = path.join(tmpDir, "nested", "deeper");
      enqueueAnnouncement({ earcon: null, ttsText: "x", timestamp: 1 }, nested);
      expect(fs.existsSync(path.join(nested, "tts-queue.jsonl"))).toBe(true);
    });
  });

  describe("tryDrainQueue", () => {
    it("returns without error when queue file is missing", () => {
      expect(() => tryDrainQueue(makeConfig(), tmpDir)).not.toThrow();
      expect(fs.existsSync(path.join(tmpDir, "tts.lock"))).toBe(false);
    });

    it("acquires lock, drains entries, and releases lock", () => {
      enqueueAnnouncement({ earcon: null, ttsText: "a", timestamp: 1 }, tmpDir);
      enqueueAnnouncement({ earcon: null, ttsText: "b", timestamp: 2 }, tmpDir);
      tryDrainQueue(makeConfig(), tmpDir);
      // Queue file is consumed
      expect(fs.existsSync(path.join(tmpDir, "tts-queue.jsonl"))).toBe(false);
      // Drain temp file cleaned up
      expect(fs.existsSync(path.join(tmpDir, "tts-queue.jsonl.drain"))).toBe(false);
      // Lock released
      expect(fs.existsSync(path.join(tmpDir, "tts.lock"))).toBe(false);
    });

    it("returns immediately when another process holds the lock", () => {
      // Pre-create a fresh (non-stale) lock with current timestamp.
      const lockPath = path.join(tmpDir, "tts.lock");
      fs.writeFileSync(lockPath, JSON.stringify({ pid: 99999, timestamp: Date.now() }));
      // Also enqueue something so we can verify it was NOT drained.
      enqueueAnnouncement({ earcon: null, ttsText: "should remain", timestamp: 1 }, tmpDir);

      tryDrainQueue(makeConfig(), tmpDir);

      // Queue file untouched
      expect(fs.existsSync(path.join(tmpDir, "tts-queue.jsonl"))).toBe(true);
      // Lock still present (we didn't release someone else's lock)
      expect(fs.existsSync(lockPath)).toBe(true);
    });

    it("clears a stale lock and acquires it", () => {
      const lockPath = path.join(tmpDir, "tts.lock");
      fs.writeFileSync(lockPath, JSON.stringify({ pid: 12345, timestamp: 0 }));
      // Backdate the mtime to be older than the stale threshold (30s).
      const oldTime = new Date(Date.now() - 60_000);
      fs.utimesSync(lockPath, oldTime, oldTime);

      enqueueAnnouncement({ earcon: null, ttsText: "x", timestamp: 1 }, tmpDir);
      tryDrainQueue(makeConfig(), tmpDir);

      // Queue drained, lock released.
      expect(fs.existsSync(path.join(tmpDir, "tts-queue.jsonl"))).toBe(false);
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it("skips malformed JSONL lines but processes valid ones", () => {
      fs.mkdirSync(tmpDir, { recursive: true });
      const qp = path.join(tmpDir, "tts-queue.jsonl");
      fs.writeFileSync(
        qp,
        [
          JSON.stringify({ earcon: null, ttsText: "good1", timestamp: 1 }),
          "this is not json",
          "",
          JSON.stringify({ earcon: null, ttsText: "good2", timestamp: 2 }),
          "{broken",
        ].join("\n") + "\n",
      );

      expect(() => tryDrainQueue(makeConfig(), tmpDir)).not.toThrow();
      expect(fs.existsSync(qp)).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, "tts.lock"))).toBe(false);
    });

    it("releases lock even when no queue file exists", () => {
      // No queue file; lock should still not linger.
      tryDrainQueue(makeConfig(), tmpDir);
      expect(fs.existsSync(path.join(tmpDir, "tts.lock"))).toBe(false);
    });

    it("a second concurrent call returns immediately while first holds lock", () => {
      // Simulate by manually creating the lock before invoking.
      fs.mkdirSync(tmpDir, { recursive: true });
      const lockPath = path.join(tmpDir, "tts.lock");
      fs.writeFileSync(lockPath, JSON.stringify({ pid: 1, timestamp: Date.now() }));
      enqueueAnnouncement({ earcon: null, ttsText: "queued", timestamp: 1 }, tmpDir);

      const start = Date.now();
      tryDrainQueue(makeConfig(), tmpDir);
      const elapsed = Date.now() - start;
      // Should not block — well under any retry-style delay.
      expect(elapsed).toBeLessThan(1000);
      // The locked-out caller did not consume the queue.
      expect(fs.existsSync(path.join(tmpDir, "tts-queue.jsonl"))).toBe(true);
    });
  });
});
