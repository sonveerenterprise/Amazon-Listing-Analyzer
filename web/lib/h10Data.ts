// Turns Helium 10 tool responses into the data the app shows. The tool
// caller is passed in, so this file has no network code and can be tested
// with recorded responses.
import type { Marketplace } from "./marketplaces";
import type { FetchedListing } from "./fetchListing";
import type { H10Competitor, H10Data, H10KeywordRow } from "./types";

export type CallTool = (name: string, args: Record<string, unknown>) => Promise<unknown>;

/** Marketplaces every Helium 10 tool used here supports. */
export const H10_MARKETPLACES = new Set(["US", "CA", "MX", "DE", "ES", "IT", "FR", "UK", "IN", "NL", "AU", "BR"]);
/** Tool calls one full load makes (the usage check itself is free). */
export const H10_CALLS_PER_LOAD = 5;

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Helium 10 wraps results as {data, error}. */
export function unwrap(res: unknown): Record<string, unknown> {
  const r = obj(res);
  if (r.error) throw new Error(typeof r.error === "string" ? r.error : str(obj(r.error).message) || "Helium 10 returned an error.");
  return obj(r.data);
}

export function mapKeywords(data: Record<string, unknown>): { total: number | null; rows: H10KeywordRow[] } {
  const rows = arr(data.keywords).map((k): H10KeywordRow => {
    const o = obj(k);
    return {
      phrase: str(o.phrase),
      searchVolume: num(o.search_volume),
      organicRank: num(o.organic_rank),
      organicPage: num(o.organic_page),
      sponsoredRank: num(o.sponsored_rank),
      sponsoredPage: num(o.sponsored_page),
      competingProducts: num(o.competing_products),
      titleDensity: num(o.title_density),
      amazonChoice: Boolean(o.amazon_choice) && o.amazon_choice === o.current_asin,
      clickShare: num(o.aba_click_share),
      convShare: num(o.aba_conv_share),
    };
  });
  rows.sort((a, b) => (b.searchVolume ?? -1) - (a.searchVolume ?? -1));
  return { total: num(obj(data.pagination).total_count), rows: rows.filter((r) => r.phrase).slice(0, 40) };
}

export function mapCompetitors(data: Record<string, unknown>, mk: Marketplace, selfAsin: string): H10Competitor[] {
  // Competitor prices arrive in the smallest currency unit (paise, cents); yen is whole.
  const div = mk.currency === "JPY" ? 1 : 100;
  return arr(data.competitor_products)
    .map((c): H10Competitor => {
      const o = obj(c);
      const price = num(o.price);
      return {
        asin: str(o.amazon_standard_identification_number),
        title: str(o.title).slice(0, 300),
        brand: str(o.brand),
        price: price === null ? null : price / div,
        rating: num(o.reviews_rating),
        reviews: num(o.review_count),
        images: num(o.number_of_images),
        variations: num(o.variation_count),
        monthlySales: num(o.monthly_sales),
        bsr: num(o.sales_rank),
      };
    })
    .filter((c) => c.asin && c.asin !== selfAsin)
    .slice(0, 6);
}

export function mapDetails(data: Record<string, unknown>): NonNullable<H10Data["details"]> {
  const s = obj(data.seed_data);
  return {
    lqs: num(s.lqs),
    price: num(s.price),
    rating: num(s.reviews_rating),
    reviews: num(s.review_count),
    bsr: num(s.sales_rank),
    subcategories: arr(s.subcategories)
      .map((x) => ({ name: str(obj(x).node_name), bsr: num(obj(x).subcategory_bsr) ?? 0 }))
      .filter((x) => x.name && x.bsr > 0),
    monthlySales: num(s.child_monthly_sales) ?? num(s.monthly_sales),
    monthlyRevenue: num(s.child_monthly_revenue) ?? num(s.monthly_revenue),
    images: num(s.number_of_images),
    variations: num(s.variation_count),
    seller: str(s.bb_seller),
    parentAsin: str(obj(data.variations).parent_asin),
  };
}

/**
 * The index check includes a control: a keyword the ASIN already ranks for
 * organically must come back indexed. If it does not, the check is not
 * trustworthy for this ASIN and the rows are withheld.
 */
