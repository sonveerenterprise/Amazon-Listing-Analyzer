# Amazon Listing Analyzer — web app

A web app built from the Amazon Listing Analyzer skill in this repository.

1. Enter an ASIN or Amazon product link (the app tries to fetch the public page), or paste the listing text.
2. Get a scored report: P0 issues first, rule-check findings with fixes, and a keyword matrix.
3. With an Anthropic API key on the server, the report adds the AI diagnosis: buyer persona, pain points, a rewritten title / Item Highlights / bullets within the marketplace's character limits, backend search terms, Rufus/Alexa readiness and an action list.

## Run it

```bash
cd web
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY for AI analysis
npm run dev                  # http://localhost:3000
```

`npm test` runs the unit tests. `npm run build && npm start` runs the production build.

## Full report (team only): the skill itself, run by Claude

The **Full report** card runs the repository's skill the way Claude Code does. The server starts Claude with `../SKILL.md`, the `references/` files and `assets/report_template.html`, and Claude does the whole workflow: live Amazon pages, every carousel image, A+, nutrition label, keyword usage, rank by keyword, indexing check, negative keywords, competitor snapshot and the ready-to-paste listing. The result is the same HTML report, shown in the app and downloadable. Editing the skill changes what the app produces; nothing in the app needs rewriting.

What it needs:

- `ANTHROPIC_API_KEY` and `TEAM_PASSWORD` in `.env.local`.
- A browser on the server for Amazon pages: Google Chrome if installed, otherwise run `npx playwright install chromium` once.
- Optional: Helium 10 connected (see below). Each report may use up to `REPORT_H10_MAX_CALLS` (default 12) Helium 10 calls.

What to expect:

- A report takes roughly 10–20 minutes and is billed to the API key. `REPORT_MAX_USD` (default 10) stops a report that would cost more. The finished report's cost is shown in the list.
- One report runs at a time. You can close the page; it keeps going.
- **Test Amazon access (free)** checks, without Claude, whether the server's browser can read a product page and a search page. If Amazon shows a robot check, the report still completes and marks that data "not obtained".

How it is contained: Claude gets only the tools in `lib/report/tools.ts` (the marketplace's own pages, Amazon image files, a fixed list of read-only Helium 10 tools, a character counter and the score calculator), no shell, and can read and write files only inside that report's folder under `data/reports/`. Reports are served as static documents with scripts disabled.

| Part | File |
|---|---|
| Engine (runs Claude with the skill) | `lib/report/agent.ts` |
| Tools Claude can use | `lib/report/tools.ts` |
| Amazon page reading | `lib/report/browser.ts` |
| Report jobs and storage | `lib/report/jobs.ts` |

The **Quick check** below it is the older, instant rule check on listing text. It is the only part public visitors can use.

## Team features: Helium 10 data

Signed-in team members can load a listing from Helium 10 instead of fetching it from Amazon. That adds a Helium 10 snapshot, rank by keyword (with search volume), a keyword index check and a competitor table to the report, and gives the AI analysis real rank data to work from. Public visitors never see or use Helium 10 data.

Setup:

1. Set `TEAM_PASSWORD` (8+ characters) and `APP_URL` (the app's public address, e.g. `https://analyzer.yourdomain.com`; for local use leave it unset) in `.env.local`, then restart the app.
2. Open the app, click **Team sign-in** and enter the password.
3. Click **Connect Helium 10** and sign in with the Helium 10 account. This is done once; the sign-in is stored on the server in `data/h10-auth.json` and never sent to browsers.
4. Enter an ASIN and click **Load from Helium 10**.

Each load uses 5 Helium 10 calls. The team bar shows how many are left this period, and the app refuses to load when fewer than 5 plus a reserve (`H10_RESERVE_CALLS`, default 20) remain. Helium 10 does not return the attribute table, so paste attributes if you want them checked.

The index check includes a control: a keyword the listing already ranks for must come back as indexed, otherwise the results are withheld as unreliable.

To try the team features without spending Helium 10 calls, run the local stand-in server with sample data:

```bash
node scripts/mock-h10.mjs
H10_MCP_URL=http://localhost:3310/mcp TEAM_PASSWORD=some-password npm run dev
```

If you change `APP_URL`, click **Disconnect Helium 10** and connect again.

## Deploy

Any Node host works. On Vercel, set the project's root directory to `web` and add `ANTHROPIC_API_KEY` as an environment variable. The AI analysis can take a minute or two, so the plan must allow function durations of that length (`maxDuration` is set to 300 seconds in `app/api/analyze/route.ts`).

## How it works

| Part | File |
|---|---|
| Marketplaces and character limits | `lib/marketplaces.ts` |
| Rule checks (title, bullets, attributes, sensitive claims, keywords) | `lib/rules.ts` |
| Weighted five-dimension score | `lib/scoring.ts` |
| Amazon page fetch and parser | `lib/fetchListing.ts` |
| Claude analysis | `lib/ai.ts` |
| Helium 10 connection and data mapping | `lib/h10Client.ts`, `lib/h10Data.ts` |
| Team sign-in | `lib/team.ts` |
| API routes | `app/api/*` |
| UI | `app/page.tsx`, `app/Report.tsx` |

The AI prompt uses the skill's reference files. `npm run knowledge` (run automatically by `dev` and `build`) bundles `../references/*.md` into `lib/knowledge.generated.ts`, so editing a reference file updates the app.

Scores only count rubric items that could be assessed from the data supplied; the report shows how much of the rubric that was. A dimension with less than 40% of its points assessed is not scored.

## Not built yet

- **Accounts and billing.** There is no sign-up, login or payment. AI use is limited per IP address in memory (`AI_RATE_LIMIT_PER_HOUR`, default 5), which is per server instance; use a shared store before going public at scale.
- **Rank, indexing and competitor data for public visitors.** These come from Helium 10 and are team-only, because every load draws on one Helium 10 account's quota.
- **Individual team accounts.** Team access is one shared password.
- **Full reports for public visitors.** They cost money and time per run, so they are team-only until accounts and billing exist.
- **Report history comparison** (previous rank column) and Seller Central data.
