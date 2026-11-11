#!/usr/bin/env python3
"""
Amazon listing five-dimension score calculator.

Dimensions (report order):
1. Compliance (25%)
2. Attribute completeness (20%)
3. Selling-point coverage (20%)
4. Bullet clarity and order (20%)
5. Buyer persona and pain points (15%)

P0 compliance items are flagged at the top of the report; they don't change the weighted total.

Usage:
  python calculate_scores.py --compliance 75 --attribute 85 --selling 70 --clarity 90 --persona 65
  python calculate_scores.py --input scores.json [--output report.txt]
"""

import argparse
import json
import sys
from datetime import datetime

DIMENSION_WEIGHTS = {
    "compliance": 0.25,
    "attribute": 0.20,
    "selling": 0.20,
    "clarity": 0.20,
    "persona": 0.15,
}

DIMENSION_NAMES = {
    "compliance": "Compliance",
    "attribute": "Attribute completeness",
    "selling": "Selling-point coverage",
    "clarity": "Bullet clarity and order",
    "persona": "Buyer persona and pain points",
}

# (key, name, max score)
SUB_ITEMS = {
    "compliance": [
        ("title_length", "Title length within marketplace limit", 25),
        ("title_content", "Title content (no promo, false claims, competitor words)", 20),
        ("main_image", "Main image (white background, no added text, >=1000px)", 20),
        ("bullet_content", "Bullets (no price, promotion, shipping, contact)", 15),
        ("variation", "Variations (same category, consistent naming)", 10),
        ("image_video", "Images/video (no watermark, logos, misleading claims, XMP)", 10),
    ],
    "attribute": [
        ("structured_fields", "Structured attribute fill rate", 35),
        ("spec_completeness", "Key specifications complete", 25),
        ("variation_attrs", "Variation attributes complete", 15),
        ("highlights_filled", "Item Highlights filled", 10),
        ("aplus_exists", "A+ / description present", 10),
        ("search_terms", "Backend search terms (if available)", 5),
    ],
    "selling": [
        ("size_spec", "Size / quantity stated", 15),
        ("material", "Material / composition", 15),
        ("core_function", "Core function with numbers", 20),
        ("scene", "Use case / target buyer", 15),
        ("assembly", "Assembly / preparation / how to use", 15),
        ("differentiation", "Differentiation", 20),
    ],
    "clarity": [
        ("single_topic", "One topic per bullet", 20),
        ("dedup", "No repetition", 15),
        ("order", "Logical order (core benefit first)", 25),
        ("language", "Natural local language", 20),
        ("readability", "Readability", 10),
        ("consistency", "Consistency across title, bullets, attributes", 10),
    ],
    "persona": [
        ("persona_quality", "Buyer persona", 20),
        ("pain_list", "Pain-point list (5-8, prioritised, can/can't answer)", 20),
        ("pain_mapping", "Pain-to-selling-point coverage (answerable only)", 30),
        ("selling_omission", "Selling points the product has but text omits", 15),
        ("qa_coverage", "Q&A covers common doubts", 10),
        ("complaint_fix", "Negative-review themes addressed", 5),
    ],
}

# A sub-item at or below this score triggers a P0 flag
P0_THRESHOLDS = {
    "compliance": {
        "title_length": 10,
        "title_content": 8,
        "main_image": 10,
        "bullet_content": 10,
        "variation": 0,
    },
    "attribute": {
        "structured_fields": 10,
    },
}

P0_MESSAGES = {
    "title_length": "Title exceeds the marketplace character limit",
    "title_content": "Title contains banned characters, promo words, false claims or competitor brands",
    "main_image": "Main image not compliant (not white, added text/watermark, or under 1000px)",
    "bullet_content": "Bullets contain price, promotion, shipping or contact details",
    "variation": "Variations mix different categories",
    "structured_fields": "Core attributes largely empty (fill rate under 50%)",
}


def get_grade(score):
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Good"
    if score >= 65:
        return "Fair"
    return "Poor"


def validate_score(score, max_score, name):
    if score < 0 or score > max_score:
        print(f"Error: {name} score {score} is outside [0, {max_score}]", file=sys.stderr)
        sys.exit(1)
    return score


def calculate_dimension_score(dimension, sub_scores):
    total = 0
    details = []
    for key, name, max_score in SUB_ITEMS[dimension]:
        score = sub_scores.get(key, 0)
        validate_score(score, max_score, f"{DIMENSION_NAMES[dimension]} - {name}")
        total += score
        details.append({"name": name, "score": score, "max": max_score, "key": key})
    return total, details


