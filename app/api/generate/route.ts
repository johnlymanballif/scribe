import { NextResponse } from "next/server";
import { 
  executePipeline, 
  getTimingBreakdown,
  type PackageId, 
  type PipelineStageConfig,
  type GenerateResponse,
  type GenerateErrorResponse,
} from "@/lib/pipeline";
import { getDictionary } from "@/lib/contacts/storage";

// -----------------------------------------------------------------------------
// API Route: POST /api/generate
// -----------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    // Validate API key
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "your_api_key_here") {
      const errorResponse: GenerateErrorResponse = {
        error: "OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in .env.local",
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // Parse request body
    const body = await req.json();
    const { 
      transcript, 
      packageId = "BALANCED_PRO", 
      customConfig, 
      templatePrompt = "",
      metadata,
    } = body as {
      transcript?: string;
      packageId?: PackageId;
      customConfig?: PipelineStageConfig;
      templatePrompt?: string;
      metadata?: {
        clientName?: string;
        participants?: string[];
        meetingName?: string;
        date?: string;
      };
    };

    // Validate transcript
    if (!transcript) {
      const errorResponse: GenerateErrorResponse = {
        error: "Missing transcript",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (typeof transcript !== "string" || transcript.trim().length < 20) {
      const errorResponse: GenerateErrorResponse = {
        error: "Transcript is too short or invalid",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Soft guardrail: ~1.5MB max
    if (transcript.length > 1_500_000) {
      const errorResponse: GenerateErrorResponse = {
        error: "Transcript is too large. Split it into smaller chunks and try again.",
      };
      return NextResponse.json(errorResponse, { status: 413 });
    }

    // Validate package ID
    const validPackages: PackageId[] = ["TRUST_MAX", "BALANCED_PRO", "FAST_ELEGANT", "CUSTOM"];
    if (!validPackages.includes(packageId)) {
      const errorResponse: GenerateErrorResponse = {
        error: `Invalid package ID. Must be one of: ${validPackages.join(", ")}`,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate custom config if using CUSTOM package
    if (packageId === "CUSTOM" && !customConfig) {
      const errorResponse: GenerateErrorResponse = {
        error: "Custom configuration required when using CUSTOM package",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Fetch dictionary entries for transcription corrections
    const dictionaryEntries = await getDictionary();
    const dictionary = dictionaryEntries.map((d) => ({
      incorrect: d.incorrect,
      correct: d.correct,
    }));

    // Build enriched metadata with dictionary
    const enrichedMetadata = {
      ...metadata,
      dictionary: dictionary.length > 0 ? dictionary : undefined,
    };

    // Execute the pipeline
    const result = await executePipeline(
      transcript,
      packageId,
      templatePrompt,
      customConfig,
      {}, // pipeline options
      enrichedMetadata
    );

    // Handle pipeline failure
    if (!result.success || !result.summary) {
      const errorResponse: GenerateErrorResponse = {
        error: result.error || "Pipeline execution failed",
        stage: result.stage_results.extraction?.success === false ? "extraction" :
               result.stage_results.deduplication?.success === false ? "deduplication" :
               result.stage_results.synthesis?.success === false ? "synthesis" :
               result.stage_results.validation?.success === false ? "validation" : undefined,
      };
      return NextResponse.json(errorResponse, { status: 502 });
    }

    // Get timing breakdown
    const timing = getTimingBreakdown(result);

    // Return successful response
    const response: GenerateResponse = {
      summary: result.summary,
      confidence: result.confidence ?? 70,
      validationFlags: result.validation_flags,
      processingTime: timing,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Generate API error:", error);
    const errorResponse: GenerateErrorResponse = {
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : undefined,
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
