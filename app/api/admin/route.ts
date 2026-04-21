import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Client, hashPassword } from "@/config/clients";
import { sessionOptions, SessionData } from "@/lib/session";

const APP_GITHUB_REPO = process.env.APP_GITHUB_REPO;
const APP_GITHUB_BRANCH = process.env.APP_GITHUB_BRANCH ?? "main";
const CLIENTS_FILE = "data/clients.json";
const USAGE_FILE = "data/usage.json";

/** Accept either "owner/repo" or a full GitHub URL and return "owner/repo" */
function normalizeGithubRepo(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function requireAdmin() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  return session.admin === true;
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

async function readJsonFile<T>(filePath: string): Promise<{ data: T; sha: string } | null> {
  const res = await ghFetch(`/contents/${filePath}?ref=${APP_GITHUB_BRANCH}`);
  if (!res.ok) return null;
  const file = await res.json();
  const data: T = JSON.parse(Buffer.from(file.content, "base64").toString("utf-8"));
  return { data, sha: file.sha };
}

async function writeJsonFile(filePath: string, data: unknown, sha: string, message: string) {
  const content = Buffer.from(JSON.stringify(data, null, 2) + "\n", "utf-8").toString("base64");
  return ghFetch(`/contents/${filePath}`, {
    method: "PUT",
    body: JSON.stringify({ message, content, sha, branch: APP_GITHUB_BRANCH }),
  });
}

// GET /api/admin — list clients + optionally usage
export async function GET() {
  if (!await requireAdmin()) return unauthorized();

  const clientsFile = await readJsonFile<Client[]>(CLIENTS_FILE);
  if (!clientsFile) {
    return NextResponse.json({ error: "Could not read clients from GitHub" }, { status: 500 });
  }

  const usageFile = await readJsonFile<UsageEntry[]>(USAGE_FILE);
  const usage = usageFile?.data ?? [];

  // Strip bcrypt hash but keep plainPassword for admin display
  const sanitized = clientsFile.data.map(({ password: _pw, ...c }) => c);
  return NextResponse.json({ clients: sanitized, usage });
}

// POST /api/admin — create a new client
export async function POST(request: NextRequest) {
  if (!await requireAdmin()) return unauthorized();
  if (!APP_GITHUB_REPO) return NextResponse.json({ error: "APP_GITHUB_REPO env var not set" }, { status: 500 });

  const body = await request.json();
  const { id, name, domain, email, password, githubRepo, githubBranch, pages } = body as Partial<Client>;

  if (!id || !name || !domain || !password || !githubRepo || !pages?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!/^[a-z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: "ID must be lowercase letters, numbers, and hyphens only" }, { status: 400 });
  }

  const clientsFile = await readJsonFile<Client[]>(CLIENTS_FILE);
  if (!clientsFile) return NextResponse.json({ error: "Could not read clients.json" }, { status: 500 });

  if (clientsFile.data.find((c) => c.id === id)) {
    return NextResponse.json({ error: `Client with id "${id}" already exists` }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const newClient: Client = {
    id, name, domain,
    ...(email ? { email } : {}),
    password: passwordHash,
    plainPassword: password,
    githubRepo: normalizeGithubRepo(githubRepo!),
    githubBranch: githubBranch ?? "main",
    pages: pages!,
  };

  const updated = [...clientsFile.data, newClient];
  const putRes = await writeJsonFile(CLIENTS_FILE, updated, clientsFile.sha, `Add client: ${name}`);
  if (!putRes.ok) {
    return NextResponse.json({ error: `GitHub write failed: ${(await putRes.text()).slice(0, 200)}` }, { status: 500 });
  }

  // Return client without the hash
  const { password: _pw, ...clientSafe } = newClient;
  return NextResponse.json({ success: true, client: { ...clientSafe, password } });
}

// PATCH /api/admin — reset a client's password
export async function PATCH(request: NextRequest) {
  if (!await requireAdmin()) return unauthorized();
  if (!APP_GITHUB_REPO) return NextResponse.json({ error: "APP_GITHUB_REPO env var not set" }, { status: 500 });

  const { id, password: newPassword } = await request.json();
  if (!id || !newPassword) return NextResponse.json({ error: "Missing id or password" }, { status: 400 });

  const clientsFile = await readJsonFile<Client[]>(CLIENTS_FILE);
  if (!clientsFile) return NextResponse.json({ error: "Could not read clients.json" }, { status: 500 });

  const idx = clientsFile.data.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const newHash = await hashPassword(newPassword);
  const updated = clientsFile.data.map((c) => c.id === id ? { ...c, password: newHash, plainPassword: newPassword } : c);
  const putRes = await writeJsonFile(CLIENTS_FILE, updated, clientsFile.sha, `Reset password for client: ${id}`);
  if (!putRes.ok) {
    return NextResponse.json({ error: `GitHub write failed: ${(await putRes.text()).slice(0, 200)}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin — remove a client
export async function DELETE(request: NextRequest) {
  if (!await requireAdmin()) return unauthorized();
  if (!APP_GITHUB_REPO) return NextResponse.json({ error: "APP_GITHUB_REPO env var not set" }, { status: 500 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const clientsFile = await readJsonFile<Client[]>(CLIENTS_FILE);
  if (!clientsFile) return NextResponse.json({ error: "Could not read clients.json" }, { status: 500 });

  const filtered = clientsFile.data.filter((c) => c.id !== id);
  if (filtered.length === clientsFile.data.length) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const putRes = await writeJsonFile(CLIENTS_FILE, filtered, clientsFile.sha, `Remove client: ${id}`);
  if (!putRes.ok) {
    return NextResponse.json({ error: `GitHub write failed: ${(await putRes.text()).slice(0, 200)}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export interface UsageEntry {
  clientId: string;
  timestamp: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}
