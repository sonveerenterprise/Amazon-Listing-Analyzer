"use client";

import { useEffect, useRef, useState } from "react";
import { MARKETPLACES, getMarketplace } from "@/lib/marketplaces";
import type { CategoryKey, H10Data } from "@/lib/types";
import FullReport from "./FullReport";
import Report, { type Analysis } from "./Report";

const CATEGORIES: [CategoryKey, string][] = [
  ["food", "Food / grocery"],
  ["kitchen", "Kitchen"],
  ["electronics", "Electronics"],
  ["furniture", "Furniture / home"],
  ["apparel", "Apparel"],
  ["toys", "Toys / baby"],
  ["outdoor", "Outdoor"],
  ["other", "Other"],
];

interface Status {
  teamEnabled: boolean;
  team: boolean;
  h10: { connected: boolean; usage: { limit: number; used: number; remaining: number } | null } | null;
  fullReports?: boolean;
}

interface Form {
  marketplace: string;
  category: CategoryKey;
  asin: string;
  title: string;
  highlights: string;
  bullets: string;
  description: string;
  brand: string;
  attributes: string;
  keywords: string;
}

const EMPTY: Form = { marketplace: "IN", category: "other", asin: "", title: "", highlights: "", bullets: "", description: "", brand: "", attributes: "", keywords: "" };

const lines = (s: string) => s.split(/\r?\n/).map((x) => x.replace(/^\s*[•\-*·]\s*/, "").trim()).filter(Boolean);

