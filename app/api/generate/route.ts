import {
  executePipelineStreaming,
  getTimingBreakdown,
  type PackageId,
  type PipelineStageConfig,
  type GenerateErrorResponse,
  type StreamEvent,
} from "@/lib/pipeline";
import { getDictionary } from "@/lib/contacts/storage";

// -----------------------------------------------------------------------------
// Route Configuration - Enable Fluid compute for longer streaming
// -----------------------------------------------------------------------------

// This enables Vercel Fluid compute which allows streaming responses
// to run for up to 60s on Hobby, 300s on Pro (vs 10s default)
export const maxDuration = 300; // seconds

// -----------------------------------------------------------------------------
// API Route: POST /api/generate (Streaming)
// -----------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    // Validate API key
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "your_api_key_here") {
      const errorResponse: GenerateErrorResponse = {
        error: "OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in .env.local",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (typeof transcript !== "string" || transcript.trim().length < 20) {
      const errorResponse: GenerateErrorResponse = {
        error: "Transcript is too short or invalid",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Soft guardrail: ~1.5MB max
    if (transcript.length > 1_500_000) {
      const errorResponse: GenerateErrorResponse = {
        error: "Transcript is too large. Split it into smaller chunks and try again.",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate package ID
    const validPackages: PackageId[] = ["TRUST_MAX", "BALANCED_PRO", "FAST_ELEGANT", "CUSTOM"];
    if (!validPackages.includes(packageId)) {
      const errorResponse: GenerateErrorResponse = {
        error: `Invalid package ID. Must be one of: ${validPackages.join(", ")}`,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate custom config if using CUSTOM package
    if (packageId === "CUSTOM" && !customConfig) {
      const errorResponse: GenerateErrorResponse = {
        error: "Custom configuration required when using CUSTOM package",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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

    // Create a streaming response using Server-Sent Events
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: StreamEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          // Skip validation on Hobby plan to fit within 60s timeout
          // Users can upgrade to Pro for full validation
          const pipeline = executePipelineStreaming(
            transcript,
            packageId,
            templatePrompt,
            customConfig,
            { skipValidation: true },
            enrichedMetadata
          );

          for await (const event of pipeline) {
            if (event.type === "complete") {
              // Transform the complete event to include timing breakdown
              const timing = getTimingBreakdown(event.result);
              sendEvent({
                type: "complete",
                result: {
                  ...event.result,
                  processingTime: timing,
                },
              } as StreamEvent);
            } else {
              sendEvent(event);
            }
          }
        } catch (error) {
          console.error("Pipeline streaming error:", error);
          sendEvent({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("Generate API error:", error);
    const errorResponse: GenerateErrorResponse = {
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : undefined,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
