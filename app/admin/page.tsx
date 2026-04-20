"use client";

import { useState, useEffect, useCallback } from "react";
import { Client, Page } from "@/config/clients";
import { UsageEntry } from "@/app/api/admin/route";

interface ResellerRecord {
  id: string;
  name: string;
  businessName: string;
  email: string;
  brandName: string;
  brandLogo?: string;
  status: "pending" | "active";
  clients: string[];
  createdAt: string;
}

// Pricing constants (Claude Sonnet, USD → NZD)
const INPUT_COST_PER_TOKEN_USD = 3.0 / 1_000_000;
const OUTPUT_COST_PER_TOKEN_USD = 15.0 / 1_000_000;
const USD_TO_NZD = 1.65;

function calcCostNzd(inputTokens: number, outputTokens: number) {
  const usd = inputTokens * INPUT_COST_PER_TOKEN_USD + outputTokens * OUTPUT_COST_PER_TOKEN_USD;
  return usd * USD_TO_NZD;
}

function fmtNzd(amount: number) {
  return `$${amount.toFixed(4)} NZD`;
}

const DEFAULT_PAGES: Page[] = [{ label: "Home", filename: "index.html" }];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface ClientUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costNzd: number;
}

export default function AdminPage() {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [usage, setUsage] = useState<UsageEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<"clients" | "usage" | "add" | "resellers">("clients");

  // Reseller state
  const [resellers, setResellers] = useState<ResellerRecord[]>([]);
  const [loadingResellers, setLoadingResellers] = useState(false);
  const [approvedReseller, setApprovedReseller] = useState<{ id: string; name: string; password: string } | null>(null);
  const [newReseller, setNewReseller] = useState<{ id: string; businessName: string; password: string } | null>(null);
  const [resellerForm, setResellerForm] = useState({ name: "", businessName: "", email: "", brandName: "" });
  const [resellerSubmitting, setResellerSubmitting] = useState(false);
  const [resellerError, setResellerError] = useState<string | null>(null);

  // Password reset state per client
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [resetLoading, setResetLoading] = useState<Record<string, boolean>>({});
  const [resetDone, setResetDone] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({ name: "", domain: "", email: "", password: "", githubRepo: "", githubBranch: "main" });
  const [pages, setPages] = useState<Page[]>(DEFAULT_PAGES);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<{ id: string; password: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const appUrl = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients);
        setUsage(data.usage ?? []);
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  const fetchResellers = useCallback(async () => {
    setLoadingResellers(true);
    try {
      const res = await fetch("/api/admin/resellers");
      if (res.ok) {
        const data = await res.json();
        setResellers(data.resellers ?? []);
      }
    } finally {
      setLoadingResellers(false);
    }
  }, []);

  // Check for existing admin session on mount
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.admin) {
          setAuthed(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authed) { fetchData(); fetchResellers(); }
  }, [authed, fetchData, fetchResellers]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(false);
    const res = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    if (res.ok) {
      setAuthed(true);
    } else {
      setAuthError(true);
    }
  }

  async function handleSignOut() {
    await fetch("/api/logout", { method: "POST" });
    setAuthed(false);
    setAdminEmail("");
    setAdminPassword("");
  }

  async function handleResetPassword(clientId: string) {
    const newPw = resetPasswords[clientId];
    if (!newPw) return;
    setResetLoading((p) => ({ ...p, [clientId]: true }));
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: clientId, password: newPw }),
    });
    setResetLoading((p) => ({ ...p, [clientId]: false }));
    if (res.ok) {
      setResetDone((p) => ({ ...p, [clientId]: true }));
      setTimeout(() => setResetDone((p) => ({ ...p, [clientId]: false })), 2500);
    }
  }

  function handleFormChange(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && (!prev.githubRepo || prev.githubRepo === `cambrewitt-ship-it/${slugify(prev.name)}-website`)) {
        next.githubRepo = `cambrewitt-ship-it/${slugify(value)}-website`;
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setSubmitError(null); setNewClient(null);
    const id = slugify(form.name);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id, pages }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setSubmitError(data.error ?? "Something went wrong"); return; }
    // data.client.password is the plaintext password returned once for display
    setNewClient({ id: data.client.id, password: data.client.password });
    setForm({ name: "", domain: "", email: "", password: "", githubRepo: "", githubBranch: "main" });
    setPages(DEFAULT_PAGES);
    fetchData();
  }

  async function handleApproveReseller(reseller: ResellerRecord) {
    if (!confirm(`Approve ${reseller.businessName}? This will generate a login password.`)) return;
    const res = await fetch("/api/admin/resellers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reseller.id, action: "approve" }),
    });
    const data = await res.json();
    if (res.ok) {
      setApprovedReseller({ id: reseller.id, name: reseller.businessName, password: data.password });
      fetchResellers();
    }
  }

  async function handleDeleteReseller(id: string) {
    if (!confirm(`Remove reseller "${id}"? Their clients will remain but be unlinked.`)) return;
    await fetch("/api/admin/resellers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchResellers();
  }

  async function handleCreateReseller(e: React.FormEvent) {
    e.preventDefault();
    setResellerSubmitting(true);
    setResellerError(null);
    const res = await fetch("/api/admin/resellers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resellerForm),
    });
    const data = await res.json();
    setResellerSubmitting(false);
    if (!res.ok) { setResellerError(data.error ?? "Something went wrong"); return; }
    setNewReseller({ id: data.reseller.id, businessName: data.reseller.businessName, password: data.reseller.password });
    setResellerForm({ name: "", businessName: "", email: "", brandName: "" });
    fetchResellers();
  }

  async function handleDelete(id: string) {
    if (!confirm(`Remove client "${id}"? This cannot be undone.`)) return;
    setDeletingId(id);
    await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    fetchData();
  }

  // Aggregate usage per client
  const usageByClient: Record<string, ClientUsage> = {};
  for (const entry of usage) {
    if (!usageByClient[entry.clientId]) {
      usageByClient[entry.clientId] = { calls: 0, inputTokens: 0, outputTokens: 0, costNzd: 0 };
    }
    const u = usageByClient[entry.clientId];
    u.calls++;
    u.inputTokens += entry.inputTokens;
    u.outputTokens += entry.outputTokens;
    u.costNzd += calcCostNzd(entry.inputTokens, entry.outputTokens);
  }
  const totalCostNzd = Object.values(usageByClient).reduce((s, u) => s + u.costNzd, 0);

  // ── Login screen ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#113D79" }}>
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: "#113D79", fontFamily: "var(--font-dm-serif)" }}>
            WebEdit Admin
          </div>
          <p className="text-gray-400 text-sm mb-8">OneOneThree Digital</p>
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <input
              type="email"
              placeholder="Admin email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#113D79]"
              autoFocus
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-[#113D79]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {authError && <p className="text-red-500 text-sm text-center">Incorrect email or password</p>}
            <button type="submit" className="w-full py-3 rounded-xl text-white font-semibold text-sm" style={{ background: "#113D79" }}>
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Admin dashboard ───────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#f8f9fc" }}>
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between" style={{ background: "#113D79" }}>
        <span className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-dm-serif)", color: "#BAA649" }}>
          WebEdit — Admin
        </span>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm">Total API spend: <span className="text-white font-semibold">{fmtNzd(totalCostNzd)}</span></span>
          <button onClick={handleSignOut} className="text-white/60 hover:text-white text-sm">
            Sign out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-6 flex gap-1">
        {(["clients", "usage", "add", "resellers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab ? "border-[#113D79] text-[#113D79]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "add" ? "Add Client" : tab === "usage" ? "API Usage & Costs" : tab === "resellers" ? `Partners ${resellers.filter(r => r.status === "pending").length > 0 ? `(${resellers.filter(r => r.status === "pending").length} pending)` : ""}` : "Clients"}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* ── CLIENTS TAB ──────────────────────────────────────── */}
        {activeTab === "clients" && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Clients</h2>
            {newClient && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
                <p className="font-semibold text-green-800 mb-2">Client created! Send these details:</p>
                <div className="text-sm font-mono bg-white rounded-xl p-3 border border-green-100 space-y-1">
                  <p><span className="text-gray-400">Link: </span>
                    <a href={`${appUrl}/edit/${newClient.id}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">{appUrl}/edit/{newClient.id}</a>
                  </p>
                  <p><span className="text-gray-400">Password: </span><strong>{newClient.password}</strong></p>
                </div>
                <button onClick={() => setNewClient(null)} className="mt-2 text-xs text-green-700 underline">Dismiss</button>
              </div>
            )}
            {loadingData ? (
              <p className="text-gray-400 text-sm">Loading…</p>
            ) : clients.length === 0 ? (
              <p className="text-gray-400 text-sm">No clients yet.</p>
            ) : (
              <div className="space-y-4">
                {clients.map((c) => (
                  <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="font-semibold text-gray-800">{c.name}</p>
                        <p className="text-sm text-gray-400">{c.domain}</p>
                        {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                        <a href={`${appUrl}/edit/${c.id}`} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline font-mono">
                          {appUrl}/edit/{c.id}
                        </a>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {usageByClient[c.id] && (
                          <div className="text-right border-l border-gray-100 pl-3">
                            <p className="text-xs text-gray-400">API spend</p>
                            <p className="text-sm font-semibold" style={{ color: "#113D79" }}>
                              {fmtNzd(usageByClient[c.id].costNzd)}
                            </p>
                          </div>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                        >
                          {deletingId === c.id ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </div>

                    {/* Password reset */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <input
                        type="text"
                        placeholder="New password…"
                        value={resetPasswords[c.id] ?? ""}
                        onChange={(e) => setResetPasswords((p) => ({ ...p, [c.id]: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#113D79]"
                      />
                      <button
                        onClick={() => handleResetPassword(c.id)}
                        disabled={!resetPasswords[c.id] || resetLoading[c.id]}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-colors"
                        style={{ background: "#113D79" }}
                      >
                        {resetDone[c.id] ? "✓ Saved" : resetLoading[c.id] ? "Saving…" : "Reset Password"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── USAGE TAB ────────────────────────────────────────── */}
        {activeTab === "usage" && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Claude API Usage & Costs</h2>
              <div className="text-sm text-gray-500">
                Pricing: $3/MTok in · $15/MTok out (USD × 1.65 NZD)
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-xs text-gray-400 mb-1">Total API calls</p>
                <p className="text-3xl font-bold" style={{ color: "#113D79" }}>{usage.length}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-xs text-gray-400 mb-1">Total tokens used</p>
                <p className="text-3xl font-bold" style={{ color: "#113D79" }}>
                  {(usage.reduce((s, u) => s + u.inputTokens + u.outputTokens, 0) / 1000).toFixed(1)}k
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-xs text-gray-400 mb-1">Total API spend</p>
                <p className="text-3xl font-bold" style={{ color: "#113D79" }}>{fmtNzd(totalCostNzd)}</p>
              </div>
            </div>

            {/* Per-client table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Client</th>
                    <th className="text-right px-5 py-3">Edits</th>
                    <th className="text-right px-5 py-3">Input tokens</th>
                    <th className="text-right px-5 py-3">Output tokens</th>
                    <th className="text-right px-5 py-3">Cost (NZD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients.map((c) => {
                    const u = usageByClient[c.id];
                    return (
                      <tr key={c.id}>
                        <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{u?.calls ?? 0}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{u ? u.inputTokens.toLocaleString() : "—"}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{u ? u.outputTokens.toLocaleString() : "—"}</td>
                        <td className="px-5 py-3 text-right font-semibold" style={{ color: "#113D79" }}>
                          {u ? fmtNzd(u.costNzd) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {clients.length > 0 && (
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-5 py-3 text-gray-800">Total</td>
                      <td className="px-5 py-3 text-right">{usage.length}</td>
                      <td className="px-5 py-3 text-right">{usage.reduce((s, u) => s + u.inputTokens, 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right">{usage.reduce((s, u) => s + u.outputTokens, 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right" style={{ color: "#113D79" }}>{fmtNzd(totalCostNzd)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {usage.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-10">No usage recorded yet. Data appears here after clients make their first AI edit.</p>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-3">
              * Costs are estimates based on Claude Sonnet pricing. USD/NZD rate hardcoded at 1.65 — update in admin/page.tsx as needed.
            </p>
          </section>
        )}

        {/* ── ADD CLIENT TAB ───────────────────────────────────── */}
        {activeTab === "add" && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Client</h2>
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Client Name *</label>
                  <input required value={form.name} onChange={(e) => handleFormChange("name", e.target.value)} placeholder="Wellington Cafe"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Website Domain *</label>
                  <input required value={form.domain} onChange={(e) => handleFormChange("domain", e.target.value)} placeholder="wellingtoncafe.co.nz"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Client Email (for login)</label>
                  <input type="email" value={form.email} onChange={(e) => handleFormChange("email", e.target.value)} placeholder="owner@wellingtoncafe.co.nz"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Client Login Password *</label>
                  <input required value={form.password} onChange={(e) => handleFormChange("password", e.target.value)} placeholder="cafe2025"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">GitHub Repo *</label>
                  <input required value={form.githubRepo} onChange={(e) => handleFormChange("githubRepo", e.target.value)} placeholder="cambrewitt-ship-it/cafe-website"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#113D79]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Branch</label>
                  <input value={form.githubBranch} onChange={(e) => handleFormChange("githubBranch", e.target.value)} placeholder="main"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#113D79]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Pages</label>
                <div className="space-y-2">
                  {pages.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input required value={p.label} onChange={(e) => setPages((prev) => prev.map((pg, idx) => idx === i ? { ...pg, label: e.target.value } : pg))}
                        placeholder="Label (e.g. Home)" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#113D79]" />
                      <input required value={p.filename} onChange={(e) => setPages((prev) => prev.map((pg, idx) => idx === i ? { ...pg, filename: e.target.value } : pg))}
                        placeholder="index.html" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#113D79]" />
                      {pages.length > 1 && (
                        <button type="button" onClick={() => setPages((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-xs px-2">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setPages((p) => [...p, { label: "", filename: "" }])}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-700">
                  + Add page
                </button>
              </div>

              {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                style={{ background: "#113D79" }}>
                {submitting ? "Creating…" : "Create Client"}
              </button>
            </form>
          </section>
        )}

        {/* ── RESELLERS TAB ─────────────────────────────────── */}
        {activeTab === "resellers" && (
          <section className="space-y-8">
            {approvedReseller && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <p className="font-semibold text-green-800 mb-2">Partner approved! Send these credentials to {approvedReseller.name}:</p>
                <div className="text-sm font-mono bg-white rounded-xl p-3 border border-green-100 space-y-1">
                  <p><span className="text-gray-400">Login: </span><a href="/partner" className="text-blue-600 underline">{appUrl}/partner</a></p>
                  <p><span className="text-gray-400">Password: </span><strong>{approvedReseller.password}</strong></p>
                </div>
                <button onClick={() => setApprovedReseller(null)} className="mt-2 text-xs text-green-700 underline">Dismiss</button>
              </div>
            )}

            {newReseller && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <p className="font-semibold text-green-800 mb-2">Partner created! Send these credentials to {newReseller.businessName}:</p>
                <div className="text-sm font-mono bg-white rounded-xl p-3 border border-green-100 space-y-1">
                  <p><span className="text-gray-400">Login: </span><a href="/partner" className="text-blue-600 underline">{appUrl}/partner</a></p>
                  <p><span className="text-gray-400">Password: </span><strong>{newReseller.password}</strong></p>
                </div>
                <button onClick={() => setNewReseller(null)} className="mt-2 text-xs text-green-700 underline">Dismiss</button>
              </div>
            )}

            {resellers.filter(r => r.status === "pending").length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Pending Applications</h2>
                <div className="space-y-3">
                  {resellers.filter(r => r.status === "pending").map((r) => (
                    <div key={r.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-800">{r.businessName}</p>
                        <p className="text-sm text-gray-500">{r.name} · {r.email}</p>
                        <p className="text-xs text-gray-400 mt-1">Applied {new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => handleApproveReseller(r)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#113D79" }}>
                          Approve
                        </button>
                        <button onClick={() => handleDeleteReseller(r.id)} className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-600">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Active Partners</h2>
              {loadingResellers ? (
                <p className="text-gray-400 text-sm">Loading…</p>
              ) : resellers.filter(r => r.status === "active").length === 0 ? (
                <p className="text-gray-400 text-sm">No active partners yet.</p>
              ) : (
                <div className="space-y-3">
                  {resellers.filter(r => r.status === "active").map((r) => (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-800">{r.businessName}</p>
                        <p className="text-sm text-gray-500">{r.name} · {r.email}</p>
                        <p className="text-xs text-gray-400 mt-1">Brand: {r.brandName} · {r.clients.length} client{r.clients.length !== 1 ? "s" : ""}</p>
                      </div>
                      <button onClick={() => handleDeleteReseller(r.id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Partner Manually</h2>
              <form onSubmit={handleCreateReseller} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Contact Name *</label>
                    <input required value={resellerForm.name} onChange={(e) => setResellerForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Alex Johnson" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Business Name *</label>
                    <input required value={resellerForm.businessName} onChange={(e) => setResellerForm(f => ({ ...f, businessName: e.target.value }))}
                      placeholder="Tradie Web Co" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                    <input required type="email" value={resellerForm.email} onChange={(e) => setResellerForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="alex@tradieweb.co" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Brand Name (editor label)</label>
                    <input value={resellerForm.brandName} onChange={(e) => setResellerForm(f => ({ ...f, brandName: e.target.value }))}
                      placeholder="Tradie Web Co (defaults to business name)" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]" />
                  </div>
                </div>
                {resellerError && <p className="text-red-500 text-sm">{resellerError}</p>}
                <button type="submit" disabled={resellerSubmitting} className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50" style={{ background: "#113D79" }}>
                  {resellerSubmitting ? "Creating…" : "Create Partner"}
                </button>
              </form>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
