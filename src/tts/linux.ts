import { spawn, spawnSync, execFileSync } from "node:child_process";

/**
 * Speak text using Linux speech-dispatcher (`spd-say`) or `espeak` fallback.
 * Fire-and-forget: detached + unref.
 */
export function speakLinux(text: string, rate: number): void {
  const engine = detectLinuxEngine();
  if (engine === "spd-say") {
    const child = spawn("spd-say", ["-r", String(rate), "--", text], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } else {
    // espeak uses words-per-minute directly
    const child = spawn("espeak", ["-s", String(rate), "--", text], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  }
}

/**
 * Speak text using Linux speech-dispatcher (`spd-say`) or `espeak` fallback,
 * blocking until done.
 */
export function speakLinuxSync(text: string, rate: number): void {
  const engine = detectLinuxEngine();
  if (engine === "spd-say") {
    spawnSync("spd-say", ["-r", String(rate), "--", text], { stdio: "ignore" });
  } else {
    spawnSync("espeak", ["-s", String(rate), "--", text], { stdio: "ignore" });
  }
}

function detectLinuxEngine(): "spd-say" | "espeak" {
  try {
    execFileSync("which", ["spd-say"], { stdio: "ignore" });
    return "spd-say";
  } catch {
    return "espeak";
  }
}
