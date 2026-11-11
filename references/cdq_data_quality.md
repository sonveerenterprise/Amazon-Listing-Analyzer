# Catalog Data Quality (CDQ) — Background

CDQ (Composite Data Quality) is described as Amazon's 2026 listing-quality algorithm replacing the older IDQ. It rewards **accurate, consistent, machine-readable** data, not just filled fields. In this skill, CDQ ideas feed into Dimension 1 (compliance) and Dimension 2 (attributes); it is background, not a separate score.

## 1. IDQ vs CDQ

| | IDQ (old) | CDQ (new) |
|---|---|---|
| Focus | Are fields filled? | Is the information correct and useful? |
| Method | Pass/fail per field | Weighted score |
| Consistency | Not compared | Title, attributes, bullets and images compared automatically |
| Variations | Not assessed | Core factor (~20%) |
| A+ | Not scored | Scored; no A+ loses points |
| Hard fails | None | Yes (see below) |

## 2. Reported weights

| Area | Weight |
|---|---|
| Structured attributes | 30% |
| Title quality | 25% |
| Variation quality | 20% |
| Images and A+ match | 15% |
| Bullets | 5% |
| A+ content | 5% |

A+ levels used in this skill: full (Brand Story + detail modules) / basic (modules without Brand Story) / none. A+ without Brand Story is **not** "no A+".

## 3. Hard fails (reported)

1. **Title contradicts other content** (e.g. title says stainless steel, attribute says plastic).
2. **Messy variations** (different categories under one parent; mixed naming like "Black-M" and "black / medium").
3. **Factual errors in the top 6 attributes** (e.g. title 20000 mAh, attribute 10000 mAh).
4. **Core attributes mostly empty** (fill rate under 50% of the top 10).

## 4. Checklist

**Cross-surface consistency (highest priority):** title vs attributes; title vs images; bullets vs attributes; image values vs attributes; AI lifestyle images vs the real product (proportions, colour).

**Variations:** same category; consistent naming (sizes S/M/L or numbers; one language for colours; 1-Pack/2-Pack); MRP matches each printed label.

**Top-6 attributes by category:**

| Category | Key attributes |
|---|---|
| Electronics | Voltage, power, battery capacity, ports, compatibility, certification |
| Apparel | Fabric composition, fit, size range, season, care, origin |
| Home | Material, dimensions, capacity, load, origin, certification |
| Outdoor | Waterproof rating, capacity, weight, packed size, material, temperature rating |
| Kitchen | Material, capacity, heat range, BPA-free, dimensions, dishwasher safe |
| Food / grocery | Ingredients (with %), diet type, allergens, storage, shelf life, nutrition per 100 g/ml, net quantity, FSSAI licence (India) |

**Coverage depth:** compare with the top 10 competitors' filled fields; aim for ≥80% fill rate.

## 5. Priorities

- **P0 (24 h):** check attribute accuracy on top-traffic ASINs; fix variation structure; fix title/attribute contradictions.
- **P1 (this week):** category attribute checklist and SOP; image completeness; A+ for top sellers.
- **P2 (ongoing):** monthly quality monitoring; attribute review before new launches.

## 6. CDQ vs LQS

| | CDQ | LQS (inferred) |
|---|---|---|
| Focus | Accuracy | Completeness |
| Where | Seller Central → Catalog → Listing Quality Dashboard | No direct view |
| Effect | Ranking, traffic, deal eligibility | Organic exposure (reported drop below ~65) |
| Refresh | Batch, 3–7 days | Near real-time |

A listing can be complete (high LQS) but contradictory (low CDQ). Fixes take one batch cycle (3–7 days) to show.

## 7. Link to AI shopping

Structured, consistent attributes feed Amazon's knowledge graph (COSMO), Rufus and Alexa. Contradictions reduce recommendation confidence.
