import { installHooks, isSonarInstalled } from "../../settings/index.js";
import { cleanStaleSessions } from "../../core/sequencer.js";

/**
 * Setup command: register sonar hooks in Claude Code settings.
 * All output is plain text — no emoji, no spinners, no color-dependent info.
 */
export function setupCommand(): void {
  try {
    const alreadyInstalled = isSonarInstalled();

    const result = installHooks();
    console.log(result);

    if (!alreadyInstalled) {
      console.log("");
      console.log("claude-sonar is now active. Claude Code will pipe tool output");
      console.log("through sonar for screen-reader-friendly formatting.");
      console.log("");
      console.log("Configure with: claude-sonar config set <key> <value>");
      console.log("Enable TTS:     claude-sonar config set tts.enabled true");
      console.log("Uninstall:      claude-sonar uninstall");
    }
    // Opportunistic cleanup of stale session files
    cleanStaleSessions();
  } catch (err) {
    console.error(
      "Failed to install hooks:",
      err instanceof Error ? err.message : String(err),
    );
    process.exitCode = 1;
  }
}
