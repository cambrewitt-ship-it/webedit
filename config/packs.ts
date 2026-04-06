export interface CreditPack {
  id: string;
  label: string;
  tokens: number;       // Displayed to users
  priceNzd: number;     // NZD charged to user
  dollarBudget: number; // USD API budget unlocked
  note: string;
  popular?: boolean;
}

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
