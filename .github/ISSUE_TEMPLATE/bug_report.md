---
name: Bug report
about: Report something that isn't working correctly
title: ""
labels: bug
assignees: ""
---

**Screen reader and OS**
- Screen reader: (e.g., VoiceOver, NVDA, JAWS, Orca, none)
- OS: (e.g., macOS 15, Ubuntu 24.04, Windows 11)
- Node version:
- claude-sonar version:

**Describe the bug**
A clear description of what the bug is.

**To reproduce**
Steps to reproduce the behavior.

**Expected behavior**
What you expected to happen.

**What did you hear?**
If this is a TTS or screen reader issue, describe what was spoken. Include the exact words if possible — this helps us understand how the output sounds to a listener.

**Hook event**
Which hook event triggered the issue? (e.g., PostToolUse, PermissionRequest, Stop, Notification, etc.)

If you know the tool name, include that too (e.g., PostToolUse for Bash, PostToolUse for Edit).

**Config dump**
Paste the output of `claude-sonar config list`:

```
(paste here)
```

**Debug log**
Run with `CLAUDE_SONAR_DEBUG=1` and attach the relevant portion of `~/.local/state/claude-sonar/debug.log`:

```
(paste here)
```
