import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getClient } from "@/config/clients";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { filename } = body;

    // Clients can only fetch pages for their own account
    const clientId = session.clientId;
    const client = getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const { githubRepo, githubBranch } = client;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

    // Use GitHub API (works for private repos; raw.githubusercontent.com does not support token auth reliably)
    const apiUrl = `https://api.github.com/repos/${githubRepo}/contents/${filename}?ref=${githubBranch}`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3.raw",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      if (response.status === 401) detail = "GitHub token is invalid or expired. Update GITHUB_TOKEN in .env.local.";
      else if (response.status === 403) detail = "GitHub token lacks access to this repo. Check token permissions.";
      else if (response.status === 404) detail = `File not found in GitHub repo (${githubRepo}/${filename} on branch ${githubBranch}). Check repo name, branch, and filename in config/clients.ts.`;
      console.error("GitHub fetch failed:", detail, apiUrl);
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    const html = await response.text();
    return NextResponse.json({ html });
  } catch (error) {
    console.error("Fetch page error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
