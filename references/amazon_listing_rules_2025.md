# Amazon Listing Rules (2026 summary)

Based on Amazon policy pages and updates up to mid-2026. Use as a reference; Seller Central is the final authority.

## 1. Title

- **75 characters including spaces** (from 27 July 2026, all categories except media). Not applied in Egypt, Saudi Arabia, Turkey, UAE. **India: 75, confirmed by the seller.** Over-limit titles get replaced with AI-suggested versions.
- Title + Item Highlights together describe the product; move detail from the title into highlights.
- Banned characters: `! $ ? _ { } ^ ¬ ¦`. No promo/subjective words ("best seller", "cheap", "free shipping", "best quality"), no keyword stuffing, no uncertified claims.
- Structure: brand + product name + 1–2 core keywords + key attribute (size, pack). Put colour/size in the variation theme, not the title.
- Amazon's AI tool: Manage All Inventory → Edit → View enhancements (brand owners have 14 days to review).

Example: "Premium Stainless Steel Insulated Water Bottle – BPA-Free" (62) + highlights "Keeps drinks cold 24 hours, hot 12 hours. Ideal for gym, office, and outdoor adventures."

## 2. Item Highlights (new, July 2026)

- US: 125 characters. **India: 75 characters (confirmed by the seller).**
- Indexed for search; shown under the title (separate grey line on mobile; joined with "|" on desktop and in the page `<title>`).
- Content: materials, use cases, compatibility, size range, proof points. Comma-separated short attributes.
- Not a second title, keyword dump or repeat of bullets.

## 3. Bullets

- Up to 5; about 100–250 characters each (some tools suggest ≥150 for quality scores).
- Start with a capital; no emoji; no all-caps except short headers/acronyms; no repetition.
- Banned: price, promotion, shipping, seller information.
- One feature + benefit per bullet.
- Common order (industry practice, **not an Amazon rule; don't deduct for it**): hero benefit → use case → differentiator → specs/compatibility → trust facts.

## 4. Backend search terms

- 249 **bytes**; going over by one byte can void the whole field.
- Don't repeat words in the title/highlights/bullets; no commas; no brand names (yours or others'); no ASINs.
- Use synonyms, alternative and phonetic spellings, local-language terms (e.g. Hindi transliterations on amazon.in), long-tail terms.

## 5. Images

**Main:** pure white (RGB 255,255,255); ≥1000 px (2000+ recommended); product ≥85% of the frame; no added text, watermark, logo, border or props not included. Real product.

**Secondary:** up to 9; at least 6 images including one lifestyle image recommended; use all 7 slots plus a video. Types: lifestyle, size reference, detail close-up, infographic, package contents.

Size-reference images are often missed: look for measurement lines, reference objects (hand, coin, phone) or side-by-side size comparisons.

**AI-generated realistic people (from 23 July 2026):** add `contains-synthetic-performer` to the XMP `dc:subject` field before upload. Not needed for real photos (even if retouched), cartoon characters or images without people.

**Video:** commonly lifts conversion 10–20%.

## 6. A+ content

- Indexed for search; needs Brand Registry.
- Low-quality A+ may be collapsed behind "See more" (2026 quality analysis).
- Images ≥970×600 (standard modules); text ≤30% of an image; JPG/PNG/BMP, RGB, <2 MB, ≥72 dpi; no GIF.
- **Alt text must describe the image accurately** (no keyword stuffing).
- Banned: promotions, review quotes, comparisons with other brands (own products allowed), warranty/returns information, contact details, QR codes, shipping. Certification claims must name the body and year. Avoid "eco-friendly", "biodegradable", "compostable".
- Mobile first (>70% of shoppers).
- Use Brand Story (free) and a comparison table of 3–5 own products.

## 7. Listing Quality Score (from around May 2026, inferred)

Reported factors: title completeness, image count and resolution, bullet depth, A+/description, backend term use, rating and review velocity (below ~3.8★ flagged), price competitiveness. ASINs scoring under ~65 reportedly lose non-branded organic visibility (15–40% in some categories).

## 8. Other 2026 changes

- Public "frequently returned" label for high-return products (US, CA, EU; Feb 2026).
- Variations with functional differences can no longer share reviews (Feb 2026; transition to 31 May 2026).
- Payment reserve: funds released 7 days after delivery (Mar 2026).
- Commingled inventory ended (Mar 2026): brand sellers with GTINs don't need Amazon barcodes; others must label.

## 9. Suppression / quality risks

Title over limit; banned characters; empty Item Highlights; non-compliant main image; fewer than 6 images or no lifestyle image; price/promo/shipping in bullets; very short bullets; competitor brands or ASINs in search terms; AI people without XMP; collapsed A+; wrong category; missing key attributes; rating under ~3.8★; high-return label.
