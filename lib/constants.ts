// =============================================================================
// Application Constants
// =============================================================================

// Re-export pipeline types and utilities for backwards compatibility
export {
  MODEL_PACKAGES,
  PIPELINE_MODELS,
  calculatePipelineCost,
  getPackage,
  getStageConfig,
} from "./pipeline";

export type {
  PackageId,
  PipelineStageConfig,
  PipelineModelId,
  ModelPackage,
} from "./pipeline";

// -----------------------------------------------------------------------------
// Templates
// -----------------------------------------------------------------------------

export type TemplateConfig = {
  id: string;
  name: string;
  prompt: string;
};

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "external-client",
    name: "[External] Client Meeting",
    prompt: `You are a Senior Brand Strategist and Executive Scribe at New Apology, a design studio. Your goal is to synthesize meeting data into a "Strategic Session Document."

THE VIBE: The output should NOT read like administrative minutes. It should read like a high-level strategic review. It must be insightful, capturing the nuance of the debate, the emotional resonance of the decisions, and the specific language used by the participants.

CRUCIAL CONSTRAINTS:
1. Polished Quotes: Remove filler words (um, uh, like, you know, repeated words) and false starts. Make speakers sound articulate and clear, but strictly maintain their original intent and unique vocabulary.
2. Attribution: Always attribute quotes to the correct speaker.
3. Tone: Keep the document professional, aspirational, and smart.
4. No Fluff: Do not include housekeeping items. Focus only on strategy.

OUTPUT STRUCTURE:

# [Insert Creative Session Title Based on Content]
**[Company Name/Context]**
**Session Date:** [Date]
**Attendees:** [List Names]

## Session Overview
[2-3 sentence high-level summary of the meeting's strategic focus]

## Key Topics Covered
- [Bullet list of 5-7 main agenda items]

## Core Strategic Insights
- **The Concept:** [Identify the biggest philosophical breakthrough]
- **The Discussion:** [Explain the insight clearly]
- **Supporting Quotes:** *Name: "Quote."*
- **Why This Matters:** [Brief synthesis of why this is crucial for the brand]

## Competitive Brand Analysis
[Group by specific competitors mentioned. For each:]

### [Brand Name]
- **The Assessment:** What are they doing?
- **The Good/The Bad:** What did the team like or dislike?
- **The Lesson:** What is the takeaway for our brand?
- *Include specific quotes critiquing design, tone, or market position*

## Deep Dive: [Major Specific Topic, e.g., Gender Strategy or Naming]
- **The Debate:** [Outline internal tension or decision-making process]
- **The Decision:** [What direction are they leaning?]
- **Quotes:** [Use quotes to show emotional reasoning]

## Visual & Design Direction
- **Aesthetic Goals:** [Visual vibe: colors, photography style, typography]
- **What to Avoid:** [Specific anti-goals mentioned]

## Design Principles Emerging
[Synthesize into 5-7 Rules or Axioms the brand will live by]
1. [Principle 1]
2. [Principle 2]
...

## What's Next
- **Immediate Focus:** [Next immediate tasks]
- **Next Session:** [What is happening in the next meeting]

## Quotes to Remember
[Curated list of 4-6 most powerful, defining quotes, categorized by theme]

### On [Theme 1]
> "Quote" – Name

### On [Theme 2]
> "Quote" – Name

---
*Prepared by New Apology*`,
  },
  {
    id: "internal-client",
    name: "[Internal] Client Meeting",
    prompt: `You are a Senior Project Lead at a design studio called New Apology.
Your task is to process meeting data into Internal Client Feedback Notes for the New Apology team.

These notes are INTERNAL ONLY. They are not client-facing and should not be softened for diplomacy.
Your goal is to help the team clearly understand how the client reacted, what direction to take next, and what to avoid.

TONE & STYLE GUIDELINES:
- Candid & Direct: Do not sanitize feedback. Call things out plainly.
- Interpretive: Translate what the client said into what it means for the work.
- Design-Directional: Output should clearly guide design decisions.
- Evidence-Based: Use direct quotes liberally when they clarify taste, intent, emotion, or constraints.
- Signal Over Summary: Prioritize reactions, preferences, and direction shifts over chronological recap.
- Surface Ambiguity: Explicitly call out tension, hesitation, or conflicting signals.

OUTPUT STRUCTURE:

# Internal Meeting Notes — Client Feedback

## High-Level Readout
[Blunt internal assessment. Answer clearly:]
- Did the client feel confident, hesitant, conflicted, or excited?
- Did anything meaningfully change in direction?
- Are we more or less aligned than before?

[This should read like an internal debrief, not a recap.]

## Topics & Feedback
[Only substantive topics where meaningful feedback, reaction, or direction emerged]

### Topic: [Clear, Descriptive Title]

**What the client responded to**
- What clearly landed
- Why it landed (emotion, familiarity, alignment with their mental model)

**What the client pushed back on**
- What felt off, wrong, risky, or uncomfortable
- Any visible hesitation or resistance

**Interpretation**
- What this means for the work
- What the client is implicitly asking for
- How this should affect our design decisions

**Representative Quotes**
> "Quote that captures how the client actually feels." – Name

> "Another quote if it reveals intent, constraint, or preference." – Name

## Design Direction (Actionable)
[A designer who was not in the meeting should be able to open Figma and act confidently.]

### Lean Into
- Directions that clearly resonated
- Styles, concepts, or approaches the client reacted positively to
- Include quotes inline where helpful

### Avoid
- Directions the client reacted negatively to
- Ideas that felt confusing, risky, or misaligned

### Refine / Explore
- Directions that intrigued the client but need iteration
- Areas where interest exists without conviction

## Tensions & Ambiguities
[Call out anything that was:]
- Contradictory
- Vague
- Emotionally charged but unresolved

[Name uncertainty clearly instead of smoothing it over.]

## Risks & Watchouts
[Be direct. Examples:]
- Misalignment between stated goals and reactions
- Scope pressure
- Timeline anxiety
- Decision-making friction

## Opportunities
[Where did the client show:]
- Strong enthusiasm?
- Curiosity?
- Openness to deeper thinking or expansion?

## Open Questions for Next Touchpoint
- Questions we need to ask explicitly
- Feedback we need to validate
- Decisions that are forming but not ready

## Internal Notes
[Any additional nuance, observation, or context that would help the team. Intentionally freeform and candid.]

---
*Quality Bar: A designer should be able to read this once and know what the client liked, what they didn't like, and what to do differently next.*`,
  },
  {
    id: "technical",
    name: "Engineering Sync",
    prompt:
      "Focus on technical blockers, architecture decisions, and status updates. Extract concrete next steps with owners. Use code-style formatting for technical terms.",
  },
];

