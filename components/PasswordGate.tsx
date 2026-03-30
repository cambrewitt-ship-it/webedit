"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PasswordGateProps {
  clientName: string;
  onSuccess: (password: string) => void;
  externalError?: string;
}

export default function PasswordGate({ clientName, onSuccess, externalError }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Small delay to feel responsive
    await new Promise((r) => setTimeout(r, 300));

    if (!password.trim()) {
      setError("Please enter a password.");
      setLoading(false);
      return;
    }

    onSuccess(password);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#113D79]">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="text-3xl mb-1"
            style={{ fontFamily: "var(--font-dm-serif)", color: "#BAA649" }}
          >
            113 WebEdit
          </div>
          <div className="text-sm text-gray-500 font-medium">{clientName}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter your access password"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#113D79]/30 focus:border-[#113D79] transition-all"
              autoFocus
            />
          </div>

          {(error || externalError) && (
            <p className="text-sm text-red-500">{error || externalError}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-semibold rounded-xl cursor-pointer"
            style={{ background: "#113D79", color: "white" }}
          >
            {loading ? "Checking..." : "Access Editor"}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Need help? Contact your web team.
        </p>
      </div>
    </div>
  );
}
