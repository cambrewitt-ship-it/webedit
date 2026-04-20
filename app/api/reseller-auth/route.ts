import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { validateResellerPassword } from "@/config/resellers";
import { sessionOptions, SessionData } from "@/lib/session";
import { checkRateLimit, recordFailure, clearFailures } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();

  const rate = checkRateLimit(`reseller-auth:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSec) },
    });
  }

  const { email, password } = await request.json();
  const reseller = await validateResellerPassword(email ?? "", password ?? "");

  if (!reseller) {
    recordFailure(`reseller-auth:${ip}`);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  clearFailures(`reseller-auth:${ip}`);

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.resellerId = reseller.id;
  await session.save();

  return NextResponse.json({ ok: true, resellerId: reseller.id });
}
