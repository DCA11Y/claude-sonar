# claude-sonar

Screen reader accessibility plugin for Claude Code.

claude-sonar intercepts Claude Code's tool output via the hooks system, reformats it into screen-reader-friendly summaries, and optionally speaks them aloud. It turns walls of raw JSON into concise, navigable announcements — so blind and low-vision developers can follow what Claude is doing without reading every line.

## Project Status

This project was built as a seed for the community — a solid foundation that someone can fork and make their own. The architecture is clean, the test suite is thorough (545 tests across 42 files), and the docs are comprehensive. There may be bugs in edge cases, but the scaffolding is there.

I'm not planning to actively maintain this long-term, but I'll try to respond to bug reports. My hope is that screen reader users who live with these problems daily will take this and shape it into exactly what they need.

If this project is useful to you, or if you want to see the community pick it up, a star helps others find it.

## Working on claude-sonar

This project is designed to be worked on with AI-assisted development. The intended workflow is to use Claude Code (or any AI coding agent) to contribute — which means working on an accessibility tool using the very tool it makes accessible.

The repo includes a [CLAUDE.md](CLAUDE.md) that gives Claude Code full context on the architecture, safety rules, accessibility requirements, and how to add formatters and hook events. It's written with blind and low-vision developers in mind, so it works whether you're reading it yourself or having Claude Code read it for you.

```bash
# Clone and start working with Claude Code immediately
git clone https://github.com/vylasaven/claude-sonar.git
cd claude-sonar
npm install
claude  # Claude Code picks up CLAUDE.md automatically
```

## What It Does

Claude Code tools produce verbose JSON. claude-sonar replaces that with structured, spoken-friendly output.

**Before (raw hook output):**

```
{"tool_name":"Read","tool_input":{"file_path":"/src/app.ts"},"tool_response":{"content":"import express from 'express';\nexport interface Config { port: number; host: string; }\nexport function createApp(config: Config) { ... }\n// 200 lines of code"}}
```

**After (claude-sonar):**

What Claude sees: `Read /src/app.ts (200 lines). Contains: interface Config, function createApp(config: Config)`

What you hear: *"Read app.ts, 200 lines. Contains Config, createApp."*

---

**Before (Edit):**

```
{"tool_name":"Edit","tool_input":{"file_path":"/src/auth.ts","old_string":"function login()...","new_string":"async function login(user: User)..."},"tool_response":{}}
```

**After:**

What Claude sees: `Edited /src/auth.ts. Changed: function login → async function login(user: User)`

What you hear: *"Edited auth.ts. Changed login."*

---

**Before (Bash):**

```
{"tool_name":"Bash","tool_input":{"command":"npm test"},"tool_response":{"stdout":"Tests: 47 passed, 2 failed\nTime: 3.2s","exit_code":1}}
```

**After:**

What Claude sees: `Bash: npm test — exit 1. 47 passed, 2 failed (3.2s)`

What you hear: *"npm test failed. 47 passed, 2 failed."* (+ test-fail earcon sound)

---

## For Users

### Quick Start

```bash
npm install -g claude-sonar
claude-sonar setup
```

`setup` registers hooks in Claude Code's `~/.claude/settings.json`. That's it — claude-sonar now intercepts every tool use and reformats it.

To remove:

```bash
claude-sonar uninstall
```

### CLI Commands

| Command | Description |
|---------|-------------|
| `claude-sonar format` | Format hook output from stdin (called automatically by Claude Code hooks) |
| `claude-sonar setup` | Register sonar hooks in Claude Code settings |
| `claude-sonar uninstall` | Remove sonar hooks from Claude Code settings |
| `claude-sonar replay` | Replay the most recent digest summary via TTS |
| `claude-sonar tasks` | Show the current task list |
| `claude-sonar tasks -i` | Interactive task list with arrow-key navigation |
| `claude-sonar history` | Show recent hook events (default: 20) |
| `claude-sonar history -i` | Interactive history with arrow-key navigation |
| `claude-sonar history -n 50` | Show last 50 events |
| `claude-sonar summarize on` | Enable code summarization mode |
| `claude-sonar summarize off` | Disable code summarization mode |
| `claude-sonar summarize` | Show current summarize status |
| `claude-sonar config get <key>` | Get a config value (e.g., `tts.enabled`) |
| `claude-sonar config set <key> <value>` | Set a config value (e.g., `tts.enabled true`) |
| `claude-sonar config list` | Show all current config values |
| `claude-sonar config reset` | Reset config to defaults |

### Configuration

Config is stored at `~/.config/claude-sonar/config.json` (XDG-compliant: respects `$XDG_CONFIG_HOME`).

