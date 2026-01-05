// =============================================================================
// Model-Agnostic JSON Parser
// =============================================================================
// Robust extraction of JSON from LLM outputs regardless of model quirks

import { coerceAndParse, type ExtractionResult, type ParseResult } from "./schema";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ExtractJsonResult {
  success: boolean;
  data: ExtractionResult | null;
  rawJson: string | null;
  errors: string[];
  extractionMethod: "xml_tags" | "json_braces" | "none";
}

// -----------------------------------------------------------------------------
// Main Extraction Function
// -----------------------------------------------------------------------------

/**
 * Extract JSON from raw LLM response text
 * 
 * Strategy (in order):
 * 1. Look for <extracted_data>...</extracted_data> XML tags
 * 2. Fall back to finding JSON by matching braces
 * 3. Return detailed errors if both fail
 */
export function extractJsonFromResponse(rawText: string): ExtractJsonResult {
  const errors: string[] = [];
  
  // Step 1: Clean the input
  let cleaned = cleanRawText(rawText);
  
  // Step 2: Try XML tag extraction first (most reliable)
  const xmlResult = extractFromXmlTags(cleaned);
  if (xmlResult) {
    const parsed = parseAndValidate(xmlResult);
    if (parsed.success) {
      return {
        success: true,
        data: parsed.data,
        rawJson: xmlResult,
        errors: [],
        extractionMethod: "xml_tags",
      };
    }
    errors.push(`XML extraction found but validation failed: ${parsed.errors.map(e => `${e.field}: ${e.message}`).join("; ")}`);
  }
  
  // Step 3: Try JSON brace matching
  const braceResult = extractFromBraces(cleaned);
  if (braceResult) {
    const parsed = parseAndValidate(braceResult);
    if (parsed.success) {
      return {
        success: true,
        data: parsed.data,
        rawJson: braceResult,
        errors: [],
        extractionMethod: "json_braces",
      };
    }
    errors.push(`JSON extraction found but validation failed: ${parsed.errors.map(e => `${e.field}: ${e.message}`).join("; ")}`);
  }
  
  // Step 4: Nothing worked
  if (errors.length === 0) {
    errors.push("No valid JSON found in response. Expected <extracted_data>{...}</extracted_data> or raw JSON object.");
  }
  
  return {
    success: false,
    data: null,
    rawJson: null,
    errors,
    extractionMethod: "none",
  };
}

// -----------------------------------------------------------------------------
// Text Cleaning
// -----------------------------------------------------------------------------

/**
 * Clean raw LLM output by removing common artifacts
 */
function cleanRawText(text: string): string {
  let cleaned = text;
  
  // Remove DeepSeek R1's <think>...</think> reasoning blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  
  // Remove other reasoning tags
  cleaned = cleaned.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  cleaned = cleaned.replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, "");
  
  // Remove markdown code fences (but preserve content)
  cleaned = cleaned.replace(/```json\s*/gi, "");
  cleaned = cleaned.replace(/```\s*/gi, "");
  
  // Remove common conversational filler at the start
  const fillerPatterns = [
    /^Here(?:'s| is) the (?:extracted |structured )?(?:data|JSON|output|summary)[:\s]*/i,
    /^I(?:'ve| have) extracted the following[:\s]*/i,
    /^Based on the (?:transcript|meeting)[,\s]*/i,
    /^The following (?:is|represents)[:\s]*/i,
    /^Let me (?:extract|analyze|process)[^{]*/i,
  ];
  
  for (const pattern of fillerPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  
  return cleaned.trim();
}

// -----------------------------------------------------------------------------
// XML Tag Extraction
// -----------------------------------------------------------------------------

/**
 * Extract JSON from <extracted_data>...</extracted_data> tags
 */
function extractFromXmlTags(text: string): string | null {
  // Try multiple tag variations
  const tagPatterns = [
    /<extracted_data>\s*([\s\S]*?)\s*<\/extracted_data>/i,
    /<extraction>\s*([\s\S]*?)\s*<\/extraction>/i,
    /<data>\s*([\s\S]*?)\s*<\/data>/i,
    /<result>\s*([\s\S]*?)\s*<\/result>/i,
    /<json>\s*([\s\S]*?)\s*<\/json>/i,
  ];
  
  for (const pattern of tagPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const content = match[1].trim();
      // Verify it looks like JSON
      if (content.startsWith("{") || content.startsWith("[")) {
        return content;
      }
    }
  }
  
  return null;
}

// -----------------------------------------------------------------------------
// Brace Matching Extraction
// -----------------------------------------------------------------------------

/**
 * Extract JSON by finding matching braces
 * Finds the FIRST '{' and its matching '}' to isolate the JSON object
 */
function extractFromBraces(text: string): string | null {
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;
  
  // Find matching closing brace
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = firstBrace; i < text.length; i++) {
    const char = text[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(firstBrace, i + 1);
      }
    }
  }
  
  // If we didn't find a matching brace, try from the last '}'
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    // Validate it's parseable
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // Not valid JSON
    }
  }
  
  return null;
}

// -----------------------------------------------------------------------------
// Parse and Validate
// -----------------------------------------------------------------------------

/**
 * Parse JSON string and validate against schema
 */
function parseAndValidate(jsonString: string): ParseResult<ExtractionResult> {
  try {
    const parsed = JSON.parse(jsonString);
    return coerceAndParse(parsed);
  } catch (e) {
    return {
      success: false,
      data: null,
      errors: [{
        field: "json",
        message: `Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`,
        received: jsonString.slice(0, 100),
      }],
    };
  }
}

// -----------------------------------------------------------------------------
// Utility Exports
// -----------------------------------------------------------------------------

/**
 * Quick check if text likely contains extractable JSON
 */
export function hasExtractableContent(text: string): boolean {
  return text.includes("{") && text.includes("}");
}

/**
 * Get a preview of what was extracted (for debugging)
 */
export function getExtractionPreview(result: ExtractJsonResult): string {
  if (!result.success) {
    return `Failed (${result.extractionMethod}): ${result.errors[0]}`;
  }
  
  const data = result.data!;
  return `Extracted via ${result.extractionMethod}: ${data.decisions.length} decisions, ${data.commitments.length} commitments, ${data.risks.length} risks`;
}



