export type Priority = "P0" | "P1" | "P2";

export type DimensionKey = "compliance" | "attribute" | "selling" | "clarity" | "persona";

export type CategoryKey =
  | "food"
  | "furniture"
  | "electronics"
  | "kitchen"
  | "apparel"
  | "toys"
  | "outdoor"
  | "other";

export interface Listing {
  marketplace: string;
  category: CategoryKey;
  asin?: string;
  title: string;
  highlights: string;
  bullets: string[];
  description: string;
  brand: string;
  attributes: Record<string, string>;
  /** Keywords the seller wants to rank for (optional). */
  keywords: string[];
  /** Facts only known when the public page was fetched. */
  page?: {
    price?: string;
    rating?: string;
    reviewCount?: string;
    imageCount?: number;
    aplusModules?: number;
    hasVideo?: boolean;
    bestSellersRank?: string;
  };
}

export interface Finding {
  priority: Priority;
  dimension: DimensionKey | "sensitive" | "keywords";
  where: string;
  /** The offending text, when there is one. */
  text?: string;
  message: string;
  fix: string;
}

export interface ItemScore {
  key: string;
  name: string;
  max: number;
  /** null = not assessed (needs AI, or data not available). */
  score: number | null;
  note: string;
  source: "rule" | "ai" | "none";
}

export interface DimensionScore {
  key: DimensionKey;
  name: string;
  weight: number;
  /** 0–100 over the assessed items only; null when nothing was assessed. */
  score: number | null;
  /** Share of this dimension's rubric points that were assessed (0–1). */
  coverage: number;
  items: ItemScore[];
}

export interface Scorecard {
  total: number | null;
  grade: string;
  coverage: number;
  dimensions: DimensionScore[];
}

export interface KeywordRow {
  keyword: string;
  inTitle: boolean;
  inHighlights: boolean;
  inBullets: boolean;
}

export interface RuleReport {
  findings: Finding[];
  items: ItemScore[];
  keywordRows: KeywordRow[];
  facts: { titleLength: number; titleLimit: number; highlightsLength: number; highlightsLimit: number | null; bulletCount: number };
}
