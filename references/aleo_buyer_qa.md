# Answer-Engine Optimisation (AEO) and Buyer Questions

AEO = making the listing the source an AI shopping assistant quotes when a shopper asks a question. The question changes from "do I rank for keyword X?" to "when someone asks Y, does Alexa/Rufus cite my listing?"

## 1. COSMO vs AEO

| | COSMO intent coverage | AEO |
|---|---|---|
| Role | Gatekeeper: is the listing a candidate? | Answer engine: is it quoted? |
| Checks | Is the intent written down? | Can it answer the actual question? |
| Focus | Intent semantics, attributes, persona | Quotable bullets, Q&A, review wording, rating threshold |

## 2. What Alexa / Rufus reads (by priority)

1. Bullets — quoted as standalone answers
2. Customer Q&A — a major index field since 2026; source of edge-case wording
3. Reviews — treated as "ground truth", more trusted than marketing copy
4. Title — read as a sentence
5. A+ text (comparison and scenario modules)
6. Brand Store content
7. All structured attributes, including optional ones
8. Image alt text and OCR'd image text

**Hard thresholds (reported):**
- Rating below 4.0★: excluded from many recommendations (an entry condition, not a ranking factor).
- Attribute completeness below ~90–95%: invisible to whole classes of conversational queries.

If reviews repeatedly say "loud" or "leaks", the listing won't be chosen for "quiet" or "leak-proof" questions, whatever the bullets claim.

## 3. Three question types

| Type | Example | Listing needs |
|---|---|---|
| Scenario / use case | "What's a good honey for my morning tea?" | Use cases and compatibility in title and bullets |
| Comparison / filter | "Which sweetener has no erythritol under ₹800?" | Comparable numbers and facts in bullets |
| Persona / problem | "Juice for someone avoiding sugar" | Target buyer and the problem it solves (within claim rules) |

## 4. Six levers

1. **Bullets as standalone answers:** one bullet = one question = one complete, verifiable answer with a number or use case. Drop "premium", "durable", "high quality". Cover: will it last, is it right for my use, does it work with X, how easy is it, what's in the box.
   - Before: "High-quality materials for maximum durability."
   - After: "58 dB noise level, quieter than normal conversation, with a HEPA H13 filter that captures 99.97% of pollen, for rooms up to 800 sq ft."
2. **Title as use-case attributes**, not a keyword list:
   - Weak: "Running Shoes Men Black Blue Waterproof 42 43 44"
   - Strong: "Men's Running Shoes with Arch Support for Flat Feet, Size 10"
3. **Q&A as an index field:** find the 10 most common questions (competitor Q&A, reviews, Rufus prompts); answer them in detail; add an A+ FAQ; recheck after updates. Never post fake questions or answers.
4. **Reviews as a lever:** recurring phrases in reviews help ranking for matching queries. Encourage honest reviews through Amazon-approved channels only (Request a Review, Vine). Never ask for specific wording in exchange for anything, and never use friends, family or staff.
5. **Images that show intent:** real use settings, scale references (hand, cup), specific numbers instead of generic icons, a scene image per variant.
6. **Rating threshold:** below 4.0★, fix product quality and negative-review themes before other AEO work.

## 5. AEO checklist

**Quotability:** each bullet answers one question; has a number or specific use; title has extractable use-case attributes; the 5 core questions are answered.

**Q&A:** ≥10 answered questions; edge cases covered; answers specific.

**Reviews:** wording matches main selling points; no cluster of negatives contradicting claims; rating ≥4.0★.

**Attributes:** ≥95% filled; intended use, audience, material/ingredients, certifications, compatibility filled.

**Images:** real-use scene images; specific numbers in infographics; descriptive alt text.

## 6. AEO vs traditional SEO

| | Traditional SEO | AEO |
|---|---|---|
| Goal | Keyword rank | Being quoted as the answer |
| Method | Keyword coverage | Attribute completeness, fact density |
| Main sources | Title, bullets, search terms | Reviews, Q&A, A+, attributes |
| Title | Keyword list | Quotable use-case attributes |
| Bullets | Feature list | Question–answer pairs |
| Q&A | Optional | Major index field |
| Reviews | Trust signal | Active lever |
| Images | Looks | Visual intent |

## 7. Timeline (reported)

- Jun 2024: COSMO paper at SIGMOD 2024.
- Late 2024: Rufus launched.
- 2025: Rufus monthly users +140%; recommended products 3–5× CTR.
- Nov 2025: Alexa for Shopping adds price-triggered buying and auto-replenishment.
- Jan 2026: Alexa shows 30- and 90-day price trends.
- 13 May 2026: Rufus renamed Alexa for Shopping in some marketplaces; voice and cross-device context added.
