# Scoring Criteria

Each dimension scores 0–100. Total = Σ (dimension score × weight). Order: compliance → attributes → selling-point coverage → clarity and order → persona and pain points. Fetch with marketplace parameters (`multi_site_adaptation.md`) and score against that marketplace's rules.

## Weights

| Dimension | Weight |
|---|---|
| 1. Compliance | 25% |
| 2. Attribute completeness | 20% |
| 3. Selling-point coverage | 20% |
| 4. Bullet clarity and order | 20% |
| 5. Buyer persona and pain points | 15% |

Grades: 90–100 Excellent · 75–89 Good · 65–74 Fair · below 65 Poor.

---

## Dimension 1: Compliance (25%)

| Item (JSON key) | Max | Rule |
|---|---|---|
| Title length (`title_length`) | 25 | Within limit (US 75; India 75; others per Seller Central) = 25; over by 1–25 = 10; far over = 0 (**P0**) |
| Title content (`title_content`) | 20 | No banned characters, promo/subjective words, false claims, competitor brands = 20; −5 to −8 per issue (all-caps brand −2, filler like "original" −3); several = 0 (**P0**) |
| Main image (`main_image`) | 20 | White background + no added text + ≥85% fill + ≥1000 px = 20; −5 per issue; added text/watermark = 0 (**P0**) |
| Bullet content (`bullet_content`) | 15 | No price, promotion, shipping, contact, review quotes = 15; −5 each (**P0**) |
| Variations (`variation`) | 10 | Same category + consistent naming = 10; inconsistent naming −2 to −5; mixed categories = 0 (**P0**) |
| Images/video (`image_video`) | 10 | No watermark, unauthorised logos, misleading or health claims, AI people without XMP = 10; −3 each |

Checklist: title length (record the number); characters; promo words; unsupported claims; competitor brands; main image white / no text / fill / resolution; bullets; variations and MRP per variant; secondary images; XMP; suppression.

Summary line: "Title X/limit characters, [compliant / N issues]; main image [ok/not]; bullets [ok/N issues]; variations [ok/not]."

---

## Dimension 2: Attribute completeness (20%)

| Item | Max | Rule |
|---|---|---|
| Structured fields (`structured_fields`) | 35 | Key-attribute fill ≥90% = 35; 70–89% = 25; 50–69% = 15; <50% = 0 (**P0**) |
| Key specifications (`spec_completeness`) | 25 | Complete = 25; −5 per missing or wrong key spec |
| Variation attributes (`variation_attrs`) | 15 | All mapped = 15; partial −5 to −10 |
| Item Highlights (`highlights_filled`) | 10 | Filled = 10; empty = 0 |
| A+ / description (`aplus_exists`) | 10 | A+ = 10; text only = 5; none = 0; A+ for the wrong variant = 5 |
| Search terms (`search_terms`) | 5 | Well used = 5; unknown = 3; brand names or waste = 0–2 |

Key attributes by category:

| Category | Attributes |
|---|---|
| Food / grocery | Ingredients with %, diet type, allergens, storage, shelf life, nutrition per 100 g/ml, net quantity, container, FSSAI licence (India) |
| Furniture / home | Dimensions, material, colour, load, assembly, weight |
| Electronics | Power/voltage, ports, compatibility, certifications |
| Kitchen | Capacity, material (food grade), dimensions, dishwasher safe, heat range |
| Apparel | Size chart, fabric, care, weight |
| Toys / baby | Age, certifications, material safety |
| Outdoor | Dimensions, load, waterproof rating, material |

If backend fields can't be seen, score on visible data, say so, and rescore when the seller shares Seller Central screenshots. An empty "Product overview" table doesn't prove attributes are empty.

---

## Dimension 3: Selling-point coverage (20%)

| Item | Max | Rule |
|---|---|---|
| Size / quantity (`size_spec`) | 15 | Exact = 15; vague = 5; missing = 0 |
| Material / composition (`material`) | 15 | Specific (incl. % for food) = 15; generic = 5; missing = 0 |
| Core function with numbers (`core_function`) | 20 | Quantified = 20; −4 per feature without numbers; adjectives only = 0 |
| Use case / buyer (`scene`) | 15 | Clear = 15; vague = 5; missing = 0 |
| Assembly / preparation / how to use (`assembly`) | 15 | Clear = 15; partial = 8; missing = 0 |
| Differentiation (`differentiation`) | 20 | Real reason to choose this = 20; generic = 10; none = 0 |

