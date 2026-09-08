import React, { useEffect, useState } from "react";
import { Phone, Mail, Search, Star, ShieldCheck, MapPin, ArrowRight, Zap } from "lucide-react";
import PublicBookingFlow from "./PublicBookingFlow";
import { fetchPublicProfile, getSession } from "../lib/api";
import { BUSINESS } from "../lib/business";
import logo from "../assets/tydie-logo.png";

// The front door. What the research on trade websites agrees on, in order:
// within five seconds a visitor knows what you do, where, and how to hire
// you; a phone number they can tap; proof you're real (insured, an ABN,
// reviews); then the prices and the form. Everything the owner might want to
// change - the line under the logo, the area served, the reviews link - comes
// from Settings through a public read-only view, never from code.

const cleanPhone = (p) => (p || "").replace(/[^0-9+]/g, "");

export default function PublicSite() {
  const [profile, setProfile] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchPublicProfile().then(setProfile).catch(() => setProfile({}));
    getSession().then((s) => setSignedIn(!!s)).catch(() => {});
  }, []);

  const tagline = profile?.public_tagline || BUSINESS.tagline;
  const area = profile?.service_area;
  const abn = profile?.abn;
  const reviews = profile?.google_review_url;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Staff who land on the front door by accident: one tap back to work. */}
      {signedIn && (
        <a href="/team" className="flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-medium py-2.5 px-4 hover:bg-slate-800">
          <Zap size={14} /> You're signed in - open the app <ArrowRight size={14} />
        </a>
      )}

      <div className="px-4 py-8 sm:py-10">
        <div className="w-full max-w-md mx-auto">
          <img src={logo} alt={BUSINESS.name} className="w-full max-w-[240px] mx-auto rounded-xl shadow-sm mb-4" />

          {/* The five-second answer: what, where. */}
          <h1 className="text-center text-xl font-semibold text-slate-900 leading-snug text-balance">{tagline}</h1>
          {area && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-slate-600 mt-1.5">
              <MapPin size={14} className="text-blue-600" /> {area}
            </p>
          )}

          {/* Proof. Real things only - nothing here is decoration. */}
          <div className="flex items-center justify-center gap-x-4 gap-y-1 flex-wrap mt-4 text-sm text-slate-600">
            <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-emerald-600" /> Fully insured</span>
            {abn && <span className="text-slate-400">ABN {abn}</span>}
            {reviews && (
              <a href={reviews} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-700 hover:underline">
                <Star size={14} className="text-amber-500 fill-amber-400" /> Google reviews
              </a>
            )}
          </div>

          {/* How to hire you: call now, or read on. */}
          {BUSINESS.phone && (
            <a
              href={`tel:${cleanPhone(BUSINESS.phone)}`}
              className="flex items-center justify-center gap-2.5 w-full bg-blue-600 text-white rounded-xl px-5 py-4 mt-5 text-lg font-semibold shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Phone size={20} /> Call {BUSINESS.phone}
            </a>
          )}
          <p className="text-center text-sm text-slate-500 mt-2">Free quotes · flexible times · or send the form below and we'll call you</p>

          {profile?.public_blurb && <p className="text-center text-sm text-slate-600 mt-4 max-w-sm mx-auto">{profile.public_blurb}</p>}

          {/* Find a service. Typing "solar" jumps straight to it. */}
          <div className="relative mt-6">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What do you need? e.g. windows, driveway, solar"
              className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              aria-label="Search services"
            />
          </div>

          <div className="mt-4">
            <PublicBookingFlow query={query} />
          </div>

          {(BUSINESS.phone || BUSINESS.email) && (
            <div className="flex items-center justify-center gap-5 mt-6 text-sm text-slate-500">
              {BUSINESS.phone && (
                <a href={`tel:${cleanPhone(BUSINESS.phone)}`} className="flex items-center gap-1.5 hover:text-blue-700">
                  <Phone size={14} /> {BUSINESS.phone}
                </a>
              )}
              {BUSINESS.email && (
                <a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-1.5 hover:text-blue-700">
                  <Mail size={14} /> {BUSINESS.email}
                </a>
              )}
            </div>
          )}

          <div className="text-center mt-8">
            <div className="text-xs text-slate-400">{BUSINESS.name}{abn ? ` · ABN ${abn}` : ""}</div>
            <a href="/team" className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">Staff sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
