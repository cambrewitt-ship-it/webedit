import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { hashPassword } from "@/config/clients";
import { readJsonFile, writeJsonFile, APP_GITHUB_REPO } from "@/lib/github";
import { Client } from "@/config/clients";

const CLIENTS_FILE = "data/clients.json";

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!APP_GITHUB_REPO) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const { newPassword } = await request.json();
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const clientsFile = await readJsonFile<Client[]>(CLIENTS_FILE);
  if (!clientsFile) return NextResponse.json({ error: "Could not read clients.json" }, { status: 500 });

  const idx = clientsFile.data.findIndex((c) => c.id === session.clientId);
  if (idx === -1) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const newHash = await hashPassword(newPassword);
  const updated = clientsFile.data.map((c) =>
    c.id === session.clientId ? { ...c, password: newHash } : c
  );

  const putRes = await writeJsonFile(CLIENTS_FILE, updated, clientsFile.sha, `Client password change: ${session.clientId}`);
  if (!putRes.ok) return NextResponse.json({ error: "Failed to save new password" }, { status: 500 });

  return NextResponse.json({ success: true });
}
