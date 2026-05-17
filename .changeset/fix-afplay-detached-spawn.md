---
"claude-sonar": patch
---

Fix earcons being silent on macOS. `playMacos` was invoking `afplay` with an end-of-options `--` separator, which afplay rejects with `unknown argument: --` and exits before producing audio. Drop the `--` from the argv. The mocked unit test missed this because the mock never invoked afplay; integration testing recommended for native helpers like afplay/say/canberra.
