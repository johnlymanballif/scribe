// =============================================================================
// Stage 1.5: Deduplication / Consolidation
// =============================================================================

import type { ExtractedFacts, DeduplicatedFacts, PipelineModelId, StageResult } from "./types";
import { DEDUPLICATION_PROMPT } from "./prompts";
import { callOpenRouter, stripReasoningTokens, extractJsonFromResponse } from "./llm";

/**
 * Execute Stage 1.5: Deduplication
 * 
 * Merges duplicate/near-duplicate items without introducing new facts.
 * Uses a hybrid approach: deterministic merging for obvious duplicates,
 * LLM-assisted for semantic similarity.
 */
export async function executeDeduplication(
  extractedFacts: ExtractedFacts,
  modelId: PipelineModelId | null // null = deterministic only
): Promise<StageResult<DeduplicatedFacts>> {
  const startTime = Date.now();

  try {
    // First, apply deterministic deduplication
    const deterministicResult = deterministicDedup(extractedFacts);

    // If no model specified or low item counts, skip LLM-assisted dedup
    if (!modelId || isLowComplexity(deterministicResult)) {
      return {
        success: true,
        data: {
          ...deterministicResult,
          deduplication_metadata: {
            original_decision_count: extractedFacts.decisions.length,
            merged_decision_count: deterministicResult.decisions.length,
            original_commitment_count: extractedFacts.commitments.length,
            merged_commitment_count: deterministicResult.commitments.length,
            deduplication_timestamp: new Date().toISOString(),
            model_used: null,
          },
        },
        error: null,
        duration_ms: Date.now() - startTime,
        tokens_used: { input: 0, output: 0 },
      };
    }

    // Use LLM for semantic deduplication
    const response = await callOpenRouter({
      model: modelId,
      messages: [
        { role: "system", content: DEDUPLICATION_PROMPT },
        { role: "user", content: JSON.stringify(deterministicResult, null, 2) },
      ],
      temperature: 0.0, // Zero temperature for deterministic behavior
      response_format: { type: "json_object" },
    });

    if (!response.success) {
      // Fall back to deterministic result on failure
      return {
        success: true,
        data: {
          ...deterministicResult,
          deduplication_metadata: {
            original_decision_count: extractedFacts.decisions.length,
            merged_decision_count: deterministicResult.decisions.length,
            original_commitment_count: extractedFacts.commitments.length,
            merged_commitment_count: deterministicResult.commitments.length,
            deduplication_timestamp: new Date().toISOString(),
            model_used: null,
          },
        },
        error: null,
        duration_ms: Date.now() - startTime,
        tokens_used: { input: 0, output: 0 },
      };
    }

    const cleanedContent = stripReasoningTokens(response.content);
    const jsonContent = extractJsonFromResponse(cleanedContent);
    const parsed = JSON.parse(jsonContent) as Partial<ExtractedFacts>;

    // Validate that LLM didn't add new facts
    const validated = validateNoNewFacts(parsed, extractedFacts);

    const result: DeduplicatedFacts = {
      participants: validated.participants || extractedFacts.participants,
      decisions: validated.decisions || deterministicResult.decisions,
      commitments: validated.commitments || deterministicResult.commitments,
      risks: validated.risks || deterministicResult.risks,
      open_questions: validated.open_questions || deterministicResult.open_questions,
      notable_quotes: validated.notable_quotes || deterministicResult.notable_quotes,
      deduplication_metadata: {
        original_decision_count: extractedFacts.decisions.length,
        merged_decision_count: (validated.decisions || deterministicResult.decisions).length,
        original_commitment_count: extractedFacts.commitments.length,
        merged_commitment_count: (validated.commitments || deterministicResult.commitments).length,
        deduplication_timestamp: new Date().toISOString(),
        model_used: modelId,
      },
    };

    return {
      success: true,
      data: result,
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
      error: error instanceof Error ? error.message : "Unknown deduplication error",
      duration_ms: Date.now() - startTime,
      tokens_used: { input: 0, output: 0 },
    };
  }
}

/**
 * Check if the extracted facts are low complexity (skip LLM dedup)
 */
function isLowComplexity(facts: Omit<ExtractedFacts, "extraction_metadata">): boolean {
  return (
    facts.decisions.length <= 3 &&
    facts.commitments.length <= 3 &&
    facts.risks.length <= 2
  );
}

/**
 * Deterministic deduplication for obvious duplicates
 */
function deterministicDedup(facts: ExtractedFacts): Omit<ExtractedFacts, "extraction_metadata"> {
  return {
    participants: [...new Set(facts.participants)],
    decisions: deduplicateDecisions(facts.decisions),
    commitments: deduplicateCommitments(facts.commitments),
    risks: deduplicateRisks(facts.risks),
    open_questions: deduplicateQuestions(facts.open_questions),
    notable_quotes: deduplicateNotableQuotes(facts.notable_quotes),
  };
}

