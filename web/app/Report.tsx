"use client";

import { useState } from "react";
import type { AiReport } from "@/lib/ai";
import type { Finding, Listing, RuleReport, Scorecard } from "@/lib/types";

export interface Analysis {
  listing: Listing;
  rules: RuleReport;
  ai: AiReport | null;
  aiNotice: string | null;
  scorecard: Scorecard;
  analysedAt: string;
}

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="small noprint"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable; the text is still selectable */
        }
      }}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Paste({ text, limit }: { text: string; limit?: number | null }) {
  const n = [...text].length;
  return (
    <div className="paste">
      <div className="txt">
        {text}
        {limit ? <div className={`count ${n > limit ? "over" : ""}`} style={{ float: "none" }}>{n}/{limit} characters{n > limit ? " — over the limit, shorten before use" : ""}</div> : null}
      </div>
      <Copy text={text} />
    </div>
  );
}

function FindingList({ items }: { items: Finding[] }) {
  return (
    <ul className="plain">
      {items.map((f, i) => (
        <li key={i}>
          <span className={`tag ${f.priority}`}>{f.priority}</span>
          <strong>{f.where}.</strong> {f.message}
          <div className="fix">Fix: {f.fix}</div>
        </li>
      ))}
    </ul>
  );
}

export default function Report({ a }: { a: Analysis }) {
  const { scorecard: sc, rules, ai, listing } = a;
  const p0 = rules.findings.filter((f) => f.priority === "P0");
  const rest = rules.findings.filter((f) => f.priority !== "P0");
  const pct = Math.round(sc.coverage * 100);

  return (
    <section aria-label="Analysis report">
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>Report{listing.asin ? ` · ${listing.asin}` : ""}</h2>
        <button type="button" className="noprint" onClick={() => window.print()}>Print / save as PDF</button>
      </div>

      {a.aiNotice ? <div className="notice warn">{a.aiNotice}</div> : null}

      <div className="card scorecard">
        <div className="total">
          <div className="num">{sc.total ?? "–"}</div>
          <div className="grade">{sc.grade}</div>
          <div className="cov">
            {ai ? "Rule checks + AI analysis" : "Rule checks only"} · {pct}% of the rubric assessed
          </div>
        </div>
        <div>
          {sc.dimensions.map((d) => (
            <div className="bar-row" key={d.key}>
              <div>{d.name} <span className="muted">({Math.round(d.weight * 100)}%)</span></div>
              <div className="bar"><span style={{ width: `${d.score ?? 0}%` }} /></div>
              <div className="val">{d.score === null ? <span className="muted">{ai ? "not enough data" : "needs AI"}</span> : d.score}</div>
            </div>
          ))}
          {pct < 100 ? (
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              The score covers only the items that could be checked from the text supplied. {ai ? "Images, variations, reviews and backend fields are not visible to this app." : "Turn on AI analysis for selling-point, clarity and buyer-fit scoring."}
            </p>
          ) : null}
        </div>
      </div>

      {ai ? <div className="card"><h2>Summary</h2><p style={{ margin: 0 }}>{ai.summary}</p></div> : null}

      {p0.length || ai?.p0.length ? (
        <div className="card p0box">
          <h2>Fix first (P0)</h2>
          <FindingList items={p0} />
          {ai?.p0.length ? (
            <ul className="plain" style={{ marginTop: p0.length ? 10 : 0 }}>
              {ai.p0.map((x, i) => (
                <li key={i}>
                  <span className="tag P0">P0</span><span className="tag src">AI</span>
                  <strong>{x.where}.</strong> {x.issue}
                  <div className="fix">Fix: {x.fix}</div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {ai ? (
        <div className="card">
          <h2>Paste-ready rewrite</h2>
          <h3>Title</h3>
          <Paste text={ai.suggested_title} limit={rules.facts.titleLimit} />
          <h3>Item Highlights</h3>
          <Paste text={ai.suggested_highlights} limit={rules.facts.highlightsLimit} />
          <h3>Bullets</h3>
          {ai.bullet_review.map((b) => (
            <div key={b.index} style={{ marginBottom: 10 }}>
              <div><strong>Bullet {b.index}</strong> <span className="muted">· {b.topic}{b.issue ? ` · ${b.issue}` : ""}</span></div>
              <Paste text={b.rewrite} />
            </div>
          ))}
          <h3>Backend search terms</h3>
          <Paste text={ai.keywords.backend_search_terms} />
        </div>
      ) : null}

      {rest.length ? (
        <div className="card">
          <h2>Rule check findings</h2>
          <FindingList items={rest} />
        </div>
      ) : !p0.length ? (
        <div className="card"><h2>Rule check findings</h2><p style={{ margin: 0 }}>No rule violations found in the text supplied.</p></div>
      ) : null}

      {rules.keywordRows.length ? (
        <div className="card">
          <h2>Your keywords</h2>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Keyword</th><th>Title</th><th>Highlights</th><th>Bullets</th></tr></thead>
              <tbody>
                {rules.keywordRows.map((k) => (
                  <tr key={k.keyword}><td>{k.keyword}</td><td>{k.inTitle ? "✓" : "✗"}</td><td>{k.inHighlights ? "✓" : "✗"}</td><td>{k.inBullets ? "✓" : "✗"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Exact-phrase match in the listing text. This is not a search rank.</p>
        </div>
      ) : null}

      {ai ? (
        <>
          <div className="card">
            <h2>Buyer and pain points</h2>
            <p><strong>Who:</strong> {ai.persona.who}<br /><strong>Budget:</strong> {ai.persona.budget}<br /><strong>Situation:</strong> {ai.persona.situation}<br /><strong>Cares about:</strong> {ai.persona.cares_about.join(", ")}</p>
            <div className="tablewrap">
              <table>
                <thead><tr><th>Pain point</th><th>Priority</th><th>Status</th><th>Suggested wording</th></tr></thead>
                <tbody>
                  {ai.pain_points.map((p, i) => (
                    <tr key={i}>
                      <td>{p.pain}</td>
                      <td>{p.priority}</td>
                      <td>{!p.answerable ? "Product limit" : p.covered ? `Covered${p.where_covered ? ` (${p.where_covered})` : ""}` : "Not covered"}</td>
                      <td>{p.suggestion || "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ai.omissions.length ? (
              <>
                <h3 style={{ marginTop: 14 }}>Facts the product has but the text leaves out</h3>
                <ul className="plain">
                  {ai.omissions.map((o, i) => (
                    <li key={i}><strong>{o.fact}</strong> <span className="muted">→ add to {o.add_to}</span><Paste text={o.suggested_wording} /></li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          {ai.sensitive_claims.length ? (
            <div className="card">
              <h2>Sensitive claims (AI review)</h2>
              <div className="tablewrap">
                <table>
                  <thead><tr><th>Where</th><th>Text</th><th>Type</th><th>Risk</th><th>Safer wording</th></tr></thead>
                  <tbody>
                    {ai.sensitive_claims.map((s, i) => (
                      <tr key={i}><td>{s.where}</td><td><span className="quote">{s.text}</span></td><td>{s.type}</td><td><span className={`tag ${s.risk}`}>{s.risk}</span></td><td>{s.safer_wording}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Regulatory points are risk flags, not legal advice. Confirm with your consultant.</p>
            </div>
          ) : null}

          <div className="card">
            <h2>Keywords</h2>
            <p><strong>Core:</strong> {ai.keywords.core.join(", ") || "–"}</p>
            <p style={{ margin: 0 }}><strong>Missing from the listing:</strong> {ai.keywords.missing.join(", ") || "none"}</p>
            <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Suggested from the listing and category knowledge. Search volume is not known.</p>
          </div>

          <div className="card">
            <h2>Rufus / Alexa readiness: {Math.round(ai.aeo.score)}/100</h2>
            <ul className="plain">
              {ai.aeo.gaps.map((g, i) => (
                <li key={i}><strong>{g.item}.</strong> {g.gap}<div className="fix">Fix: {g.fix}</div></li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>Action list</h2>
            <ul className="plain">
              {ai.actions.map((x, i) => (
                <li key={i}>
                  <span className={`tag ${x.priority}`}>{x.priority}</span>{x.problem}
                  <div className="fix">Fix: {x.fix}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Expected effect: {x.expected_effect}</div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <div className="card">
        <details>
          <summary>Score detail</summary>
          <div className="tablewrap" style={{ marginTop: 10 }}>
            <table>
              <thead><tr><th>Item</th><th>Score</th><th>Source</th><th>Note</th></tr></thead>
              <tbody>
                {sc.dimensions.flatMap((d) => [
                  <tr key={d.key}><td colSpan={4}><strong>{d.name}</strong></td></tr>,
                  ...d.items.map((it) => (
                    <tr key={it.key}>
                      <td>{it.name}</td>
                      <td>{it.score === null ? "–" : `${it.score}/${it.max}`}</td>
                      <td>{it.source === "rule" ? "Rule" : it.source === "ai" ? "AI" : "Not assessed"}</td>
                      <td>{it.note}</td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      {ai?.not_assessed.length ? (
        <div className="card">
          <h2>Not checked</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{ai.not_assessed.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </div>
      ) : null}

      <footer>
        Analysed {new Date(a.analysedAt).toLocaleString()}{ai ? ` · AI model ${ai.model}` : ""}. Live search rank, keyword indexing and competitor data are not part of this report.
      </footer>
    </section>
  );
}
