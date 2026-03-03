# Contributing to claude-sonar

## Development Setup

```bash
git clone https://github.com/vylasaven/claude-sonar.git
cd claude-sonar
npm install
npm run build
npm test
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Build with tsup (dual ESM/CJS + CLI with shebang) |
| `npm test` | Run tests with vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage |
| `npm run lint` | Lint with ESLint (flat config) |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run typecheck` | Type check with tsc |

## Architecture Overview

### Pipeline

claude-sonar's core is a pure pipeline with no I/O. The CLI layer is a thin wrapper that handles stdin/stdout/TTS/earcons.

```
stdin JSON
  |
  v
parseHookEvent()          -- parse raw JSON into typed HookEvent union
  |
  v
[route by event type]     -- PostToolUse, Notification, PermissionRequest, Stop, etc.
  |
  v (PostToolUse path)
setSummarizeOptions()     -- configure summarize state from config
  |
  v
formatToolUse()           -- dispatch to registered formatter by tool name
  |
  v
classifySignificance()   -- classify as noise/routine/notable/important
  |
  v
applySignificance()      -- adjust output based on significance level
  |
  v
buildHookOutput()        -- wrap into HookJsonOutput for Claude Code
  |
  v
stdout JSON + TTS + earcon
```

### Key Design Principles

**Pure core, thin CLI wrappers.** The pipeline function (`src/core/pipeline.ts`) is a pure function: input string + config in, structured result out. All I/O (reading stdin, writing stdout, spawning TTS, playing earcons) happens in the CLI layer (`src/cli/`). This makes the core fully testable without mocking.

**Separate audiences.** `FormattedOutput` has two fields:
- `contextText` — for Claude. Can include file paths, line numbers, structural details. Claude reads this.
- `ttsText` — for the human ear. Must be speakable: short, no special characters, no file paths that sound garbled when spoken.

**Formatter registry with conflict detection.** Each formatter declares a unique `id` and a list of `toolNames`. Registration fails fast if two formatters claim the same tool name. A try/catch wrapper at the registry level ensures a buggy formatter falls back gracefully.

**Guaranteed valid JSON output.** The `format` command always produces valid JSON on stdout, even if the formatter throws, the input is garbage, or anything else goes wrong. This is critical because Claude Code expects valid JSON from hook commands.

### Source Layout

```
src/
  cli/            -- CLI entry point and command handlers
    commands/     -- Individual command implementations
  config/         -- Config types, defaults, read/write/merge
  core/           -- Pure pipeline: parse, format, classify, digest, progress, history
  earcon/         -- Earcon sound definitions and playback
  formatters/     -- Tool-specific formatters (Bash, Edit, Read, etc.)
  output/         -- Build final HookJsonOutput
  settings/       -- Claude Code settings.json read/write/hook management
```

## How to Add a Formatter

1. **Create the formatter file** at `src/formatters/your-tool.ts`:

```typescript
import type { Formatter, PostToolUseInput, FormattedOutput } from "./types.js";

export const yourToolFormatter: Formatter = {
  id: "your-tool",
  toolNames: ["YourTool"],

  format(input: PostToolUseInput): FormattedOutput {
    const response = input.tool_response;
    // Extract what matters from the response
    const summary = String(response["result"] || "completed");

    return {
      contextText: `YourTool: ${summary}`,
      ttsText: `Your tool ${summary}`,
    };
  },
};
```

2. **Register it** in `src/formatters/index.ts`:

```typescript
import { yourToolFormatter } from "./your-tool.js";

// In registerBuiltinFormatters():
registerFormatter(yourToolFormatter);
```

3. **Add test fixtures** in `tests/fixtures/hook-inputs/` — JSON files representing the hook input your formatter will receive.

4. **Add tests** in `tests/formatters/your-tool.test.ts`. Test:
   - Normal output
   - Edge cases (empty response, missing fields)
   - contextText content (what Claude sees)
   - ttsText content (what the user hears)

5. **Update the README** — add your formatter to the "Supported Tool Formatters" table.

## How to Add a Hook Event Type

1. **Add the event type** to the union in `src/core/types.ts`:

```typescript
export interface YourNewEvent extends HookEventBase {
  hook_event_name: "YourNewEvent";
  // event-specific fields
}
```

Add it to the `HookEvent` union type.

2. **Add a parser case** in `parseHookEvent()` in `src/core/pipeline.ts`:

```typescript
case "YourNewEvent":
  return {
    ...base,
    hook_event_name: "YourNewEvent" as const,
    // parse event-specific fields from obj
  };
```

3. **Add a handler** in `src/core/pipeline.ts`:

```typescript
function handleYourNewEvent(event: YourNewEvent, config: SonarConfig): FormatResult {
  // format the event
}
```

Wire it into the switch statement in `processHookEvent()`.

4. **Register the hook** in `src/settings/index.ts` — add the event name to the `HOOK_EVENT_TYPES` array.

