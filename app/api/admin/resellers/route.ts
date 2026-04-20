import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { readOrInitJsonFile, readJsonFile, writeJsonFile, createJsonFile, APP_GITHUB_REPO } from "@/lib/github";
import { Reseller, hashPassword, generateTempPassword, slugify } from "@/config/resellers";

const RESELLERS_FILE = "data/resellers.json";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function requireAdmin() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  return session.admin === true;
}

// GET /api/admin/resellers — list all resellers
export async function GET() {
  if (!await requireAdmin()) return unauthorized();

  const resellersFile = await readOrInitJsonFile<Reseller[]>(RESELLERS_FILE);
  const sanitized = resellersFile.data.map(({ password: _pw, ...r }) => r);
  return NextResponse.json({ resellers: sanitized });
}

// POST /api/admin/resellers — create a reseller (admin-side)
export async function POST(request: NextRequest) {
  if (!await requireAdmin()) return unauthorized();
  if (!APP_GITHUB_REPO) return NextResponse.json({ error: "APP_GITHUB_REPO not set" }, { status: 500 });

  const body = await request.json();
  const { name, businessName, email, brandName, brandLogo } = body as {
    name?: string; businessName?: string; email?: string; brandName?: string; brandLogo?: string;
  };

  if (!name || !businessName || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const resellersFile = await readOrInitJsonFile<Reseller[]>(RESELLERS_FILE);

  const emailLower = email.toLowerCase().trim();
  if (resellersFile.data.find((r) => r.email.toLowerCase() === emailLower)) {
    return NextResponse.json({ error: "A reseller with this email already exists" }, { status: 409 });
  }

  const baseId = slugify(businessName);
  let id = baseId;
  let suffix = 2;
  while (resellersFile.data.find((r) => r.id === id)) {
    id = `${baseId}-${suffix++}`;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const newReseller: Reseller = {
    id,
    name: name.trim(),
    businessName: businessName.trim(),
    email: emailLower,
    password: passwordHash,
    brandName: (brandName ?? businessName).trim(),
    ...(brandLogo ? { brandLogo } : {}),
    status: "active",
    clients: [],
    createdAt: new Date().toISOString(),
  };

  const updated = [...resellersFile.data, newReseller];
  const putRes = resellersFile.sha
    ? await writeJsonFile(RESELLERS_FILE, updated, resellersFile.sha, `Add reseller: ${businessName}`)
    : await createJsonFile(RESELLERS_FILE, updated, `Add reseller: ${businessName}`);
  if (!putRes.ok) return NextResponse.json({ error: "Failed to write resellers.json" }, { status: 500 });

  const { password: _pw, ...safe } = newReseller;
  return NextResponse.json({ success: true, reseller: { ...safe, password: tempPassword } });
}

// PATCH /api/admin/resellers — approve pending / reset password / update branding
export async function PATCH(request: NextRequest) {
  if (!await requireAdmin()) return unauthorized();
  if (!APP_GITHUB_REPO) return NextResponse.json({ error: "APP_GITHUB_REPO not set" }, { status: 500 });

  const body = await request.json();
  const { id, action, brandName, brandLogo, password: manualPassword } = body as {
    id?: string;
    action?: "approve" | "reset-password" | "update-brand";
    brandName?: string;
    brandLogo?: string;
    password?: string;
  };

  if (!id || !action) return NextResponse.json({ error: "Missing id or action" }, { status: 400 });

  const resellersFile = await readOrInitJsonFile<Reseller[]>(RESELLERS_FILE);

  const idx = resellersFile.data.findIndex((r) => r.id === id);
  if (idx === -1) return NextResponse.json({ error: "Reseller not found" }, { status: 404 });

  let tempPassword: string | undefined;
  let updated: Reseller[];

  if (action === "approve") {
    tempPassword = generateTempPassword();
    const hash = await hashPassword(tempPassword);
    updated = resellersFile.data.map((r) =>
      r.id === id ? { ...r, status: "active" as const, password: hash } : r
    );
  } else if (action === "reset-password") {
    const pw = manualPassword ?? generateTempPassword();
    tempPassword = manualPassword ? undefined : pw;
    const hash = await hashPassword(pw);
    updated = resellersFile.data.map((r) =>
      r.id === id ? { ...r, password: hash } : r
    );
  } else if (action === "update-brand") {
    updated = resellersFile.data.map((r) =>
      r.id === id
        ? { ...r, ...(brandName ? { brandName } : {}), ...(brandLogo !== undefined ? { brandLogo } : {}) }
        : r
    );
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const putRes = resellersFile.sha
    ? await writeJsonFile(RESELLERS_FILE, updated, resellersFile.sha, `Admin PATCH reseller: ${id} (${action})`)
    : await createJsonFile(RESELLERS_FILE, updated, `Admin PATCH reseller: ${id} (${action})`);
  if (!putRes.ok) return NextResponse.json({ error: "Failed to write resellers.json" }, { status: 500 });

  return NextResponse.json({ success: true, ...(tempPassword ? { password: tempPassword } : {}) });
}

// DELETE /api/admin/resellers — remove a reseller
export async function DELETE(request: NextRequest) {
  if (!await requireAdmin()) return unauthorized();
  if (!APP_GITHUB_REPO) return NextResponse.json({ error: "APP_GITHUB_REPO not set" }, { status: 500 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const resellersFile = await readOrInitJsonFile<Reseller[]>(RESELLERS_FILE);

  const filtered = resellersFile.data.filter((r) => r.id !== id);
  if (filtered.length === resellersFile.data.length) {
    return NextResponse.json({ error: "Reseller not found" }, { status: 404 });
  }

  const putRes = resellersFile.sha
    ? await writeJsonFile(RESELLERS_FILE, filtered, resellersFile.sha, `Remove reseller: ${id}`)
    : await createJsonFile(RESELLERS_FILE, filtered, `Remove reseller: ${id}`);
  if (!putRes.ok) return NextResponse.json({ error: "Failed to write resellers.json" }, { status: 500 });

  return NextResponse.json({ success: true });
}
