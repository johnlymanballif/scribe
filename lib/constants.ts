export type ModelConfig = {
  id: string;
  name: string;
  provider: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  description: string;
  contextTokens?: number;
};

export const MODELS: ModelConfig[] = [
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    description: "Nuanced writing + strong structure. Excellent meeting notes.",
    contextTokens: 1_000_000,
  },
  {
    id: "moonshotai/kimi-k2",
    name: "Kimi 2 (K2)",
    provider: "MoonshotAI",
    inputCostPer1M: 0.456,
    outputCostPer1M: 1.84,
    description: "Great value. Strong extraction and formatting for long transcripts.",
    contextTokens: 131_072,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    inputCostPer1M: 2.5,
    outputCostPer1M: 10.0,
    description: "Top-tier generalist. Reliable formatting and clarity.",
    contextTokens: 128_000,
  },
  {
    id: "minimax/minimax-m2.1",
    name: "MiniMax (M2.1)",
    provider: "MiniMax",
    inputCostPer1M: 0.30,
    outputCostPer1M: 1.20,
    description: "Fast and cost-efficient. Good structured summaries.",
    contextTokens: 204_800,
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    inputCostPer1M: 0.30,
    outputCostPer1M: 2.50,
    description: "Very strong workhorse with massive context. Great for long meetings.",
    contextTokens: 1_048_576,
  },
];

export type TemplateConfig = {
  id: string;
  name: string;
  prompt: string;
};

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "executive",
    name: "Executive Brief",
    prompt:
      "Write for an executive who needs outcomes fast. Prioritize decisions, risks, and next actions. Keep it tight.",
  },
  {
    id: "detailed",
    name: "Detailed Minutes",
    prompt:
      "Create a chronological, thorough record. Preserve key context behind decisions. Include direct quotes when useful.",
  },
  {
    id: "technical",
    name: "Engineering Sync",
    prompt:
      "Focus on technical blockers, architecture decisions, and status updates. Extract concrete next steps and owners.",
  },
];

export const LOADING_PHRASES = [
  "Reading the transcript...",
  "Detecting structure...",
  "Extracting decisions...",
  "Capturing action items...",
  "Pulling key quotes...",
  "Formatting for Notion...",
  "Polishing hierarchy...",
  "Finalizing notes...",
];

/**
 * Quick estimate for a 1-hour meeting.
 * Default assumption: ~12k input tokens, ~1.2k output tokens.
 * (In the UI, you can improve this later with a tokenizer-based estimate.)
 */
export function calculateCost(modelId: string) {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) return "0.0000";

  const estimatedInputTokens = 12000;
  const estimatedOutputTokens = 1200;

  const cost =
    (estimatedInputTokens / 1_000_000) * model.inputCostPer1M +
    (estimatedOutputTokens / 1_000_000) * model.outputCostPer1M;

  return cost.toFixed(4);
}
