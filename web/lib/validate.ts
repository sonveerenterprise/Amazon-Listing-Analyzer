import { z } from "zod";
import { MARKETPLACES } from "./marketplaces";
import type { Listing } from "./types";

const text = (max: number) => z.string().max(max).default("");

export const ListingInput = z.object({
  marketplace: z.enum(MARKETPLACES.map((m) => m.code) as [string, ...string[]]),
  category: z.enum(["food", "furniture", "electronics", "kitchen", "apparel", "toys", "outdoor", "other"]).default("other"),
  asin: z.string().regex(/^[A-Z0-9]{10}$/).optional(),
  title: z.string().trim().min(1, "A title is required").max(1000),
  highlights: text(1000),
  bullets: z.array(z.string().max(3000)).max(12).default([]),
  description: text(20000),
  brand: text(200),
  attributes: z.record(z.string().max(120), z.string().max(2000)).default({}),
  keywords: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  page: z
    .object({
      price: z.string().max(60).optional(),
      rating: z.string().max(60).optional(),
      reviewCount: z.string().max(60).optional(),
      imageCount: z.number().optional(),
      aplusModules: z.number().optional(),
      hasVideo: z.boolean().optional(),
      bestSellersRank: z.string().max(600).optional(),
    })
    .optional(),
  h10: z.unknown().optional(),
});

const n = z.number().nullable();
// Helium 10 data comes back from the browser, so it is re-checked and capped.
const H10Input = z.object({
  fetchedAt: z.string().max(40),
  details: z
    .object({
      lqs: n, price: n, rating: n, reviews: n, bsr: n,
      subcategories: z.array(z.object({ name: z.string().max(120), bsr: z.number() })).max(10),
      monthlySales: n, monthlyRevenue: n, images: n, variations: n,
      seller: z.string().max(200), parentAsin: z.string().max(20),
    })
    .optional(),
  keywords: z
    .object({
      total: n,
      rows: z
        .array(z.object({ phrase: z.string().max(200), searchVolume: n, organicRank: n, organicPage: n, sponsoredRank: n, sponsoredPage: n, competingProducts: n, titleDensity: n, amazonChoice: z.boolean(), clickShare: n, convShare: n }))
        .max(60),
    })
    .optional(),
  index: z.object({ reliable: z.boolean(), note: z.string().max(400), rows: z.array(z.object({ keyword: z.string().max(200), indexed: z.boolean() })).max(60) }).optional(),
  competitors: z.array(z.object({ asin: z.string().max(12), title: z.string().max(400), brand: z.string().max(200), price: n, rating: n, reviews: n, images: n, variations: n, monthlySales: n, bsr: n })).max(10).optional(),
  warnings: z.array(z.string().max(400)).max(10),
});

export function parseListing(body: unknown): { listing: Listing } | { error: string } {
  const r = ListingInput.safeParse(body);
  if (!r.success) return { error: r.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ") };
  const l = r.data;
  if (Object.keys(l.attributes).length > 150) return { error: "Too many attributes." };
  let h10: Listing["h10"];
  if (l.h10 !== undefined && l.h10 !== null) {
    const h = H10Input.safeParse(l.h10);
    if (!h.success) return { error: "The Helium 10 data was not in the expected format. Load the listing again." };
    h10 = h.data;
  }
  return { listing: { ...l, h10, bullets: l.bullets.map((b) => b.trim()).filter(Boolean) } as Listing };
}
