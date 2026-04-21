import bcrypt from "bcryptjs";
import clientsData from "@/data/clients.json";

export interface Page {
  label: string;
  filename: string;
}

export interface Client {
  id: string;
  name: string;
  domain: string;
  email?: string;
  password: string;
  plainPassword?: string;
  githubRepo: string;
  githubBranch: string;
  pages: Page[];
  /** API dollar budget — defaults to $15.00 (base plan) if not set */
  dollarBudget?: number;
  /** Set when this client is managed by a reseller partner */
  resellerId?: string;
  /** Reseller's brand name — shown in editor header instead of "WebEdit" */
  resellerBrandName?: string;
  /** Reseller's brand logo URL — shown in editor header (optional) */
  resellerBrandLogo?: string;
}

export const clients: Client[] = clientsData as Client[];

export function getClient(id: string): Client | undefined {
  return clients.find((c) => c.id === id);
}

export async function validatePassword(clientId: string, password: string): Promise<boolean> {
  const client = getClient(clientId);
  if (!client) return false;
  return bcrypt.compare(password, client.password);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
