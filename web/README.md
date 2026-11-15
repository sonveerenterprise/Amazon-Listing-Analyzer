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
| API routes | `app/api/*` |
| UI | `app/page.tsx`, `app/Report.tsx` |

The AI prompt uses the skill's reference files. `npm run knowledge` (run automatically by `dev` and `build`) bundles `../references/*.md` into `lib/knowledge.generated.ts`, so editing a reference file updates the app.

Scores only count rubric items that could be assessed from the data supplied; the report shows how much of the rubric that was. A dimension with less than 40% of its points assessed is not scored.

## Not built yet

- **Accounts and billing.** There is no sign-up, login or payment. AI use is limited per IP address in memory (`AI_RATE_LIMIT_PER_HOUR`, default 5), which is per server instance; use a shared store before going public at scale.
- **Live rank by keyword, keyword indexing check, competitor snapshot** (skill steps 3B, 3C, 11). These need Amazon search pages, which Amazon blocks for server requests; they need a paid data provider.
- **Image, A+ and nutrition-table review.** The app analyses text only.
- **Saved report history.**
