export interface CreditPack {
  id: string;
  label: string;
  tokens: number;       // Displayed to users
  priceNzd: number;     // NZD charged to user
  dollarBudget: number; // USD API budget unlocked
  note: string;
  popular?: boolean;
}

// Retail packs — sold directly to end-clients
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    label: "Starter Pack",
    tokens: 200_000,
    priceNzd: 25,
    dollarBudget: 1.50,
    note: "~33 typical edits",
  },
  {
    id: "standard",
    label: "Standard Pack",
    tokens: 600_000,
    priceNzd: 49,
    dollarBudget: 4.50,
    note: "~100 typical edits",
    popular: true,
  },
  {
    id: "pro",
    label: "Pro Pack",
    tokens: 1_200_000,
    priceNzd: 79,
    dollarBudget: 9.00,
    note: "~200 typical edits",
  },
];

// Wholesale packs — sold to resellers at ~30% discount, they mark up to their clients
export const WHOLESALE_PACKS: CreditPack[] = [
  {
    id: "ws-starter",
    label: "Starter",
    tokens: 200_000,
    priceNzd: 17,
    dollarBudget: 1.50,
    note: "~33 typical edits",
  },
  {
    id: "ws-standard",
    label: "Standard",
    tokens: 600_000,
    priceNzd: 34,
    dollarBudget: 4.50,
    note: "~100 typical edits",
    popular: true,
  },
  {
    id: "ws-pro",
    label: "Pro",
    tokens: 1_200_000,
    priceNzd: 55,
    dollarBudget: 9.00,
    note: "~200 typical edits",
  },
];
