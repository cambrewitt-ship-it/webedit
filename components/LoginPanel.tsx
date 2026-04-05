"use client";

import { useState } from "react";
import { Client } from "@/config/clients";

export default function LoginPanel({ clients }: { clients: Client[] }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Match client by email field, fall back to first client
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
      sessionStorage.setItem(
        "webedit_session",
        JSON.stringify({ clientId: client.id, password })
      );
      window.location.href = `/edit/${client.id}`;
    } else {
      setError("Incorrect password. Please try again.");
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
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-[#113D79] focus:outline-none"
        />

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
