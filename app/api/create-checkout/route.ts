import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { CREDIT_PACKS } from "@/config/packs";
import { sessionOptions, SessionData } from "@/lib/session";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientId = session.clientId;

    const { packId } = await request.json();

    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL not configured" }, { status: 500 });
    }

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "nzd",
            product_data: {
              name: `WebEdit ${pack.label}`,
              description: `${pack.tokens.toLocaleString()} AI editing tokens — ${pack.note}`,
            },
            unit_amount: pack.priceNzd * 100, // cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/edit/${clientId}?payment=success&pack=${pack.id}`,
      cancel_url: `${appUrl}/edit/${clientId}?payment=cancelled`,
      metadata: {
        clientId,
        packId: pack.id,
        dollarBudget: pack.dollarBudget.toString(),
        tokens: pack.tokens.toString(),
      },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