#### verbosity

Controls how much detail appears in output.

| Value | Behavior |
|-------|----------|
| `"compact"` | Suppresses noise and routine events entirely |
| `"minimal"` | Short summaries only |
| `"normal"` | Balanced detail (default) |
| `"full"` | Maximum detail including raw data |

```bash
claude-sonar config set verbosity minimal
```

#### tts

Text-to-speech configuration.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `tts.enabled` | `boolean` | `false` | Enable spoken announcements |
| `tts.engine` | `"auto" \| "say" \| "spd-say"` | `"auto"` | TTS engine (`say` = macOS, `spd-say` = Linux) |
| `tts.rate` | `number` | `200` | Speech rate in words per minute |
| `tts.maxLength` | `number` | `500` | Max characters sent to TTS (truncated beyond this) |

```bash
claude-sonar config set tts.enabled true
claude-sonar config set tts.rate 250
```

#### permissions

Auto-approve or auto-deny permission prompts by tool and pattern.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `permissions.rules` | `PermissionRule[]` | `[]` | List of rules, evaluated in order |

Each rule has:
- `tool` — tool name to match (e.g., `"Bash"`, `"Edit"`)
- `pattern` — optional substring to match against the command/file path
- `action` — `"allow"` or `"deny"`

#### silence

Suppress output for specific tools entirely.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `silence.enabled` | `boolean` | `true` | Enable per-tool silencing |
| `silence.tools` | `Record<string, boolean>` | `{}` | Map of tool names to silence (e.g., `{"Glob": true}`) |

```bash
claude-sonar config set silence.tools.Glob true
```

#### significance

Classifies events by importance level: `noise`, `routine`, `notable`, `important`. Higher levels get more prominent announcements; lower levels may be suppressed.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `significance.enabled` | `boolean` | `true` | Enable significance classification |
| `significance.overrides` | `Record<string, SignificanceLevel>` | `{}` | Force a significance level per tool name |

```bash
claude-sonar config set significance.overrides.Glob noise
```

#### digest

Accumulates tool events during a turn and produces a single summary at the end (on the Stop event), instead of announcing each tool use individually.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `digest.enabled` | `boolean` | `false` | Enable digest mode |

```bash
claude-sonar config set digest.enabled true
```

Use `claude-sonar replay` to hear the last digest summary again.

#### earcon

Short audio cues that play on specific events (e.g., a chime when tests pass, a thud when they fail).

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `earcon.enabled` | `boolean` | `false` | Enable earcon sounds |
| `earcon.engine` | `"auto" \| "afplay" \| "paplay" \| "canberra-gtk-play"` | `"auto"` | Audio playback engine |
| `earcon.volume` | `number` | `0.5` | Volume level (0.0 to 1.0) |
| `earcon.overrides` | `Record<string, string \| false>` | `{}` | Custom sound path per earcon ID, or `false` to disable |

```bash
claude-sonar config set earcon.enabled true
claude-sonar config set earcon.volume 0.7
```

#### progress

Announces elapsed time for long-running tools ("took 8 seconds").

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `progress.enabled` | `boolean` | `false` | Enable progress timing |
| `progress.thresholdMs` | `number` | `3000` | Minimum elapsed time (ms) before announcing |

```bash
claude-sonar config set progress.enabled true
claude-sonar config set progress.thresholdMs 5000
```

#### history

Logs hook events to a per-session JSONL file for later review.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `history.enabled` | `boolean` | `true` | Enable event history logging |
| `history.maxEntries` | `number` | `500` | Max entries per session (oldest trimmed) |

```bash
claude-sonar history -n 30
claude-sonar history -i
```

#### summarize

When enabled, Read/Write/Edit formatters include named code declarations (functions, classes, interfaces, types) in their output.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `summarize.enabled` | `boolean` | `false` | Enable code summarization |
| `summarize.maxDeclarations` | `number` | `20` | Max declarations in context text |
| `summarize.maxTtsNames` | `number` | `3` | Max declaration names spoken via TTS |

```bash
claude-sonar summarize on
# or equivalently:
claude-sonar config set summarize.enabled true
```

### Hook Events

claude-sonar registers for 9 Claude Code hook events:

| Event | When It Fires | What claude-sonar Does |
|-------|---------------|----------------------|
| `PreToolUse` | Before a tool runs | Records start time for progress timing |
| `PostToolUse` | After a tool runs | Formats result, announces via TTS, plays earcon |
| `PostToolUseFailure` | When a tool fails | Announces failure (always treated as important) |
| `Notification` | Claude sends a notification | Announces the message |
| `PermissionRequest` | Claude needs permission | Describes the action, evaluates auto-rules |
| `Stop` | Claude finishes responding | Says "Done", flushes digest if enabled |
| `SubagentStart` | A subagent launches | Announces agent type |
| `SubagentStop` | A subagent finishes | Announces completion |
| `TaskCompleted` | A task is marked done | Announces the task subject |

