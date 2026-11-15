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
});

export function parseListing(body: unknown): { listing: Listing } | { error: string } {
  const r = ListingInput.safeParse(body);
  if (!r.success) return { error: r.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ") };
  const l = r.data;
  if (Object.keys(l.attributes).length > 150) return { error: "Too many attributes." };
  return { listing: { ...l, bullets: l.bullets.map((b) => b.trim()).filter(Boolean) } as Listing };
}
