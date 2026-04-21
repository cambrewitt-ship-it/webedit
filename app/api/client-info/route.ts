import { NextRequest, NextResponse } from "next/server";
import { Client } from "@/config/clients";
import { readJsonFile } from "@/lib/github";

const CLIENTS_FILE = "data/clients.json";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }

  const clientsFile = await readJsonFile<Client[]>(CLIENTS_FILE);
  if (!clientsFile) {
    return NextResponse.json({ error: "Could not read clients" }, { status: 500 });
  }

  const client = clientsFile.data.find((c) => c.id === clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { password: _pw, plainPassword: _plain, ...safe } = client;
  return NextResponse.json(safe);
}
