import { describe, it, expect } from "vitest";
import { fallbackFormatter } from "../../src/formatters/fallback.js";

describe("fallbackFormatter", () => {
  it("formats unknown tool", () => {
    const input = {
      tool_name: "SomeNewTool",
      tool_input: {},
      tool_response: {},
    };
    const result = fallbackFormatter.format(input);
    expect(result.contextText).toContain("SomeNewTool");
    expect(result.ttsText).toContain("SomeNewTool");
    expect(result.ttsText).toContain("completed");
  });

  it("handles missing tool_name", () => {
    const input = {
      tool_name: "",
      tool_input: {},
      tool_response: {},
    };
    const result = fallbackFormatter.format(input);
    expect(result.contextText).toContain("Unknown tool");
  });

  describe("normalizeToolNames flag", () => {
    it("uses raw tool name in ttsText when flag is false", () => {
      const result = fallbackFormatter.format({
        tool_name: "WebFetch",
        tool_input: {},
        tool_response: {},
        normalizeToolNames: false,
      });
      expect(result.ttsText).toBe("WebFetch completed.");
    });

    it("uses raw tool name in ttsText when flag is omitted", () => {
      const result = fallbackFormatter.format({
        tool_name: "WebFetch",
        tool_input: {},
        tool_response: {},
      });
      expect(result.ttsText).toBe("WebFetch completed.");
    });

    it("uses normalized tool name in ttsText when flag is true", () => {
      const result = fallbackFormatter.format({
        tool_name: "WebFetch",
        tool_input: {},
        tool_response: {},
        normalizeToolNames: true,
      });
      expect(result.ttsText).toBe("Web Fetch completed.");
    });

    it("normalizes MCP tool names in ttsText when flag is true", () => {
      const result = fallbackFormatter.format({
        tool_name: "mcp__some-uuid__getJiraIssue",
        tool_input: {},
        tool_response: {},
        normalizeToolNames: true,
      });
      expect(result.ttsText).toBe("MCP Get Jira Issue completed.");
    });

    it("always uses raw tool name in contextText regardless of flag", () => {
      const rawName = "mcp__some-uuid__getJiraIssue";
      const withFlag = fallbackFormatter.format({
        tool_name: rawName,
        tool_input: {},
        tool_response: {},
        normalizeToolNames: true,
      });
      const withoutFlag = fallbackFormatter.format({
        tool_name: rawName,
        tool_input: {},
        tool_response: {},
        normalizeToolNames: false,
      });
      expect(withFlag.contextText).toContain(rawName);
      expect(withoutFlag.contextText).toContain(rawName);
      expect(withFlag.contextText).toBe(withoutFlag.contextText);
    });
  });
});
