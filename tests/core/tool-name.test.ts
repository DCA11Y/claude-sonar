import { describe, it, expect } from "vitest";
import { normalizeTtsToolName } from "../../src/core/tool-name.js";

describe("normalizeTtsToolName", () => {
  it("normalizes MCP tool with UUID server and camelCase name", () => {
    expect(
      normalizeTtsToolName("mcp__83d3d3ec-a5c8-449a-b405-61e2279b592d__getJiraIssue"),
    ).toBe("MCP Get Jira Issue");
  });

  it("normalizes MCP tool with UUID server and snake_case name", () => {
    expect(normalizeTtsToolName("mcp__uuid__add_comment_to_jira_issue")).toBe(
      "MCP Add Comment To Jira Issue",
    );
  });

  it("normalizes MCP tool with server slug (drops server, keeps tool)", () => {
    expect(normalizeTtsToolName("mcp__ccd_session__mark_chapter")).toBe(
      "MCP Mark Chapter",
    );
  });

  it("normalizes simple PascalCase name", () => {
    expect(normalizeTtsToolName("WebFetch")).toBe("Web Fetch");
  });

  it("normalizes another PascalCase multi-word name", () => {
    expect(normalizeTtsToolName("TaskCreate")).toBe("Task Create");
  });

  it("leaves single-word PascalCase unchanged in word count", () => {
    expect(normalizeTtsToolName("Bash")).toBe("Bash");
  });

  it("passes through already-spaced strings", () => {
    expect(normalizeTtsToolName("Unknown tool")).toBe("Unknown tool");
  });

  it("handles acronyms followed by words without inserting extra spaces", () => {
    expect(normalizeTtsToolName("WebSearch")).toBe("Web Search");
  });

  it("handles empty string by returning empty string", () => {
    expect(normalizeTtsToolName("")).toBe("");
  });

  it("normalizes snake_case identifier", () => {
    expect(normalizeTtsToolName("read_file_content")).toBe("Read File Content");
  });

  it("normalizes mixed camelCase across underscores", () => {
    expect(normalizeTtsToolName("mcp__uuid__getThing_doStuff")).toBe(
      "MCP Get Thing Do Stuff",
    );
  });

  it("handles MCP with empty tool segment", () => {
    expect(normalizeTtsToolName("mcp__uuid__")).toBe("MCP");
  });

  it("preserves uppercase acronym followed by uppercase+lowercase word", () => {
    // HTTPServer -> HTTP Server
    expect(normalizeTtsToolName("HTTPServer")).toBe("HTTP Server");
  });
});
