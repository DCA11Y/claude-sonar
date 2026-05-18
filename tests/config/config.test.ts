import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  loadConfig,
  setConfigValue,
  getConfigValue,
  resetConfig,
  getConfigDir,
  DEFAULT_CONFIG,
} from "../../src/config/index.js";

describe("config", () => {
  let tmpDir: string;
  const origEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sonar-test-"));
    process.env["CLAUDE_SONAR_CONFIG_DIR"] = tmpDir;
  });

  afterEach(() => {
    process.env = { ...origEnv };
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("getConfigDir", () => {
    it("uses CLAUDE_SONAR_CONFIG_DIR when set", () => {
      process.env["CLAUDE_SONAR_CONFIG_DIR"] = "/custom/path";
      expect(getConfigDir()).toBe("/custom/path");
    });

    it("falls back to XDG_CONFIG_HOME", () => {
      delete process.env["CLAUDE_SONAR_CONFIG_DIR"];
      process.env["XDG_CONFIG_HOME"] = "/xdg/config";
      expect(getConfigDir()).toBe("/xdg/config/claude-sonar");
    });
  });

  describe("loadConfig", () => {
    it("returns defaults when no config file exists", () => {
      const config = loadConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it("returns defaults when config is invalid JSON", () => {
      fs.writeFileSync(path.join(tmpDir, "config.json"), "not json");
      const config = loadConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it("returns defaults when config is an array", () => {
      fs.writeFileSync(path.join(tmpDir, "config.json"), "[]");
      const config = loadConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it("merges partial config over defaults", () => {
      fs.writeFileSync(
        path.join(tmpDir, "config.json"),
        JSON.stringify({ verbosity: "full", tts: { enabled: true } }),
      );
      const config = loadConfig();
      expect(config.verbosity).toBe("full");
      expect(config.tts.enabled).toBe(true);
      expect(config.tts.engine).toBe("auto"); // default preserved
      expect(config.tts.rate).toBe(200); // default preserved
    });

    it("ignores invalid verbosity values", () => {
      fs.writeFileSync(
        path.join(tmpDir, "config.json"),
        JSON.stringify({ verbosity: "invalid" }),
      );
      const config = loadConfig();
      expect(config.verbosity).toBe("normal");
    });

    it("returns a deep clone, not a reference to defaults", () => {
      const a = loadConfig();
      const b = loadConfig();
      a.tts.enabled = true;
      expect(b.tts.enabled).toBe(false);
    });
  });

  describe("setConfigValue", () => {
    it("sets a top-level value", () => {
      setConfigValue("verbosity", "full");
      expect(getConfigValue("verbosity")).toBe("full");
    });

    it("sets a nested value", () => {
      setConfigValue("tts.enabled", true);
      expect(getConfigValue("tts.enabled")).toBe(true);
      // Other tts values preserved
      expect(getConfigValue("tts.rate")).toBe(200);
    });

    it("rejects __proto__ key", () => {
      expect(() => setConfigValue("__proto__.polluted", true)).toThrow("dangerous key");
    });

    it("rejects constructor key", () => {
      expect(() => setConfigValue("constructor.polluted", true)).toThrow("dangerous key");
    });

    it("rejects prototype key", () => {
      expect(() => setConfigValue("prototype.polluted", true)).toThrow("dangerous key");
    });

    it("creates backup file on update", () => {
      setConfigValue("verbosity", "minimal");
      setConfigValue("verbosity", "full");
      const bakPath = path.join(tmpDir, "config.json.bak");
      expect(fs.existsSync(bakPath)).toBe(true);
      const bak = JSON.parse(fs.readFileSync(bakPath, "utf-8"));
      expect(bak.verbosity).toBe("minimal");
    });
  });

  describe("getConfigValue", () => {
    it("returns undefined for missing keys", () => {
      expect(getConfigValue("nonexistent")).toBeUndefined();
    });

    it("returns undefined for deep missing keys", () => {
      expect(getConfigValue("tts.nonexistent")).toBeUndefined();
    });
  });

  describe("resetConfig", () => {
    it("resets to defaults", () => {
      setConfigValue("verbosity", "full");
      setConfigValue("tts.enabled", true);
      resetConfig();
      const config = loadConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });

  describe("queue config", () => {
    it("reads queue.enabled from user config", () => {
      fs.writeFileSync(
        path.join(tmpDir, "config.json"),
        JSON.stringify({ queue: { enabled: true } }),
      );
      const config = loadConfig();
      expect(config.queue.enabled).toBe(true);
      expect(config.queue.gapMs).toBe(500); // default preserved
    });

    it("reads queue.gapMs from user config", () => {
      fs.writeFileSync(
        path.join(tmpDir, "config.json"),
        JSON.stringify({ queue: { gapMs: 1000 } }),
      );
      const config = loadConfig();
      expect(config.queue.gapMs).toBe(1000);
      expect(config.queue.enabled).toBe(false);
    });

    it("ignores non-boolean queue.enabled", () => {
      fs.writeFileSync(
        path.join(tmpDir, "config.json"),
        JSON.stringify({ queue: { enabled: "yes" } }),
      );
      const config = loadConfig();
      expect(config.queue.enabled).toBe(false);
    });

    it("ignores non-number queue.gapMs", () => {
      fs.writeFileSync(
        path.join(tmpDir, "config.json"),
        JSON.stringify({ queue: { gapMs: "500" } }),
      );
      const config = loadConfig();
      expect(config.queue.gapMs).toBe(500);
    });

    it("rejects negative gapMs", () => {
      fs.writeFileSync(
        path.join(tmpDir, "config.json"),
        JSON.stringify({ queue: { gapMs: -100 } }),
      );
      const config = loadConfig();
      expect(config.queue.gapMs).toBe(500);
    });

    it("accepts zero gapMs", () => {
      fs.writeFileSync(
        path.join(tmpDir, "config.json"),
        JSON.stringify({ queue: { gapMs: 0 } }),
      );
      const config = loadConfig();
      expect(config.queue.gapMs).toBe(0);
    });

    it("ignores array queue value", () => {
      fs.writeFileSync(
        path.join(tmpDir, "config.json"),
        JSON.stringify({ queue: [1, 2, 3] }),
      );
      const config = loadConfig();
      expect(config.queue).toEqual(DEFAULT_CONFIG.queue);
    });
  });
});
