import { NextRequest, NextResponse } from "next/server";
import { Client } from "@/config/clients";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const APP_GITHUB_REPO = process.env.APP_GITHUB_REPO; // e.g. "cambrewitt-ship-it/oot-website"
const APP_GITHUB_BRANCH = process.env.APP_GITHUB_BRANCH ?? "main";
const CLIENTS_FILE = "data/clients.json";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function ghFetch(path: string, options?: RequestInit) {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${APP_GITHUB_REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options?.headers ?? {}),
    },
  });
  return res;
}

// GET /api/admin — list all clients (admin only)
export async function GET(request: NextRequest) {
  const pw = request.headers.get("x-admin-password");
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) return unauthorized();

  // Read clients.json from GitHub so we always get the live version
  const res = await ghFetch(`/contents/${CLIENTS_FILE}?ref=${APP_GITHUB_BRANCH}`);
  if (!res.ok) {
    return NextResponse.json({ error: "Could not read clients from GitHub" }, { status: 500 });
  }
  const data = await res.json();
  const clients: Client[] = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
  return NextResponse.json({ clients });
}

// POST /api/admin — create a new client
export async function POST(request: NextRequest) {
  const pw = request.headers.get("x-admin-password");
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) return unauthorized();

  if (!APP_GITHUB_REPO) {
    return NextResponse.json({ error: "APP_GITHUB_REPO env var not set" }, { status: 500 });
  }

  const body = await request.json();
  const { id, name, domain, password, githubRepo, githubBranch, pages } = body as Partial<Client>;

  if (!id || !name || !domain || !password || !githubRepo || !pages?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate id format
  if (!/^[a-z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: "ID must be lowercase letters, numbers, and hyphens only" }, { status: 400 });
  }

  // Read current clients.json from GitHub
  const getRes = await ghFetch(`/contents/${CLIENTS_FILE}?ref=${APP_GITHUB_BRANCH}`);
  if (!getRes.ok) {
    return NextResponse.json({ error: "Could not read current clients.json from GitHub" }, { status: 500 });
  }
  const fileData = await getRes.json();
  const sha: string = fileData.sha;
  const currentClients: Client[] = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf-8"));

  // Check for duplicate id
  if (currentClients.find((c) => c.id === id)) {
    return NextResponse.json({ error: `Client with id "${id}" already exists` }, { status: 409 });
  }

  const newClient: Client = {
    id,
    name,
    domain,
    password,
    githubRepo,
    githubBranch: githubBranch ?? "main",
    pages,
  };

  const updatedClients = [...currentClients, newClient];
  const newContent = Buffer.from(JSON.stringify(updatedClients, null, 2) + "\n", "utf-8").toString("base64");

  // Commit the updated clients.json
  const putRes = await ghFetch(`/contents/${CLIENTS_FILE}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Add client: ${name}`,
      content: newContent,
      sha,
      branch: APP_GITHUB_BRANCH,
    }),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    return NextResponse.json({ error: `GitHub write failed: ${errText.slice(0, 200)}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, client: newClient });
}

// DELETE /api/admin — remove a client by id
export async function DELETE(request: NextRequest) {
  const pw = request.headers.get("x-admin-password");
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) return unauthorized();

  if (!APP_GITHUB_REPO) {
    return NextResponse.json({ error: "APP_GITHUB_REPO env var not set" }, { status: 500 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const getRes = await ghFetch(`/contents/${CLIENTS_FILE}?ref=${APP_GITHUB_BRANCH}`);
  if (!getRes.ok) {
    return NextResponse.json({ error: "Could not read clients.json" }, { status: 500 });
  }
  const fileData = await getRes.json();
  const sha: string = fileData.sha;
  const currentClients: Client[] = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf-8"));

  const filtered = currentClients.filter((c) => c.id !== id);
  if (filtered.length === currentClients.length) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const newContent = Buffer.from(JSON.stringify(filtered, null, 2) + "\n", "utf-8").toString("base64");
  const putRes = await ghFetch(`/contents/${CLIENTS_FILE}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Remove client: ${id}`,
      content: newContent,
      sha,
      branch: APP_GITHUB_BRANCH,
    }),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    return NextResponse.json({ error: `GitHub write failed: ${errText.slice(0, 200)}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