function parseAttributes(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of lines(s)) {
    const m = line.match(/^([^:\t]{1,100})[:\t]\s*(.+)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function Count({ value, limit }: { value: string; limit: number | null }) {
  const n = [...value.trim()].length;
  if (!limit) return <span className="count">{n} characters</span>;
  return <span className={`count ${n > limit ? "over" : ""}`}>{n}/{limit}</span>;
}

export default function Page() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [page, setPage] = useState<Analysis["listing"]["page"]>(undefined);
  const [lookup, setLookup] = useState("");
  const [aiAvailable, setAiAvailable] = useState(false);
  const [status, setStatus] = useState<Status>({ teamEnabled: false, team: false, h10: null });
  const [h10, setH10] = useState<H10Data | undefined>(undefined);
  const [teamOpen, setTeamOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [teamMsg, setTeamMsg] = useState<string | null>(null);
  const [loadingH10, setLoadingH10] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<{ kind: "warn" | "err" | "info"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  async function refreshStatus() {
    try {
      const s = await (await fetch("/api/status")).json();
      setAiAvailable(Boolean(s.ai));
      setStatus({ teamEnabled: Boolean(s.teamEnabled), team: Boolean(s.team), h10: s.h10 ?? null, fullReports: Boolean(s.fullReports) });
    } catch {
      setAiAvailable(false);
    }
  }

  useEffect(() => {
    refreshStatus();
    const flag = new URLSearchParams(window.location.search).get("h10");
    if (flag) {
      setTeamOpen(true);
      setTeamMsg(
        flag === "connected" ? "Helium 10 is connected." : flag === "cancelled" ? "The Helium 10 sign-in was cancelled." : flag === "signin" ? "Sign in to the team area first, then connect Helium 10." : "The Helium 10 sign-in did not complete. Try connecting again.",
      );
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function teamLogin(e: React.FormEvent) {
    e.preventDefault();
    setTeamMsg(null);
    const res = await fetch("/api/team/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }).catch(() => null);
    if (!res?.ok) {
      setTeamMsg((await res?.json().catch(() => null))?.error ?? "Could not reach the server.");
      return;
    }
    setPassword("");
    await refreshStatus();
  }

  async function teamLogout() {
    await fetch("/api/team/logout", { method: "POST" }).catch(() => null);
    setH10(undefined);
    await refreshStatus();
  }

  async function connectH10() {
    setTeamMsg(null);
    const res = await fetch("/api/h10/connect", { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.url) {
      setTeamMsg(data?.error ?? "Could not start the Helium 10 sign-in.");
      return;
    }
    window.location.href = data.url;
  }

  async function disconnectH10() {
    await fetch("/api/h10/disconnect", { method: "POST" }).catch(() => null);
    setH10(undefined);
    await refreshStatus();
  }

  async function loadH10() {
    if (!lookup.trim()) return;
    setLoadingH10(true);
    setFetchMsg(null);
    try {
      const keywords = form.keywords.split(/[\n,]/).map((k) => k.trim()).filter(Boolean);
      const res = await fetch("/api/h10/load", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: lookup, marketplace: form.marketplace, keywords }) });
      const data = await res.json();
      if (!res.ok) {
        setFetchMsg({ kind: "err", text: data.error ?? "Helium 10 could not load this listing." });
        if (data.notConnected) refreshStatus();
        return;
      }
      const l = data.listing;
      const top = ((data.h10 as H10Data).keywords?.rows ?? []).slice(0, 10).map((r) => r.phrase);
      setForm((f) => ({
        ...f,
        marketplace: l.marketplace,
        asin: l.asin,
        title: l.title,
        highlights: l.highlights,
        bullets: l.bullets.join("\n"),
        description: l.description,
        keywords: f.keywords.trim() ? f.keywords : top.join(", "),
      }));
      setPage(l.page);
      setH10(data.h10);
      if (data.usage) setStatus((s) => ({ ...s, h10: { connected: true, usage: data.usage } }));
      setFetchMsg({ kind: "info", text: `Loaded from Helium 10. ${l.warnings.join(" ")} Check the fields below, then analyse.` });
    } catch {
      setFetchMsg({ kind: "err", text: "Could not reach the server. Check your connection and try again." });
    } finally {
      setLoadingH10(false);
    }
  }

  const mk = getMarketplace(form.marketplace);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function doFetch(e: React.FormEvent) {
    e.preventDefault();
    if (!lookup.trim()) return;
    setFetching(true);
    setFetchMsg(null);
    try {
      const res = await fetch("/api/fetch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: lookup, marketplace: form.marketplace }) });
      const data = await res.json();
      if (!res.ok) {
        if (data.blocked) setForm((f) => ({ ...f, asin: data.asin, marketplace: data.marketplace }));
        setFetchMsg({ kind: data.blocked ? "warn" : "err", text: data.error });
        return;
      }
      const l = data.listing;
      setForm((f) => ({
        ...f,
        marketplace: l.marketplace,
        asin: l.asin,
        title: l.title,
        highlights: l.highlights,
        bullets: l.bullets.join("\n"),
        description: l.description,
        brand: l.brand,
        attributes: Object.entries(l.attributes as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("\n"),
      }));
      setPage(l.page);
      setH10(undefined);
      setFetchMsg({ kind: l.warnings.length ? "warn" : "info", text: l.warnings.length ? `Fetched. ${l.warnings.join(" ")}` : "Fetched. Check the fields below, then analyse." });
    } catch {
      setFetchMsg({ kind: "err", text: "Could not reach the server. Check your connection and try again." });
    } finally {
      setFetching(false);
    }
  }

  async function analyse(e: React.FormEvent) {
    e.preventDefault();
    setAnalysing(true);
    setError(null);
    try {
      const listing = {
        marketplace: form.marketplace,
        category: form.category,
        asin: /^[A-Z0-9]{10}$/.test(form.asin) ? form.asin : undefined,
        title: form.title,
        highlights: form.highlights,
        bullets: lines(form.bullets),
        description: form.description,
        brand: form.brand,
        attributes: parseAttributes(form.attributes),
        keywords: form.keywords.split(/[\n,]/).map((k) => k.trim()).filter(Boolean),
        page,
        // Helium 10 data only belongs to the ASIN it was loaded for.
        h10: h10 && /^[A-Z0-9]{10}$/.test(form.asin) ? h10 : undefined,
      };
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listing, useAi: aiAvailable && useAi }) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The analysis failed.");
        return;
      }
      setAnalysis(data);
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setError("Could not reach the server. Your text is still here; try again.");
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <main>
      <div className="noprint">
        <h1>Amazon Listing Analyzer</h1>
        <p className="lede">Score a listing on compliance, attributes, selling points, clarity and buyer fit, and get fixes you can paste into Seller Central.</p>

        {status.teamEnabled ? (
          <div className="card team">
            {!status.team ? (
              teamOpen ? (
                <form className="row" onSubmit={teamLogin}>
                  <div className="grow">
                    <label htmlFor="teampw">Team password</label>
                    <input id="teampw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                  </div>
                  <button type="submit" disabled={!password}>Sign in</button>
                </form>
              ) : (
                <button type="button" className="small" onClick={() => setTeamOpen(true)}>Team sign-in</button>
              )
            ) : (
              <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <strong>Team mode.</strong>{" "}
                  {status.h10?.connected ? `Helium 10 connected${status.h10.usage ? ` · ${status.h10.usage.remaining} of ${status.h10.usage.limit} calls left` : ""}.` : "Helium 10 is not connected."}
                </div>
                <div className="row">
                  {status.h10?.connected ? <button type="button" className="small" onClick={disconnectH10}>Disconnect Helium 10</button> : <button type="button" className="small primary" onClick={connectH10}>Connect Helium 10</button>}
                  <button type="button" className="small" onClick={teamLogout}>Sign out</button>
                </div>
              </div>
            )}
            {teamMsg ? <div className="notice info" style={{ margin: "10px 0 0" }} role="status">{teamMsg}</div> : null}
          </div>
        ) : null}

        {status.team ? (
          <>
            <FullReport available={Boolean(status.fullReports)} h10Connected={Boolean(status.h10?.connected)} />
            <h2 className="sub">Quick check</h2>
            <p className="lede" style={{ marginBottom: 12 }}>The fast rule check on the listing text. It does not look at images, A+ or search pages.</p>
          </>
        ) : null}

        <form className="card" onSubmit={doFetch}>
          <h2>1. Load a listing</h2>
          <div className="row">
            <div style={{ flex: "0 1 190px" }}>
              <label htmlFor="mk">Marketplace</label>
              <select id="mk" value={form.marketplace} onChange={(e) => set("marketplace", e.target.value)}>
                {MARKETPLACES.map((m) => <option key={m.code} value={m.code}>{m.name} ({m.domain})</option>)}
              </select>
            </div>
            <div className="grow">
              <label htmlFor="lookup">ASIN or product link <span className="hint">(optional)</span></label>
              <input id="lookup" type="text" value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="B0XXXXXXXX or https://www.amazon.in/dp/…" autoComplete="off" />
            </div>
            <button type="submit" disabled={fetching || loadingH10 || !lookup.trim()}>{fetching ? "Fetching…" : status.team ? "Fetch from Amazon" : "Fetch listing"}</button>
            {status.team && status.h10?.connected ? (
              <button type="button" className="primary" onClick={loadH10} disabled={fetching || loadingH10 || !lookup.trim()}>{loadingH10 ? "Loading… up to a minute" : "Load from Helium 10"}</button>
            ) : null}
          </div>
          {status.team && status.h10?.connected ? (
            <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
              Helium 10 adds keyword ranks, an index check and competitors. Each load uses 5 Helium 10 calls{status.h10.usage ? `; ${status.h10.usage.remaining} of ${status.h10.usage.limit} left this period` : ""}.
            </p>
          ) : null}
          {fetchMsg ? <div className={`notice ${fetchMsg.kind}`} style={{ margin: "12px 0 0" }} role="status">{fetchMsg.text}</div> : <p className="muted" style={{ margin: "10px 0 0", fontSize: 13 }}>Amazon sometimes blocks automatic fetching. You can always paste the listing text below instead.</p>}
        </form>

        <form className="card" onSubmit={analyse}>
          <h2>2. Check the listing text</h2>
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="grow">
              <label htmlFor="cat">Category</label>
              <select id="cat" value={form.category} onChange={(e) => set("category", e.target.value as CategoryKey)}>
                {CATEGORIES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </div>
            <div className="grow">
              <label htmlFor="brand">Brand <span className="hint">(optional)</span></label>
              <input id="brand" type="text" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="title">Title <Count value={form.title} limit={mk.titleLimit} /></label>
            <textarea id="title" rows={2} value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="hl">Item Highlights <span className="hint">(the line under the title, if any)</span> <Count value={form.highlights} limit={mk.highlightsLimit} /></label>
            <textarea id="hl" rows={2} value={form.highlights} onChange={(e) => set("highlights", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="bullets">Bullet points <span className="hint">(one per line)</span></label>
            <textarea id="bullets" rows={7} value={form.bullets} onChange={(e) => set("bullets", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="attrs">Product attributes <span className="hint">(optional; one per line as “Name: value”)</span></label>
            <textarea id="attrs" rows={4} value={form.attributes} onChange={(e) => set("attributes", e.target.value)} placeholder={"Net Quantity: 500 g\nDiet Type: Vegetarian"} />
          </div>
          <div className="field">
            <label htmlFor="desc">Description <span className="hint">(optional)</span></label>
            <textarea id="desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="kw">Keywords you want to rank for <span className="hint">(optional; comma or line separated)</span></label>
            <textarea id="kw" rows={2} value={form.keywords} onChange={(e) => set("keywords", e.target.value)} />
          </div>

          {aiAvailable ? (
            <label className="check field">
              <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
              <span>Include AI analysis <span className="hint">(buyer persona, pain points, rewritten title and bullets; takes about a minute)</span></span>
            </label>
          ) : (
            <div className="notice info">AI analysis is not set up on this server, so this run uses the free rule checks only.</div>
          )}
          {error ? <div className="notice err" role="alert">{error}</div> : null}
          <button type="submit" className="primary" disabled={analysing || !form.title.trim()}>
            {analysing ? (aiAvailable && useAi ? "Analysing… about a minute" : "Analysing…") : "Analyse listing"}
          </button>
        </form>
      </div>

      <div ref={reportRef}>{analysis ? <Report a={analysis} /> : null}</div>
    </main>
  );
}
