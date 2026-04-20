import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { readJsonFile, readOrInitJsonFile, writeJsonFile, APP_GITHUB_REPO } from "@/lib/github";
import { Client, hashPassword } from "@/config/clients";
import { Reseller, generateTempPassword, slugify } from "@/config/resellers";
import { UsageEntry } from "@/app/api/admin/route";

const CLIENTS_FILE = "data/clients.json";
const RESELLERS_FILE = "data/resellers.json";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function requireReseller(): Promise<string | null> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  return session.resellerId ?? null;
}

// GET /api/reseller/clients — list this reseller's clients + usage
export async function GET() {
  const resellerId = await requireReseller();
  if (!resellerId) return unauthorized();

  const resellersFile = await readOrInitJsonFile<Reseller[]>(RESELLERS_FILE);

  const reseller = resellersFile.data.find((r) => r.id === resellerId);
  if (!reseller) return unauthorized();

  const clientsFile = await readJsonFile<Client[]>(CLIENTS_FILE);
  const allClients: Client[] = clientsFile?.data ?? [];

  const myClients = allClients
    .filter((c) => reseller.clients.includes(c.id))
    .map(({ password: _pw, ...c }) => c);

  const usageFile = await readJsonFile<UsageEntry[]>("data/usage.json");
  const usage = usageFile?.data ?? [];
  const myUsage = usage.filter((u) => reseller.clients.includes(u.clientId));

  return NextResponse.json({ clients: myClients, usage: myUsage, reseller: { ...reseller, password: undefined } });
}

// POST /api/reseller/clients — create a client for this reseller
export async function POST(request: NextRequest) {
  const resellerId = await requireReseller();
  if (!resellerId) return unauthorized();
  if (!APP_GITHUB_REPO) return NextResponse.json({ error: "APP_GITHUB_REPO not set" }, { status: 500 });

  const body = await request.json();
  const { name, domain, email, githubRepo, githubBranch, pages } = body as Partial<Client>;

  if (!name || !domain || !githubRepo || !pages?.length) {
    return NextResponse.json({ error: "Missing required fields: name, domain, githubRepo, pages" }, { status: 400 });
  }

  // Read both files
  const [clientsFile, resellersFile] = await Promise.all([
    readJsonFile<Client[]>(CLIENTS_FILE),
    readOrInitJsonFile<Reseller[]>(RESELLERS_FILE),
  ]);
  if (!clientsFile) return NextResponse.json({ error: "Could not read clients.json" }, { status: 500 });

  const reseller = resellersFile.data.find((r) => r.id === resellerId);
  if (!reseller) return unauthorized();

  const id = slugify(name);
  if (clientsFile.data.find((c) => c.id === id)) {
    return NextResponse.json({ error: `Client id "${id}" already exists` }, { status: 409 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const newClient: Client = {
    id,
    name,
    domain,
    ...(email ? { email } : {}),
    password: passwordHash,
    githubRepo,
    githubBranch: githubBranch ?? "main",
    pages: pages!,
    dollarBudget: 15.0,
    resellerId,
    resellerBrandName: reseller.brandName,
    ...(reseller.brandLogo ? { resellerBrandLogo: reseller.brandLogo } : {}),
  };

  const updatedClients = [...clientsFile.data, newClient];
  const putClients = await writeJsonFile(CLIENTS_FILE, updatedClients, clientsFile.sha, `Add reseller client: ${name}`);
  if (!putClients.ok) {
    return NextResponse.json({ error: "Failed to write clients.json" }, { status: 500 });
  }

  // Add clientId to reseller's client list
  const updatedResellers = resellersFile.data.map((r) =>
    r.id === resellerId ? { ...r, clients: [...r.clients, id] } : r
  );
  // Need fresh SHA after first write — re-read
  const resellersFile2 = await readJsonFile<Reseller[]>(RESELLERS_FILE);
  if (resellersFile2) {
    await writeJsonFile(RESELLERS_FILE, updatedResellers, resellersFile2.sha, `Add client ${id} to reseller: ${resellerId}`);
  }

  const { password: _pw, ...clientSafe } = newClient;
  return NextResponse.json({ success: true, client: { ...clientSafe, password: tempPassword } });
}

// PATCH /api/reseller/clients — reset a client's password
export async function PATCH(request: NextRequest) {
  const resellerId = await requireReseller();
  if (!resellerId) return unauthorized();
  if (!APP_GITHUB_REPO) return NextResponse.json({ error: "APP_GITHUB_REPO not set" }, { status: 500 });

  const { clientId } = await request.json();
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  // Verify this client belongs to the reseller
  const resellersFile = await readOrInitJsonFile<Reseller[]>(RESELLERS_FILE);
  const reseller = resellersFile.data.find((r) => r.id === resellerId);
  if (!reseller || !reseller.clients.includes(clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const newHash = await hashPassword(tempPassword);

  const clientsFile = await readJsonFile<Client[]>(CLIENTS_FILE);
  if (!clientsFile) return NextResponse.json({ error: "Could not read clients.json" }, { status: 500 });

  const idx = clientsFile.data.findIndex((c) => c.id === clientId);
  if (idx === -1) return NextResponse.json({ error: "Client not found in clients.json" }, { status: 404 });

  const updated = clientsFile.data.map((c) => c.id === clientId ? { ...c, password: newHash } : c);
  const putRes = await writeJsonFile(CLIENTS_FILE, updated, clientsFile.sha, `Reset password for client: ${clientId}`);
  if (!putRes.ok) return NextResponse.json({ error: "Failed to write clients.json" }, { status: 500 });

  return NextResponse.json({ success: true, password: tempPassword });
}

// DELETE /api/reseller/clients — remove a client from this reseller
export async function DELETE(request: NextRequest) {
  const resellerId = await requireReseller();
  if (!resellerId) return unauthorized();
  if (!APP_GITHUB_REPO) return NextResponse.json({ error: "APP_GITHUB_REPO not set" }, { status: 500 });

  const { clientId } = await request.json();
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  const [clientsFile, resellersFile] = await Promise.all([
    readJsonFile<Client[]>(CLIENTS_FILE),
    readOrInitJsonFile<Reseller[]>(RESELLERS_FILE),
  ]);
  if (!clientsFile) return NextResponse.json({ error: "Could not read data files" }, { status: 500 });

  const reseller = resellersFile.data.find((r) => r.id === resellerId);
  if (!reseller || !reseller.clients.includes(clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const updatedClients = clientsFile.data.filter((c) => c.id !== clientId);
  const putClients = await writeJsonFile(CLIENTS_FILE, updatedClients, clientsFile.sha, `Remove client: ${clientId}`);
  if (!putClients.ok) return NextResponse.json({ error: "Failed to write clients.json" }, { status: 500 });

  const updatedResellers = resellersFile.data.map((r) =>
    r.id === resellerId ? { ...r, clients: r.clients.filter((c) => c !== clientId) } : r
  );
  const resellersFile2 = await readOrInitJsonFile<Reseller[]>(RESELLERS_FILE);
  if (resellersFile2.sha) {
    await writeJsonFile(RESELLERS_FILE, updatedResellers, resellersFile2.sha, `Remove client ${clientId} from reseller: ${resellerId}`);
  }

  return NextResponse.json({ success: true });
}
