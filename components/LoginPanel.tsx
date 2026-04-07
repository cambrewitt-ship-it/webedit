"use client";

import { useState } from "react";
import { Client } from "@/config/clients";

export default function LoginPanel({ clients }: { clients: Client[] }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1. Try admin auth first
    const adminRes = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (adminRes.ok) {
      window.location.href = "/admin";
      return;
    }

    // 2. Try client auth
    const client =
      clients.find((c) => c.email?.toLowerCase() === email.toLowerCase()) ??
      clients[0];

    if (!client) {
      setError("No account found for this email.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, password }),
    });

    if (res.ok) {
      window.location.href = `/edit/${client.id}`;
    } else {
      setError("Incorrect email or password. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col p-8 h-full">
      {/* Branding card */}
      <div className="mb-8 rounded-2xl px-5 py-4" style={{ background: "#113D79" }}>
        <div className="flex items-center gap-2">
          <span
            className="text-xl font-bold text-white"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            WebEdit
          </span>
          <span className="text-sm text-white/50">by</span>
          <img
            src="/Logo_Drafts__1_-removebg-preview.png"
            alt="113 Digital"
            className="h-6 w-auto"
          />
        </div>
      </div>

      <h2 className="mb-1 text-lg font-semibold text-gray-800">
        Log in to your portal
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Welcome back. Enter your details to continue.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-[#113D79] focus:outline-none"
        />

        {/* Password with eye toggle */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-800 placeholder-gray-400 focus:border-[#113D79] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              // Eye-off
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              // Eye
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: "#113D79" }}
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        New customer?{" "}
        <a
          href="#quote"
          className="font-medium hover:underline"
          style={{ color: "#113D79" }}
        >
          Get a free quote ↑
        </a>
      </p>
    </div>
  );
}