5. **Add tests** covering parsing, handling, and output for the new event type.

## How to Add an Earcon

1. **Add the earcon ID** to the `EarconId` type in `src/earcon/sounds.ts`:

```typescript
export type EarconId =
  | "edit-complete"
  // ... existing IDs ...
  | "your-new-earcon";
```

2. **Add sound mappings** in `MACOS_SOUNDS`, `LINUX_SOUNDS`, and `EARCON_IDS` in the same file.

3. **Wire the earcon into the pipeline** — in the appropriate handler or selection function in `src/core/pipeline.ts`, return your earcon ID from `selectPostToolUseEarcon()` or directly in an event handler.

4. **Add tests** verifying the earcon is selected under the right conditions.

## Testing

We use vitest with V8 coverage. The test suite has 545+ tests across 42+ test files.

```bash
# Run all tests
npm test

# Run a specific test file
npx vitest run tests/formatters/bash.test.ts

# Run tests matching a pattern
npx vitest run -t "should format edit"

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Patterns

- **Formatters**: test contextText and ttsText separately. Verify exact strings for critical output.
- **Pipeline**: test with full config objects. Use `DEFAULT_CONFIG` as a base and override specific fields.
- **Significance**: test classification for each tool type and edge cases (empty response, error states).
- **Config**: test merge behavior, prototype pollution guards, atomic write safety.
- **Earcons**: test selection logic (pure functions), not playback (I/O).

### Test File Locations

```
tests/
  core/           -- Pipeline, significance, digest, progress, history tests
  config/         -- Config read/write/merge tests
  formatters/     -- One test file per formatter
  earcon/         -- Earcon selection tests
  settings/       -- Hook install/uninstall tests
  cli/            -- CLI command integration tests
  fixtures/       -- Shared test data (hook-inputs/)
```

## Accessibility Coding Guidelines

claude-sonar's output is consumed by screen readers and speech engines. Every line of output must work for someone who can't see the screen.

### No Emoji in Output

Never include emoji in `contextText` or `ttsText`. Screen readers spell out emoji names ("face with tears of joy"), which is disruptive and wastes time. Use words instead.

### No ANSI Colors in CLI Output

CLI commands (`tasks`, `history`, `config list`) must not use ANSI color codes. Screen readers don't convey color — the escape sequences just produce garbled speech. Use structure (indentation, labels, punctuation) to convey hierarchy.

### TTS Text Must Be Speakable

TTS text is sent directly to a speech engine. It must sound natural when spoken:

- Spell out abbreviations: "TypeScript" not "TS", "JavaScript" not "JS" (in TTS text only)
- Avoid special characters that sound garbled: `→`, `│`, `├`, etc.
- Use periods for pauses, commas for shorter pauses
- Keep it short — 1-2 sentences max
- Don't include file paths in TTS (just filenames): say "app.ts" not "/Users/me/projects/app/src/app.ts"

### contextText vs ttsText: Different Audiences

`contextText` is read by Claude (the AI). It should include:
- Full file paths
- Line numbers
- Structural details (function signatures, class names)
- Technical details that help Claude make better decisions

`ttsText` is heard by the user. It should include:
- Just the filename (not the full path)
- A brief summary of what happened
- Error states and important status changes
- Nothing that sounds garbled or takes too long to hear

### Test Structural Output

Don't just test that a formatter doesn't crash. Test the actual content of `contextText` and `ttsText`:

```typescript
// Bad: only tests that it returns something
expect(result.contextText).toBeTruthy();

// Good: tests what the user actually experiences
expect(result.contextText).toContain("function createApp");
expect(result.ttsText).toBe("Edited app.ts. Changed createApp.");
```

## Screen Reader Testing

See [TESTING.md](TESTING.md) for a complete guide to testing with VoiceOver (macOS), NVDA (Windows), and Orca (Linux).

## Release Process

We use [changesets](https://github.com/changesets/changesets) for versioning and changelogs.

### Before Submitting a PR

If your change is user-facing (new feature, bug fix, behavior change), create a changeset:

```bash
npx changeset
```

This prompts you for:
- Which packages are affected (just `claude-sonar`)
- Semver bump type (patch, minor, major)
- A summary of the change

It creates a markdown file in `.changeset/` — commit this with your PR.

### What Warrants a Changeset

| Change Type | Bump | Example |
|-------------|------|---------|
| Bug fix | patch | Fix TTS not speaking on Linux |
| New formatter | minor | Add TaskCreate formatter |
| New config option | minor | Add `progress.thresholdMs` setting |
| New CLI command | minor | Add `claude-sonar history` command |
| Breaking config change | major | Rename `silence` to `mute` |
| Internal refactor | none | Don't create a changeset |
| Test-only change | none | Don't create a changeset |

### Release Flow

1. PRs with changesets are merged to main
2. A "Version Packages" PR is automatically created/updated by the changesets GitHub Action
3. Merging the Version Packages PR bumps the version, updates CHANGELOG.md, and publishes to npm
