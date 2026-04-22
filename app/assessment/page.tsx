"use client";

import { useState } from "react";
import { X } from "lucide-react";
import LoginPanel from "@/components/LoginPanel";
import { clients } from "@/config/clients";

/* ─── Platform pricing data ─────────────────────────────────── */

// All monthly costs in NZD (USD prices × ~1.65 exchange rate, rounded)
const PLATFORMS = [
  {
    id: "squarespace",
    name: "Squarespace",
    monthlyAvg: 55,
    description: "~NZ$42–$60/mo",
    icon: (
      <svg viewBox="0 0 40 40" fill="currentColor" className="w-7 h-7">
        <rect width="40" height="40" rx="4" fill="#000" />
        <path d="M10 20a10 10 0 1020 0 10 10 0 00-20 0zm4 0a6 6 0 1112 0 6 6 0 01-12 0z" fill="#fff" />
      </svg>
    ),
  },
  {
    id: "wix",
    name: "Wix",
    monthlyAvg: 46,
    description: "~NZ$28–$60/mo",
    icon: (
      <svg viewBox="0 0 40 20" fill="none" className="w-10 h-5">
        <text x="0" y="16" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="18" fill="#FAAD00">Wix</text>
      </svg>
    ),
  },
  {
    id: "wordpress",
    name: "WordPress.com",
    monthlyAvg: 33,
    description: "~NZ$15–$41/mo",
    icon: (
      <svg viewBox="0 0 40 40" fill="currentColor" className="w-7 h-7">
        <circle cx="20" cy="20" r="18" fill="#21759B" />
        <path d="M3.5 20a16.5 16.5 0 0027.6 12.2L4.2 13.5A16.4 16.4 0 003.5 20zm28.7-8.4l-8.5 24.5A16.5 16.5 0 0032.2 11.6zm-14 .5l5.5 16.1-7.4-22A16.5 16.5 0 0118.2 12z" fill="#fff" />
      </svg>
    ),
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    monthlyAvg: 28,
    description: "~NZ$18–$36/mo",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <circle cx="20" cy="20" r="18" fill="#1BDBDB" />
        <text x="8" y="26" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="13" fill="#fff">GD</text>
      </svg>
    ),
  },
  {
    id: "weebly",
    name: "Weebly",
    monthlyAvg: 26,
    description: "~NZ$17–$41/mo",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <circle cx="20" cy="20" r="18" fill="#4A90D9" />
        <text x="9" y="26" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="13" fill="#fff">W</text>
      </svg>
    ),
  },
  {
    id: "webflow",
    name: "Webflow",
    monthlyAvg: 38,
    description: "~NZ$23–$64/mo",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="4" fill="#146EF5" />
        <text x="5" y="26" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="13" fill="#fff">WF</text>
      </svg>
    ),
  },
  {
    id: "showit",
    name: "ShowIt",
    monthlyAvg: 40,
    description: "~NZ$31–$48/mo",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="20" fill="#FF5252" />
        <text x="8" y="26" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="13" fill="#fff">SI</text>
      </svg>
    ),
  },
  {
    id: "ionos",
    name: "IONOS",
    monthlyAvg: 23,
    description: "~NZ$13–$30/mo",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <rect width="40" height="40" rx="4" fill="#003D8F" />
        <text x="5" y="26" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="11" fill="#fff">IONOS</text>
      </svg>
    ),
  },
  {
    id: "jimdo",
    name: "Jimdo",
    monthlyAvg: 25,
    description: "~NZ$18–$33/mo",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <circle cx="20" cy="20" r="18" fill="#FF6D00" />
        <text x="9" y="26" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="13" fill="#fff">J</text>
      </svg>
    ),
  },
  {
    id: "other",
    name: "Other / Not sure",
    monthlyAvg: 45,
    description: "We'll calculate your savings",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
        <circle cx="20" cy="20" r="18" fill="#6B7280" />
        <text x="13" y="27" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="18" fill="#fff">?</text>
      </svg>
    ),
  },
];

