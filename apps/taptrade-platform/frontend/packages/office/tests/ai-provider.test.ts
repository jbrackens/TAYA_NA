import { afterEach, describe, expect, it, vi } from "vitest";
import { tierConfigFromEnv } from "../lib/ai/provider";

describe("tierConfigFromEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults the routine tier to local OSS via Ollama", () => {
    const c = tierConfigFromEnv("routine");
    expect(c.provider).toBe("openai-compatible");
    expect(c.model).toBe("qwen2.5");
    expect(c.endpoint).toBe("http://localhost:11434/v1");
  });

  it("defaults the hard tier to Anthropic Claude", () => {
    const c = tierConfigFromEnv("hard");
    expect(c.provider).toBe("anthropic");
    expect(c.model).toBe("claude-sonnet-4-6");
  });

  it("honors env overrides per tier", () => {
    vi.stubEnv("AI_ROUTINE_MODEL", "llama3.1");
    vi.stubEnv("AI_HARD_PROVIDER", "openai-compatible");
    vi.stubEnv("AI_HARD_ENDPOINT", "https://api.example.com/v1");
    expect(tierConfigFromEnv("routine").model).toBe("llama3.1");
    expect(tierConfigFromEnv("hard").provider).toBe("openai-compatible");
    expect(tierConfigFromEnv("hard").endpoint).toBe(
      "https://api.example.com/v1",
    );
  });
});
