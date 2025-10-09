/**
 * 🧠 Betting-Brain v3 - Kimi K2 Provider
 * OpenAI-compatible provider configuration for Kimi K2 AI
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * Kimi K2 Model ID
 */
export const KIMI_K2_MODEL = 'kimi-k2';

/**
 * Kimi K2 Base URL
 */
export const KIMI_BASE_URL = 'https://opencode.ai/zen/v1';

/**
 * Create Kimi Provider
 * @param apiKey - Kimi API key
 * @returns OpenAI-compatible provider instance
 */
export function createKimiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: 'kimi',
    apiKey,
    baseURL: KIMI_BASE_URL,
  });
}

/**
 * Create Kimi Model Instance
 * @param apiKey - Kimi API key
 * @param modelId - Model ID (default: kimi-k2)
 * @returns Model instance ready for use with AI SDK
 */
export function createKimiModel(apiKey: string, modelId: string = KIMI_K2_MODEL) {
  const provider = createKimiProvider(apiKey);
  return provider(modelId);
}

/**
 * Kimi K2 Pricing (per 1M tokens)
 */
export const KIMI_PRICING = {
  input: 0.60,   // $0.60 per 1M input tokens
  output: 2.50,  // $2.50 per 1M output tokens
} as const;

/**
 * Calculate cost for token usage
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost breakdown in USD
 */
export function calculateCost(inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * KIMI_PRICING.input;
  const outputCost = (outputTokens / 1_000_000) * KIMI_PRICING.output;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    inputTokens,
    outputTokens,
  };
}
