import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Client } from "@/config/clients";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

const APP_GITHUB_REPO = process.env.APP_GITHUB_REPO;
const APP_GITHUB_BRANCH = process.env.APP_GITHUB_BRANCH ?? "main";
const CLIENTS_FILE = "data/clients.json";

const DEFAULT_DOLLAR_BUDGET = 15.0; // Base plan

async function ghFetch(path: string, options?: RequestInit) {
  const token = process.env.GITHUB_TOKEN;
  return fetch(`https://api.github.com/repos/${APP_GITHUB_REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options?.headers ?? {}),
    },
  });
}

async function addClientBudget(clientId: string, amount: number) {
  const res = await ghFetch(`/contents/${CLIENTS_FILE}?ref=${APP_GITHUB_BRANCH}`);
  if (!res.ok) throw new Error(`Failed to read clients.json: ${res.status}`);

  const file = await res.json();
  const clients: Client[] = JSON.parse(Buffer.from(file.content, "base64").toString("utf-8"));

  const idx = clients.findIndex((c) => c.id === clientId);
  if (idx === -1) throw new Error(`Client not found: ${clientId}`);

  // Increment their budget — start from default if not set
  const current = clients[idx].dollarBudget ?? DEFAULT_DOLLAR_BUDGET;
  clients[idx] = { ...clients[idx], dollarBudget: parseFloat((current + amount).toFixed(4)) };

  const content = Buffer.from(JSON.stringify(clients, null, 2) + "\n", "utf-8").toString("base64");
  const putRes = await ghFetch(`/contents/${CLIENTS_FILE}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Add ${amount} USD budget for client: ${clientId}`,
      content,
      sha: file.sha,
      branch: APP_GITHUB_BRANCH,
    }),
  });

  if (!putRes.ok) {
    throw new Error(`Failed to write clients.json: ${putRes.status} ${(await putRes.text()).slice(0, 200)}`);
  }
}

// Must export config to disable body parsing — Stripe needs the raw body for sig verification
export const config = { api: { bodyParser: false } };

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { clientId, dollarBudget } = session.metadata ?? {};

    if (!clientId || !dollarBudget) {
      console.error("Webhook: missing metadata on session", session.id);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    try {
      await addClientBudget(clientId, parseFloat(dollarBudget));
      console.log(`✓ Added $${dollarBudget} USD budget to client: ${clientId}`);
    } catch (err) {
      console.error("Webhook: failed to update client budget:", err);
      return NextResponse.json({ error: "Failed to update budget" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