// -----------------------------------------------------------------------------
// Loading Phrases (for pipeline status)
// -----------------------------------------------------------------------------

export const LOADING_PHRASES = [
  "Extracting facts from transcript...",
  "Consolidating duplicates...",
  "Writing summary...",
  "Validating claims...",
];

// -----------------------------------------------------------------------------
// Legacy Model Config (for reference)
// -----------------------------------------------------------------------------

export type ModelConfig = {
  id: string;
  name: string;
  provider: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  description: string;
  contextTokens?: number;
};

// Legacy MODELS array - kept for backwards compatibility
// New code should use PIPELINE_MODELS from ./pipeline
export const MODELS: ModelConfig[] = [
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    description: "Nuanced writing + strong structure. Excellent meeting notes.",
    contextTokens: 200_000,
  },
  {
    id: "anthropic/claude-haiku-4",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.0,
    description: "Fast and affordable with strong instruction-following.",
    contextTokens: 200_000,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    inputCostPer1M: 0.55,
    outputCostPer1M: 2.19,
    description: "Strong reasoning model. Great for extraction and validation.",
    contextTokens: 64_000,
  },
  {
    id: "moonshotai/kimi-k2",
    name: "Kimi K2",
    provider: "MoonshotAI",
    inputCostPer1M: 0.6,
    outputCostPer1M: 2.5,
    description: "Fast and capable. Good value for synthesis.",
    contextTokens: 131_072,
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    description: "Very fast with massive context. Great for long meetings.",
    contextTokens: 1_048_576,
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
];

/**
 * Calculate cost for a single model (legacy function)
 * New code should use calculatePipelineCost from ./pipeline
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
