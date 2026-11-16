"use client";

import { useState } from "react";
import type { AiReport } from "@/lib/ai";
import type { Finding, H10Data, Listing, RuleReport, Scorecard } from "@/lib/types";

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

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "–" : n.toLocaleString("en-IN"));
const rank = (r: number | null, p: number | null) => (r === null ? "–" : `#${r}${p ? ` · P${p}` : ""}`);
const has = (text: string, phrase: string) => text.toLowerCase().includes(phrase.toLowerCase());

function H10Sections({ h, asin, title, highlights }: { h: H10Data; asin?: string; title: string; highlights: string }) {
  const d = h.details;
  const comps = h.competitors ?? [];
  return (
    <>
      {d ? (
        <div className="card">
          <h2>Helium 10 snapshot</h2>
          <div className="facts">
            <div><span>Listing Quality Score</span><strong>{d.lqs ?? "–"}</strong></div>
            <div><span>Best Sellers Rank</span><strong>{d.bsr ? `#${fmt(d.bsr)}` : "–"}</strong></div>
            {d.subcategories.slice(0, 2).map((c) => <div key={c.name}><span>{c.name}</span><strong>#{fmt(c.bsr)}</strong></div>)}
            <div><span>Rating</span><strong>{d.rating ?? "–"} ({fmt(d.reviews)})</strong></div>
            <div><span>Images</span><strong>{fmt(d.images)}</strong></div>
            <div><span>Est. monthly units</span><strong>{fmt(d.monthlySales)}</strong></div>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>Source: Helium 10. Sales figures are Helium 10 estimates, not Amazon data.</p>
        </div>
      ) : null}

      {h.keywords?.rows.length ? (
        <div className="card">
          <h2>Rank by keyword</h2>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Keyword</th><th>Search volume</th><th>Organic rank</th><th>Sponsored rank</th><th>Competing products</th><th>Title density</th><th>In title?</th><th>In highlights?</th></tr></thead>
              <tbody>
                {h.keywords.rows.slice(0, 25).map((k) => (
                  <tr key={k.phrase}>
                    <td>{k.phrase}{k.amazonChoice ? <span className="tag src" style={{ marginLeft: 6 }}>Amazon&apos;s Choice</span> : null}</td>
                    <td>{fmt(k.searchVolume)}</td>
                    <td>{rank(k.organicRank, k.organicPage)}</td>
                    <td>{rank(k.sponsoredRank, k.sponsoredPage)}</td>
                    <td>{k.competingProducts ? `>${fmt(k.competingProducts)}` : "–"}</td>
                    <td>{fmt(k.titleDensity)}</td>
                    <td>{has(title, k.phrase) ? "✓" : "✗"}</td>
                    <td>{has(highlights, k.phrase) ? "✓" : "✗"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
            Source: Helium 10 (last 30 days), top {Math.min(25, h.keywords.rows.length)} by search volume{h.keywords.total ? ` of ${fmt(h.keywords.total)} keywords found` : ""}. Lower rank number = better position. Search volume is a Helium 10 estimate.
          </p>
        </div>
      ) : null}

      {h.index ? (
        <div className="card">
          <h2>Keyword index check</h2>
          {h.index.reliable ? (
            <>
              <div className="tablewrap">
                <table>
                  <thead><tr><th>Keyword</th><th>Indexed?</th><th>Fix</th></tr></thead>
                  <tbody>
                    {h.index.rows.map((r) => (
                      <tr key={r.keyword}><td>{r.keyword}</td><td>{r.indexed ? "✓ Yes" : "✗ No"}</td><td>{r.indexed ? "–" : "Add the exact phrase to a bullet or to backend search terms."}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Source: Helium 10 Index Checker. {h.index.note}</p>
            </>
          ) : (
            <div className="notice warn" style={{ margin: 0 }}>{h.index.note} No index results are shown.</div>
          )}
        </div>
      ) : null}

      {comps.length ? (
        <div className="card">
          <h2>Competitor snapshot</h2>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Product</th><th>Price</th><th>Rating</th><th>Ratings</th><th>Title length</th><th>Images</th><th>Est. monthly units</th><th>BSR</th></tr></thead>
              <tbody>
                {d ? (
                  <tr><td><strong>This listing{asin ? ` (${asin})` : ""}</strong></td><td><strong>{fmt(d.price)}</strong></td><td><strong>{d.rating ?? "–"}</strong></td><td><strong>{fmt(d.reviews)}</strong></td><td><strong>{[...title].length}</strong></td><td><strong>{fmt(d.images)}</strong></td><td><strong>{fmt(d.monthlySales)}</strong></td><td><strong>{fmt(d.bsr)}</strong></td></tr>
                ) : null}
                {comps.map((c) => (
                  <tr key={c.asin}><td>{c.brand ? `${c.brand}: ` : ""}{c.title.slice(0, 90)}{c.title.length > 90 ? "…" : ""} <span className="muted">({c.asin})</span></td><td>{fmt(c.price)}</td><td>{c.rating ?? "–"}</td><td>{fmt(c.reviews)}</td><td>{[...c.title].length}</td><td>{fmt(c.images)}</td><td>{fmt(c.monthlySales)}</td><td>{fmt(c.bsr)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Source: Helium 10 competitor search (similar listings, in Helium 10&apos;s default order). Unit sales are estimates.</p>
        </div>
      ) : null}

      {h.warnings.length ? <div className="notice warn">{h.warnings.join(" ")}</div> : null}
    </>
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
          <div className="grade">{sc.coverage < 0.5 && sc.total !== null ? "Partial check" : sc.grade}</div>
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

      {listing.h10 ? <H10Sections h={listing.h10} asin={listing.asin} title={listing.title} highlights={listing.highlights} /> : null}

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
        Analysed {new Date(a.analysedAt).toLocaleString()}{ai ? ` · AI model ${ai.model}` : ""}.{listing.h10 ? " Rank, index and competitor data: Helium 10." : " Live search rank, keyword indexing and competitor data are not part of this report."}
      </footer>
    </section>
  );
}
