// =============================================================================
// LLM Utilities for Pipeline
// =============================================================================

import type { PipelineModelId } from "./types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterRequest {
  model: PipelineModelId;
  messages: ChatMessage[];
  temperature?: number;
  response_format?: { type: "json_object" } | { type: "text" };
}

interface OpenRouterResponse {
  success: boolean;
  content: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// -----------------------------------------------------------------------------
// Timeout Configuration
// -----------------------------------------------------------------------------

// Model timeouts - kept short to fit within Vercel Hobby 60s limit
// Total pipeline needs to complete in ~55s, so each stage ~12-15s max
const MODEL_TIMEOUTS: Record<string, number> = {
  "deepseek/deepseek-r1": 45_000, // 45s for reasoning model
  "anthropic/claude-sonnet-4": 30_000, // 30s
  "anthropic/claude-haiku-4": 20_000, // 20s (fast model)
  "openai/gpt-4o": 30_000, // 30s
  "google/gemini-2.5-flash": 20_000, // 20s (fast model)
  "moonshotai/kimi-k2": 30_000, // 30s
};

const DEFAULT_TIMEOUT = 30_000; // 30 seconds default

// -----------------------------------------------------------------------------
// OpenRouter API Call
// -----------------------------------------------------------------------------

/**
 * Call OpenRouter API with the specified model and messages
 */
export async function callOpenRouter(request: OpenRouterRequest): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey || apiKey === "your_api_key_here") {
    return {
      success: false,
      content: "",
      error: "OpenRouter API key is not configured",
    };
  }

  const timeout = MODEL_TIMEOUTS[request.model] ?? DEFAULT_TIMEOUT;

  try {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Scribe Pipeline",
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.2,
        // Only include response_format if explicitly set to json_object
        // Some models don't support it
        ...(request.response_format?.type === "json_object" && supportsJsonMode(request.model)
          ? { response_format: request.response_format }
          : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        content: "",
        error: `OpenRouter API error (${response.status}): ${errText.slice(0, 500)}`,
      };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const usage = data?.usage;

    return {
      success: true,
      content,
      usage: usage ? {
        prompt_tokens: usage.prompt_tokens ?? 0,
        completion_tokens: usage.completion_tokens ?? 0,
        total_tokens: usage.total_tokens ?? 0,
      } : undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        content: "",
        error: `Request timed out after ${timeout / 1000}s. Try a faster model.`,
      };
    }
    return {
      success: false,
      content: "",
      error: error instanceof Error ? error.message : "Unknown error calling OpenRouter",
    };
  }
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/**
 * Check if a model supports JSON response format
 */
function supportsJsonMode(modelId: PipelineModelId): boolean {
  // Most modern models support JSON mode
  // Kimi K2 may have issues, so we'll let it output naturally
  const jsonModeModels = [
    "anthropic/claude-sonnet-4",
    "anthropic/claude-haiku-4",
    "deepseek/deepseek-r1",
    "openai/gpt-4o",
    "google/gemini-2.5-flash",
  ];
  return jsonModeModels.includes(modelId);
}

/**
 * Strip reasoning/chain-of-thought tokens from model output
 * 
 * Some models (especially DeepSeek R1) include <think>...</think> blocks
 * that we need to remove before parsing or storing the output.
 */
export function stripReasoningTokens(content: string): string {
  // Remove <think>...</think> blocks (DeepSeek R1 style)
  let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "");
  
  // Remove <reasoning>...</reasoning> blocks
  cleaned = cleaned.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  
  // Remove [thinking]...[/thinking] blocks
  cleaned = cleaned.replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, "");
  
  // Remove lines that start with common reasoning prefixes
  cleaned = cleaned
    .split("\n")
    .filter(line => {
      const trimmed = line.trim().toLowerCase();
      return !trimmed.startsWith("let me think") &&
             !trimmed.startsWith("i need to") &&
             !trimmed.startsWith("first, i") &&
             !trimmed.startsWith("okay, so") &&
             !trimmed.startsWith("alright,");
    })
    .join("\n");
  
  // Trim any leading/trailing whitespace
  return cleaned.trim();
}

/**
 * Extract JSON from a potentially wrapped response
 */
export function extractJsonFromResponse(content: string): string {
  // If it's already valid JSON, return as-is
  try {
    JSON.parse(content);
    return content;
  } catch {
    // Continue to extraction
  }

  // Try to find JSON object in the content
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // Try to find JSON array
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  // Return original content if no JSON found
  return content;
}

