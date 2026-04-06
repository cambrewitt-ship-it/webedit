import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { validatePassword } from "@/config/clients";

const APP_GITHUB_REPO = process.env.APP_GITHUB_REPO;
const APP_GITHUB_BRANCH = process.env.APP_GITHUB_BRANCH ?? "main";
const USAGE_FILE = "data/usage.json";

async function recordUsage(clientId: string, model: string, inputTokens: number, outputTokens: number) {
  const token = process.env.GITHUB_TOKEN;
  if (!token || !APP_GITHUB_REPO) {
    console.warn("recordUsage: missing GITHUB_TOKEN or APP_GITHUB_REPO — skipping");
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const getRes = await fetch(
    `https://api.github.com/repos/${APP_GITHUB_REPO}/contents/${USAGE_FILE}?ref=${APP_GITHUB_BRANCH}`,
    { headers }
  );
  if (!getRes.ok) {
    console.error(`recordUsage: failed to read ${USAGE_FILE} — ${getRes.status} ${getRes.statusText}`);
    return;
  }

  const file = await getRes.json();
  const current: unknown[] = JSON.parse(Buffer.from(file.content, "base64").toString("utf-8"));

  const entry = { clientId, timestamp: new Date().toISOString(), model, inputTokens, outputTokens };
  const updated = [...current, entry];
  const content = Buffer.from(JSON.stringify(updated, null, 2) + "\n", "utf-8").toString("base64");

  const putRes = await fetch(
    `https://api.github.com/repos/${APP_GITHUB_REPO}/contents/${USAGE_FILE}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Log usage: ${clientId}`,
        content,
        sha: file.sha,
        branch: APP_GITHUB_BRANCH,
      }),
    }
  );
  if (!putRes.ok) {
    console.error(`recordUsage: failed to write ${USAGE_FILE} — ${putRes.status} ${(await putRes.text()).slice(0, 200)}`);
  }
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a friendly website editor assistant for a small NZ business owner. They describe website changes in plain English and you make surgical edits to the HTML.

CRITICAL: Your ENTIRE response must use EXACTLY this format — no text before <<<MESSAGE>>>, no text after the last block:

<<<MESSAGE>>>
your friendly 1-2 sentence confirmation here
<<<FIND>>>
the exact HTML snippet to replace (copied verbatim from the current HTML)
<<<REPLACE>>>
the new HTML snippet

Rules:
- Start your response immediately with <<<MESSAGE>>> — no preamble, no intro text
- <<<FIND>>> must be a short unique snippet copied EXACTLY from the HTML — whitespace and all
- <<<REPLACE>>> is the modified version of that snippet
- Never return the entire HTML document — only the changed portion
- If the user uploads an image, use the literal placeholder __UPLOADED_IMAGE__ as the src value. Do NOT write any base64 data. Example: <img src="__UPLOADED_IMAGE__" alt="description" class="...">
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
    const { clientId, password, currentHtml, userMessage, imageBase64, imageMediaType, selectedElementHtml, selectedElementLabel, history } = body;

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

    // Strip base64 from selected element too before sending to Claude
    const strippedElement = selectedElementHtml
      ? stripBase64Images(selectedElementHtml).stripped
      : null;

    const elementContext = strippedElement
      ? `\n\nThe user clicked on this specific element in the preview (target your change here):\n\`\`\`html\n${strippedElement}\n\`\`\`\n(Element label: ${selectedElementLabel ?? "unknown"})`
      : "";

    const imageNote = imageBase64
      ? `\n\n[An image has been uploaded. Use __UPLOADED_IMAGE__ as the src — do not write any base64 data.]`
      : "";

    userContent.push({
      type: "text",
      text: `Current HTML:\n\`\`\`html\n${strippedHtml}\n\`\`\`${elementContext}${imageNote}\n\nRequested change: ${userMessage}`,
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

    // Record usage — must be awaited so it completes before the serverless function exits
    await recordUsage(clientId, response.model, response.usage.input_tokens, response.usage.output_tokens);

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract message — primary: <<<MESSAGE>>> block; fallback: text before <<<FIND>>> or <<<HTML>>>
    let message: string;
    const messageMatch = rawText.match(/<<<MESSAGE>>>\s*([\s\S]*?)(?:<<<FIND>>>|<<<HTML>>>)/);
    if (messageMatch) {
      message = messageMatch[1].trim();
    } else {
      // Fallback: AI omitted <<<MESSAGE>>> but may have put friendly text before the structural block
      const fallbackMatch = rawText.match(/^([\s\S]*?)(?:<<<FIND>>>|<<<HTML>>>)/);
      if (!fallbackMatch) {
        console.error("Unexpected AI response format:", rawText.slice(0, 500));
        return NextResponse.json({ error: "Unexpected response format from AI. Please try again." }, { status: 500 });
      }
      message = fallbackMatch[1].trim() || "Done!";
    }

    let html: string;

    // Targeted find/replace mode (fast path)
    const findMatch = rawText.match(/<<<FIND>>>\s*([\s\S]*?)<<<REPLACE>>>/);
    const replaceMatch = rawText.match(/<<<REPLACE>>>\s*([\s\S]*?)$/);

    if (findMatch && replaceMatch) {
      const find = findMatch[1].trim();
      const replace = replaceMatch[1].trim();
      // Search and replace on the stripped HTML (Claude's FIND may reference __B64_IMG_n__ placeholders),
      // then restore base64 data into the result.
      if (!strippedHtml.includes(find)) {
        console.error("FIND snippet not found in HTML. Snippet:", find.slice(0, 200));
        return NextResponse.json({ error: "I couldn't locate that exact text in the page. Please try rephrasing your request." }, { status: 422 });
      }
      html = restoreBase64Images(strippedHtml.replace(find, replace), imageMap);
    } else {
      // Full HTML fallback mode
      const htmlMatch = rawText.match(/<<<HTML>>>\s*([\s\S]*?)$/);
      if (!htmlMatch || !htmlMatch[1].trim()) {
        return NextResponse.json({ error: "AI returned empty HTML. Please try again." }, { status: 500 });
      }
      html = restoreBase64Images(htmlMatch[1].trim(), imageMap);
    }

    // Replace image placeholder with the actual uploaded image data URL
    const finalHtml = imageBase64 && imageMediaType
      ? html.replace(/__UPLOADED_IMAGE__/g, `data:${imageMediaType};base64,${imageBase64}`)
      : html;

    return NextResponse.json({ message, html: finalHtml });
  } catch (error: unknown) {
    console.error("Edit API error:", error);

    const apiError = error as { status?: number; error?: { error?: { message?: string } }; message?: string };
    const message = apiError.error?.error?.message || apiError.message || "Internal server error";
    const status = apiError.status || (message.toLowerCase().includes("rate limit") ? 429 : 500);

    return NextResponse.json({ error: message }, { status });
  }
}
