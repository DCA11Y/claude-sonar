import { spawn, spawnSync } from "node:child_process";

/**
 * Play a sound on Linux using canberra-gtk-play.
 * Fire-and-forget: detached + unref.
 */
export function playLinux(soundName: string, volume: number): void {
  const child = spawn(
    "canberra-gtk-play",
    ["-i", soundName, "--volume", String(Math.round(volume * 100))],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();
}

/**
 * Play a sound on Linux using canberra-gtk-play, blocking until done.
 */
export function playLinuxSync(soundName: string, volume: number): void {
  spawnSync(
    "canberra-gtk-play",
    ["-i", soundName, "--volume", String(Math.round(volume * 100))],
    { stdio: "ignore" },
  );
}
