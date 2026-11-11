# Image Review Standard

Use this to review the gallery images one by one, in any marketplace.

## 1. Five criteria

| Criterion | Weight | Question |
|---|---|---|
| Selling-point clarity | 25% | Does each image get one key point across in 3 seconds, and is it a point buyers care about? |
| Photo / render quality | 20% | Realistic materials, lighting and proportions? |
| Visual consistency | 20% | Same colours, fonts and style across the set; suits the target market? |
| Layout | 20% | Clear hierarchy, readable on a phone (~300 px wide), text not covering the product? |
| Order | 15% | Does the sequence follow the buyer's decision path, without repeats? |

Score each image 0–100 and note: type, selling point, what works, what to fix.

## 2. Common deductions

- **Clarity:** pretty scene with no message; image says A, text says B; five points crammed into one image; key point shown nowhere; two images saying the same thing.
- **Same jar/box rotated** to show label panels: one label shot (enlarged) is useful, three more are wasted slots.
- **Quality:** fake-looking textures, inconsistent shadows, wrong proportions, floating objects, variants modelled differently.
- **Consistency:** warm vs cold tones, different border colours or fonts per image, scenes that don't fit the market.
- **Layout:** text over the product, text unreadable on mobile, uneven density, misalignment, blurry icons.
- **Order:** main image not first; core point after image 5; repeats; weak final image; variants mixed.
- **Claims in images:** disease or health claims, unsupported certifications, warranty badges (see `sensitive_words.md`).
- **Misleading props:** ingredients pictured that aren't in the product (e.g. oranges beside a berry juice).

## 3. Recommended order

| Position | Type | Purpose |
|---|---|---|
| 1 | Main (white background) | What it is; product fills ≥85% |
| 2 | Top benefit or lifestyle | Why buy |
| 3 | Core proof (specs, lab values, certifications) | Answers the biggest doubt |
| 4–5 | Secondary features / how to use | Supporting facts |
| 6 | Quality and trust (materials, tests, label) | Removes last doubts |
| 7 | Comparison or differentiation (factual) | Why this one |
| 8+ | Brand, extra scenes, video | Reinforce |

Food: include a how-to-use/servings image and an enlarged nutrition/ingredient graphic. Furniture: dimensions, load, materials, assembly. Electronics: specs, ports, compatibility. Apparel: size chart, fabric, on-model, details.

## 4. Text vs. image coverage matrix

1. List the top 6–8 selling points (from the coverage matrix, pain points and category knowledge).
2. For each: is it in the text (title/highlights/bullets/A+)? Is it in at least one image?
3. Result:
   - ✓✓ both: complete.
   - Text only: add an image.
   - Image only: add it to bullets/highlights (buyers and search can't read images).
   - ✗✗ neither: P1 gap.

| Selling point | Text | Images | Result | Fix |
|---|---|---|---|---|
| Lab-tested values | ✗ | Image 2 | Image only | Add to bullet 2 |

## 5. Variant filtering

- Build the image set from `colorImages.initial` (MAIN, PT01…), which only holds the current variant. Don't infer it from `#altImages` order, which includes other variants' thumbnails.
- Check other variant keys for overlapping image IDs (overlap = extraction error).
- Compare the product colour/flavour in each image with the current variant; mismatches are listed separately as "other-variant image".
- State "current variant carousel: N images".

## 6. Output

Overview (thumbnail, type, selling point, variant) → per-image cards with scores → text-vs-image matrix → current vs. suggested order → variant check → P0/P1/P2 issues → concrete replacements (what image goes where, with what text).