### Supported Tool Formatters

Each formatter produces tailored output for its tool type:

| Formatter | Tool | Output Example |
|-----------|------|----------------|
| Bash | `Bash` | Exit code, command summary, stdout/stderr highlights |
| Edit | `Edit` | File path, structural changes (functions added/removed/changed) |
| Write | `Write` | File path, line count, declarations defined |
| Read | `Read` | File path, line count, declarations found |
| Grep | `Grep` | Match count, file list |
| Glob | `Glob` | File count, pattern matched |
| WebFetch | `WebFetch` | URL, content summary |
| WebSearch | `WebSearch` | Query, result count |
| Task | `Task` | Agent type, description |
| TaskCreate | `TaskCreate` | Task subject, ID |
| TaskUpdate | `TaskUpdate` | Task status change |
| TaskList | `TaskList` | Task count, statuses |
| TaskGet | `TaskGet` | Task details |
| (fallback) | Any other tool | Generic tool name + response summary |

### Earcon Sounds

When earcons are enabled, short audio cues play for specific events:

| Earcon ID | Trigger | macOS Sound | Linux Sound |
|-----------|---------|-------------|-------------|
| `edit-complete` | Notable Edit/Write | Tink | message |
| `test-pass` | Tests passed | Glass | complete |
| `test-fail` | Tests failed | Basso | dialog-error |
| `error` | Command/tool failure | Sosumi | dialog-warning |
| `agent-start` | Subagent launched | Blow | service-login |
| `agent-stop` | Subagent finished | Bottle | service-logout |
| `done` | Claude finished (Stop) | Hero | bell |
| `permission` | Permission requested | Funk | dialog-question |
| `task-complete` | Task marked done | Ping | message-new-instant |
| `notification` | Notification received | Pop | message-new-email |

Override or disable individual earcons:

```bash
# Use a custom sound file
claude-sonar config set earcon.overrides.done /path/to/custom.wav

# Disable a specific earcon
claude-sonar config set earcon.overrides.test-pass false
```

### File Locations

| Path | Purpose |
|------|---------|
| `~/.config/claude-sonar/config.json` | User configuration |
| `~/.local/state/claude-sonar/` | Runtime state (history, digest, debug logs) |
| `~/.claude/settings.json` | Claude Code settings (hooks are registered here) |

Config location respects `$XDG_CONFIG_HOME`. State location respects `$XDG_STATE_HOME`.

### Troubleshooting

**claude-sonar isn't intercepting tool output**

1. Run `claude-sonar setup` to ensure hooks are registered
2. Check `~/.claude/settings.json` — look for `"claude-sonar format"` entries under `hooks`
3. Verify claude-sonar is installed globally: `which claude-sonar`

**TTS isn't speaking**

1. Check TTS is enabled: `claude-sonar config get tts.enabled`
2. Test your system TTS directly: `say "hello"` (macOS) or `spd-say "hello"` (Linux)
3. Try setting the engine explicitly: `claude-sonar config set tts.engine say`

**Earcons aren't playing**

1. Check earcons are enabled: `claude-sonar config get earcon.enabled`
2. Test system audio: `afplay /System/Library/Sounds/Glass.aiff` (macOS)
3. Check volume: `claude-sonar config get earcon.volume`

**Output is too verbose / not verbose enough**

Adjust verbosity level:

```bash
claude-sonar config set verbosity compact    # minimum output
claude-sonar config set verbosity minimal    # short summaries
claude-sonar config set verbosity normal     # balanced (default)
claude-sonar config set verbosity full       # maximum detail
```

**Debug logging**

Set `CLAUDE_SONAR_DEBUG=1` to write debug output to `~/.local/state/claude-sonar/debug.log`:

```bash
CLAUDE_SONAR_DEBUG=1 claude-sonar format < test-input.json
```

**Reset everything**

```bash
claude-sonar config reset   # Reset config to defaults
claude-sonar uninstall      # Remove hooks
claude-sonar setup          # Re-register hooks
```

---

## For Contributors

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture overview, and how to add formatters, hook events, and earcons.

See [TESTING.md](TESTING.md) for a step-by-step guide to testing with screen readers (VoiceOver, NVDA, Orca).

See [CLAUDE.md](CLAUDE.md) for AI agent instructions — if you're using Claude Code to work on this project, it picks this up automatically.

## License

MIT
