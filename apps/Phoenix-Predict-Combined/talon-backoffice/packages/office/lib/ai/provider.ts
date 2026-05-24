// Vercel AI SDK implementation of ModelProvider (plan §6, locked decision 1).
// Routes each tier to its configured model via env. The OpenAI-compatible
// adapter covers OpenAI + self-hosted/local OSS (Ollama, vLLM, LM Studio) by
// baseURL; Anthropic uses its native adapter.
//
// LIVE PATH NOTE: generateObject performs a network call and needs a reachable
// endpoint + key, so it is verified by type-check + the mock-tested drafter
// rather than an offline unit test. tierConfigFromEnv (pure) is unit-tested.

import { generateObject, type LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { z } from "zod";
import type {
  GenerateObjectParams,
  GenerateObjectResult,
  ModelProvider,
  ModelTier,
} from "./provider-types";

export interface TierConfig {
  provider: string; // "openai-compatible" | "anthropic"
  model: string;
  endpoint?: string;
  apiKey?: string;
}

export function tierConfigFromEnv(tier: ModelTier): TierConfig {
  const prefix = tier === "routine" ? "AI_ROUTINE" : "AI_HARD";
  const isRoutine = tier === "routine";
  return {
    provider:
      process.env[`${prefix}_PROVIDER`] ??
      (isRoutine ? "openai-compatible" : "anthropic"),
    model:
      process.env[`${prefix}_MODEL`] ??
      (isRoutine ? "qwen2.5" : "claude-sonnet-4-6"),
    endpoint:
      process.env[`${prefix}_ENDPOINT`] ??
      (isRoutine ? "http://localhost:11434/v1" : undefined),
    apiKey: process.env[`${prefix}_API_KEY`],
  };
}

function resolveModel(cfg: TierConfig): LanguageModel {
  if (cfg.provider === "anthropic") {
    return createAnthropic({ apiKey: cfg.apiKey })(cfg.model);
  }
  // openai-compatible covers OpenAI + Ollama / vLLM / LM Studio via baseURL.
  return createOpenAICompatible({
    name: cfg.provider,
    baseURL: cfg.endpoint ?? "http://localhost:11434/v1",
    apiKey: cfg.apiKey ?? "not-needed",
  })(cfg.model);
}

export function createAISDKProvider(): ModelProvider {
  return {
    async generateObject<T>(
      params: GenerateObjectParams<T>,
    ): Promise<GenerateObjectResult<T>> {
      const cfg = tierConfigFromEnv(params.tier);
      // The Vercel AI SDK's generateObject is heavily generic-overloaded.
      // Letting it infer the output type from our zod v4 schemas makes
      // `next build`'s type-check worker instantiate a union so large it
      // overflows TypeScript (TS2590 "union too complex" / a "Call retries
      // were exceeded" worker OOM) — even though plain `tsc` survives via lazy
      // evaluation. Erase the schema's element type at the SDK boundary and
      // restore it on return: the public ModelProvider<T> contract stays
      // precise for callers, and runtime is unchanged (the real zod schema is
      // still passed and validates the model output).
      const result = await generateObject({
        model: resolveModel(cfg),
        schema: params.schema as z.ZodType<unknown>,
        system: params.system,
        prompt: params.prompt,
      });
      return {
        object: result.object as T,
        usage: {
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
        },
        provider: cfg.provider,
        model: cfg.model,
      };
    },
  };
}
