# Cross-Carrier Consistency Check

The same product facts must match across **five carriers**: images, text, attributes, variants and A+. Mismatches lower catalog data quality, confuse buyers, and can be treated as misleading information.

## 1. The five carriers

| Carrier | Source |
|---|---|
| Images (P) | Size, function, colour and text shown in the main and secondary images, including the printed label |
| Text (C) | Title, Item Highlights, bullets, description |
| Attributes (A) | Product details table and Seller Central fields |
| Variants (V) | Colour/size/flavour variants, their names and images |
| A+ (E) | A+ module text, comparison-table values for the current SKU, which variant the A+ shows |

## 2. What to compare

1. **Size and quantity:** dimensions, net weight/volume, servings; same units (convert precisely: 1 inch = 2.54 cm). Distinguish, for example, table height vs. total height.
2. **Weight / load capacity:** values in infographics must also appear in text or attributes.
3. **Materials / ingredients:** bullets ↔ ingredient field ↔ label image ↔ A+. For food, include percentages and naming (e.g. "extract" vs "juice concentrate").
4. **Functions and features:** what the images show (ports, drawers, certifications) must match bullets, attributes and A+, with the same counts.
5. **Numbers and names:** colour, flavour and product names spelled the same everywhere; generic name matches the label.
6. **Nutrition:** nutrition table in images ↔ backend nutrition fields ↔ claims in text (see Step 6B in SKILL.md).
7. **Variant images and A+:** each variant's images and A+ must show that variant (e.g. an Ajwain A+ on a Eucalyptus page = P0).

## 3. Levels

- **P0:** the same attribute has conflicting values, or A+/images show another variant → fix now.
- **P1:** a fact appears in only one carrier (image has it, text doesn't) → add it.
- **P2:** wording differs (units, spelling, naming) → standardise.

## 4. Process

1. Build a data dictionary from the attributes.
2. Extract values from every image (look at each one), the text, the attributes and the A+.
3. Compare item by item.
4. Output the matrix with ✓ match / ✗ conflict / △ missing, P0 items first.

## 5. Output template

| Item | Images / label | Text | Attributes | A+ | Result | Note |
|---|---|---|---|---|---|---|
| Ingredients | "<1% preservative" (image 4) | INS 330, INS 202 | "Berry, water" | — | ✗ P1 | Live page shows an old list |
| Servings | — | 50 (bullet 5) | — | — | △ P1 | Add to title or an image |
