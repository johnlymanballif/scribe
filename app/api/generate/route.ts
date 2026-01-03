import { NextResponse } from "next/server";

const SYSTEM_INSTRUCTION = `
You are an expert technical writer. Convert raw meeting transcripts into beautifully formatted Markdown documents optimized for Notion.

Formatting contract:
- Use "# " for a clear title.
- Use "## " for major sections and "### " for subsections.
- Use "- [ ]" for action items (checkboxes).
- Use "> " for key quotes (attribute speakers when possible).
- Use short paragraphs, strong hierarchy, and plenty of whitespace.
- Prefer bullet lists over long prose when summarizing.
- Do NOT wrap the output in triple backticks or \`\`\`markdown fences.
- Return only the final markdown.
`;

export async function POST(req: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "your_api_key_here") {
      return NextResponse.json(
        { error: "OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const { transcript, model, templatePrompt } = await req.json();

    if (!transcript || !model) {
      return NextResponse.json({ error: "Missing transcript or model." }, { status: 400 });
    }

    if (typeof transcript !== "string" || transcript.trim().length < 20) {
      return NextResponse.json({ error: "Transcript looks empty." }, { status: 400 });
    }

    // soft guardrail: ~1.5MB
    if (transcript.length > 1_500_000) {
      return NextResponse.json(
        { error: "Transcript is too large. Split it into smaller chunks and try again." },
        { status: 413 }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "Scribe",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION.trim() },
          {
            role: "user",
            content: `TEMPLATE INSTRUCTIONS:\n${templatePrompt || ""}\n\nTRANSCRIPT:\n${transcript}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: "OpenRouter request failed.", details: errText.slice(0, 2000) },
        { status: 502 }
      );
    }

    const data = await response.json();
    const notes = data?.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ notes });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
