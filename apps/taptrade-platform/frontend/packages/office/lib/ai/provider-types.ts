// Provider-agnostic seam for LLM calls (plan §6). The market drafter depends on
// this interface, not on any vendor SDK, so its orchestration is unit-testable
// with a mock. The Vercel AI SDK implementation lives in provider.ts.

import type { z } from "zod";

export type ModelTier = "routine" | "hard";

export interface ModelUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface GenerateObjectParams<T> {
  tier: ModelTier;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
}

export interface GenerateObjectResult<T> {
  object: T;
  usage: ModelUsage;
  provider: string;
  model: string;
}

export interface ModelProvider {
  generateObject<T>(
    params: GenerateObjectParams<T>,
  ): Promise<GenerateObjectResult<T>>;
}
