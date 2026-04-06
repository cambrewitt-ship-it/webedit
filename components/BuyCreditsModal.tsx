"use client";

import { useState } from "react";
import { X, Zap, Loader2 } from "lucide-react";
import { CREDIT_PACKS } from "@/config/packs";

interface BuyCreditsModalProps {
  clientId: string;
  password: string;
  usedTokens?: number;
  budgetTokens?: number;
  onClose: () => void;
}

export default function BuyCreditsModal({
  clientId,
  password,
  usedTokens,
  budgetTokens,
  onClose,
}: BuyCreditsModalProps) {
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(packId: string) {
    setLoadingPackId(packId);
    setError(null);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, password, packId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to create checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoadingPackId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">

        {/* Header */}
        <div className="px-7 py-6" style={{ background: "#113D79" }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-yellow-300" />
            <span className="text-sm font-semibold text-yellow-300">Token limit reached</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Top up your tokens</h2>
          {usedTokens !== undefined && budgetTokens !== undefined && (
            <p className="text-sm text-white/60">
              You&apos;ve used {usedTokens.toLocaleString()} of your {budgetTokens.toLocaleString()} included tokens
            </p>
          )}
        </div>

        {/* Packs */}
        <div className="px-7 py-6 space-y-3">
          {CREDIT_PACKS.map((pack) => {
            const isLoading = loadingPackId === pack.id;
            return (
              <div
                key={pack.id}
                className={`relative rounded-xl border-2 p-4 flex items-center justify-between gap-4 ${
                  pack.popular ? "border-[#113D79]" : "border-gray-200"
                }`}
              >
                {pack.popular && (
                  <span
                    className="absolute -top-2.5 left-4 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ background: "#113D79" }}
                  >
                    Most popular
                  </span>
                )}
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{pack.label}</p>
                  <p className="text-lg font-bold mt-0.5" style={{ color: "#113D79" }}>
                    {pack.tokens.toLocaleString()}{" "}
                    <span className="text-sm font-normal text-gray-400">tokens</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{pack.note}</p>
                </div>
                <button
                  onClick={() => handleBuy(pack.id)}
                  disabled={!!loadingPackId}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                  style={{ background: "#113D79" }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Loading…</span>
                    </>
                  ) : (
                    `NZ$${pack.priceNzd} →`
                  )}
                </button>
              </div>
            );
          })}

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <p className="text-xs text-gray-400 text-center pt-1">
            Secure payment via Stripe. Tokens are added to your account instantly after payment.
          </p>
        </div>
      </div>
    </div>
  );
}
