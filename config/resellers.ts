import bcrypt from "bcryptjs";
import resellersData from "@/data/resellers.json";

export interface Reseller {
  id: string;
  name: string;         // Contact person's name
  businessName: string; // Their agency / trading name
  email: string;        // Login email
  password: string;     // bcrypt hash
  brandName: string;    // Shown to their end-clients in the editor header
  brandLogo?: string;   // URL or base64 logo shown in editor header (optional)
  status: "pending" | "active";
  clients: string[];    // clientIds they manage
  createdAt: string;    // ISO 8601
}

export const resellers: Reseller[] = resellersData as Reseller[];

export function getReseller(id: string): Reseller | undefined {
  return resellers.find((r) => r.id === id);
}

export function getResellerByEmail(email: string): Reseller | undefined {
  return resellers.find((r) => r.email.toLowerCase() === email.toLowerCase());
}

export async function validateResellerPassword(email: string, password: string): Promise<Reseller | null> {
  const reseller = getResellerByEmail(email);
  if (!reseller) return null;
  if (reseller.status !== "active") return null;
  const valid = await bcrypt.compare(password, reseller.password);
  return valid ? reseller : null;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function generateTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  // Use Math.random for non-security-sensitive temp password display
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
