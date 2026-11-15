# Amazon Listing Analyzer (Claude Code skill)

Diagnoses an Amazon listing (any marketplace, tuned for amazon.in) and gives paste-ready fixes.

- Five weighted scores: compliance, attributes, selling-point coverage, bullet clarity, buyer pain points
- Keyword usage, Scribbles-style: every word and phrase with its use count per field and colour (backend terms measurable only after Seller Central login)
- Live rank by keyword, Cerebro-style (organic and sponsored rank, Amazon suggestion rank, match type, competing products, sponsored ASINs, title density, keyword distribution, word frequency) in every report — free public data, no search-volume estimates
- Keyword indexing check (is each word indexed for the ASIN, with a control test) in every report
- Ready-to-paste optimized listing first (title, highlights, bullets, description, backend terms) with keyword coverage before → after and competitor keyword gap
- Mode A: build a full listing for a new product from product details
- For listings outside India: import duty and landed cost from official tariff sources (US HTS, UK Trade Tariff, EU TARIC)
- A+ audit plus a compliant module-by-module A+ plan (headline, copy, image brief, alt text) in every report
- Starter negative keywords for Sponsored Products (wrong form, wrong formula, wrong product, unsupported claim), built from real search suggestions
- Competitor snapshot (top 5 organic: price, unit price, rating, content, ads, "Customers say" topics) in every report
- Add-on checks: keywords, sensitive claims (FSSAI for India), IP risk, consistency, image-by-image review, nutrition table and lab parameters, A+, Rufus/Alexa (AEO)
- English HTML report on request

## Install

1. Clone into your Claude Code skills folder:
   ```bash
   git clone <this-repo-url> ~/.claude/skills/amazon-listing-analyzer
   ```
2. Start a new Claude Code session.
3. Run `/amazon-listing-analyzer` and give an ASIN with the marketplace, for example `B0XXXXXXXX (IN)`.

## Contributing

Create a branch, make your change, open a pull request. Keep everything in English. Check title and Item Highlights limits (India: 75 characters each) with a script before suggesting them.

## Credits

Based on the original Amazon Listing Analyzer by Floki Garvey (MIT).

**Maintained and extended by Virendrasinh Jethwa:** full English translation, India/FSSAI rules, 75-character title and Item Highlights limits for amazon.in, nutrition table and lab-parameter checks, Rufus/Alexa (AEO) guidance, and a new English report template.
