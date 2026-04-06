import { NextRequest, NextResponse } from "next/server";
import { getClient, validatePassword } from "@/config/clients";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, password, filename, html } = body;

    if (!validatePassword(clientId, password)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

    const { githubRepo, githubBranch } = client;
    const apiBase = `https://api.github.com/repos/${githubRepo}`;
    const headers = {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    async function ghFetch(path: string, options?: RequestInit) {
      const res = await fetch(`${apiBase}${path}`, { ...options, headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API error ${res.status} on ${path}: ${text.slice(0, 300)}`);
      }
      return res.json();
    }

    // 1. Get current branch tip commit SHA
    const refData = await ghFetch(`/git/ref/heads/${githubBranch}`);
    const currentCommitSha: string = refData.object.sha;

    // 2. Get the tree SHA from that commit
    const commitData = await ghFetch(`/git/commits/${currentCommitSha}`);
    const baseTreeSha: string = commitData.tree.sha;

    // 3. Create a blob with the new file content
    const blobData = await ghFetch(`/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: html, encoding: "utf-8" }),
    });
    const blobSha: string = blobData.sha;

    // 4. Create a new tree pointing to the new blob
    const treeData = await ghFetch(`/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [{ path: filename, mode: "100644", type: "blob", sha: blobSha }],
      }),
    });
    const newTreeSha: string = treeData.sha;

    // 5. Create a commit
    const timestamp = new Date().toISOString();
    const newCommit = await ghFetch(`/git/commits`, {
      method: "POST",
      body: JSON.stringify({
        message: `Website update via 113 WebEdit - ${timestamp}`,
        tree: newTreeSha,
        parents: [currentCommitSha],
      }),
    });
    const newCommitSha: string = newCommit.sha;

    // 6. Advance the branch ref
    await ghFetch(`/git/refs/heads/${githubBranch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: newCommitSha }),
    });

    return NextResponse.json({
      success: true,
      commitSha: newCommitSha,
      commitUrl: `https://github.com/${githubRepo}/commit/${newCommitSha}`,
    });
  } catch (error) {
    console.error("Push API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
