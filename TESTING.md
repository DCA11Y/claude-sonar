# Screen Reader Testing Guide

This guide walks through testing claude-sonar with actual screen readers on macOS, Windows, and Linux. You don't need a screen reader to verify basic functionality (see "Verifying Output Without a Screen Reader" at the end), but testing with one is the gold standard.

## Prerequisites

- Node.js 20+
- claude-sonar installed globally (`npm install -g claude-sonar`)
- Claude Code installed and working
- `claude-sonar setup` has been run

## VoiceOver (macOS)

### Enable VoiceOver

Press **Cmd+F5** to toggle VoiceOver on/off. You'll hear "VoiceOver on" when it activates.

### Terminal Setup

1. Open Terminal.app or iTerm2
2. VoiceOver works best with Terminal.app's default settings
3. In iTerm2, ensure "Accessibility" is enabled in Preferences > General > Accessibility

### Navigation

- **VO+Right Arrow / VO+Left Arrow** — move through terminal output line by line (VO = Ctrl+Option)
- **VO+Shift+Down Arrow** — interact with the terminal area
- **VO+Shift+Up Arrow** — stop interacting
- **VO+A** — read all from current position
- **VO+B** — read from beginning of current line

### What to Listen For

When claude-sonar is active during a Claude Code session:

- Tool completions should be announced as concise summaries, not raw JSON
- File paths should include just the filename for TTS, full path for context
- Exit codes and error states should be clearly spoken
- Permission prompts should describe the action and how to respond

## NVDA (Windows)

### Install and Configure

