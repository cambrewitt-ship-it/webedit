"use client";

import { useState } from "react";

function CheckIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="#113D79">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export default function PartnersPage() {
  const [form, setForm] = useState({ name: "", businessName: "", email: "", website: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/reseller/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      setError(data.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: "#113D79", fontFamily: "var(--font-dm-serif)" }}>WebEdit</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: "#BAA649" }}>Partners</span>
        </div>
        <a href="/partner" className="text-sm text-gray-500 hover:text-gray-800">
          Partner login →
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border" style={{ color: "#113D79", borderColor: "#113D79", background: "#f0f4ff" }}>
          WebEdit Partner Program
        </div>
        <h1 className="text-5xl font-bold mb-6 leading-tight" style={{ color: "#113D79", fontFamily: "var(--font-dm-serif)" }}>
          Turn your AI websites<br />into recurring revenue.
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          You already build great websites for tradies and local businesses. Add WebEdit to every site — your clients edit their own content, and you collect a margin every year.
        </p>
        <a
          href="#apply"
          className="inline-block px-8 py-4 rounded-xl text-white font-semibold text-base"
          style={{ background: "#113D79" }}
        >
          Apply to become a partner
        </a>
        <p className="text-sm text-gray-400 mt-4">Free to join · No monthly fees · Pay only per client you onboard</p>
      </section>

      {/* The problem */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#113D79", fontFamily: "var(--font-dm-serif)" }}>
            The problem with one-off website builds
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed">
            You build a beautiful AI website for a tradie — $200–500, job done. Then they ring you six months later: &quot;Can you update my hours?&quot; Or they switch platforms. Or they want changes and have no way to make them without you.
          </p>
          <p className="text-gray-800 text-lg font-medium mt-6">
            There&apos;s no recurring revenue. No lock-in. No margin after delivery.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-14" style={{ color: "#113D79", fontFamily: "var(--font-dm-serif)" }}>
          How the partner program works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              num: "01",
              title: "You build the site",
              body: "Keep doing what you already do — AI-generated HTML hosted on Cloudflare Pages or GitHub Pages. Free hosting, as usual.",
            },
            {
              num: "02",
              title: "You add WebEdit",
              body: "Create your client inside your branded partner dashboard. They get a private editing portal — branded with your business name, not ours.",
            },
            {
              num: "03",
              title: "You collect recurring revenue",
              body: "Your clients pay you monthly or annually to keep editing access. You pay us wholesale. The difference is yours.",
            },
          ].map((step) => (
            <div key={step.num} className="text-center p-6 rounded-2xl border border-gray-100">
              <div className="text-4xl font-bold mb-4" style={{ color: "#BAA649", fontFamily: "var(--font-dm-serif)" }}>
                {step.num}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Economics */}
      <section className="py-16 px-6" style={{ background: "#113D79" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-white" style={{ fontFamily: "var(--font-dm-serif)" }}>
            The numbers make sense
          </h2>
          <p className="text-center text-white/60 mb-12">Per client, per year</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                label: "You pay us (wholesale)",
                amount: "NZ$49",
                sub: "per client / year",
                muted: true,
              },
              {
                label: "You charge your client",
                amount: "NZ$360–600",
                sub: "$30–50/month · your price",
                muted: false,
              },
              {
                label: "Your profit",
                amount: "NZ$311–551",
                sub: "per client · every year",
                muted: false,
              },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl p-6 text-center ${item.muted ? "bg-white/10" : "bg-white"}`}>
                <p className={`text-xs font-medium mb-2 ${item.muted ? "text-white/60" : "text-gray-500"}`}>{item.label}</p>
                <p className={`text-4xl font-bold mb-1 ${item.muted ? "text-white" : ""}`} style={!item.muted ? { color: "#113D79" } : {}}>
                  {item.amount}
                </p>
                <p className={`text-xs ${item.muted ? "text-white/50" : "text-gray-400"}`}>{item.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/10 rounded-2xl p-6 text-center">
            <p className="text-white text-sm mb-2 font-medium">With 10 clients on your roster:</p>
            <p className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-dm-serif)" }}>NZ$3,000–5,500/year in recurring revenue</p>
            <p className="text-white/50 text-sm">after paying us $490/year wholesale</p>
          </div>

          <p className="text-center text-white/40 text-xs mt-6">
            Plus you earn margin on token top-ups — buy wholesale (~30% off retail), charge your client at retail.
          </p>
        </div>
      </section>

      {/* What's included */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: "#113D79", fontFamily: "var(--font-dm-serif)" }}>
          What you get as a partner
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            "Your own branded partner dashboard",
            "White-label editor — your brand name, not ours",
            "Add and manage unlimited clients",
            "Auto-generated client login credentials",
            "Clients can reset their own password",
            "Real-time token usage tracking per client",
            "Wholesale token top-up pricing (~30% off retail)",
            "Your clients pay you — you control pricing",
            "No lock-in — cancel any client at any time",
            "AI-powered editing for any HTML website",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <CheckIcon />
              <span className="text-gray-700 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Ideal partner */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "#113D79", fontFamily: "var(--font-dm-serif)" }}>
            Perfect for web builders who work with local businesses
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
            {[
              "Freelancers building AI-generated HTML websites",
              "Agencies selling to tradies, hospitality, and local retail",
              "Developers offering free Cloudflare / GitHub Pages hosting",
            ].map((item) => (
              <div key={item} className="bg-white rounded-xl p-4 border border-gray-100">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: "#113D79", fontFamily: "var(--font-dm-serif)" }}>
          Common questions
        </h2>
        <div className="space-y-6">
          {[
            {
              q: "Will my clients know they're using WebEdit?",
              a: "No. The editor shows your business name and logo. WebEdit is invisible to your end-clients — it's your product.",
            },
            {
              q: "Do I pay monthly or per-client?",
              a: "Per-client, per year. No ongoing platform fee. You only pay when you have a client to onboard — NZ$49/year each. Zero risk.",
            },
            {
              q: "How do token top-ups work?",
              a: "Each client gets a starting token allocation. When they run low, you buy wholesale top-up packs from your dashboard at ~30% below retail. You decide what to charge your client.",
            },
            {
              q: "What kind of websites does it support?",
              a: "Any HTML website hosted on a GitHub repository. Works perfectly with sites built on Cloudflare Pages, GitHub Pages, or Netlify using AI tools.",
            },
            {
              q: "Can my client change their own password?",
              a: "Yes. When you create a client, a temporary password is generated. Your client logs in and can change it themselves from the editor.",
            },
            {
              q: "What if I want to remove a client?",
              a: "You can remove a client from your dashboard at any time. No questions asked.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-gray-100 pb-6">
              <p className="font-semibold text-gray-800 mb-2">{q}</p>
              <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Apply form */}
      <section id="apply" className="py-20 px-6" style={{ background: "#113D79" }}>
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-3" style={{ fontFamily: "var(--font-dm-serif)" }}>
            Apply to become a partner
          </h2>
          <p className="text-center text-white/60 text-sm mb-10">
            We&apos;ll review your application and get back to you within 1–2 business days.
          </p>

          {submitted ? (
            <div className="bg-white rounded-2xl p-10 text-center">
              <div className="text-4xl mb-4">✓</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: "#113D79" }}>Application received!</h3>
              <p className="text-gray-500 text-sm">
                We&apos;ll review your details and send your login credentials to <strong>{form.email}</strong> within 1–2 business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Your Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Alex Johnson"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Business Name *</label>
                  <input
                    required
                    value={form.businessName}
                    onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                    placeholder="Your Web Agency"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email Address *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@youragency.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Your Website (optional)</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://youragency.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tell us about your clients (optional)</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="What kind of businesses do you build for? How many clients do you work with?"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79] resize-none"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
                style={{ background: "#113D79" }}
              >
                {submitting ? "Submitting…" : "Submit application"}
              </button>

              <p className="text-xs text-gray-400 text-center">
                By applying you agree to our{" "}
                <a href="/" className="underline hover:text-gray-600">terms of service</a>.
                No payment required to apply.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center">
        <p className="text-sm text-gray-400">
          WebEdit by{" "}
          <a href="/" className="hover:underline text-gray-500">OneOneThree Digital</a>
          {" "}·{" "}
          <a href="/partner" className="hover:underline text-gray-500">Partner login</a>
        </p>
      </footer>
    </div>
  );
}