def calculate_total_score(dimension_scores):
    return round(sum(score * DIMENSION_WEIGHTS[dim] for dim, score in dimension_scores.items()), 1)


def check_p0_issues(dimension_data):
    issues = []
    for dim, thresholds in P0_THRESHOLDS.items():
        for item in dimension_data.get(dim, {}).get("details", []):
            key = item.get("key", "")
            if key in thresholds and item["score"] <= thresholds[key]:
                issues.append(P0_MESSAGES.get(key, f"{DIMENSION_NAMES[dim]} - {item['name']} failed"))
    return issues


def generate_report(asin, dimension_data, total_score, site_info=None):
    lines = []
    lines.append("=" * 70)
    lines.append("  Amazon Listing Analyzer - Score Report")
    lines.append(f"  ASIN: {asin or 'not provided'}")
    if site_info:
        lines.append(
            f"  Marketplace: {site_info.get('site') or 'unknown'} | "
            f"Language: {site_info.get('language') or 'unknown'} | "
            f"Currency: {site_info.get('currency') or 'unknown'}"
        )
    lines.append(f"  Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("=" * 70)
    lines.append("")
    lines.append("SCORECARD")
    lines.append(f"{'Dimension':<34} {'Weight':>7} {'Score':>9} {'Grade':>10}")
    lines.append("-" * 64)
    for dim in DIMENSION_WEIGHTS:
        score = dimension_data[dim]["score"]
        lines.append(
            f"{DIMENSION_NAMES[dim]:<34} {DIMENSION_WEIGHTS[dim] * 100:>6.0f}% "
            f"{score:>5}/100 {get_grade(score):>10}"
        )
    lines.append("-" * 64)
    lines.append(f"{'Weighted total':<34} {'100%':>7} {total_score:>5}/100 {get_grade(total_score):>10}")
    lines.append("")
    lines.append("P0 COMPLIANCE CHECK")
    p0 = check_p0_issues(dimension_data)
    if p0:
        for issue in p0:
            lines.append(f"  ! {issue}")
    else:
        lines.append("  No P0 issues from sub-scores (check P0 items from the add-on diagnostics separately)")
    lines.append("")
    for dim in DIMENSION_WEIGHTS:
        data = dimension_data[dim]
        lines.append(f"{DIMENSION_NAMES[dim].upper()}: {data['score']}/100 ({get_grade(data['score'])})")
        for item in data["details"]:
            bar = "#" * int(item["score"] / item["max"] * 20) if item["max"] else ""
            lines.append(f"  {item['name']:<58} {item['score']:>3}/{item['max']:<3} {bar}")
        lines.append("")
    lines.append("=" * 70)
    return "\n".join(lines)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Amazon listing five-dimension score calculator")
    parser.add_argument("--asin", default="")
    parser.add_argument("--site", default="", help="e.g. amazon.in")
    parser.add_argument("--language", default="", help="e.g. en_IN")
    parser.add_argument("--currency", default="", help="e.g. INR")
    for dim in DIMENSION_WEIGHTS:
        parser.add_argument(f"--{dim}", type=float, help=f"{DIMENSION_NAMES[dim]} score (0-100)")
    parser.add_argument("--input", help="JSON file with sub-item scores per dimension")
    parser.add_argument("--output", default="", help="Save the text report to this path")
    args = parser.parse_args()

    site_info = {"site": args.site, "language": args.language, "currency": args.currency}

    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
        asin = data.get("asin", "")
        site_info = {k: data.get(k, site_info[k]) for k in site_info}
        dimension_data = {}
        for dim in DIMENSION_WEIGHTS:
            if dim in data:
                score, details = calculate_dimension_score(dim, data[dim])
                dimension_data[dim] = {"score": score, "details": details}
            else:
                dimension_data[dim] = {"score": 0, "details": []}
    else:
        asin = args.asin
        dimension_data = {}
        for dim in DIMENSION_WEIGHTS:
            value = getattr(args, dim, None)
            score = int(min(100, max(0, value))) if value is not None else 0
            dimension_data[dim] = {
                "score": score,
                "details": [{"name": "Total", "score": score, "max": 100}] if value is not None else [],
            }

    total = calculate_total_score({d: v["score"] for d, v in dimension_data.items()})
    report = generate_report(asin, dimension_data, total, site_info)
    print(report)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"\nReport saved to: {args.output}")


if __name__ == "__main__":
    main()
