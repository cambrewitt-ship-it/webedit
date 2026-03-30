import { NextRequest, NextResponse } from "next/server";
import { validatePassword } from "@/config/clients";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clientId, password } = body;

  if (validatePassword(clientId, password)) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
