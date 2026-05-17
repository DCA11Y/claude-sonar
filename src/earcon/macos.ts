import { spawn } from "node:child_process";

/**
 * Play a sound file on macOS using afplay.
 * Fire-and-forget: detached + unref.
 */
export function playMacos(soundPath: string, volume: number): void {
  // No `--` separator: afplay does not support `--` and exits with
  // `unknown argument: --` before producing audio.
  const child = spawn("afplay", ["-v", String(volume), soundPath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}
