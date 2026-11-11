# Amazon Listing Analyzer (Claude Code skill)

Diagnoses an Amazon listing (any marketplace, tuned for amazon.in) and gives paste-ready fixes.

- Five weighted scores: compliance, attributes, selling-point coverage, bullet clarity, buyer pain points
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

Based on the original Amazon Listing Analyzer by Floki Garvey (MIT). Translated to English and extended (India/FSSAI rules, nutrition and lab-parameter checks, AEO guidance).
