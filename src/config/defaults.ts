import type { SonarConfig } from "./types.js";

export const DEFAULT_CONFIG: Readonly<SonarConfig> = {
  verbosity: "normal",
  tts: {
    enabled: false,
    engine: "auto",
    rate: 200,
    maxLength: 500,
    normalizeToolNames: false,
  },
  permissions: {
    rules: [],
  },
  silence: {
    enabled: true,
    tools: {},
  },
  significance: {
    enabled: true,
    overrides: {},
  },
  digest: {
    enabled: false,
  },
  earcon: {
    enabled: false,
    engine: "auto",
    volume: 0.5,
    overrides: {},
  },
  progress: {
    enabled: false,
    thresholdMs: 3000,
  },
  history: {
    enabled: true,
    maxEntries: 500,
  },
  summarize: {
    enabled: false,
    maxDeclarations: 20,
    maxTtsNames: 3,
  },
  queue: {
    enabled: false,
    gapMs: 500,
  },
};
