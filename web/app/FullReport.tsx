"use client";

import { useCallback, useEffect, useState } from "react";
import { MARKETPLACES } from "@/lib/marketplaces";
import type { Job } from "@/lib/report/jobs";

const mins = (from: string, to?: string) => {
  const end = to ? new Date(to).getTime() : Date.now();
  const s = Math.max(0, Math.round((end - new Date(from).getTime()) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

export default function FullReport({ available, h10Connected }: { available: boolean; h10Connected: boolean }) {
  const [input, setInput] = useState("");
  const [marketplace, setMarketplace] = useState("IN");
  const [competitors, setCompetitors] = useState("");
  const [notes, setNotes] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [, tick] = useState(0);
  const [check, setCheck] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkAmazon() {
    setChecking(true);
    setCheck(null);
    try {
      const res = await fetch("/api/reports/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, marketplace }) });
      setCheck(JSON.stringify(await res.json(), null, 2));
    } catch {
      setCheck("Could not reach the server.");
    } finally {
      setChecking(false);
    }
  }

  const refresh = useCallback(async () => {
    const res = await fetch("/api/reports").catch(() => null);
    if (res?.ok) setJobs((await res.json()).jobs);
  }, []);

  const active = jobs.find((j) => j.status === "running");
  const activeId = active?.id;

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll only while a report is being written.
  useEffect(() => {
    if (!activeId) return;
    const timer = setInterval(() => {
      refresh();
      tick((n) => n + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeId, refresh]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, marketplace, competitors, notes }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "The report could not be started.");
      await refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setStarting(false);
    }
  }

  async function cancel(id: string) {
    await fetch(`/api/reports/${id}`, { method: "DELETE" }).catch(() => null);
    await refresh();
  }

  const finished = jobs.filter((j) => j.status !== "running");

  return (
    <div className="card">
      <h2>Full report</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        Runs the complete Amazon Listing Analyzer skill with Claude: live Amazon pages, every image, A+, keywords, rank, indexing, competitors
        {h10Connected ? ", Helium 10 data" : ""} and a ready-to-paste listing. Takes roughly 10–20 minutes and is charged to the server&apos;s Anthropic API key.
      </p>

      {!available ? (
        <div className="notice info">
          Full reports need an Anthropic API key on the server. Add ANTHROPIC_API_KEY to .env.local and restart the app. You can already test Amazon access below.
        </div>
      ) : null}
      {active ? (
        <div className="progress" role="status">
          <div className="toolbar" style={{ marginBottom: 6 }}>
            <strong>
              Writing the report for {active.asin}… {mins(active.createdAt)}
            </strong>
            <button type="button" className="small" onClick={() => cancel(active.id)}>
              Cancel
            </button>
          </div>
          <ol className="steps">
            {active.steps.slice(-8).map((s, i, arr) => (
              <li key={s.at + i} className={i === arr.length - 1 ? "now" : ""}>
                {s.label}
              </li>
            ))}
          </ol>
          <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
            {active.steps.length} steps so far. You can close this page; the report keeps going and will be listed below.
          </p>
        </div>
      ) : (
        <form onSubmit={start}>
          <div className="row">
            <div style={{ flex: "0 1 190px" }}>
              <label htmlFor="fr-mk">Marketplace</label>
              <select id="fr-mk" value={marketplace} onChange={(e) => setMarketplace(e.target.value)}>
                {MARKETPLACES.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name} ({m.domain})
                  </option>
                ))}
              </select>
            </div>
            <div className="grow">
              <label htmlFor="fr-asin">ASIN or product link</label>
              <input id="fr-asin" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="B0XXXXXXXX" autoComplete="off" required />
            </div>
          </div>
          <details style={{ margin: "10px 0" }}>
            <summary style={{ fontSize: 13 }}>Optional: competitors and notes</summary>
            <div className="field" style={{ marginTop: 8 }}>
              <label htmlFor="fr-comp">
                Competitor ASINs <span className="hint">(otherwise chosen from search results)</span>
              </label>
              <input id="fr-comp" type="text" value={competitors} onChange={(e) => setCompetitors(e.target.value)} placeholder="B0AAAAAAAA, B0BBBBBBBB" />
            </div>
            <div className="field">
              <label htmlFor="fr-notes">
                Notes for the analysis <span className="hint">(for example facts from Seller Central or a lab report)</span>
              </label>
              <textarea id="fr-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </details>
          {error ? (
            <div className="notice err" role="alert">
              {error}
            </div>
          ) : null}
          <div className="row">
            <button type="submit" className="primary" disabled={starting || !available || !input.trim()}>
              {starting ? "Starting…" : "Create full report"}
            </button>
            <button type="button" onClick={checkAmazon} disabled={checking || !input.trim()}>
              {checking ? "Testing… up to a minute" : "Test Amazon access (free)"}
            </button>
          </div>
          {check ? (
            <pre className="check-out" role="status">
              {check}
            </pre>
          ) : null}
        </form>
      )}

      {finished.length ? (
        <>
          <h3 style={{ marginTop: 18 }}>Reports</h3>
          <ul className="plain">
            {finished.map((j) => (
              <li key={j.id}>
                <div className="toolbar" style={{ marginBottom: 0 }}>
                  <div>
                    <strong>{j.asin}</strong>{" "}
                    <span className="muted">
                      · {j.marketplace} · {new Date(j.createdAt).toLocaleString()} · {mins(j.createdAt, j.finishedAt)}
                      {typeof j.costUsd === "number" ? ` · $${j.costUsd.toFixed(2)}` : ""}
                      {j.h10Calls ? ` · ${j.h10Calls} Helium 10 calls` : ""}
                    </span>
                  </div>
                  {j.hasReport ? (
                    <div className="row">
                      <a className="btn" href={`/api/reports/${j.id}/html`} target="_blank" rel="noreferrer">
                        Open report
                      </a>
                      <a className="btn" href={`/api/reports/${j.id}/html?download=1`}>
                        Download
                      </a>
                    </div>
                  ) : null}
                </div>
                {j.status !== "done" ? (
                  <div className="notice warn" style={{ margin: "8px 0 0" }}>
                    {j.error ?? "This report did not finish."}
                    {j.hasReport ? " A partial report was saved." : ""}
                  </div>
                ) : null}
                {j.status === "done" && j.summary ? (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ fontSize: 13 }}>Summary</summary>
                    <p style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", fontSize: 14 }}>{j.summary}</p>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
