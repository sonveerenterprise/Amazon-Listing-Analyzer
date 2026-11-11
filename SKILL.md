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

### Step 3B — Rank by keyword (always run; always in the detailed report)
Run this in every ASIN check, and include the table in every detailed HTML report. Take 5–8 keywords from Step 3 (core term, spelling variants, long-tail and use-case terms). For each, open the live search page on the target marketplace (with language parameter) in the browser and find the ASIN among **organic** results only (skip "Sponsored" items). Check page 1; check page 2 for core keywords not found on page 1.

Output one table:

| Keyword | Organic rank | Page | Keyword in title? | Keyword in highlights? | Note |
|---|---|---|---|---|---|
| leh berry juice | #9 | 1 | ✗ | ✓ | Ranks well; only the highlights contain "Leh Berry" |

- Organic rank = position among organic results across the pages checked (e.g. page 2, 15th organic = #63 when page 1 holds 48).
- "Keyword in title / highlights": ✓, ✗, or "Partial" / the near-match found (e.g. "Himalaya" only).
- Note: one line linking the rank to the listing (what helps, what to add).
- Below the table: "Lower number = better position. Organic positions exclude sponsored results; page 1 held N organic results."
- Never invent search volume, history, traffic or revenue; this is a single snapshot that varies by location and personalisation.

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

### Step 8 — A+ content (add-on)
Existence and type (Basic: up to 5 modules; Premium: up to 7; Brand Story separate). Module list, duplicate images, alt text quality (generic codes = fix), sensitive claims in A+ text and images, comparison-table values vs attributes, selling-point consistency with bullets, typos, carousel order (scene → function → detail → comparison → CTA), and which variant the A+ shows. Suggest missing modules (FAQ via Standard Text, comparison chart, certifications, video). See `references/aplus_diagnosis.md`.

### Step 9 — Rufus / Alexa discoverability (AEO, add-on)
Score 0–100: title meaning (what + for whom + key benefit) 15; Amazon's Choice 10; bullet structure 15; query coverage (use-case, comparison, problem-solution, suitability) 20; structured attributes 15; Q&A 15; review language covered 5; A+ comparison/FAQ 5. For each part give the gap and the fix. See `references/cosmo_rufus_optimization.md`.

### Step 10 — P0 list and total score
P0 items go in a red box at the top regardless of score: title over limit; banned characters, promo or competitor words in title; non-compliant main image; price/promo/contact in bullets; cross-category variations; core attributes mostly empty; AI people without XMP; suppressed listing; disease/medical claims; other brands' logos; unsupported certifications; contradictory values for the same attribute; A+ showing another variant.

### Step 11 — Competitor comparison (optional)

### Step 12 — Action list
Each item: problem → exact fix (paste-ready text with character count for titles and highlights) → expected effect → priority (P0/P1/P2). Always check title and highlights lengths with a script before giving them.

### Step 13 — Report
Only create the HTML report when the user asks for one. Use `assets/report_template.html` (white background, English). Save to `~/reports/listing_analysis_[ASIN]_[YYYYMMDD].html`. Sections: scorecard, P0 box, five dimensions, images, keywords, rank by keyword, keyword indexing, sensitive claims, IP, consistency, nutrition check (food), A+, AEO, action list, data collection notes.

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
