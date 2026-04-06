"use client";

import { useState } from "react";
import { clients } from "@/config/clients";
import LeadForm from "@/components/LeadForm";
import LoginPanel from "@/components/LoginPanel";
import CostChart from "@/components/CostChart";
import { X } from "lucide-react";

/* ─── helpers ──────────────────────────────────────────────── */

function Stars() {
  return (
    <div className="flex gap-0.5 mb-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="w-4 h-4" viewBox="0 0 20 20" fill="#BAA649">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

const testimonials = [
  {
    quote:
      "We're saving over $500 a year by moving away from our old website platform. The migration was done in a week and we haven't looked back.",
    name: "Sarah M.",
  },
  {
    quote:
      "The AI editor is genuinely easy — feels like texting someone who just fixes your site. I updated our menu and hours in two minutes.",
    name: "James R.",
  },
  {
    quote:
      "Honestly better than our old platform in every way. We own our site, it loads faster, and we're not locked into a subscription.",
    name: "Priya K.",
  },
];

const steps = [
  {
    num: "01",
    title: "We clone your site",
    body: "Share your current website URL. We rebuild your entire site on free Cloudflare hosting — same look, same content, zero downtime.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "You go live for free",
    body: "Your domain points to your new site. Your old hosting subscription cancelled. Hosting costs you nothing, forever.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Edit with AI anytime",
    body: "Log in to WebEdit, describe what you want changed in plain English, and your site updates instantly. No code, no developers, no waiting.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
];

/* ─── page ──────────────────────────────────────────────────── */

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Nav ──────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/10"
        style={{ background: "#113D79" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-base font-bold text-white" style={{ fontFamily: "Inter, sans-serif" }}>
            WebEdit
          </span>
          <span className="text-sm text-white/50">by</span>
          <img src="/Logo_Drafts__1_-removebg-preview.png" alt="113 Digital" className="h-6 w-auto" />
        </div>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors">
            How it works
          </a>
          <a href="#pricing" className="text-sm text-white/70 hover:text-white transition-colors">
            Pricing
          </a>
          <a
            href="#quote"
            className="px-4 py-1.5 rounded-lg bg-white/10 border border-white/20 text-sm font-medium text-white/80 hover:text-white hover:bg-white/20 transition-all"
          >
            Get a Quote
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

      {/* ── Login drawer ─────────────────────────────────────── */}
      {/* Backdrop */}
      {showLogin && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowLogin(false)}
        />
      )}
      {/* Panel */}
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

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="flex flex-1">

        {/* Left — scrollable marketing content */}
        <main className="w-full min-w-0">

          {/* Hero */}
          <section className="px-10 lg:px-16 py-16 lg:py-20" style={{ background: "#0d2f5e" }}>
            <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12">

              {/* Left — text + form */}
              <div className="flex-1 min-w-0">
                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5"
                  style={{ fontFamily: "Satoshi, sans-serif" }}
                >
                  Stop <em>renting</em> your website.<br />
                  Own it — and edit it with AI.
                </h1>

                <p className="text-lg lg:text-xl text-white/70 mb-5">
                  We migrate your site onto free hosting — you can edit it at anytime with AI - simply explain what you&apos;d like to change, and it&apos;s live in seconds. <span className="text-white font-bold">Most clients save $500+ per year.</span>
                </p>

                {/* Powered by Claude badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 mb-10">
                  <span className="text-xs text-white/40">Powered by</span>
                  <span className="text-xs font-semibold" style={{ color: "#D97757" }}>Claude</span>
                </div>

                {/* Lead form */}
                <div id="quote" className="mb-0">
                  <LeadForm />
                </div>
              </div>

              {/* Right — cost comparison chart */}
              <div className="hidden lg:block flex-shrink-0 w-1/3 mt-2">
                <CostChart />
              </div>

            </div>

            {/* Demo video */}
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 mt-14">
              <video
                src="/webedit-demo.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-auto block"
              />
            </div>
          </section>

          {/* Testimonials */}
          <section className="px-10 lg:px-16 py-16 bg-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Client results
            </p>
            <h2
              className="text-3xl font-bold mb-10"
              style={{ fontFamily: "Satoshi, sans-serif", color: "#113D79" }}
            >
              What our clients say
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-6 flex flex-col"
                >
                  <Stars />
                  <p className="text-gray-700 text-sm leading-relaxed flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-5 pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="px-10 lg:px-16 py-16" style={{ background: "#f8f9fc" }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Simple process
            </p>
            <h2
              className="text-3xl font-bold mb-12"
              style={{ fontFamily: "Satoshi, sans-serif", color: "#113D79" }}
            >
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((step) => (
                <div key={step.num} className="flex flex-col">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 text-white"
                    style={{ background: "#113D79" }}
                  >
                    {step.icon}
                  </div>
                  <p className="text-xs font-bold tracking-widest text-gray-300 mb-1">{step.num}</p>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="px-10 lg:px-16 py-16 bg-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              No hidden fees
            </p>
            <h2
              className="text-3xl font-bold mb-10"
              style={{ fontFamily: "Satoshi, sans-serif", color: "#113D79" }}
            >
              Simple, transparent pricing
            </h2>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: "#113D79" }}>
                {/* Card header */}
                <div className="px-8 py-6" style={{ background: "#113D79" }}>
                  <h3 className="text-xl font-bold text-white mb-1">Full Migration + AI Editor</h3>
                  <p className="text-sm text-white/60">Everything you need to own your site and edit it with AI</p>
                </div>

                {/* Card body */}
                <div className="px-8 py-6 space-y-4">
                  {/* One-time */}
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f0f4ff" }}>
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="#113D79">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: "#113D79" }}>$399 <span className="text-base font-normal text-gray-400">one-time</span></p>
                      <p className="text-sm text-gray-500 mt-0.5">Migration: we clone and rebuild your site on free hosting</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Annual */}
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f0f4ff" }}>
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="#113D79">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: "#113D79" }}>+$99 <span className="text-base font-normal text-gray-400">/year</span></p>
                      <p className="text-sm text-gray-500 mt-0.5">WebEdit portal access: 2,000,000 tokens of AI-powered edits (~333 typical edits)</p>
                    </div>
                  </div>

                  <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#f0f4ff" }}>
                    <span className="font-semibold" style={{ color: "#113D79" }}>vs traditional website hosting:</span>
                    <span className="text-gray-600"> ~$500/year, forever. Most clients break even within 12 months.</span>
                  </div>

                  <a
                    href="#quote"
                    className="block w-full rounded-xl px-6 py-3.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: "#113D79" }}
                  >
                    Get Started — Free Quote →
                  </a>

                  <p className="text-xs text-gray-400 text-center">
                    Hosting is free forever on Cloudflare Pages. The $99/year is for WebEdit portal access only.
                  </p>
                </div>
              </div>

              {/* Cost comparison chart */}
              <div className="flex flex-col">
                <CostChart />
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="px-10 lg:px-16 py-12" style={{ background: "#113D79" }}>
            {/* Top row — brand + nav */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 mb-10">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-dm-serif)" }}>
                    WebEdit
                  </span>
                  <span className="text-white/40 text-sm">by</span>
                  <img src="/Logo_Drafts__1_-removebg-preview.png" alt="OneOneThree Digital" className="h-6 w-auto" />
                </div>
                <p className="text-sm text-white/50 max-w-xs">
                  AI-powered website editing on free hosting — built for New Zealand small businesses.
                </p>
              </div>

              {/* Nav links */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Navigation</p>
                <ul className="space-y-2">
                  <li><a href="#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors">How it works</a></li>
                  <li><a href="#pricing" className="text-sm text-white/70 hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#quote" className="text-sm text-white/70 hover:text-white transition-colors">Get a Quote</a></li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Get in Touch</p>
                <p className="text-sm text-white/70">Cam Brewitt</p>
                <a
                  href="mailto:cam@oneonethree.co.nz"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  cam@oneonethree.co.nz
                </a>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <p className="text-xs text-white/40">
                © 2026 OneOneThree Digital Ltd. All rights reserved.
              </p>
              <a
                href="https://oneonethree.co.nz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                See more marketing solutions at OneOneThree Digital →
              </a>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}
