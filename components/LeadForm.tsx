"use client";

import { useState } from "react";

export default function LeadForm() {
  const [form, setForm] = useState({ name: "", email: "", website: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("https://formspree.io/f/xgondvne", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        console.error("Formspree error", await res.text());
      }
    } catch (err) {
      console.error("Form submission failed", err);
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-6 py-8 text-center">
        <div className="mb-3 text-3xl">✓</div>
        <p className="font-semibold text-green-800">
          Thanks, {form.name}! We&apos;ll be in touch within 24 hours.
        </p>
        <p className="mt-1 text-sm text-green-600">Check your inbox at {form.email}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          name="name"
          placeholder="First name"
          value={form.name}
          onChange={handleChange}
          required
          className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
        />
        <input
          type="email"
          name="email"
          placeholder="Email address"
          value={form.email}
          onChange={handleChange}
          required
          className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
        />
      </div>
      <input
        type="text"
        name="website"
        placeholder="yourbusiness.co.nz"
        value={form.website}
        onChange={handleChange}
        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
      />
      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: "#113D79" }}
        >
          {loading ? "Sending…" : "Get My Free Migration Quote →"}
        </button>
        <p className="mt-2 text-center text-xs text-white/40">
          Free quote, no obligation. We&apos;ll be in touch within 24 hours.
        </p>
      </div>
    </form>
  );
}
