import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { WHOLESALE_PACKS } from "@/config/packs";
import { sessionOptions, SessionData } from "@/lib/session";
import { readOrInitJsonFile } from "@/lib/github";
import { Reseller } from "@/config/resellers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

const RESELLERS_FILE = "data/resellers.json";

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.resellerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resellerId = session.resellerId;
  const { packId, clientId } = await request.json();

  const pack = WHOLESALE_PACKS.find((p) => p.id === packId);
  if (!pack) return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  // Verify this client belongs to the reseller
  const resellersFile = await readOrInitJsonFile<Reseller[]>(RESELLERS_FILE);
  const reseller = resellersFile.data.find((r) => r.id === resellerId);
  if (!reseller || !reseller.clients.includes(clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL not configured" }, { status: 500 });

  try {
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "nzd",
            product_data: {
              name: `WebEdit Wholesale — ${pack.label}`,
              description: `${pack.tokens.toLocaleString()} editing tokens for client: ${clientId} (${pack.note})`,
            },
            unit_amount: pack.priceNzd * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/partner/dashboard?payment=success&client=${clientId}`,
      cancel_url: `${appUrl}/partner/dashboard?payment=cancelled`,
      // Reuse the same metadata shape — the existing stripe-webhook handles it
      metadata: {
        clientId,
        packId: pack.id,
        dollarBudget: pack.dollarBudget.toString(),
        tokens: pack.tokens.toString(),
        resellerId,
      },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error("Reseller checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
