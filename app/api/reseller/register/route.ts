import { NextRequest, NextResponse } from "next/server";
import { Reseller, slugify, hashPassword, generateTempPassword } from "@/config/resellers";
import { readOrInitJsonFile, writeJsonFile, createJsonFile, APP_GITHUB_REPO } from "@/lib/github";

const RESELLERS_FILE = "data/resellers.json";

// POST /api/reseller/register — public self-registration (creates pending reseller)
export async function POST(request: NextRequest) {
  if (!APP_GITHUB_REPO) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const body = await request.json();
  const { name, businessName, email, website, message } = body as {
    name?: string;
    businessName?: string;
    email?: string;
    website?: string;
    message?: string;
  };

  if (!name || !businessName || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const emailLower = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const resellersFile = await readOrInitJsonFile<Reseller[]>(RESELLERS_FILE);

  if (resellersFile.data.find((r) => r.email.toLowerCase() === emailLower)) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const baseId = slugify(businessName);
  let id = baseId;
  let suffix = 2;
  while (resellersFile.data.find((r) => r.id === id)) {
    id = `${baseId}-${suffix++}`;
  }

  // Generate a temp password — admin will share this when they approve the application
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const newReseller: Reseller = {
    id,
    name: name.trim(),
    businessName: businessName.trim(),
    email: emailLower,
    password: passwordHash,
    brandName: businessName.trim(),
    status: "pending",
    clients: [],
    createdAt: new Date().toISOString(),
    ...(website ? { website } : {}),
    ...(message ? { notes: message } : {}),
  } as Reseller & { website?: string; notes?: string };

  const updated = [...resellersFile.data, newReseller];
  const putRes = resellersFile.sha
    ? await writeJsonFile(RESELLERS_FILE, updated, resellersFile.sha, `New partner application: ${businessName}`)
    : await createJsonFile(RESELLERS_FILE, updated, `New partner application: ${businessName}`);
  if (!putRes.ok) return NextResponse.json({ error: "Failed to save application" }, { status: 500 });

  return NextResponse.json({ success: true });
}