/* ─── helpers ──────────────────────────────────────────────── */

function Stars() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="w-4 h-4" viewBox="0 0 20 20" fill="#BAA649">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Step {step} of {total}
        </span>
        <span className="text-xs text-gray-400">{Math.round((step / total) * 100)}% complete</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(step / total) * 100}%`, background: "#113D79" }}
        />
      </div>
    </div>
  );
}

/* ─── Assessment form (bottom of results) ───────────────────── */

function AssessmentLeadForm({ platform, annualSavings }: { platform: string; annualSavings: number }) {
  const [form, setForm] = useState({ name: "", email: "", website: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).dataLayer = (window as any).dataLayer || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).dataLayer.push({
      event: "assessment_lead_submit",
      platform,
      estimated_annual_savings: annualSavings,
    });

    try {
      const res = await fetch("https://formspree.io/f/xgondvne", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...form, platform, estimated_annual_savings: annualSavings, source: "assessment" }),
      });
      if (res.ok) {
        setSubmitted(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dataLayer.push({ event: "assessment_lead_submit_success" });
      }
    } catch (err) {
      console.error("Form submission failed", err);
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-6 py-10 text-center">
        <div className="text-4xl mb-3 font-bold text-green-700">✓</div>
        <p className="font-bold text-green-800 text-lg">
          Thanks, {form.name}! We&apos;ll be in touch within 24 hours.
        </p>
        <p className="mt-1 text-sm text-green-600">Check your inbox at {form.email}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          type="text"
          name="name"
          placeholder="First name"
          value={form.name}
          onChange={handleChange}
          required
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none w-full"
        />
        <input
          type="email"
          name="email"
          placeholder="Email address"
          value={form.email}
          onChange={handleChange}
          required
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none w-full"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          type="text"
          name="website"
          placeholder="Your website URL"
          value={form.website}
          onChange={handleChange}
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none w-full"
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone (optional)"
          value={form.phone}
          onChange={handleChange}
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none w-full"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl px-6 py-4 text-sm font-bold text-white transition-opacity disabled:opacity-60 hover:opacity-90"
        style={{ background: "#113D79" }}
      >
        {loading ? "Sending…" : "Claim My Free Migration Quote →"}
      </button>
      <p className="text-center text-xs text-gray-400">
        No obligation, completely free. We&apos;ll reply within 24 hours.
      </p>
    </form>
  );
}

/* ─── Savings line chart ────────────────────────────────────── */

function SavingsLineChart({ monthlyAvg, platformName }: { monthlyAvg: number; platformName: string }) {
  const annual = monthlyAvg * 12;
  const years = [1, 2, 3, 4, 5];
  const platformCumulative = years.map((y) => annual * y);
  const webeditCumulative = years.map((y) => 399 + 99 * y);

  const maxVal = platformCumulative[4];
  const W = 320, H = 280;
  const padL = 52, padR = 12, padT = 12, padB = 32;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const xp = (i: number) => padL + (i / 4) * cW;
  const yp = (v: number) => padT + cH - (v / maxVal) * cH;

  const pPath = years.map((_, i) => `${i === 0 ? "M" : "L"}${xp(i)},${yp(platformCumulative[i])}`).join(" ");
  const wPath = years.map((_, i) => `${i === 0 ? "M" : "L"}${xp(i)},${yp(webeditCumulative[i])}`).join(" ");

  // Filled area between the two lines
  const areaPath = [
    ...years.map((_, i) => `${i === 0 ? "M" : "L"}${xp(i)},${yp(platformCumulative[i])}`),
    ...[...years].reverse().map((_, i) => `L${xp(4 - i)},${yp(webeditCumulative[4 - i])}`),
    "Z",
  ].join(" ");

  const yTicks = [0, Math.round(maxVal / 2 / 100) * 100, maxVal];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-xl">
      <defs>
        <linearGradient id="areaFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(239,68,68,0.5)" />
          <stop offset="67%" stopColor="rgba(239,68,68,0.5)" />
          <stop offset="100%" stopColor="rgba(239,68,68,0)" />
        </linearGradient>
      </defs>
      {/* white background */}
      <rect x="0" y="0" width={W} height={H} fill="white" rx="8" />

      {/* grid + y labels */}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={padL} y1={yp(tick)} x2={W - padR} y2={yp(tick)} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
          <text x={padL - 5} y={yp(tick) + 4} textAnchor="end" fontSize="9" fill="rgba(0,0,0,0.4)">
            {tick >= 1000 ? `$${(tick / 1000).toFixed(1)}k` : `$${tick}`}
          </text>
        </g>
      ))}

      {/* x labels */}
      {years.map((y, i) => (
        <text key={y} x={xp(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="rgba(0,0,0,0.4)">
          Yr {y}
        </text>
      ))}

      {/* filled area between lines */}
      <path d={areaPath} fill="url(#areaFade)" />

      {/* platform line */}
      <path d={pPath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {years.map((_, i) => (
        <circle key={`p${i}`} cx={xp(i)} cy={yp(platformCumulative[i])} r="3.5" fill="#ef4444" />
      ))}

      {/* webedit line */}
      <path d={wPath} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {years.map((_, i) => (
        <circle key={`w${i}`} cx={xp(i)} cy={yp(webeditCumulative[i])} r="3.5" fill="#16a34a" />
      ))}

      {/* legend */}
      <rect x={padL} y={padT} width="8" height="8" rx="2" fill="#ef4444" />
      <text x={padL + 11} y={padT + 7} fontSize="8.5" fill="rgba(0,0,0,0.6)">{platformName}</text>
      <rect x={padL + 90} y={padT} width="8" height="8" rx="2" fill="#16a34a" />
      <text x={padL + 101} y={padT + 7} fontSize="8.5" fill="rgba(0,0,0,0.6)">WebEdit</text>
    </svg>
  );
}

/* ─── page ──────────────────────────────────────────────────── */

type Step = "intro" | "q1" | "q2" | "q3" | "disqualified-ecommerce" | "no-website" | "results";

export default function AssessmentPage() {
  const [step, setStep] = useState<Step>("intro");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const platform = PLATFORMS.find((p) => p.id === selectedPlatform);
  const monthlyFee = platform?.monthlyAvg ?? 0;
  const annualSavings = monthlyFee * 12;
  const fiveYearSavings = monthlyFee * 60;

  const stepNumber =
    step === "q1" ? 1 : step === "q2" ? 2 : step === "q3" ? 3 : step === "results" ? 3 : 0;

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Nav ──────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/10"
        style={{ background: "#113D79" }}
      >
        <a href="/" className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-base font-bold text-white" style={{ fontFamily: "Inter, sans-serif" }}>
            WebEdit
          </span>
          <span className="text-sm text-white/50">by</span>
          <img src="/Logo_Drafts__1_-removebg-preview.png" alt="113 Digital" className="h-6 w-auto" />
        </a>

        <nav className="hidden md:flex items-center gap-6">
          <a href="/#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors">
            How it works
          </a>
          <a href="/#pricing" className="text-sm text-white/70 hover:text-white transition-colors">
            Pricing
          </a>
          <button
            onClick={() => setShowLogin(true)}
            className="px-4 py-1.5 rounded-lg bg-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ color: "#113D79" }}
          >
            Sign In
          </button>
        </nav>
      </header>

      {/* Login drawer */}
      {showLogin && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowLogin(false)}
        />
      )}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm shadow-2xl transition-transform duration-300 ease-in-out ${
          showLogin ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "#f1f3f5" }}
      >
        <button
          onClick={() => setShowLogin(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-gray-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <LoginPanel clients={clients} />
      </div>

      {/* ── Hero banner ──────────────────────────────────────── */}
      <div className="px-6 py-10 text-center" style={{ background: "#0d2f5e" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-3">
          Free 60-second assessment
        </p>
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4"
          style={{ fontFamily: "Satoshi, sans-serif" }}
        >
          Stop paying rent on your website.<br />
          Get <span className="bg-white px-1 rounded" style={{ color: "#113D79" }}>$0 monthly fees.</span> <em>Forever.</em>
        </h1>
        <p className="text-white/60 text-base max-w-xl mx-auto">
          Answer 3 quick questions and we&apos;ll show you exactly what you&apos;re overpaying — and how much you&apos;d save switching to free hosting with WebEdit.
        </p>
      </div>

      {/* ── Assessment card ───────────────────────────────────── */}
      <main className="flex-1 flex items-start justify-center px-4 py-10 bg-gray-50">
        <div className="w-full max-w-2xl">

          {/* ── INTRO ── */}
          {step === "intro" && (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 px-8 py-10 text-center">
              <p className="text-4xl font-bold mb-6 whitespace-nowrap" style={{ color: "#113D79", fontFamily: "Satoshi, sans-serif" }}>
                Save $500 per Year
              </p>
              <h2 className="text-2xl font-bold mb-3" style={{ color: "#113D79", fontFamily: "Satoshi, sans-serif" }}>
                How much is your website costing you?
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-md mx-auto">
                Most NZ small businesses are paying NZ$300–$800+ per year just to keep their website online.
              </p>


              <button
                onClick={() => setStep("q1")}
                className="w-full rounded-xl px-6 py-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "#113D79" }}
              >
                Start My Free Assessment →
              </button>
            </div>
          )}

          {/* ── Q1: Do you have a website? ── */}
          {step === "q1" && (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 px-8 py-10">
              <ProgressBar step={1} total={3} />
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Question 1 of 3</p>
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#113D79", fontFamily: "Satoshi, sans-serif" }}>
                Does your business already have a website?
              </h2>
              <p className="text-gray-400 text-sm mb-8">
                WebEdit is a migration service — we move your existing site onto free hosting.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Yes, we have a website", next: () => setStep("q2") },
                  { label: "No, not yet", next: () => setStep("no-website") },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={opt.next}
                    className="group rounded-2xl border-2 border-gray-100 p-6 text-left hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <p className="font-semibold text-gray-800 text-sm">{opt.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Q2: Ecommerce? ── */}
          {step === "q2" && (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 px-8 py-10">
              <ProgressBar step={2} total={3} />
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Question 2 of 3</p>
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#113D79", fontFamily: "Satoshi, sans-serif" }}>
                Is your website primarily an online store / ecommerce site?
              </h2>
              <p className="text-gray-400 text-sm mb-8">
                Ecommerce sites (with product catalogues, carts, checkout etc.) have different requirements.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "No — it's a business / service site", next: () => setStep("q3") },
                  { label: "Yes — we sell products online", next: () => setStep("disqualified-ecommerce") },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={opt.next}
                    className="group rounded-2xl border-2 border-gray-100 p-6 text-left hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <p className="font-semibold text-gray-800 text-sm">{opt.label}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep("q1")}
                className="mt-6 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back
              </button>
            </div>
          )}

          {/* ── Q3: Platform ── */}
          {step === "q3" && (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 px-8 py-10">
              <ProgressBar step={3} total={3} />
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Question 3 of 3</p>
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#113D79", fontFamily: "Satoshi, sans-serif" }}>
                Who hosts / runs your website?
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Select your current platform and we&apos;ll calculate your savings instantly.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`rounded-2xl border-2 p-4 text-left transition-all flex flex-col gap-2 ${
                      selectedPlatform === p.id
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-100 hover:border-blue-200 hover:shadow-sm"
                    }`}
                  >
                    <div>{p.icon}</div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm leading-tight">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("q2")}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => { if (selectedPlatform) setStep("results"); }}
                  disabled={!selectedPlatform}
                  className="flex-1 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40 hover:opacity-90"
                  style={{ background: "#113D79" }}
                >
                  Calculate My Savings →
                </button>
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {step === "results" && platform && (
            <div className="space-y-6">
              {/* Savings card */}
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 px-8 py-10">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: "#16a34a" }}
                  >
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Your results</p>
                    <p className="font-bold text-gray-800">Based on {platform.name} pricing</p>
                  </div>
                </div>

                {/* Big savings numbers + chart */}
                <div className="rounded-2xl px-6 py-8 mb-6" style={{ background: "#0d2f5e" }}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:gap-8">
                    {/* Numbers */}
                    <div className="text-center lg:text-left lg:flex-shrink-0">
                      <p className="text-white/60 text-sm mb-1">You could save</p>
                      <p
                        className="text-5xl sm:text-6xl font-bold text-white mb-1"
                        style={{ fontFamily: "Satoshi, sans-serif" }}
                      >
                        NZ${annualSavings.toLocaleString()}
                      </p>
                      <p className="text-white/60 text-sm mb-5">every year in website hosting fees</p>

                      <div className="border-t border-white/10 pt-5">
                        <p className="text-white/60 text-sm mb-1">Over 5 years, that&apos;s</p>
                        <p
                          className="text-3xl sm:text-4xl font-bold"
                          style={{ fontFamily: "Satoshi, sans-serif", color: "#BAA649" }}
                        >
                          NZ${fiveYearSavings.toLocaleString()}
                        </p>
                        <p className="text-white/40 text-xs mt-1">in hosting fees you no longer need to pay</p>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="mt-6 lg:mt-0 lg:flex-1 border-t border-white/10 pt-6 lg:border-t-0 lg:border-l lg:pl-6">
                      <SavingsLineChart monthlyAvg={platform.monthlyAvg} platformName={platform.name} />
                      <p className="text-center text-white/30 text-xs mt-1">Cumulative cost over 5 years (NZD)</p>
                    </div>
                  </div>
                </div>

                {/* Breakdown table */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Your current {platform.name} plan</p>
                      <p className="text-xs text-gray-400">Estimated monthly fee</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-500">~NZ${platform.monthlyAvg}/mo</p>
                      <p className="text-xs text-gray-400">NZ${platform.monthlyAvg * 12}/year</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">WebEdit hosting</p>
                      <p className="text-xs text-gray-400">Cloudflare Pages — forever free</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">NZ$0/mo</p>
                      <p className="text-xs text-gray-400">NZ$0/year</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">WebEdit AI editor access</p>
                      <p className="text-xs text-gray-400">Edit your site anytime in plain English</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-700">NZ$99/year</p>
                      <p className="text-xs text-gray-400">~NZ$8.25/mo</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3 rounded-xl px-3" style={{ background: "#f0f4ff" }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#113D79" }}>Annual saving</p>
                      <p className="text-xs text-gray-400">What you keep in your pocket each year</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color: "#113D79" }}>
                        NZ${(annualSavings - 99).toLocaleString()}/year
                      </p>
                    </div>
                  </div>
                </div>

                {/* Asterisk note */}
                <p className="text-xs text-gray-400 text-center">
                  * One-time migration fee of NZ$399 applies. Most clients break even within the first 12 months.
                </p>
              </div>

              {/* Contact form card */}
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 px-8 py-10">
                {/* Social proof banner */}
                <div
                  className="rounded-2xl px-5 py-4 mb-6 flex items-center gap-4"
                  style={{ background: "#f0f4ff" }}
                >
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "#113D79" }}>
                    <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#113D79" }}>
                      NZ$8,674 in website fees saved in 2026 so far
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Join other NZ businesses who&apos;ve already made the switch
                    </p>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-1" style={{ color: "#113D79", fontFamily: "Satoshi, sans-serif" }}>
                  Let&apos;s chat — no obligation, free quote
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  We&apos;ll review your website and send you a personalised migration plan. No cost, no pressure.
                </p>

                <AssessmentLeadForm platform={platform.name} annualSavings={annualSavings - 99} />

                {/* Testimonial */}
                <div className="mt-6 rounded-2xl border border-gray-100 p-5">
                  <Stars />
                  <p className="text-gray-600 text-sm leading-relaxed mt-2">
                    &ldquo;We&apos;re saving over $500 a year by moving away from our old website platform. The migration was done in a week and we haven&apos;t looked back.&rdquo;
                  </p>
                  <p className="text-xs font-semibold text-gray-500 mt-3">— Sarah M.</p>
                </div>
              </div>

              <div className="text-center pb-4">
                <button
                  onClick={() => { setStep("intro"); setSelectedPlatform(null); }}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← Start over
                </button>
              </div>
            </div>
          )}

          {/* ── DISQUALIFIED: ecommerce ── */}
          {step === "disqualified-ecommerce" && (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 px-8 py-12 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "#f0f4ff" }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#113D79" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: "#113D79", fontFamily: "Satoshi, sans-serif" }}>
                Sorry — WebEdit isn&apos;t the right fit for ecommerce stores
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-md mx-auto">
                WebEdit is designed for service businesses and brochure sites. Ecommerce stores with product catalogues, carts, and checkout systems have requirements that our platform isn&apos;t built for — and we&apos;d rather be honest than waste your time.
              </p>
              <div className="rounded-2xl px-5 py-4 mb-8 text-left" style={{ background: "#f0f4ff" }}>
                <p className="font-semibold text-sm mb-1" style={{ color: "#113D79" }}>Who WebEdit is perfect for:</p>
                <ul className="space-y-1.5">
                  {[
                    "Trades & services (plumbers, electricians, builders)",
                    "Hospitality (cafes, restaurants, accommodation)",
                    "Health & wellness (physios, gyms, beauty)",
                    "Professional services (lawyers, accountants, consultants)",
                    "Local businesses with informational websites",
                  ].map((item) => (
                    <li key={item} className="text-xs text-gray-600 flex items-start gap-2">
                      <svg className="w-3 h-3 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="#16a34a"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setStep("q2")}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ← Go back
                </button>
                <a
                  href="/"
                  className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#113D79" }}
                >
                  Learn more about WebEdit →
                </a>
              </div>
            </div>
          )}

          {/* ── NO WEBSITE ── */}
          {step === "no-website" && (
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 px-8 py-12 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "#f0f4ff" }}>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#113D79" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: "#113D79", fontFamily: "Satoshi, sans-serif" }}>
                No website yet? We can help with that too.
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-md mx-auto">
                WebEdit is primarily a migration service — but if you&apos;re starting from scratch, get in touch and we can discuss building you a site on free hosting from day one.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setStep("q1")}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <a
                  href="/#quote"
                  className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#113D79" }}
                >
                  Get in touch →
                </a>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="px-6 py-10" style={{ background: "#113D79" }}>
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-dm-serif)" }}>
              WebEdit
            </span>
            <span className="text-white/40 text-sm">by</span>
            <img src="/Logo_Drafts__1_-removebg-preview.png" alt="OneOneThree Digital" className="h-5 w-auto" />
          </div>
          <div className="flex gap-6">
            <a href="/#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors">How it works</a>
            <a href="/#pricing" className="text-sm text-white/60 hover:text-white transition-colors">Pricing</a>
            <a href="mailto:cam@oneonethree.co.nz" className="text-sm text-white/60 hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div className="max-w-2xl mx-auto border-t border-white/10 mt-8 pt-6">
          <p className="text-xs text-white/40 text-center">
            © 2026 OneOneThree Digital Ltd. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
