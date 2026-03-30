"use client";

import { useState, useEffect, useCallback } from "react";
import { Client, Page } from "@/config/clients";

const DEFAULT_PAGES: Page[] = [
  { label: "Home", filename: "index.html" },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    domain: "",
    password: "",
    githubRepo: "",
    githubBranch: "main",
  });
  const [pages, setPages] = useState<Page[]>(DEFAULT_PAGES);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<Client | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const appUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : "";

  const fetchClients = useCallback(async (pw: string) => {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/admin", {
        headers: { "x-admin-password": pw },
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients);
      }
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchClients(password);
  }, [authed, password, fetchClients]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    // We verify by making a real API call
    setAuthError(false);
    fetch("/api/admin", { headers: { "x-admin-password": password } }).then((res) => {
      if (res.ok) {
        setAuthed(true);
      } else {
        setAuthError(true);
      }
    });
  }

  function handleFormChange(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name") {
        // Auto-fill GitHub repo if empty
        const slug = slugify(value);
        if (!prev.githubRepo || prev.githubRepo === `cambrewitt-ship-it/${slugify(prev.name)}-website`) {
          next.githubRepo = `cambrewitt-ship-it/${slug}-website`;
        }
      }
      return next;
    });
  }

  function addPage() {
    setPages((prev) => [...prev, { label: "", filename: "" }]);
  }

  function removePage(i: number) {
    setPages((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updatePage(i: number, field: "label" | "filename", value: string) {
    setPages((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setNewClient(null);

    const id = slugify(form.name);

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ ...form, id, pages }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(data.error ?? "Something went wrong");
      return;
    }

    setNewClient(data.client);
    setForm({ name: "", domain: "", password: "", githubRepo: "", githubBranch: "main" });
    setPages(DEFAULT_PAGES);
    fetchClients(password);
  }

  async function handleDelete(id: string) {
    if (!confirm(`Remove client "${id}"? This cannot be undone.`)) return;
    setDeletingId(id);
    await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    fetchClients(password);
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#113D79" }}>
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: "#113D79", fontFamily: "var(--font-dm-serif)" }}>
            113 WebEdit
          </div>
          <p className="text-gray-400 text-sm mb-8">Admin access only</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoFocus
            />
            {authError && <p className="text-red-500 text-sm">Incorrect password</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors"
              style={{ background: "#113D79" }}
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#f8f9fc" }}>
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between" style={{ background: "#113D79" }}>
        <span className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-dm-serif)", color: "#BAA649" }}>
          113 WebEdit — Admin
        </span>
        <button
          onClick={() => { setAuthed(false); setPassword(""); }}
          className="text-white/60 hover:text-white text-sm transition-colors"
        >
          Sign out
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Success banner */}
        {newClient && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <p className="font-semibold text-green-800 mb-3">Client created! Send these details:</p>
            <div className="space-y-2 text-sm font-mono bg-white rounded-xl p-4 border border-green-100">
              <p><span className="text-gray-400">Link: </span>
                <a href={`${appUrl}/edit/${newClient.id}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  {appUrl}/edit/{newClient.id}
                </a>
              </p>
              <p><span className="text-gray-400">Password: </span><strong>{newClient.password}</strong></p>
            </div>
            <p className="text-xs text-green-600 mt-3">
              The app will update in ~1-2 minutes after GitHub deploys the change.
            </p>
            <button onClick={() => setNewClient(null)} className="mt-3 text-xs text-green-700 underline">Dismiss</button>
          </div>
        )}

        {/* Current clients */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Clients</h2>
          {loadingClients ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : clients.length === 0 ? (
            <p className="text-gray-400 text-sm">No clients yet.</p>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
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
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Password</p>
                      <p className="text-sm font-mono font-semibold text-gray-700">{c.password}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                      {deletingId === c.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Create client form */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Client</h2>
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Client Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  placeholder="Wellington Cafe"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Website Domain *</label>
                <input
                  required
                  value={form.domain}
                  onChange={(e) => handleFormChange("domain", e.target.value)}
                  placeholder="wellingtoncafe.co.nz"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Client Login Password *</label>
                <input
                  required
                  value={form.password}
                  onChange={(e) => handleFormChange("password", e.target.value)}
                  placeholder="cafe2025"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">GitHub Repo *</label>
                <input
                  required
                  value={form.githubRepo}
                  onChange={(e) => handleFormChange("githubRepo", e.target.value)}
                  placeholder="cambrewitt-ship-it/cafe-website"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Branch</label>
                <input
                  value={form.githubBranch}
                  onChange={(e) => handleFormChange("githubBranch", e.target.value)}
                  placeholder="main"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {/* Pages */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Pages</label>
              <div className="space-y-2">
                {pages.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      required
                      value={p.label}
                      onChange={(e) => updatePage(i, "label", e.target.value)}
                      placeholder="Label (e.g. Home)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <input
                      required
                      value={p.filename}
                      onChange={(e) => updatePage(i, "filename", e.target.value)}
                      placeholder="filename (e.g. index.html)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    {pages.length > 1 && (
                      <button type="button" onClick={() => removePage(i)} className="text-red-400 hover:text-red-600 text-xs px-2">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addPage}
                className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition-colors"
              >
                + Add page
              </button>
            </div>

            {submitError && (
              <p className="text-red-500 text-sm">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ background: "#113D79" }}
            >
              {submitting ? "Creating…" : "Create Client"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
