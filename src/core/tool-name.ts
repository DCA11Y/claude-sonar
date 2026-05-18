/**
 * Normalize a raw tool name into human-readable words for TTS output.
 *
 * Examples:
 *   mcp__<uuid>__getJiraIssue           -> "MCP Get Jira Issue"
 *   mcp__uuid__add_comment_to_jira      -> "MCP Add Comment To Jira"
 *   WebFetch                            -> "Web Fetch"
 *   Bash                                -> "Bash"
 *   "Unknown tool"                      -> "Unknown tool" (passthrough)
 *
 * Pure function: no side effects, no external state.
 */
export function normalizeTtsToolName(toolName: string): string {
  if (!toolName) return toolName;

  // Passthrough for names that already contain spaces — assume already readable.
  if (/\s/.test(toolName)) return toolName;

  // MCP tool: mcp__<server>__<tool-name>. Drop server segment, keep tool segment.
  if (toolName.startsWith("mcp__")) {
    const parts = toolName.split("__");
    const toolSegment = parts[2] || "";
    if (!toolSegment) return "MCP";
    return `MCP ${splitToWords(toolSegment)}`;
  }

  return splitToWords(toolName);
}

/**
 * Split a single identifier (snake_case, camelCase, PascalCase) into a
 * space-separated title-cased phrase.
 */
function splitToWords(identifier: string): string {
  // First split on underscores to get snake_case pieces.
  const snakeParts = identifier.split("_").filter((p) => p.length > 0);

  // For each piece, further split on camelCase/PascalCase word boundaries.
  const allWords: string[] = [];
  for (const part of snakeParts) {
    for (const word of splitCamel(part)) {
      if (word.length > 0) allWords.push(word);
    }
  }

  return allWords.map(titleCaseWord).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Split a camelCase/PascalCase identifier into individual words.
 * Handles acronym runs by treating consecutive uppercase letters as one word
 * until the last uppercase letter before a lowercase letter (e.g., "HTTPServer" -> ["HTTP", "Server"]).
 */
function splitCamel(s: string): string[] {
  if (!s) return [];
  // Insert a space:
  //  - between a lowercase/digit and an uppercase letter
  //  - between an uppercase letter and an uppercase-lowercase pair (acronym -> word)
  const spaced = s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return spaced.split(/\s+/);
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  // Preserve all-uppercase short acronyms? For simplicity title-case everything,
  // but if the whole word is uppercase and length > 1, keep it uppercase.
  if (word.length > 1 && word === word.toUpperCase()) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