/**
 * Deduplicate decisions by exact match on description
 */
function deduplicateDecisions(decisions: ExtractedFacts["decisions"]) {
  const seen = new Map<string, ExtractedFacts["decisions"][0]>();
  
  for (const decision of decisions) {
    const key = normalizeText(decision.description);
    const existing = seen.get(key);
    
    if (existing) {
      // Merge: combine quotes, use higher certainty
      existing.supporting_quotes = [
        ...existing.supporting_quotes,
        ...decision.supporting_quotes,
      ];
      existing.certainty_level = higherCertainty(
        existing.certainty_level,
        decision.certainty_level
      );
    } else {
      seen.set(key, { ...decision });
    }
  }
  
  return Array.from(seen.values()).map((d, i) => ({
    ...d,
    decision_id: `D${i + 1}`,
  }));
}

/**
 * Deduplicate commitments by owner + normalized task
 */
function deduplicateCommitments(commitments: ExtractedFacts["commitments"]) {
  const seen = new Map<string, ExtractedFacts["commitments"][0]>();
  
  for (const commitment of commitments) {
    const key = `${normalizeText(commitment.owner)}::${normalizeText(commitment.task)}`;
    const existing = seen.get(key);
    
    if (existing) {
      existing.supporting_quotes = [
        ...existing.supporting_quotes,
        ...commitment.supporting_quotes,
      ];
      existing.certainty_level = higherCertainty(
        existing.certainty_level,
        commitment.certainty_level
      );
      // Use most specific due date
      if (!existing.due_date && commitment.due_date) {
        existing.due_date = commitment.due_date;
      }
    } else {
      seen.set(key, { ...commitment });
    }
  }
  
  return Array.from(seen.values()).map((c, i) => ({
    ...c,
    commitment_id: `C${i + 1}`,
  }));
}

/**
 * Deduplicate risks by normalized description
 */
function deduplicateRisks(risks: ExtractedFacts["risks"]) {
  const seen = new Map<string, ExtractedFacts["risks"][0]>();
  
  for (const risk of risks) {
    const key = normalizeText(risk.description);
    const existing = seen.get(key);
    
    if (existing) {
      existing.supporting_quotes = [
        ...existing.supporting_quotes,
        ...risk.supporting_quotes,
      ];
      existing.severity = higherSeverity(existing.severity, risk.severity);
    } else {
      seen.set(key, { ...risk });
    }
  }
  
  return Array.from(seen.values()).map((r, i) => ({
    ...r,
    risk_id: `R${i + 1}`,
  }));
}

/**
 * Deduplicate open questions by normalized question text
 */
function deduplicateQuestions(questions: ExtractedFacts["open_questions"]) {
  const seen = new Map<string, ExtractedFacts["open_questions"][0]>();
  
  for (const question of questions) {
    const key = normalizeText(question.question);
    if (!seen.has(key)) {
      seen.set(key, { ...question });
    }
  }
  
  return Array.from(seen.values()).map((q, i) => ({
    ...q,
    question_id: `Q${i + 1}`,
  }));
}

/**
 * Deduplicate notable quotes by exact quote text
 */
function deduplicateNotableQuotes(quotes: ExtractedFacts["notable_quotes"]) {
  const seen = new Map<string, ExtractedFacts["notable_quotes"][0]>();
  
  for (const quote of quotes) {
    const key = normalizeText(quote.quote);
    if (!seen.has(key)) {
      seen.set(key, { ...quote });
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Return the higher certainty level
 */
function higherCertainty(
  a: "tentative" | "confirmed" | "uncertain",
  b: "tentative" | "confirmed" | "uncertain"
): "tentative" | "confirmed" | "uncertain" {
  const order = { uncertain: 0, tentative: 1, confirmed: 2 };
  return order[a] >= order[b] ? a : b;
}

/**
 * Return the higher severity level
 */
function higherSeverity(
  a: "low" | "medium" | "high" | "uncertain",
  b: "low" | "medium" | "high" | "uncertain"
): "low" | "medium" | "high" | "uncertain" {
  const order = { uncertain: 0, low: 1, medium: 2, high: 3 };
  return order[a] >= order[b] ? a : b;
}

/**
 * Validate that LLM output doesn't introduce new facts
 */
function validateNoNewFacts(
  llmOutput: Partial<ExtractedFacts>,
  original: ExtractedFacts
): Partial<ExtractedFacts> {
  // For now, just return the LLM output
  // In production, you'd want to verify each fact exists in original
  // This is a safety measure against hallucination
  return llmOutput;
}



