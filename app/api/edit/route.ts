import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { validatePassword } from "@/config/clients";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a friendly website editor assistant for a small NZ business owner. They describe website changes in plain English and you make surgical edits to the HTML.

CRITICAL: Respond using EXACTLY this format and nothing else:

<<<MESSAGE>>>
your friendly 1-2 sentence confirmation here
<<<FIND>>>
the exact HTML snippet to replace (copied verbatim from the current HTML)
<<<REPLACE>>>
the new HTML snippet

Rules:
- <<<FIND>>> must be a short unique snippet copied EXACTLY from the HTML — whitespace and all
- <<<REPLACE>>> is the modified version of that snippet
- Never return the entire HTML document — only the changed portion
- If the user uploads an image, embed it as a base64 src inside <<<REPLACE>>>
- Your message must be simple, warm, and non-technical — like texting a friend
- Make exactly the change requested, keep everything else identical
- If you truly cannot express the change as a single find/replace (e.g. changes across many disconnected sections), use <<<HTML>>> instead of <<<FIND>>><<<REPLACE>>> and return the full modified HTML`;

// Strip base64 data URIs from HTML, replacing with short placeholders.
// Returns the stripped HTML and a map to restore them afterwards.
function stripBase64Images(html: string): { stripped: string; map: Record<string, string> } {
  const map: Record<string, string> = {};
  let idx = 0;
  const stripped = html.replace(/data:[^"';]+;base64,[A-Za-z0-9+/=]+/g, (match) => {
    const placeholder = `__B64_IMG_${idx++}__`;
    map[placeholder] = match;
    return placeholder;
  });
  return { stripped, map };
}

// Restore placeholders back to original base64 data URIs.
function restoreBase64Images(html: string, map: Record<string, string>): string {
  return html.replace(/__B64_IMG_\d+__/g, (placeholder) => map[placeholder] ?? placeholder);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, password, currentHtml, userMessage, imageBase64, imageMediaType, history } = body;

    if (!validatePassword(clientId, password)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!currentHtml || !userMessage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Strip embedded base64 images before sending to Claude to avoid token limits
    const { stripped: strippedHtml, map: imageMap } = stripBase64Images(currentHtml);

    // Build message history (text-only, no large blobs)
    const messages: Anthropic.MessageParam[] = [];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role,
          content: typeof msg.content === "string" ? msg.content : msg.content,
        });
      }
    }

    // Build the current user message content
    const userContent: Anthropic.ContentBlockParam[] = [];

    if (imageBase64 && imageMediaType) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: imageMediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: imageBase64,
        },
      });
    }

    userContent.push({
      type: "text",
      text: `Current HTML:\n\`\`\`html\n${strippedHtml}\n\`\`\`\n\nRequested change: ${userMessage}`,
    });

    messages.push({
      role: "user",
      content: userContent,
    });

    // Keep last 6 history entries + current message to stay within limits
    const trimmedHistory = messages.slice(-7);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8096,
      system: SYSTEM_PROMPT,
      messages: trimmedHistory,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract message (always present)
    const messageMatch = rawText.match(/<<<MESSAGE>>>\s*([\s\S]*?)(?:<<<FIND>>>|<<<HTML>>>)/);
    if (!messageMatch) {
      console.error("Unexpected AI response format:", rawText.slice(0, 500));
      return NextResponse.json({ error: "Unexpected response format from AI. Please try again." }, { status: 500 });
    }
    const message = messageMatch[1].trim();

    let html: string;

    // Targeted find/replace mode (fast path)
    const findMatch = rawText.match(/<<<FIND>>>\s*([\s\S]*?)<<<REPLACE>>>/);
    const replaceMatch = rawText.match(/<<<REPLACE>>>\s*([\s\S]*?)$/);

    if (findMatch && replaceMatch) {
      const find = findMatch[1].trim();
      const replace = replaceMatch[1].trim();
      const restoredHtml = restoreBase64Images(strippedHtml, imageMap);
      if (!restoredHtml.includes(find)) {
        // Find text not found — fall back to asking for full HTML would require another round-trip,
        // so instead return an error with context so the user can retry
        console.error("FIND snippet not found in HTML. Snippet:", find.slice(0, 200));
        return NextResponse.json({ error: "I couldn't locate that exact text in the page. Please try rephrasing your request." }, { status: 422 });
      }
      html = restoredHtml.replace(find, replace);
    } else {
      // Full HTML fallback mode
      const htmlMatch = rawText.match(/<<<HTML>>>\s*([\s\S]*?)$/);
      if (!htmlMatch || !htmlMatch[1].trim()) {
        return NextResponse.json({ error: "AI returned empty HTML. Please try again." }, { status: 500 });
      }
      html = restoreBase64Images(htmlMatch[1].trim(), imageMap);
    }

    return NextResponse.json({ message, html });
  } catch (error: unknown) {
    console.error("Edit API error:", error);

    const apiError = error as { status?: number; error?: { error?: { message?: string } }; message?: string };
    const message = apiError.error?.error?.message || apiError.message || "Internal server error";
    const status = apiError.status || (message.toLowerCase().includes("rate limit") ? 429 : 500);

    return NextResponse.json({ error: message }, { status });
  }
}