export function mapIndex(data: Record<string, unknown>, control: string | null): NonNullable<H10Data["index"]> {
  const rows = arr(data.results).map((r) => ({ keyword: str(obj(r).keyword), indexed: obj(r).cumulative === true })).filter((r) => r.keyword);
  if (control) {
    const c = rows.find((r) => r.keyword.toLowerCase() === control.toLowerCase());
    if (!c || !c.indexed) {
      return { reliable: false, rows: [], note: `Helium 10 reported "${control}" as not indexed although the listing ranks for it organically, so the index check is not reliable for this ASIN right now.` };
    }
  }
  return { reliable: true, rows, note: control ? `Control passed: "${control}" (a keyword this listing ranks for) came back indexed.` : "No ranking keyword was available to use as a control." };
}

export async function gatherH10(call: CallTool, asin: string, mk: Marketplace, extraKeywords: string[] = []): Promise<{ listing: FetchedListing; h10: H10Data }> {
  const base = { marketplace: mk.code, context: "Listing audit in the seller's own listing analyzer app." };

  // The listing itself is required; everything after it is best-effort.
  const l = unwrap(await call("retrieve_listing_by_asin", { ...base, asin }));
  let title = str(l.product_name).trim();
  if (!title) throw new Error(`Helium 10 returned no listing for ${asin} on ${mk.domain}.`);
  let highlights = str(l.item_highlight).trim();
  // Amazon shows "title | highlights"; keep only the title part in the title.
  if (highlights && title.endsWith(highlights)) title = title.slice(0, -highlights.length).replace(/[\s|]+$/, "");
  else if (!highlights && title.includes("|")) {
    const [t, ...rest] = title.split("|");
    title = t.trim();
    highlights = rest.join("|").trim();
  }

  const h10: H10Data = { fetchedAt: new Date().toISOString(), warnings: [] };
  const attempt = async <T,>(label: string, fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (e) {
      h10.warnings.push(`${label} could not be loaded from Helium 10 (${e instanceof Error ? e.message : "error"}).`);
      return undefined;
    }
  };

  const [details, keywords, competitors] = await Promise.all([
    attempt("Listing details", async () => mapDetails(unwrap(await call("get_listing_details", { ...base, main_asin: asin })))),
    attempt("Keyword ranks", async () => mapKeywords(unwrap(await call("get_keywords_by_asin", { ...base, asin, limit: 150, exclude_variations: true })))),
    attempt("Competitors", async () => mapCompetitors(unwrap(await call("search_competitors_by_asin", { ...base, asin })), mk, asin)),
  ]);
  h10.details = details;
  h10.keywords = keywords;
  h10.competitors = competitors;

  const ranked = keywords?.rows.filter((r) => r.organicRank !== null && r.organicRank <= 20) ?? [];
  const control = ranked[0]?.phrase ?? null;
  const toCheck = [...new Set([...(control ? [control] : []), ...extraKeywords, ...(keywords?.rows.slice(0, 15).map((r) => r.phrase) ?? [])].map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, 25);
  if (toCheck.length) {
    h10.index = await attempt("Keyword index check", async () => mapIndex(unwrap(await call("check_asin_keyword_index", { ...base, asin, keywords: toCheck })), control));
  }

  const images = arr(l.images).length || details?.images || undefined;
  const sym = ({ INR: "₹", USD: "$", GBP: "£", EUR: "€", CAD: "$", AUD: "$", MXN: "$", BRL: "R$" } as Record<string, string>)[mk.currency] ?? `${mk.currency} `;
  return {
    listing: {
      asin,
      marketplace: mk.code,
      title,
      highlights,
      bullets: arr(l.bullet_points).map((b) => str(b).trim()).filter(Boolean),
      description: str(l.description).trim(),
      brand: "",
      attributes: {},
      page: {
        price: details?.price != null ? `${sym}${details.price}` : undefined,
        rating: details?.rating != null ? `${details.rating} out of 5 stars` : undefined,
        reviewCount: details?.reviews != null ? `${details.reviews} ratings` : undefined,
        imageCount: images,
        bestSellersRank: details?.bsr != null ? `#${details.bsr}` : undefined,
      },
      warnings: ["Helium 10 does not return the attribute table; paste attributes if you want them checked.", ...h10.warnings],
    },
    h10,
  };
}
