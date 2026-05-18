import { spawn, spawnSync } from "node:child_process";

/**
 * Speak text using macOS `say` command.
 * Fire-and-forget: detached + unref.
 */
export function speakMacos(text: string, rate: number): void {
  const child = spawn("say", ["-r", String(rate), "--", text], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

/**
 * Speak text using macOS `say` command, blocking until done.
 */
export function speakMacosSync(text: string, rate: number): void {
  spawnSync("say", ["-r", String(rate), "--", text], { stdio: "ignore" });
}
