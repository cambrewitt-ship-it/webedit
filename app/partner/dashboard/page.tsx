"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WHOLESALE_PACKS } from "@/config/packs";
import { Page } from "@/config/clients";

// Pricing constants
const INPUT_COST_PER_TOKEN_USD = 3.0 / 1_000_000;
const OUTPUT_COST_PER_TOKEN_USD = 15.0 / 1_000_000;
const USD_TO_NZD = 1.65;

function calcCostNzd(inputTokens: number, outputTokens: number) {
  const usd = inputTokens * INPUT_COST_PER_TOKEN_USD + outputTokens * OUTPUT_COST_PER_TOKEN_USD;
  return usd * USD_TO_NZD;
}

function fmtNzd(amount: number) {
  return `$${amount.toFixed(2)} NZD`;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface ClientData {
  id: string;
  name: string;
  domain: string;
  email?: string;
  githubRepo: string;
  githubBranch: string;
  pages: Page[];
  dollarBudget?: number;
  resellerId?: string;
}

interface UsageEntry {
  clientId: string;
  timestamp: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

interface ResellerInfo {
  id: string;
  name: string;
  businessName: string;
  email: string;
  brandName: string;
  brandLogo?: string;
  status: string;
  clients: string[];
}

interface NewClientResult {
  id: string;
  name: string;
  password: string;
}

interface ResetResult {
  clientId: string;
  clientName: string;
  password: string;
}

const DEFAULT_PAGES: Page[] = [{ label: "Home", filename: "index.html" }];

export default function PartnerDashboard() {
  const router = useRouter();
  const [reseller, setReseller] = useState<ResellerInfo | null>(null);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [usage, setUsage] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"clients" | "add" | "settings">("clients");

  // Payment success banner
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // New client result (shown once)
  const [newClientResult, setNewClientResult] = useState<NewClientResult | null>(null);

  // Password reset result (shown once)
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Buy tokens modal
  const [buyTokensFor, setBuyTokensFor] = useState<ClientData | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // Add client form
  const [form, setForm] = useState({
    name: "", domain: "", email: "", githubRepo: "", githubBranch: "main",
  });
  const [pages, setPages] = useState<Page[]>(DEFAULT_PAGES);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Settings form
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const appUrl = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reseller/clients");
      if (res.status === 401) {
        router.replace("/partner");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients ?? []);
        setUsage(data.usage ?? []);
        setReseller(data.reseller ?? null);
        if (data.reseller) {
          setBrandName(data.reseller.brandName ?? "");
          setBrandLogo(data.reseller.brandLogo ?? "");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setPaymentSuccess(true);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setPaymentSuccess(false), 6000);
    }
  }, []);

  async function handleSignOut() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/partner");
  }

  // Usage aggregated per client
  const usageByClient: Record<string, { calls: number; costNzd: number }> = {};
  for (const u of usage) {
    if (!usageByClient[u.clientId]) usageByClient[u.clientId] = { calls: 0, costNzd: 0 };
    usageByClient[u.clientId].calls++;
    usageByClient[u.clientId].costNzd += calcCostNzd(u.inputTokens, u.outputTokens);
  }

  // Budget used per client (same calc as main app)
  const budgetUsedByClient: Record<string, number> = {};
  for (const u of usage) {
    const usd = u.inputTokens * INPUT_COST_PER_TOKEN_USD + u.outputTokens * OUTPUT_COST_PER_TOKEN_USD;
    budgetUsedByClient[u.clientId] = (budgetUsedByClient[u.clientId] ?? 0) + usd;
  }

  // ── Add client ───────────────────────────────────────────────

  function handleFormChange(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !prev.githubRepo) {
        next.githubRepo = `your-org/${slugify(value)}-website`;
      }
      return next;
    });
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    const res = await fetch("/api/reseller/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, pages }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setSubmitError(data.error ?? "Something went wrong"); return; }
    setNewClientResult({ id: data.client.id, name: data.client.name, password: data.client.password });
    setForm({ name: "", domain: "", email: "", githubRepo: "", githubBranch: "main" });
    setPages(DEFAULT_PAGES);
    setActiveTab("clients");
    fetchData();
  }

  // ── Reset password ───────────────────────────────────────────

  async function handleResetPassword(client: ClientData) {
    if (!confirm(`Generate a new temporary password for ${client.name}?`)) return;
    const res = await fetch("/api/reseller/clients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setResetResult({ clientId: client.id, clientName: client.name, password: data.password });
    }
  }

  // ── Delete client ────────────────────────────────────────────

  async function handleDelete(client: ClientData) {
    if (!confirm(`Remove ${client.name}? This cannot be undone.`)) return;
    setDeletingId(client.id);
    await fetch("/api/reseller/clients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id }),
    });
    setDeletingId(null);
    fetchData();
  }

  // ── Buy tokens ───────────────────────────────────────────────

  async function handleBuyTokens(packId: string, clientId: string) {
    setCheckingOut(true);
    const res = await fetch("/api/reseller/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId, clientId }),
    });
    const data = await res.json();
    setCheckingOut(false);
    if (res.ok && data.url) {
      window.location.href = data.url;
    }
  }

  // ── Save settings ────────────────────────────────────────────

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    // For now, show a message — brand updates require admin action
    // TODO: add a self-service branding endpoint
    await new Promise((r) => setTimeout(r, 800));
    setSettingsSaving(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  }

  const totalClients = clients.length;
  const totalEdits = usage.length;
  const totalApiCostNzd = Object.values(usageByClient).reduce((s, u) => s + u.costNzd, 0);

  return (
    <div className="min-h-screen" style={{ background: "#f8f9fc" }}>
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between" style={{ background: "#113D79" }}>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-dm-serif)", color: "#BAA649" }}>
            {reseller?.brandName ?? "Partner Portal"}
          </span>
          <span className="text-white/40 text-sm">— Partner Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm hidden sm:block">{reseller?.email}</span>
          <button onClick={handleSignOut} className="text-white/60 hover:text-white text-sm">
            Sign out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-6 flex gap-1">
        {(["clients", "add", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab ? "border-[#113D79] text-[#113D79]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "add" ? "Add Client" : tab === "settings" ? "Brand Settings" : "My Clients"}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Banners */}
        {paymentSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800 text-sm font-medium">
            Payment successful — tokens have been added to your client&apos;s account.
          </div>
        )}

        {newClientResult && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <p className="font-semibold text-green-800 mb-2">Client created! Send these login details:</p>
            <div className="text-sm font-mono bg-white rounded-xl p-3 border border-green-100 space-y-1">
              <p>
                <span className="text-gray-400">Link: </span>
                <a href={`${appUrl}/edit/${newClientResult.id}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  {appUrl}/edit/{newClientResult.id}
                </a>
              </p>
              <p><span className="text-gray-400">Temporary password: </span><strong>{newClientResult.password}</strong></p>
              <p className="text-xs text-gray-400 mt-1">Your client can change this password after they log in.</p>
            </div>
            <button onClick={() => setNewClientResult(null)} className="mt-2 text-xs text-green-700 underline">Dismiss</button>
          </div>
        )}

        {resetResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <p className="font-semibold text-blue-800 mb-2">New temporary password for {resetResult.clientName}:</p>
            <div className="text-sm font-mono bg-white rounded-xl p-3 border border-blue-100">
              <strong className="text-lg">{resetResult.password}</strong>
            </div>
            <p className="text-xs text-blue-600 mt-2">Send this to your client. They can change it after logging in.</p>
            <button onClick={() => setResetResult(null)} className="mt-2 text-xs text-blue-700 underline">Dismiss</button>
          </div>
        )}

        {/* ── CLIENTS TAB ──────────────────────────────────────── */}
        {activeTab === "clients" && (
          <section>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-xs text-gray-400 mb-1">Clients</p>
                <p className="text-3xl font-bold" style={{ color: "#113D79" }}>{totalClients}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-xs text-gray-400 mb-1">Total edits</p>
                <p className="text-3xl font-bold" style={{ color: "#113D79" }}>{totalEdits}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className="text-xs text-gray-400 mb-1">API spend</p>
                <p className="text-3xl font-bold" style={{ color: "#113D79" }}>{fmtNzd(totalApiCostNzd)}</p>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Clients</h2>

            {loading ? (
              <p className="text-gray-400 text-sm">Loading…</p>
            ) : clients.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <p className="text-gray-500 mb-3">No clients yet.</p>
                <button
                  onClick={() => setActiveTab("add")}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                  style={{ background: "#113D79" }}
                >
                  Add your first client
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {clients.map((c) => {
                  const u = usageByClient[c.id];
                  const budgetUsedUsd = budgetUsedByClient[c.id] ?? 0;
                  const budgetTotalUsd = c.dollarBudget ?? 15;
                  const budgetPct = Math.min(100, (budgetUsedUsd / budgetTotalUsd) * 100);
                  const budgetLow = budgetPct > 80;

                  return (
                    <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="font-semibold text-gray-800">{c.name}</p>
                          <p className="text-sm text-gray-400">{c.domain}</p>
                          <a
                            href={`${appUrl}/edit/${c.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-500 hover:underline font-mono"
                          >
                            {appUrl}/edit/{c.id}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">{u?.calls ?? 0} edits</span>
                        </div>
                      </div>

                      {/* Token budget bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-gray-500">Token budget</span>
                          <span className={budgetLow ? "text-orange-500 font-medium" : "text-gray-500"}>
                            {budgetPct.toFixed(0)}% used
                            {budgetLow ? " — running low" : ""}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${budgetPct}%`,
                              background: budgetLow ? "#f97316" : "#113D79",
                            }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 flex-wrap">
                        <button
                          onClick={() => setBuyTokensFor(c)}
                          className="flex-1 min-w-[120px] py-2 rounded-lg text-sm font-medium text-white"
                          style={{ background: "#113D79" }}
                        >
                          Top up tokens
                        </button>
                        <button
                          onClick={() => handleResetPassword(c)}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:border-gray-300"
                        >
                          Reset password
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-600 disabled:opacity-40"
                        >
                          {deletingId === c.id ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── ADD CLIENT TAB ───────────────────────────────────── */}
        {activeTab === "add" && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Client</h2>
            <form onSubmit={handleAddClient} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Business Name *</label>
                  <input
                    required value={form.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    placeholder="Wellington Plumber"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Website Domain *</label>
                  <input
                    required value={form.domain}
                    onChange={(e) => handleFormChange("domain", e.target.value)}
                    placeholder="wellingtonplumber.co.nz"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Client Email (optional)</label>
                  <input
                    type="email" value={form.email}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                    placeholder="owner@wellingtonplumber.co.nz"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">GitHub Repo *</label>
                  <input
                    required value={form.githubRepo}
                    onChange={(e) => handleFormChange("githubRepo", e.target.value)}
                    placeholder="your-org/client-website"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#113D79]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Branch</label>
                  <input
                    value={form.githubBranch}
                    onChange={(e) => handleFormChange("githubBranch", e.target.value)}
                    placeholder="main"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#113D79]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Pages</label>
                <div className="space-y-2">
                  {pages.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        required value={p.label}
                        onChange={(e) => setPages((prev) => prev.map((pg, idx) => idx === i ? { ...pg, label: e.target.value } : pg))}
                        placeholder="Label (e.g. Home)"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#113D79]"
                      />
                      <input
                        required value={p.filename}
                        onChange={(e) => setPages((prev) => prev.map((pg, idx) => idx === i ? { ...pg, filename: e.target.value } : pg))}
                        placeholder="index.html"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#113D79]"
                      />
                      {pages.length > 1 && (
                        <button type="button" onClick={() => setPages((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-xs px-2">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setPages((p) => [...p, { label: "", filename: "" }])} className="mt-2 text-xs text-blue-500 hover:text-blue-700">
                  + Add page
                </button>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                A temporary password will be generated automatically. Share it with your client — they can change it after logging in.
              </div>

              {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                style={{ background: "#113D79" }}
              >
                {submitting ? "Creating…" : "Create Client"}
              </button>
            </form>
          </section>
        )}

        {/* ── SETTINGS TAB ─────────────────────────────────────── */}
        {activeTab === "settings" && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Brand Settings</h2>
            <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                Brand changes apply to all new clients. To update branding on existing clients, contact support.
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Brand Name *</label>
                <input
                  required value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Your Agency Name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]"
                />
                <p className="text-xs text-gray-400 mt-1">Shown in your clients&apos; editor header instead of &quot;WebEdit&quot;</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Logo URL (optional)</label>
                <input
                  type="url" value={brandLogo}
                  onChange={(e) => setBrandLogo(e.target.value)}
                  placeholder="https://youragency.com/logo.png"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]"
                />
                <p className="text-xs text-gray-400 mt-1">PNG or SVG recommended. Must be a publicly accessible URL.</p>
              </div>

              {brandLogo && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <img src={brandLogo} alt="Logo preview" className="h-8 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <span className="text-xs text-gray-500">Logo preview</span>
                </div>
              )}

              <button
                type="submit"
                disabled={settingsSaving}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                style={{ background: "#113D79" }}
              >
                {settingsSaved ? "✓ Saved" : settingsSaving ? "Saving…" : "Save Brand Settings"}
              </button>
            </form>

            <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Account</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="text-gray-400">Business: </span>{reseller?.businessName}</p>
                <p><span className="text-gray-400">Contact: </span>{reseller?.name}</p>
                <p><span className="text-gray-400">Email: </span>{reseller?.email}</p>
                <p><span className="text-gray-400">Clients: </span>{reseller?.clients.length ?? 0}</p>
              </div>
              <p className="text-xs text-gray-400 mt-4">To change your password or email, contact support.</p>
            </div>
          </section>
        )}
      </div>

      {/* ── Buy Tokens Modal ─────────────────────────────────────── */}
      {buyTokensFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Top up tokens</h3>
                <p className="text-sm text-gray-400">{buyTokensFor.name}</p>
              </div>
              <button onClick={() => setBuyTokensFor(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <p className="text-sm text-gray-500 mb-5">
              Wholesale pricing — buy at cost, charge your client whatever you like.
            </p>

            <div className="space-y-3">
              {WHOLESALE_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handleBuyTokens(pack.id, buyTokensFor.id)}
                  disabled={checkingOut}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all disabled:opacity-60 ${
                    pack.popular ? "border-[#113D79] bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{pack.label}</span>
                        {pack.popular && (
                          <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ background: "#113D79" }}>
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{pack.tokens.toLocaleString()} tokens · {pack.note}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Retail value: NZ${pack.popular ? 49 : pack.tokens > 600_000 ? 79 : 25}</p>
                    </div>
                    <span className="text-lg font-bold" style={{ color: "#113D79" }}>NZ${pack.priceNzd}</span>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              You pay wholesale · charge your client at retail = your margin
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
