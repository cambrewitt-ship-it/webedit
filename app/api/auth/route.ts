import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getClient } from "@/config/clients";
import { validatePassword } from "@/config/clients";
import { sessionOptions, SessionData } from "@/lib/session";
import { checkRateLimit, recordFailure, clearFailures } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();

  const rate = checkRateLimit(`auth:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSec) },
    });
  }

  const { clientId, password } = await request.json();

  const client = getClient(clientId);
  const valid = client ? await validatePassword(clientId, password ?? "") : false;

  if (!valid) {
    recordFailure(`auth:${ip}`);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  clearFailures(`auth:${ip}`);

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.clientId = clientId;
  await session.save();

  return NextResponse.json({ ok: true });
}
