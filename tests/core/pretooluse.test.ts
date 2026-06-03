import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { processHookEvent, parseHookEvent } from "../../src/core/pipeline.js";
import { DEFAULT_CONFIG } from "../../src/config/defaults.js";
import type { SonarConfig } from "../../src/config/types.js";

function config(overrides: Partial<SonarConfig> = {}): SonarConfig {
  return { ...structuredClone(DEFAULT_CONFIG), ...overrides } as SonarConfig;
}

describe("PreToolUse handling", () => {
  it("returns empty output for PreToolUse", () => {
    const input = JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "npm test" },
    });
    const result = processHookEvent(input, config());
    expect(result.ttsText).toBeNull();
    expect(result.earcon).toBeNull();
    // PreToolUse with no decision yields a bare output object.
    expect(result.hookOutput).toEqual({});
  });

  it("parses PreToolUse event correctly", () => {
    const event = parseHookEvent(
      JSON.stringify({
        hook_event_name: "PreToolUse",
        tool_name: "Edit",
        tool_input: { file_path: "/a.ts" },
        tool_use_id: "tu-123",
        session_id: "s-1",
      }),
    );
    expect(event.hook_event_name).toBe("PreToolUse");
    if (event.hook_event_name === "PreToolUse") {
      expect(event.tool_name).toBe("Edit");
      expect(event.tool_use_id).toBe("tu-123");
    }
  });
});

describe("progress integration", () => {
  let tmpDir: string;
  const origEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sonar-progress-pipe-"));
    process.env["XDG_STATE_HOME"] = tmpDir;
  });

  afterEach(() => {
    process.env = { ...origEnv };
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("records start time on PreToolUse when progress enabled", () => {
    const cfg = config({ progress: { enabled: true, thresholdMs: 0 } });
    const preInput = JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "npm test" },
      tool_use_id: "tu-1",
      session_id: "s-1",
    });
    processHookEvent(preInput, cfg);

    // Verify state file was created
    const progressDir = path.join(tmpDir, "claude-sonar", "progress");
    expect(fs.existsSync(progressDir)).toBe(true);
  });

  it("does not record when progress disabled", () => {
    const cfg = config({ progress: { enabled: false, thresholdMs: 3000 } });
    const preInput = JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "npm test" },
      tool_use_id: "tu-1",
      session_id: "s-1",
    });
    processHookEvent(preInput, cfg);

    const progressDir = path.join(tmpDir, "claude-sonar", "progress");
    expect(fs.existsSync(progressDir)).toBe(false);
  });

  it("appends elapsed to TTS when above threshold", () => {
    const cfg = config({
      progress: { enabled: true, thresholdMs: 0 }, // 0ms threshold = always show
      significance: { enabled: false, overrides: {} }, // disable significance to get raw ttsText
    });

    // Record a start
    const preInput = JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "npm test" },
      tool_use_id: "tu-1",
      session_id: "s-1",
    });
    processHookEvent(preInput, cfg);

    // Now process the completion
    const postInput = JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_input: { command: "npm test" },
      tool_response: { exitCode: 0, stdout: "ok" },
      tool_use_id: "tu-1",
      session_id: "s-1",
    });
    const result = processHookEvent(postInput, cfg);
    // Should contain "took" in ttsText
    expect(result.ttsText).toContain("took");
  });
});
