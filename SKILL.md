---
name: amazon-listing-analyzer
display_name: Amazon Listing Analyzer
description: Multi-marketplace Amazon listing diagnosis. Five weighted dimensions (compliance, attribute completeness, selling-point coverage, bullet clarity and order, buyer persona and pain points) plus add-on checks (keywords, sensitive claims, IP risk, cross-carrier consistency, per-image review, nutrition table and lab parameters, A+ content, Rufus/Alexa discoverability). Outputs actionable fixes and an English HTML report. Use when the user asks to analyze, diagnose, audit or optimize an Amazon listing or ASIN.
icon: 📦
version: 3.0.0
author: Floki Garvey (original); Virendrasinh Jethwa (English version and extensions)
license: MIT
disable-model-invocation: true
---

# Amazon Listing Analyzer

Diagnose an Amazon listing across five weighted dimensions plus add-on checks, then give fixes the seller can paste directly. **All output is in English.**

## Five-dimension framework

| Dimension | Weight | Core question |
|---|---|---|
| 1. Compliance | 25% | Does the listing break any marketplace or legal rule? |
| 2. Attribute completeness | 20% | Are backend fields and key specifications filled? |
| 3. Selling-point coverage | 20% | Do title and bullets give buyers everything they need to decide? |
| 4. Bullet clarity and order | 20% | Is each bullet clear, single-topic and in a sensible order? |
| 5. Buyer persona and pain points | 15% | Do the selling points answer what the target buyer cares about most? |

Scoring rules: `references/scoring_criteria.md`. Calculator: `scripts/calculate_scores.py`.

## Inputs

