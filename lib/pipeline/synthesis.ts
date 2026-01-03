// =============================================================================
// Stage 2: Synthesis (Writing Layer)
// =============================================================================

import type { DeduplicatedFacts, PipelineModelId, StageResult, MeetingMetadata } from "./types";
import { getSynthesisPromptWithTemplate, KIMI_TONE_EXAMPLE } from "./prompts";
import { callOpenRouter, stripReasoningTokens } from "./llm";

/**
 * Execute Stage 2: Synthesis
 * 
 * Converts structured facts into professional, human-readable summary.
 * NEVER receives raw transcript - only deduped facts.
 */
export async function executeSynthesis(
  deduplicatedFacts: DeduplicatedFacts,
  modelId: PipelineModelId,
  templatePrompt: string,
  metadata?: MeetingMetadata
): Promise<StageResult<string>> {
  const startTime = Date.now();

  try {
    // Build the system prompt with template instructions
    let systemPrompt = getSynthesisPromptWithTemplate(templatePrompt);
    
    // Add metadata context if provided
    if (metadata) {
      const metadataContext = buildMetadataContext(metadata);
      systemPrompt += `\n\n## MEETING CONTEXT\n${metadataContext}`;
    }
    
    // Add one-shot tone example for Kimi K2 (higher variance model)
    if (modelId === "moonshotai/kimi-k2") {
      systemPrompt += KIMI_TONE_EXAMPLE;
    }

    // Prepare the facts for the model - remove internal metadata
    const factsForModel = prepareFactsForSynthesis(deduplicatedFacts);

    const response = await callOpenRouter({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Please write a meeting summary based on the following extracted facts:\n\n${JSON.stringify(factsForModel, null, 2)}` 
        },
      ],
      temperature: 0.3, // Slightly higher for natural writing, but still controlled
    });

    if (!response.success) {
      return {
        success: false,
        data: null,
        error: response.error || "Failed to call synthesis model",
        duration_ms: Date.now() - startTime,
        tokens_used: { input: 0, output: 0 },
      };
    }

    // Strip reasoning tokens and clean the output
    let summary = stripReasoningTokens(response.content);
    
    // Remove markdown code fences if present
    summary = removeMarkdownFences(summary);
    
    // Validate the output has actual content
    if (!summary.trim() || summary.length < 50) {
      return {
        success: false,
        data: null,
        error: "Synthesis produced empty or too short output",
        duration_ms: Date.now() - startTime,
        tokens_used: {
          input: response.usage?.prompt_tokens ?? 0,
          output: response.usage?.completion_tokens ?? 0,
        },
      };
    }

    return {
      success: true,
      data: summary,
      error: null,
      duration_ms: Date.now() - startTime,
      tokens_used: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown synthesis error",
      duration_ms: Date.now() - startTime,
      tokens_used: { input: 0, output: 0 },
    };
  }
}

/**
 * Prepare facts for synthesis by removing internal metadata
 * and formatting for readability
 */
function prepareFactsForSynthesis(facts: DeduplicatedFacts): object {
  return {
    participants: facts.participants,
    decisions: facts.decisions.map(d => ({
      description: d.description,
      certainty: d.certainty_level,
      supporting_evidence: d.supporting_quotes.map(q => q.quote),
    })),
    commitments: facts.commitments.map(c => ({
      owner: c.owner,
      task: c.task,
      due_date: c.due_date,
      certainty: c.certainty_level,
    })),
    risks: facts.risks.map(r => ({
      description: r.description,
      severity: r.severity,
      raised_by: r.raised_by,
    })),
    open_questions: facts.open_questions.map(q => ({
      question: q.question,
      raised_by: q.raised_by,
      context: q.context,
    })),
    notable_quotes: facts.notable_quotes.map(q => ({
      quote: q.quote,
      speaker: q.speaker,
      significance: q.significance,
    })),
  };
}

/**
 * Build metadata context string for synthesis prompt
 */
function buildMetadataContext(metadata: MeetingMetadata): string {
  const parts: string[] = [];
  
  if (metadata.clientName) {
    parts.push(`- Client/Company: ${metadata.clientName}`);
  }
  if (metadata.meetingName) {
    parts.push(`- Meeting Name: ${metadata.meetingName}`);
  }
  if (metadata.date) {
    parts.push(`- Date: ${metadata.date}`);
  }
  if (metadata.participants && metadata.participants.length > 0) {
    parts.push(`- Participants: ${metadata.participants.join(", ")}`);
  }
  
  if (parts.length === 0) return "";
  
  let instructions = `Use this context to inform your summary:
- Reference participants by name when appropriate
- Include the meeting name and date in the summary header if provided
- Use the client/company name to provide context about who the meeting was with`;

  if (metadata.clientName) {
    instructions += `
- When attributing quotes or perspectives from the client side, you can reference "${metadata.clientName}" if specific names aren't available`;
  }
  
  return parts.join("\n") + "\n\n" + instructions;
}

/**
 * Remove markdown code fences that some models add
 */
function removeMarkdownFences(content: string): string {
  // Remove ```markdown ... ``` wrapping
  let cleaned = content.replace(/^```(?:markdown|md)?\n?/i, "");
  cleaned = cleaned.replace(/\n?```$/i, "");
  
  // Also handle if it starts with ``` on its own line
  if (cleaned.startsWith("```\n")) {
    cleaned = cleaned.slice(4);
  }
  if (cleaned.endsWith("\n```")) {
    cleaned = cleaned.slice(0, -4);
  }
  
  return cleaned.trim();
}