Trust facts (what's in the box, manuals, test data) can add value but aren't scored. **Warranty is never required; don't deduct for its absence.** Warranty promises in bullets are a compliance risk.

Coverage matrix: item → which bullet → quality → gap.

---

## Dimension 4: Bullet clarity and order (20%)

| Item | Max | Rule |
|---|---|---|
| One topic per bullet (`single_topic`) | 20 | −5 per mixed bullet; 3+ mixed = −15 |
| No repetition (`dedup`) | 15 | −4 per repeat; many = −10 |
| Order (`order`) | 25 | Core benefit first, support in the middle, trust/package last = 25; core benefit not first −10; packaging or background first −15 |
| Language (`language`) | 20 | Natural local language = 20; literal translation −8; wrong language = 5 |
| Readability (`readability`) | 10 | −2 to −3 per issue (long sentences, no headers, jargon) |
| Consistency (`consistency`) | 10 | −4 per conflict between title, bullets, images, attributes (serious conflicts are also compliance P0) |

Per-bullet table: # → text → topic → clarity → issue → rewrite.

---

## Dimension 5: Buyer persona and pain points (15%)

| Item | Max | Rule |
|---|---|---|
| Persona (`persona_quality`) | 20 | Specific = 20; vague = 10; none = 0 |
| Pain-point list (`pain_list`) | 20 | 5–8 with priority and can/can't answer = 20; 2–3 = 10; none = 0 |
| Pain coverage (`pain_mapping`) | 30 | Only answerable pain points count. ≥80% answered with clear location = 30; 50–79% = 20; <50% = 10; none = 0 |
| Omissions (`selling_omission`) | 15 | Things the product has but text omits: 0 = 15; 1–2 = 10; ≥3 = 5; all = 0 |
| Q&A (`qa_coverage`) | 10 | Common doubts answered = 10; partly = 5; none = 0 |
| Negative reviews (`complaint_fix`) | 5 | Themes addressed = 5; partly = 3; not = 0 (no negative reviews = 5) |

Pain points the product can't answer are excluded and not penalised; list them as "product limits". Sources: this listing's negative reviews → competitor negative reviews → Q&A → category knowledge.

Outputs: persona card; pain list; pain-to-selling-point map; omission list with where and how to add each; unanswered-but-answerable list.

---

## P0 list (always shown at the top)

Title over limit; banned characters, promo words, false claims or competitor brands in the title; non-compliant main image; price/promo/contact in bullets; mixed-category variations; core attributes <50% filled; AI people without XMP; suppressed listing; disease/medical claims; other brands' logos; unsupported certifications; the same attribute with conflicting values; A+ or images showing another variant.

---

## Add-on 1: Keywords (unweighted)

| Item | Max | Rule |
|---|---|---|
| Title core keyword | 15 | Present = 15; missing = 0 (P1) |
| Highlights core keyword | 10 | Present = 10; missing = 0 (P1) |
| Core keyword coverage | 30 | Top 10 all in title or highlights = 30; −3 each; ≥3 missing = 0 |
| Popular terms | 20 | ≥70% of 20–30 terms = 20; 50–69% = 15; 30–49% = 8; <30% = 0 |
| Placement | 10 | Core terms in title/highlights; bullets only −2 each |
| Off-topic words | 10 | −3 each; ≥3 = 0 |
| Long-tail | 5 | Missing obvious ones −2 |

Sensitive words are never recommended and never counted as missing. Benchmark against top search-result titles; don't invent search volumes ("volume not confirmed").

Outputs: title/highlights check table; coverage matrix; off-topic table; missing list; backend search-term suggestion.

## Add-on 2: IP risk (unweighted)

P0 confirmed or highly likely; P1 risk signal; P2 preventive. Check trademarks (other brands in text or images, look-alike names), copyright (images, copied text), patents (flag known risks only), misrepresentation (unproven numbers or certifications, misleading images or names).

Output: type → detail → level → action.

## Add-on 3: Sensitive claims (unweighted)

| Type | Level |
|---|---|
| Disease or medical claim | P0 |
| Absolute/superlative | P1 |
| Warranty in title or images, guarantee promises in bullets/A+ | P0 |
| Vague warranty statements | P1 |
| Unsupported certifications | P0 |
| False origin | P0 |
| Quoting Amazon data (bestseller, Prime) | P0 |
| India: "pure" on blends, organic without NPOP, "NABL certified", unsupported "rich in" | P1 |

Output: # → where → text → type → risk → safer wording. See `sensitive_words.md`.

## Add-on 4: Consistency (unweighted)

P0 conflicting values or wrong-variant content; P1 fact in one place only; P2 wording differences. Matrix: item × images / text / attributes / A+. See `consistency_check.md`.

## Add-on 5: Nutrition and lab parameters (food; unweighted)

Energy math (±10%), parts ≤ whole, unit plausibility, category ranges, serving math, %RDA basis, claims vs table, same values everywhere. Deviation = P1; P0 if it creates a false nutrition/health claim. Guide only; parameters only.

## Add-on 6: A+ (unweighted)

| Item | Max | Rule |
|---|---|---|
| Exists | 15 | None = 0 |
| Module variety | 15 | ≥3 types = 15; 1 type = 5 |
| Sensitive claims | 25 | −8 each; medical −15 |
| Comparison values | 20 | −8 per conflict; no table = 20 |
| Consistency with bullets | 15 | A+-only facts −5; conflicts −10 |
| Keyword additions | 5 | None = 2 |
| Language | 5 | −2 per typo |
| A+ images | 10 | Average ≥80 = 10; −5 per image with risky text or another variant |
| Carousel order | 5 | No carousel = 5; disordered −3 |
| Module count | 5 | Premium ≥6 or Basic ≥4 = 5; Premium 3–5 = 3; ≤2 = 1 |

Also check: which variant the A+ shows, duplicate images, alt text. See `aplus_diagnosis.md`.

## Add-on 7: Rufus / Alexa (AEO) (unweighted, 0–100)

| Item | Max | Rule |
|---|---|---|
| Title meaning (what + for whom + benefit) | 15 | Keyword list / no use case −5 to −10 |
| Amazon's Choice | 10 | Yes = 10; no = 0 |
| Bullet structure (context → fact → benefit) | 15 | Spec list −5; vague words −5 |
| Query types (use case, comparison, problem-solution, suitability) | 20 | −5 per missing type |
| Structured attributes | 15 | −3 per missing important attribute |
| Q&A | 15 | ≥15 substantive = 15; 10–14 = 10; 5–9 = 5; <5 = 0 |
| Review language | 5 | Positive themes covered = 5; unaddressed negative themes −3 |
| A+ comparison / FAQ | 5 | Present = 5; none = 2 |

For each item give the gap and the fix. See `cosmo_rufus_optimization.md` and `aleo_buyer_qa.md`.