1. ASIN (ask for the marketplace, or default to the one the user has used before; otherwise US).
2. Product URL (marketplace is taken from the domain).
3. Pasted listing text (title, highlights, bullets, attributes).
4. Competitor ASINs (optional).
5. Local materials for unlisted products: an image folder plus a text file; the user must state marketplace and language.
6. Product details only (new product, no ASIN yet): use **Mode A** (see after Step 13) to build a listing from scratch.
6. Seller Central screenshots or lab reports shared by the user (use them to correct anything the public page can't show).

## Marketplace rules

Load `references/multi_site_adaptation.md` before fetching. Add language and currency parameters (for example `?language=en_IN&currency=INR`), then check that the page language and currency symbol match.

**Title and Item Highlights limits:**
- US: title 75 characters (enforced).
- India: title **75** characters and Item Highlights **75** characters (confirmed by the seller).
- Other marketplaces: check Seller Central; 200 is only a reference value.

## Data collection

Priority: connected Amazon data tools → live page in the browser → pasted data. Collect:
- Title; Item Highlights (`.dp-title-differentiators`; also in the page `<title>` after "|"); bullets (verbatim).
- Product details, Important information (ingredients, directions, safety), description, A+ (modules, text, image URLs, alt text).
- Images: parse `colorImages.initial` (MAIN, PT01…) for the **current variant only**; ignore other variants' thumbnails.
- Price, MRP, rating, review count, badges (Amazon's Choice), BSR, variants, video, review samples.
- The "Product overview" table may be empty in some categories; that does **not** mean attributes are missing. Ask for Seller Central screenshots before scoring attributes harshly.

## Workflow

### Step 1 — Marketplace and parameters
Identify the marketplace, load parameters, fetch, verify language and currency.

### Step 2 — Five-dimension diagnosis

**Dimension 1: Compliance (25%)**
- Title length within the marketplace limit (over the limit = P0); no banned characters (! $ ? _ { } ^ ~), promo or subjective words ("best", "cheap", "original"), unsupported claims, or competitor brand names. Avoid all-caps unless the registered brand is in capitals.
- Main image: pure white background, no added text, watermark or border; product fills ≥85% of the frame; ≥1000 px. Text printed on the packaging itself is allowed.
- Bullets: no price, promotion, shipping, contact details or review quotes.
- Variations: same category, consistent naming; MRP matches each printed label.
- Images: no unauthorized logos, misleading comparisons; realistic AI people need XMP tags.
- No suppression notice.

**Dimension 2: Attribute completeness (20%)**
- Category key attributes filled (food: ingredients, diet type, allergens, storage, shelf life, nutrition, container, FSSAI licence; furniture: dimensions, material, load; electronics: power, interfaces, certifications).
- Item Highlights filled; A+ present; search terms used without brand names or repetition.
- Part/model number is a SKU, not a description.

**Dimension 3: Selling-point coverage (20%)**
Coverage matrix (7 items): size/quantity; material or composition; core function with numbers; who it's for and when; preparation, assembly or how to use; compatibility (if relevant); differentiation. For food, "material" = ingredients/composition and "assembly" = preparation/usage.
Warranty or after-sales promises are **not** required in bullets; don't penalize their absence.

**Dimension 4: Clarity and order (20%)**
One topic per bullet; no repetition; order = core benefit → supporting facts → use case → packaging/trust facts; natural local language; readable (short sentences, headers); consistent facts across title, bullets, images and attributes.

**Dimension 5: Buyer persona and pain points (15%)**
- Persona card (who, budget, situation, what they care about).
- 5–8 pain points (from reviews, competitor reviews, Q&A, category knowledge), each marked **product can answer / can't answer**.
- Pain-to-selling-point map. Pain points the product can't answer are excluded from the score.
- **Omission list:** things the product already has (from attributes, images, A+) that the text doesn't mention, each with where to add it and suggested wording.
- Q&A coverage and response to negative-review themes.

### Step 3 — Keyword coverage (add-on)
- Title and highlights must each contain ≥1 core keyword (missing = P1).
- Coverage matrix: keyword → title → highlights → bullets → A+ → status. Benchmark against top search-result titles on the same marketplace.
- Flag off-topic or risky words (other brands' names, misleading terms).
- Never recommend sensitive or regulated words (disease terms, warranty claims) as keywords, even if searched.
- Suggest backend search terms (no brand names, no repetition of title words; local-language and phonetic spellings are useful).

### Step 3A — Keyword usage, Scribbles-style (always; in the detailed report)
Show how many times each target **word** and **phrase** is used in the **current live listing** (not the rewrite).

1. Lists: 20–30 single words and 15–25 phrases from keyword mining (Step 3B), the rank check and the competitor keyword gap.
2. Count whole-word, case-insensitive matches in title, Item Highlights, each bullet, description and backend search terms. "sugar" must not count inside "sugarfree"; treat "-" and "–" as the same.
3. Output per list (Words, then Phrases):
   - Header "Words (used / total · %)" with a progress bar.
   - Coloured chips with the total count (×n). Colour = best place used: green title · purple highlights · blue bullets · orange description · teal backend only · red not used.
   - A table: keyword → title → highlights → bullets → description → backend → total, sorted by total.
   - A "Not used yet" line for words and for phrases.
4. **Remark (always print):** "Backend search terms can only be measured after Seller Central login/authorization, or if the seller pastes them. Until then, the Backend column shows '–'."

### Step 3B — Rank by keyword (always run; always in the detailed report)
Run this in every ASIN check, and include the table in every detailed HTML report. A free, Cerebro-style keyword table built from live public pages only.

**1. Build the keyword list (10–20 keywords).**
- Run Amazon autocomplete mining for 1–2 seed terms (the product's core keyword): from a tab on the target Amazon site, call the same-origin endpoint `/suggestions?limit=11&suggestion-type=KEYWORD&alias=aps&site-variant=desktop&version=3&lop=en_IN&mid={marketplaceId}&prefix={prefix}` (India `mid=A21TJRUUN4KGV`) for the seed, "best/top {seed}" and "{seed} a…z". (Plain HTTP calls and cross-site calls are usually blocked; use the browser tab.)
- Add the title's and highlights' key phrases, spelling variants and local-language terms.
- Exclude other brands' names and sensitive/disease terms from recommendations (they can still be measured, marked "brand term").
- Prioritise: core term, variants, long-tail and use-case terms.

**2. For each keyword, open the live search page** (`/s?k={keyword}&language=...`; page 1, and page 2 for core keywords not on page 1) and measure:

| Column | How |
|---|---|
| Organic rank | Position of the ASIN among organic results (skip "Sponsored"), written `#27 · P1`; page 2 continues the count (#63 · P2) |
| Sponsored rank | Position among sponsored results on the page if the ASIN appears as an ad (`#13 · P1`), else "–" |
| Amazon suggests? (AR) | ✓ if the exact keyword appears in Amazon's suggestion list (prefix = the keyword), else ✗. Don't report a numeric AR rank: Helium's "Amazon Rec. Rank" is a different, proprietary measure |
| Match type | O = ranks organically, SP = seen as sponsored, AR = Amazon suggests the keyword |
| Competing products | From the results bar ("1-48 of over 2,000 results" → ">2,000") |
| Sponsored ASINs | Number of sponsored placements counted on page 1 (state "page 1 count") |
| Title density | Number of page-1 result titles containing the exact phrase (case-insensitive) |
| In title? / In highlights? | ✓, ✗, or Partial (near-match, e.g. "Himalaya" only) for this listing |
| Note | One line: what helps or what to add |

Output table:

| Keyword | Organic rank | Sponsored rank | Amazon suggests? | Match type | Competing products | Sponsored ASINs (p1) | Title density | In title? | In highlights? | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| leh berry seabuckthorn juice | #5 · P1 | – | ✓ | O, AR | 311 | 12 | 0 | ✗ | ✓ | Ranks from highlights |

Tested against Helium 10 Cerebro (Nov 2026): organic rank, competing products and title density matched within a few positions/products.

**3. Summary above the table:**
- **Keyword distribution:** total keywords checked · organic (ranked on pages checked) · paid (seen as sponsored) · Amazon-suggested (AR).
- **Word frequency:** the 10–15 most common words across the keyword list with counts (e.g. juice (12), buckthorn (10)).

**4. Optional — Brand Analytics:** if the user shares an Amazon Brand Analytics (Search Query Performance / Top Search Terms) export, add **Click share** and **Conversion share** (and Search Frequency Rank) columns for matching keywords, citing the report period.

**Rules**
- Below the table: "Lower number = better position. Organic positions exclude sponsored results; page 1 held N organic results. Single snapshot on {date}; results vary by location and personalisation."
- **Never show search volume, search-volume trend, IQ score, CPR, traffic or revenue.** These are paid-tool estimates (e.g. Helium 10) and can't be measured from public pages. If the user shares a paid-tool export, those columns can be added with the source named.
- History: if earlier snapshots exist in `~/reports/`, add a "Previous rank" column and the change; otherwise don't mention history.

### Step 3C — Keyword indexing check (always run; always in the detailed report)
Checks whether Amazon has indexed a word for this ASIN. Search `{ASIN} {word}` on the target marketplace (from a tab on that Amazon site, e.g. `fetch('/s?k=' + encodeURIComponent(ASIN + ' ' + word))`). If the result HTML contains `data-asin="{ASIN}"`, the word is indexed.

- Test 10–16 words: core keywords, claims and certifications (e.g. organic, NPOP, NMR), backend-only terms, local-language words (e.g. shahad, madhu), and spelling variants (crystallized/crystallised).
- **Always run a control** with 3–4 unrelated words (e.g. laptop, zebra) in the same batch. If any control comes back indexed, the test is unreliable; say so and don't report results.
- Amazon doesn't always match word forms ("crystallization" in a bullet doesn't index "crystallized"), so test the exact form shoppers type.

Output one table:

| Word | Indexed? | Fix |
|---|---|---|
| madhu | ❌ No | Add to backend search terms |

Fix = where to add the word (title, highlights, bullets or backend search terms), respecting character limits and claim rules. Never recommend competitor brand names in backend terms.

### Step 3D — Starter negative keywords for ads (always; in the detailed report)
A **pre-emptive** list for Sponsored Products, built from the autocomplete mining in Step 3B (real shopper searches) and the listing facts. It blocks obvious waste before it happens; it is **not** a waste analysis (that needs the seller's Search Term Report).

Start with a short **summary**: what the list is and isn't, and a table of groups → number of terms → match type.

Then four groups, each in its own paste-ready code block (one term per line):
1. **Negative phrase — wrong form or pack:** suggestions asking for a different format or size than this ASIN (e.g. for drops: powder, 1 kg, jar, sachets, pellets, tablets, bulk; for a powder: drops, liquid, syrup).
2. **Negative phrase — wrong formula:** ingredients or variants this product doesn't have (e.g. "with erythritol", "allulose" on a product without allulose, "brown", "golden").
3. **Negative phrase — wrong product:** different products that share the seed word (e.g. chocolate, cookies, biscuits, hair oil, chikki).
4. **Negative exact — unsupported claim:** searches for an attribute the product can't claim (e.g. "… organic" when not certified). Use exact so the core term isn't blocked.

For each group, add one line saying which real suggestions it came from.

Rules:
- Amazon Sponsored Products supports only **negative exact** and **negative phrase**; never suggest negative broad.
- Never negate the core keyword, close substitutes on the same format (e.g. "stevia drops" for monk fruit drops), or terms the product ranks for (Step 3B).
- Don't add competitor brand names automatically; that's the seller's choice (negate if they waste spend, keep for conquest campaigns).
- Don't estimate savings or ACoS; say real negatives come from search terms with 10+ clicks and 0 orders.

### Step 4 — IP and misrepresentation risk (add-on)
Trademarks (other brands' names in title/bullets/images), copyright, known patent risks (flag only, not a legal opinion), certification marks used without right, naming that misrepresents the main ingredient. Levels: P0 confirmed / P1 risk signal / P2 preventive.

### Step 5 — Sensitive claims (add-on)
Scan title, highlights, bullets, A+, attributes and image text. Load `references/sensitive_words.md`.
- Disease, medical or treatment claims (for example "diabetic friendly", "cures", "boosts immunity" without approval) = P0.
- Absolute or superlative words without proof = P1.
- Certification claims without evidence (organic, lab certified, NABL, FDA, CE) = P0/P1. A product can't be "NABL certified"; labs are accredited.
- "Pure" / "natural" only for single-ingredient foods with nothing added (India: FSSAI Advertising & Claims Regulations 2018).
- India organic: FSSAI Organic Food Regulations 2017 recognise NPOP / PGS-India and the Jaivik Bharat logo; lead with those before USDA.
- Warranty statements: not in title or images; no guarantee promises in bullets or A+; use the dedicated Seller Central warranty field.
Output: location → text → type → risk → suggested wording.

### Step 6 — Cross-carrier consistency (add-on)
Compare images, text, attributes, variants and A+ for the same facts (size, weight, materials, ingredients, counts, names). Same attribute with conflicting values = P0; fact in only one place = P1; wording differences = P2. A+ showing a different variant = P0. See `references/consistency_check.md`.

### Step 6B — Nutrition table and lab parameters (add-on; required for food)
Run whenever a nutrition table is visible in any image, or the user shares a lab report or backend nutrition screenshot. Zoom in and read the table. **Guide only, parameters only:** don't comment on the report's issuer, customer name or accreditation unless asked.

Checks (per 100 g / 100 ml, and per serving if shown):
1. **Energy math:** kcal ≈ 4×protein + 4×carbohydrate + 9×fat (g) (+2×fibre, +2.4×polyols, +0.4×allulose). Flag deviations >10%.
2. **Parts ≤ whole:** total sugars ≤ carbohydrate; added sugars ≤ total sugars; saturated + trans ≤ total fat; omegas/fatty acids ≤ total fat; fibre ≤ carbohydrate.
3. **Unit plausibility:** macros in g, not mg; vitamins and minerals at believable levels (folic acid in µg; many times the RDA per 100 g/ml = likely unit error).
4. **Category ranges:** honey ≈ 300–330 kcal, ~80 g carbs per 100 g; fruit-pulp drinks ≈ 20–60 kcal per 100 ml; "zero calorie" must show ≤4 kcal per 100 g.
5. **Serving math:** per serving = per 100 × serving size / 100; servings × serving size ≈ net quantity.
6. **%RDA** consistent with the stated basis (India: 2000 kcal, FSSAI 2020).
7. **Claims vs table:** "no added sugar" needs added sugars = 0; "rich in / source of" must meet thresholds; "zero sugar / low calorie" must match.
8. **Same numbers and units** in images, bullets and Seller Central fields.
Output: parameter → value + unit → check → OK/deviation → what to verify. Deviations are P1 (P0 if they create a false nutrition or health claim).

### Step 7 — Per-image review (add-on)
Review **every** carousel image one by one: type, selling point, rendering/photo quality, design, layout and text size on mobile, order. Score each 0–100. Flag duplicates, label rotations that add nothing, claims in images, cross-variant images. Build a text-vs-image coverage matrix for key selling points and suggest a new order. See `references/image_diagnosis.md`.

### Step 8 — A+ content: current audit + compliant improvement plan (always in the detailed report)

**8a. Audit the current A+.** Existence and type (Basic: up to 5 modules; Premium: up to 7; Brand Story separate). Module list (type, content, issue), duplicate images, alt text quality (empty or codes = fix), sensitive claims in A+ text and images, comparison-table values vs attributes, consistency with bullets, typos, carousel order (scene → function → detail → comparison → CTA), and which variant the A+ shows. Look at every A+ image. See `references/aplus_diagnosis.md`.

**8b. Write a compliant A+ plan** that fixes what 8a found, using the available module count plus Brand Story. Always state the tier in the plan heading, in brackets:
- **(Basic A+: 5 modules / 5 images)**: use modules 1, 2, 3, 5 and an FAQ via **Standard Text** (Basic has no Q&A module).
- **(Premium A+: 7 modules / 7 images)**: use all 7 below.
If the current A+ uses Premium modules, give the Premium plan; otherwise give the Basic plan and note what Premium would add.

Default flow (adapt to the product):

| # | Purpose | Typical module |
|---|---|---|
| 1 | Hero: what it is + core value | Full-width image + text |
| 2 | Problem → solution (the buyer's main worry, e.g. aftertaste, adulteration) | Split image / image + text |
| 3 | Features → benefits with numbers (4 icons) | Four-image / icons |
| 4 | Q&A 1: using the product | Q&A (Premium, up to 5 Q&As) or Standard Text |
| 5 | Comparison chart: **own products only** (sizes, formats, flavours) | Comparison chart |
| 6 | Lifestyle / use cases (local context, e.g. chai, mithai, baking) | Multiple images + text |
| 7 | Q&A 2: ingredients, certifications, storage, who should be careful | Q&A or Standard Text |
| + | Brand Story (separate, free) | Brand Story carousel |

Output table per module: **# · module type · headline · copy (paste-ready) · image brief · alt text**. Use the competitor snapshot's complaint topics (Step 11) to choose what the problem/solution and Q&A modules answer.

**Never include in A+ (Amazon rejects it):** customer reviews or testimonials; comparisons with other brands or naming competitors (own products only); prices, discounts, "limited time", stock or urgency/FOMO; warranty, guarantee or return-policy text; contact details, QR codes, shipping info; disease or medical claims; unverified certifications or "#1/best" claims; eco claims like "eco-friendly/biodegradable" without proof. Cost-per-serving belongs in carousel images, not A+.

Never promise conversion lifts or ROI; say "expected to help conversion" at most.

### Step 9 — Rufus / Alexa discoverability (AEO, add-on)
Score 0–100: title meaning (what + for whom + key benefit) 15; Amazon's Choice 10; bullet structure 15; query coverage (use-case, comparison, problem-solution, suitability) 20; structured attributes 15; Q&A 15; review language covered 5; A+ comparison/FAQ 5. For each part give the gap and the fix. See `references/cosmo_rufus_optimization.md`.

### Step 10 — P0 list and total score
P0 items go in a red box at the top regardless of score: title over limit; banned characters, promo or competitor words in title; non-compliant main image; price/promo/contact in bullets; cross-category variations; core attributes mostly empty; AI people without XMP; suppressed listing; disease/medical claims; other brands' logos; unsupported certifications; contradictory values for the same attribute; A+ showing another variant.

### Step 11 — Competitor snapshot (always run; always in the detailed report)
Use the main keyword's live search page (same marketplace, language parameter) in the browser.

1. **Pick like-for-like competitors.** First identify what drives this product's price and positioning: base ingredient or formula (e.g. allulose vs erythritol), concentration (1:1 vs 2x–5x), form (powder, drops, sachets, syrup), certification (organic) and pack size. Then search the terms that describe that exact type (e.g. "allulose monk fruit sweetener", "monk fruit sweetener with allulose") and keep only organic results that match it, judged from the title and the ingredients on the product page. Pick the top 5 by ratings. If the user names competitor ASINs, use those instead.
   - Never compare unit prices against a different formula or form (e.g. an allulose blend vs cheaper erythritol blends). If the main keyword's page 1 is mostly a different type, say so in one line and keep them out of the price comparison.
   - **Price position:** collect unit prices from all like-for-like listings found (aim for 20+), and report min / median / max and where this ASIN sits (percentile). Only call the price "premium" when it's clearly above the like-for-like median.
2. **Matrix** (one row per product, this ASIN first, in bold):

| Product | Price | Unit price (₹/100 g or per unit) | Rating | Ratings | Title length | Images | Video | A+ modules | Brand Story |
|---|---|---|---|---|---|---|---|---|---|

   Price, unit price, rating and ratings count come from the search result card; title length, images (`hiRes` count), video, A+ module count (`#aplus .aplus-module`) and Brand Story from each product page. Flag competitor titles over the marketplace limit.
3. **Sponsored visibility:** count the sponsored placements on page 1 for the main keyword, list the brands, and say whether this ASIN appears.
4. **Review topics ("Customers say"):** on the rendered product page, read the aspect buttons (aria-label like "Positive aspect, quality, 2534 mentions"). Compare this ASIN with the top 2–3 competitors as positive / mixed / negative with mention counts, and note the star distribution (e.g. % of 1-star). Highlight category-wide concerns (e.g. authenticity mixed for everyone) as positioning opportunities.
5. **Key findings:** 3–5 points: price position vs. the like-for-like median (and cost per serving if it helps answer "value for money" complaints; never put prices in bullets), the top category complaints from competitor "Customers say" topics and how this listing can pre-empt them, claims competitors use in titles that this listing lacks, content gaps (images, video, A+, Brand Story), ad visibility gap, review-topic gaps.

Never estimate PPC spend, market share, sales, deal frequency or price history; they can't be measured from public pages. Say "not available" if asked.

### Step 11B — Extra competitor comparison (optional)

### Step 12 — Optimized listing, ready to paste (always; first section of the detailed report)
The seller's workflow is: copy → paste into Seller Central → done. Always deliver the full rewritten listing, not only advice.

1. **Title** (with character count; India and US ≤75).
2. **Item Highlights** (with character count; India ≤75).
3. **5 bullets**: `HEADER: fact + benefit`, one topic each, numbers first (dose, size, servings, formula). Never use a bullet for warranty, guarantee or "social proof".
4. **Product description** (≤2,000 characters): problem → how it works → ingredients/what's inside → uses → how to use → what's in the box. Embed keywords not used above. Plain text, no HTML, no claims you wouldn't put in bullets.
5. **Backend search terms**: words not already in title/highlights/bullets, from the indexing check and keyword mining; no brand names; ≤249 bytes. Terms that would be risky as visible claims (e.g. "natural" on a product with a preservative) may go here only.

**Competitor keyword gap:** read the full titles (and bullets) of the top 5 like-for-like competitors (Step 11), list words used by 2+ of them that this listing lacks, and add the safe ones. List what was **not** copied on purpose (disease claims, "organic"/"pure" without proof, "no chemicals").

**Keyword coverage before → after:** build the keyword list from Steps 3, 3B, 3C and the competitor gap (15–20 keywords). Table: keyword → before (where found) → after → where added. Report coverage % before and after. Never show search volumes unless the user provides paid-tool data.

**Before → after table** for title, highlights, each bullet, description and backend terms. Below it, list the fixes that need seller action (images, A+, attributes), since text alone can't fix them.

Tone: professional and factual by default (or friendly for food and home). Never "urgent", scarcity or FOMO.

### Step 12B — Action list
Each item: problem → exact fix (paste-ready text with character count for titles and highlights) → expected effect → priority (P0/P1/P2). Always check title, highlights and description lengths with a script before giving them.

### Step 13 — Report
Only create the HTML report when the user asks for one. Use `assets/report_template.html` (white background, English). Save to `~/reports/listing_analysis_[ASIN]_[YYYYMMDD].html`. Sections, in order: **optimized listing (ready to paste) + keyword coverage before → after**, scorecard, P0 box, five dimensions, images, keywords, keyword usage (Scribbles), rank by keyword, keyword indexing, starter negative keywords, competitor snapshot (with competitor keyword gap), sensitive claims, IP, consistency, nutrition check (food), A+ (audit + plan), AEO, import duty and landed cost (non-India marketplaces only), action list, data collection notes.

### Step 14 — Import duty and landed cost (only for listings outside India)
Run when the marketplace isn't amazon.in and the product ships from India (or another origin the user names). Include in the detailed report.

1. **HS code:** suggest the most likely code from the product type and ingredients (e.g. honey 0409; food preparations/sweetener drops 2106.90; fruit juices 2009) and say it must be confirmed with a customs broker.
2. **Look up live rates from official sources only** (never a hard-coded table; tariffs change often):
   - US: USITC HTS REST, `https://hts.usitc.gov/reststop/search?keyword={HS or product}` → "general" rate (India has no GSP, so the general rate applies), plus Chapter 99 lines for the origin (search `keyword=India`; e.g. 9903.01.84 +25%, 9903.02.26 +25%, 9903.05.44 +10% as listed on 15 Nov 2026). Report which lines exist and that applicability depends on product, date and exemptions.
   - UK: `https://www.trade-tariff.service.gov.uk/api/v2/commodities/{10-digit code}` → third-country duty, any India preference, VAT (food is often 0%).
   - EU: TARIC (`ec.europa.eu/taxation_customs/dds2/taric`) → third-country duty and the import VAT of the destination country.
   - Others (UAE, Saudi, Australia, Canada, Japan): the official customs tariff site of that country; if not reachable, say "rate not verified".
3. **Valuation basis:** US duty is charged on the **FOB/transaction value**; the EU and UK charge duty on **CIF** (value + freight + insurance), and import VAT on CIF + duty.
4. **Landed cost table** per shipment and per unit: product value, freight, insurance, base duty, additional duties, import VAT/GST (if not recoverable), fees (US: MPF 0.3464% with min/max, HMF 0.125% for sea), broker/clearance and port fees, inland freight to the Amazon warehouse. Clearly mark every **assumed** input (FOB price, freight, quantity) and let the user replace them; show the formula.
5. **Compliance notes for food:** US FDA food facility registration and prior notice; EU/UK labelling and novel-food status for ingredients like allulose; label language and units.
6. Never present rates as guaranteed; add "Confirm with a licensed customs broker before shipping." Amazon referral/FBA fees aren't part of landed cost; mention them separately if the user asks for margin.

### Mode A — New product (not yet listed)
When the user gives product details (or local materials) instead of an ASIN:
1. Collect: product type, brand, key attributes (size, material/ingredients, quantity), 3–5 features, target buyer, top 3 uses, what's in the box, marketplace.
2. Keywords: autocomplete mining for 1–2 seed terms (Step 3B method) plus the top 5 like-for-like competitors' titles and bullets (competitor keyword gap). If the user names competitor ASINs, use those.
3. Tier keywords: core → title; secondary → highlights and bullets (one per bullet); long-tail → description; rest → backend terms.
4. Deliver the Step 12 ready-to-paste listing, the keyword coverage table, sensitive-claim check (Step 5) and a compliant A+ plan (Step 8b). Skip scoring, rank and indexing (the ASIN doesn't exist yet).

## Rules

1. Use only real data; mark anything not obtained as "not obtained". Never invent search volumes.
2. Check language and currency after fetching.
3. Start each section with a one-line summary.
4. No vague advice; every fix must be paste-ready or a concrete step.
5. Judge by category and stage (new listings with few reviews are normal).
6. Compliance first; any policy violation is P0.
7. Persona analysis must include the pain-point map with "can answer / can't answer".
8. **Output language: English only.**
9. If raw text contains "|", split it into title (before) and Item Highlights (after).
10. Before saying an image type is missing, check every carousel image.
11. Confirm the main image via `landingImage` / `colorImages.initial` MAIN, not carousel order.
12. Filter other variants' images out of the image set.
13. Patent risk is a flag only, not a legal conclusion.
14. Sensitive words are never recommended as keywords.
15. Warranty claims are never required in bullets; direct sellers to the Seller Central warranty field.
16. Title and highlights must contain core keywords.
17. Check for off-topic words.
18. Reports use the white template; no dark backgrounds.
19. Review images one by one, never as a single overall judgment.
20. A+ must always be checked, including which variant it shows and its alt text.
21. Run the nutrition and lab-parameter check (Step 6B) whenever a table or report is available.
21d. Run the competitor snapshot (Step 11) for every ASIN and include it in every detailed report; real page data only.
21c. Run the keyword indexing check (Step 3C) with a control for every ASIN and include it in every detailed report.
21b. Run the rank-by-keyword check (Step 3B) for every ASIN and include it in every detailed report. Before recommending removal of any title or highlights word, check whether it currently drives a page-1 rank.
22. Regulatory points are risk flags based on current understanding; tell the user to confirm with their consultant.
23. Keep chat answers short and to the point; put detail in the report.

## References

- `references/scoring_criteria.md` — scoring rules for all dimensions and add-ons
- `references/multi_site_adaptation.md` — marketplace parameters and limits
- `references/sensitive_words.md` — sensitive claims by marketplace, with India (FSSAI) rules
- `references/consistency_check.md` — cross-carrier consistency rules
- `references/image_diagnosis.md` — per-image scoring
- `references/aplus_diagnosis.md` — A+ checks
- `references/amazon_listing_rules_2025.md` — listing rules summary
- `references/cdq_data_quality.md` — catalog data quality background
- `references/cosmo_rufus_optimization.md` — Rufus / Alexa / semantic search guidance
- `references/aleo_buyer_qa.md` — buyer question patterns for pain-point research
- `assets/report_template.html` — English HTML report template
- `scripts/calculate_scores.py` — weighted score calculator (`--input scores.json`)
