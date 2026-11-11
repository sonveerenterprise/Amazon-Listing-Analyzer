# COSMO, Rufus and Alexa — How AI Shopping Reads a Listing

Reference for Step 9 (AEO). Figures and mechanics are from Amazon publications and industry reports up to mid-2026.

## 1. The three layers

```
Shopper question → Rufus works out intent → COSMO walks the knowledge graph → A10 keyword match + conversion signals → ranked results
```
Optimising only one layer leaves the others short of data.

- **COSMO:** Amazon's LLM-built commonsense knowledge graph (SIGMOD 2024 paper). It understands intent, not just keywords.
- **Rufus:** the shopper-facing assistant. It reads the title, Item Highlights, bullets, A+ (text and image text via OCR), reviews, Q&A and images, then answers and recommends. Reported: Rufus-recommended products get 3–5× the CTR of standard organic results.
- **Alexa for Shopping:** voice; relies heavily on Amazon's Choice, ratings (≥4★), and bullets that each answer one question.

Rufus doesn't recommend products it isn't confident about. Complete, consistent information raises confidence; vague, missing or contradictory information lowers it.

## 2. Semantic relations COSMO looks for

| Relation | Question | Where in the listing | Common gap |
|---|---|---|---|
| isA | What is it? | Title | Brand + adjectives, no clear product type |
| usedFor | What is it for? | Highlights, bullets ("for X, when Y") | Attributes listed, no use case |
| capableOf | What can it do? | Bullets with numbers | "Durable" with no figure |
| cause | What result does it give? | Bullets, A+ | Feature without outcome (keep within claim rules) |
| userGroup | Who is it for? | Highlights, bullets | "Perfect for everyone" |

## 3. What Rufus reads (2026)

1. Title (75 characters) — identity and core keyword
2. Item Highlights — comparison info, use case; read early, shown under the title
3. Bullets
4. A+ text and image text
5. Reviews (sentiment and recurring phrases)
6. Q&A
7. Images (OCR, scene recognition)

**"Why this product" sentence:** keep one consistent value statement across the title, highlights, bullet 1 and A+ module 1; Rufus often quotes it.

## 4. Five Rufus factors

1. **Context:** scenario language ("lightweight rain jacket for monsoon hikes", not just "waterproof jacket").
2. **Behaviour signals:** seasonal and event relevance (festivals, back-to-school, winter).
3. **Structured attributes:** most sellers leave 30+ fields empty; filling them is the biggest opportunity.
4. **Performance:** CTR, conversion, reviews, returns; a "frequently returned" badge hurts recommendations.
5. **Cross-surface consistency:** title, highlights, bullets, A+ and Store must agree.

## 5. Strategies

1. **Title + highlights together:** title = brand + type + 1–2 keywords + fit info; highlights = materials · use · compatibility · size, or proof points. Move detail out of the title.
2. **Intent over keywords:** connect each feature to a benefit and a situation, e.g. "moisture-wicking fabric to keep you dry during intense workouts".
3. **Bullets as answers:** each bullet answers one buyer question (durability, who it's for, how it differs, size/compatibility, what's in the box). Industry bullet order (hero → use case → differentiator → specs → trust) is a guide, **not a scoring rule**.
4. **Answer likely questions** in text and an A+ FAQ.
5. **Images:** show real use; put key facts in large, OCR-readable text; tag AI-generated people with XMP.
6. **Fill everything:** attributes, highlights, search terms (synonyms, local and phonetic spellings), alt text, A+.
7. **Use Amazon's AI suggestions** (Manage All Inventory → Edit → View enhancements) but review them.

## 6. Intent-coverage check (community framework, not an official COSMO score)

| Intent | Points | Check |
|---|---|---|
| usedFor | 25 | Specific use cases, not just attributes |
| cause | 20 | Outcome described (within claim rules) |
| userGroup | 20 | 1–2 clear buyer groups |
| capableOf | 15 | Numbers, not adjectives |
| isA | 10 | Clear product type |
| Attribute → intent bridge | 10 | Each key attribute explained in buyer terms |

**Query types to cover:** scenario ("best X for Y"), problem ("X that doesn't Y"), persona ("X for kids"), comparison ("X vs Y").

**Common problems:**
- *Spec-sheet syndrome:* only specs. Fix: add a use/benefit to each.
- *Adjective dependence:* "premium", "high quality". Fix: replace with verifiable numbers.
- *No audience:* "for everyone". Fix: name 1–2 groups.
- *No scenario:* features without use cases. Fix: "for X, when Y".

## 7. Quick AEO checklist

1. Title ≤ limit and states type + key value.
2. Item Highlights filled with use, proof or compatibility.
3. Same core value in title, highlights, bullet 1 and A+ module 1.
4. Use cases in bullets.
5. Structured attributes complete (target ≥95% for Alexa-style queries).
6. Key facts readable in image text.
7. A+ not collapsed; has FAQ or comparison.
8. AI people tagged (if any).
9. No high-return badge.
10. Bullets can each stand alone as an answer.
11. Q&A: ≥10–15 substantive answers, including edge cases.
12. Review wording matches the main selling points.
13. Rating ≥4.0★ (Alexa and Rufus rarely recommend below).
14. Covers isA, usedFor, capableOf, cause and userGroup.
15. Not a spec sheet; not adjective-led.
16. Covers scenario, problem, persona and comparison queries.
17. Consistent data across surfaces (see `cdq_data_quality.md`).
