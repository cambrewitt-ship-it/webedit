import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { checkRateLimit, recordFailure, clearFailures } from "@/lib/ratelimit";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

export async function POST(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();

  const rate = checkRateLimit(`admin-auth:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSec) },
    });
  }

  if (!ADMIN_EMAIL || (!ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH)) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }

  const { email, password } = await request.json();

  const emailMatch = email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const passwordMatch = ADMIN_PASSWORD_HASH
    ? await bcrypt.compare(password ?? "", ADMIN_PASSWORD_HASH)
    : password === ADMIN_PASSWORD;

  if (!emailMatch || !passwordMatch) {
    recordFailure(`admin-auth:${ip}`);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  clearFailures(`admin-auth:${ip}`);

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.admin = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