1. Download NVDA from [nvaccess.org](https://www.nvaccess.org/download/)
2. Run the installer; NVDA starts automatically
3. Press **NVDA+N** to open the NVDA menu

### Terminal Setup

Use Windows Terminal (recommended) or Command Prompt:

1. Open Windows Terminal
2. NVDA reads terminal output automatically via UIA
3. For WSL: run `wsl` in Windows Terminal — screen reader access works through the Windows Terminal layer

### Navigation

- **NVDA+Down Arrow** — say all (continuous reading)
- **NVDA+Up Arrow** — read current line
- **NVDA+Shift+Up Arrow** — read from cursor to top
- **Review cursor** (Numpad 7/8/9/4/5/6/1/2/3) — navigate by line/word/character
- **NVDA+Space** — toggle between browse mode and focus mode
- Use **focus mode** in the terminal for typing; use **browse mode** for reviewing output

### What to Listen For

Same as VoiceOver — concise tool summaries, clear permission prompts, and earcon sounds (if enabled).

## Orca (Linux)

### Enable Orca

Orca is pre-installed on most GNOME desktops:

1. Open Settings > Accessibility > Screen Reader, toggle on
2. Or run `orca` from a terminal
3. Press **Super+Alt+S** to toggle on some distributions

### Terminal Setup

GNOME Terminal works best with Orca:

1. Open GNOME Terminal
2. Orca reads terminal output through AT-SPI
3. Other terminals (Konsole, xfce4-terminal) may have limited accessibility support

### Navigation

- **Orca+Semicolon** (flat review) — enter flat review mode
- **Numpad 8 / Numpad 2** — previous/next line in flat review
- **Numpad 5** — read current line
- **Orca+Semicolon twice** — read from top to current position
- **Numpad Plus** — say all

### What to Listen For

Same as other screen readers. Additionally, verify that `spd-say` (speech-dispatcher) works for TTS:

```bash
spd-say "testing speech"
```

If that doesn't work, install speech-dispatcher: `sudo apt install speech-dispatcher`.

## Test Scenarios

Run these scenarios with Claude Code while your screen reader is active. For each, note what you hear and whether the announcement is clear and useful.

### 1. Read a TypeScript File

Ask Claude to read a file:

> "Read src/config/types.ts"

**Expected:** You hear something like *"Read types.ts, 70 lines."* With summarize enabled, you also hear key declarations: *"Contains TtsConfig, PermissionRule, SonarConfig."*

### 2. Edit a Function

Ask Claude to modify a function:

> "Rename the function `getColor` to `getThemeColor` in src/theme.ts"

**Expected:** You hear *"Edited theme.ts. Changed getColor."* With summarize enabled, includes parameter/return type info. You should also hear the `edit-complete` earcon (if earcons are enabled).

### 3. Run a Bash Command

Ask Claude to run tests:

> "Run npm test"

**Expected:** If tests pass: *"npm test passed. N tests passed."* (+ `test-pass` earcon). If tests fail: *"npm test failed. N passed, M failed."* (+ `test-fail` earcon).

### 4. Permission Prompt

When Claude needs permission for a Bash command or file edit:

**Expected:** You hear *"Permission requested for Bash. Run 'npm install'. Y to allow, N to deny."* (+ `permission` earcon).

### 5. Enable TTS

```bash
claude-sonar config set tts.enabled true
```

Then trigger a tool use. Verify that speech output plays in addition to the screen reader reading the terminal.

**Note:** TTS and screen reader may talk over each other. This is expected — many users prefer one or the other. TTS is most useful for users who don't run a screen reader, or who want audio cues while working in a different window.

### 6. Enable Earcons

```bash
claude-sonar config set earcon.enabled true
```

Then trigger tool uses that map to earcons (see README for the full table). Verify you hear the system sounds. On macOS, you should hear sounds like Glass, Basso, and Hero.

## Verifying Output Without a Screen Reader

You can verify claude-sonar's output without a screen reader by piping test input directly:

### Basic PostToolUse Test

```bash
echo '{"hook_event_name":"PostToolUse","tool_name":"Read","tool_input":{"file_path":"/src/app.ts"},"tool_response":{"content":"const x = 1;\nconst y = 2;\n"}}' | claude-sonar format
```

Check the stdout JSON. It should contain an `additionalContext` field with a human-readable summary, not raw tool output.

### Permission Request Test

```bash
echo '{"hook_event_name":"PermissionRequest","tool_name":"Bash","tool_input":{"command":"rm -rf /tmp/test"}}' | claude-sonar format
```

Should produce output describing the permission action and how to respond.

### Notification Test

```bash
echo '{"hook_event_name":"Notification","message":"Session idle for 5 minutes","notification_type":"idle_prompt"}' | claude-sonar format
```

### Stop Event Test

```bash
echo '{"hook_event_name":"Stop","session_id":"test-session"}' | claude-sonar format
```

### Checking TTS Text

The format command's JSON output includes the TTS text that would be spoken. Look for the `ttsText` or speech-related fields in the output to verify what a user would hear.

### Checking with Different Verbosity Levels

```bash
claude-sonar config set verbosity compact
echo '{"hook_event_name":"PostToolUse","tool_name":"Glob","tool_input":{"pattern":"*.ts"},"tool_response":{"files":["a.ts"]}}' | claude-sonar format

claude-sonar config set verbosity full
echo '{"hook_event_name":"PostToolUse","tool_name":"Glob","tool_input":{"pattern":"*.ts"},"tool_response":{"files":["a.ts"]}}' | claude-sonar format

claude-sonar config set verbosity normal  # reset
```

Compare the outputs — compact should be shorter, full should include more detail.

## Reporting Issues

### Bugs

If claude-sonar is crashing, producing incorrect JSON, or otherwise malfunctioning, file a **bug report**:

[Open a bug report](../../issues/new?template=bug_report.md)

Include the debug log (`CLAUDE_SONAR_DEBUG=1`) and your config dump (`claude-sonar config list`).

### Speech Output Feedback

If the code works correctly but the spoken output is confusing, unhelpful, or poorly worded for screen reader users, file a **screen reader feedback** report:

[Open screen reader feedback](../../issues/new?template=screen_reader_feedback.md)

This is a different category from bugs — the code works, but the words chosen don't serve the listener well. These reports are especially valuable because they come from real screen reader users experiencing the output firsthand.
