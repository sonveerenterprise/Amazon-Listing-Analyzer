// Port of scripts/calculate_scores.py, extended so items that could not be
// assessed are left out of the maths instead of being counted as zero.
import type { DimensionKey, DimensionScore, ItemScore, Scorecard } from "./types";

export const DIMENSIONS: { key: DimensionKey; name: string; weight: number; items: [string, string, number][] }[] = [
  {
    key: "compliance",
    name: "Compliance",
    weight: 0.25,
    items: [
      ["title_length", "Title length", 25],
      ["title_content", "Title content", 20],
      ["main_image", "Main image", 20],
      ["bullet_content", "Bullet content", 15],
      ["variation", "Variations", 10],
      ["image_video", "Images and video", 10],
    ],
  },
  {
    key: "attribute",
    name: "Attribute completeness",
    weight: 0.2,
    items: [
      ["structured_fields", "Structured fields", 35],
      ["spec_completeness", "Key specifications", 25],
      ["variation_attrs", "Variation attributes", 15],
      ["highlights_filled", "Item Highlights", 10],
      ["aplus_exists", "A+ / description", 10],
      ["search_terms", "Search terms", 5],
    ],
  },
  {
    key: "selling",
    name: "Selling-point coverage",
    weight: 0.2,
    items: [
      ["size_spec", "Size / quantity", 15],
      ["material", "Material / composition", 15],
      ["core_function", "Core function with numbers", 20],
      ["scene", "Use case / buyer", 15],
      ["assembly", "Assembly / preparation / how to use", 15],
      ["differentiation", "Differentiation", 20],
    ],
  },
  {
    key: "clarity",
    name: "Bullet clarity and order",
    weight: 0.2,
    items: [
      ["single_topic", "One topic per bullet", 20],
      ["dedup", "No repetition", 15],
      ["order", "Order", 25],
      ["language", "Language", 20],
      ["readability", "Readability", 10],
      ["consistency", "Consistency", 10],
    ],
  },
  {
    key: "persona",
    name: "Buyer persona and pain points",
    weight: 0.15,
    items: [
      ["persona_quality", "Persona", 20],
      ["pain_list", "Pain-point list", 20],
      ["pain_mapping", "Pain coverage", 30],
      ["selling_omission", "Omissions", 15],
      ["qa_coverage", "Q&A", 10],
      ["complaint_fix", "Negative reviews", 5],
    ],
  },
];

export const ITEM_KEYS = DIMENSIONS.flatMap((d) => d.items.map((i) => i[0]));

export function grade(total: number): string {
  if (total >= 90) return "Excellent";
  if (total >= 75) return "Good";
  if (total >= 65) return "Fair";
  return "Poor";
}

/** Items the rule engine measures exactly; an AI score never replaces them. */
const RULE_AUTHORITATIVE = new Set(["title_length", "highlights_filled"]);

/** Later sources win, except for rule-authoritative items. */
export function mergeItems(rule: ItemScore[], ai: ItemScore[]): ItemScore[] {
  const byKey = new Map<string, ItemScore>();
  for (const it of rule) if (it.score !== null) byKey.set(it.key, it);
  for (const it of ai) {
    if (it.score === null) continue;
    const existing = byKey.get(it.key);
    if (existing && RULE_AUTHORITATIVE.has(it.key)) continue;
    byKey.set(it.key, it);
  }
  return [...byKey.values()];
}

const MIN_COVERAGE = 0.4;

export function buildScorecard(scored: ItemScore[]): Scorecard {
  const byKey = new Map(scored.map((s) => [s.key, s]));
  const dimensions: DimensionScore[] = DIMENSIONS.map((d) => {
    const items: ItemScore[] = d.items.map(([key, name, max]) => {
      const s = byKey.get(key);
      if (!s || s.score === null) {
        return { key, name, max, score: null, note: s?.note ?? "Not assessed", source: "none" };
      }
      return { ...s, name, max, score: Math.max(0, Math.min(max, Math.round(s.score))) };
    });
    const assessed = items.filter((i) => i.score !== null);
    const maxAssessed = assessed.reduce((a, i) => a + i.max, 0);
    const maxAll = items.reduce((a, i) => a + i.max, 0);
    const got = assessed.reduce((a, i) => a + (i.score ?? 0), 0);
    return {
      key: d.key,
      name: d.name,
      weight: d.weight,
      // A dimension is only scored when enough of it was assessed; one
      // measured item out of six would otherwise read as a full score.
      score: maxAssessed / maxAll >= MIN_COVERAGE ? Math.round((got / maxAssessed) * 1000) / 10 : null,
      coverage: maxAssessed / maxAll,
      items,
    };
  });

  const live = dimensions.filter((d) => d.score !== null);
  const weightSum = live.reduce((a, d) => a + d.weight, 0);
  const total = weightSum > 0 ? Math.round((live.reduce((a, d) => a + (d.score ?? 0) * d.weight, 0) / weightSum) * 10) / 10 : null;
  const coverage = dimensions.reduce((a, d) => a + d.coverage * d.weight, 0);
  return { total, grade: total === null ? "Not scored" : grade(total), coverage, dimensions };
}
