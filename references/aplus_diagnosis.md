# A+ Content Check

A+ (Enhanced Brand Content) converts best, and it is where outdated text, old numbers and risky claims hide: sellers update bullets and forget A+. **Compliant bullets don't make the A+ compliant. Always check A+ on its own.**

## 1. Getting the A+ data

- From the product page `#aplus` block: module classes (e.g. `premium-module-2-fullbackground-image`, `aplus-standard`), text, image URLs and alt text.
- If A+ loads asynchronously or is empty, ask the user for a screenshot.
- Look at each A+ image (they often hold most of the content).

## 2. Checks

1. **Existence and type:** Basic A+ (up to 5 modules) or Premium (up to 7); Brand Story present? Brand-registered product with no A+ = P1.
2. **Which variant it shows:** the A+ must match the current variant, or be range-level with no single flavour/colour named. Wrong variant = P0.
3. **Duplicate images:** the same image used in two modules = wasted module.
4. **Alt text:** descriptive ("Brand raw eucalyptus honey 530g glass jar"), not codes ("SPN-SELHP") and not empty. Alt text is indexed; fix typos in it.
5. **Sensitive claims** in A+ text and image text (see `sensitive_words.md`).
6. **Comparison table values** for the current SKU ↔ attributes, bullets and title. Conflicts = P0.
7. **Selling-point consistency:** A+ facts missing from bullets = add to bullets; conflicts = P0.
8. **Keywords:** A+ can add use-case and long-tail terms the bullets don't cover.
9. **Quality:** natural language, no typos (e.g. "Buckthron").
10. **Carousel order** (if any): scene → core function → detail → comparison/specs → trust/CTA. Specs or comparison first = reorder.
11. **Module count:** under 50% of the limit = P1; under 80% = P2. Priority to add: FAQ (Standard Text in Basic), comparison chart, certifications, video (Premium), Brand Story.

## 3. A+ image scoring (each image)

| Check | Points |
|---|---|
| One clear selling point | 20 |
| Photo / render quality | 20 |
| Design fits the buyer | 20 |
| Layout and mobile readability | 20 |
| Text compliance (no risky claims or warranty badges) | 15 |
| Matches current variant | 5 |

Full-width banners (1464×600) lose detail on mobile; keep key numbers large.

## 4. A+ scoring (0–100, unweighted)

| Item | Points | Rule |
|---|---|---|
| Exists | 15 | None = 0 |
| Module variety | 15 | ≥3 types full; 1 type = 5 |
| Sensitive claims | 25 | −8 each; −15 for medical claims |
| Comparison values | 20 | −8 per conflict (no table = not applicable, full) |
| Consistency with bullets | 15 | Unique A+ facts −5; conflicts −10 |
| Keyword additions | 5 | |
| Language quality | 5 | −2 per typo |

## 5. Output

A+ module list (type, content, issue) → image-by-image table → variant check → alt-text check → sensitive claims → comparison values → consistency → module count → actions (P0/P1/P2, exactly what to change).
