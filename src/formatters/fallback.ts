import type { Formatter, PostToolUseInput } from "./types.js";
import { normalizeTtsToolName } from "../core/tool-name.js";

export const fallbackFormatter: Formatter = {
  id: "fallback",
  toolNames: [],
  format(input: PostToolUseInput) {
    const rawName = input.tool_name || "Unknown tool";
    const ttsName = input.normalizeToolNames ? normalizeTtsToolName(rawName) : rawName;
    return {
      contextText: `Tool "${rawName}" completed.`,
      ttsText: `${ttsName} completed.`,
    };
  },
};
