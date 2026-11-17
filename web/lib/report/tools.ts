// The tools the report agent can use. Everything it can reach is defined
// here: the marketplace's public pages, Amazon image files, a fixed list of
// read-only Helium 10 tools (with a per-report call cap), and two calculators.
import { createSdkMcpServer, tool, type SdkMcpToolDefinition } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { h10Call, h10Connected } from "../h10Client";
import type { Marketplace } from "../marketplaces";
import { DIMENSIONS, grade } from "../scoring";
import { AmazonBrowser } from "./browser";

const MARKETPLACE_IDS: Record<string, string> = {
  IN: "A21TJRUUN4KGV", US: "ATVPDKIKX0DER", UK: "A1F83G8C2ARO7P", DE: "A1PA6795UKMFR9", FR: "A13V1IB3VIYZZH", IT: "APJ6JRA9NG5V4",
  ES: "A1RKKUPIHCS9HS", CA: "A2EUQ1WTGCTBG2", JP: "A1VC38T7YXB528", AU: "A39IBJ37TRP1C6", AE: "A2VIGQ35RCS4UG", MX: "A1AM78C64UM0Y8",
  BR: "A2Q3Y263D00KWC", NL: "A1805IZSGTT6HS", SG: "A19VAU5U5O7RUS", SE: "A2NODRKZP88ZB9", PL: "A1C3SOZRARQ6R3", TR: "A33AVAJ2PDY3EV", SA: "A17E79C6D8DWNP", EG: "ARBP9OOSHTCHU",
};

/** Read-only Helium 10 tools the agent may call, with what each costs in output size. */
export const H10_ALLOWED = [
  "retrieve_listing_by_asin",
  "get_listing_details",
  "get_listing_score",
  "get_keywords_by_asin",
  "get_top_keywords",
  "check_asin_keyword_index",
  "search_competitors_by_asin",
  "compare_listings",
  "get_asin_review_analysis",
  "analyze_keywords",
] as const;

const IMAGE_HOSTS = new Set(["m.media-amazon.com", "images-na.ssl-images-amazon.com", "images-eu.ssl-images-amazon.com"]);

const json = (v: unknown) => ({ content: [{ type: "text" as const, text: typeof v === "string" ? v : JSON.stringify(v) }] });
const fail = (e: unknown) => ({ content: [{ type: "text" as const, text: `Tool failed: ${e instanceof Error ? e.message.slice(0, 400) : "error"}. Treat this data as not obtained.` }], isError: true });
const asinShape = z.string().regex(/^[A-Za-z0-9]{10}$/);

/** Keeps a large Helium 10 result inside the model's budget. */
export function trimForModel(value: unknown, maxChars = 45_000): string {
  const drop = new Set(["bsr_chart", "subcategories_bsr", "sales_units_chart", "image_url", "phrase_id", "suggested_bid_usd", "buy_box_seller_identifier", "fulfilled_by_amazon_fee"]);
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k]) => !drop.has(k)).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  let slim = walk(value) as Record<string, unknown>;
  let text = JSON.stringify(slim);
  // Long row lists (148 competitors, hundreds of keywords) are cut from the end.
  for (let keep = 60; text.length > maxChars && keep >= 5; keep = Math.floor(keep / 2)) {
    const data = (slim?.data ?? slim) as Record<string, unknown>;
    for (const k of Object.keys(data ?? {})) if (Array.isArray(data[k]) && (data[k] as unknown[]).length > keep) data[k] = [...(data[k] as unknown[]).slice(0, keep), `… ${(data[k] as unknown[]).length - keep} more rows not shown`];
    text = JSON.stringify(slim);
  }
  return text.length > maxChars ? `${text.slice(0, maxChars)} …[truncated]` : text;
}

export function countCharacters(texts: string[]) {
  return texts.map((t) => ({ text: t, characters: [...t].length, bytes: Buffer.byteLength(t, "utf8") }));
}

export function buildTools(mk: Marketplace, onStep: (label: string) => void, h10MaxCalls: number) {
  const browser = new AmazonBrowser(mk);
  let h10Calls = 0;
  const run = async <T,>(label: string, fn: () => Promise<T>) => {
    onStep(label);
    try {
      return json(await fn());
    } catch (e) {
      return fail(e);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: SdkMcpToolDefinition<any>[] = [
    tool("amazon_product_page", `Open a product page on ${mk.domain} in a real browser and return its content as JSON: title, Item Highlights, bullets, description, price, MRP, rating, badges, variants, images of the current variant (colorImages.initial with hiRes URLs and pixel sizes), video count, attribute tables, Important information, A+ modules (text, image URLs, alt text), Brand Story, "Customers say" summary and aspect buttons, star distribution, and an excerpt of the visible text as a safety net. Returns {blocked:true} if Amazon shows a robot check.`, { asin: asinShape }, ({ asin }) =>
      run(`Reading product page ${asin.toUpperCase()}`, () => browser.productPage(asin.toUpperCase())),
    ),
    tool("amazon_search", `Open a live search results page on ${mk.domain} and return each result in page order with: asin, sponsored (true/false), position (counted separately for organic and sponsored), title, price, unit price, rating and ratings count; plus the results bar text ("1-48 of over 2,000 results") and the organic and sponsored counts. Use page 2 for core keywords not found on page 1; organic positions on page 2 continue after page 1's organic_count.`, { keyword: z.string().min(1).max(150), page: z.number().int().min(1).max(3).default(1) }, ({ keyword, page }) =>
      run(`Searching "${keyword}"${page > 1 ? ` (page ${page})` : ""}`, () => browser.search(keyword, page)),
    ),
    tool("amazon_suggestions", `Amazon's own search suggestions (autocomplete) on ${mk.domain} for up to 30 prefixes per call, fetched from a tab on the site. Returns prefix → list of suggestions.`, { prefixes: z.array(z.string().min(1).max(80)).min(1).max(30) }, ({ prefixes }) =>
      run(`Reading Amazon search suggestions (${prefixes.length})`, () => browser.suggestions(prefixes, MARKETPLACE_IDS[mk.code] ?? MARKETPLACE_IDS.IN)),
    ),
    tool("amazon_index_check", `Keyword indexing check from the skill: searches "{ASIN} {word}" on ${mk.domain} for each word and returns true when the result HTML contains the ASIN. Include 3-4 unrelated control words in the same call.`, { asin: asinShape, words: z.array(z.string().min(1).max(60)).min(1).max(22) }, ({ asin, words }) =>
      run(`Checking keyword indexing (${words.length} words)`, () => browser.indexCheck(asin.toUpperCase(), words)),
    ),
    tool("amazon_page_text", `Open any other path on ${mk.domain} (for example /product-reviews/{ASIN} or /gp/bestsellers/...) and return its visible text (up to 20,000 characters). The path must start with "/".`, { path: z.string().min(2).max(400) }, ({ path }) =>
      run(`Reading ${path.slice(0, 60)}`, () => browser.pageText(path)),
    ),
    tool("view_images", "Look at up to 4 Amazon-hosted images (listing carousel, A+ or competitor images) by URL. Returns the images so you can review them: text on the image, layout, nutrition tables, logos. For label text and nutrition tables ask for size 1500; otherwise 800 is enough.", { urls: z.array(z.string().url()).min(1).max(4), size: z.number().int().min(300).max(1600).default(800) }, async ({ urls, size }) => {
      onStep(`Looking at ${urls.length} image${urls.length > 1 ? "s" : ""}`);
      const content: ({ type: "text"; text: string } | { type: "image"; data: string; mimeType: string })[] = [];
      for (const raw of urls) {
        try {
          const u = new URL(raw);
          if (u.protocol !== "https:" || !IMAGE_HOSTS.has(u.hostname)) throw new Error("only Amazon image hosts are allowed");
          // Amazon serves a resized copy when a size tag is put before the extension.
          const sized = u.pathname.replace(/(\/images\/I\/[^./]+)(?:\.[^/]*)?\.(jpe?g|png|webp)$/i, `$1._SL${size}_.$2`);
          const res = await fetch(`${u.origin}${sized}`, { signal: AbortSignal.timeout(20_000) });
          const type = res.headers.get("content-type") ?? "";
          if (!res.ok || !/^image\/(jpeg|png|webp|gif)/.test(type)) throw new Error(`status ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length > 4_500_000) throw new Error("image too large");
          content.push({ type: "text", text: `Image: ${raw}` }, { type: "image", data: buf.toString("base64"), mimeType: type.split(";")[0] });
        } catch (e) {
          content.push({ type: "text", text: `Image not obtained: ${raw} (${e instanceof Error ? e.message : "error"})` });
        }
      }
      return { content };
    }),
    tool("count_characters", "Count characters and UTF-8 bytes of each text exactly. Always use this before giving a title, Item Highlights, bullets, description or backend search terms; do not count by eye.", { texts: z.array(z.string().max(5000)).min(1).max(20) }, async ({ texts }) => json(countCharacters(texts))),
    tool("calculate_scores", `Weighted five-dimension total, as scripts/calculate_scores.py does. Pass each dimension's 0-100 score. Weights: ${DIMENSIONS.map((d) => `${d.key} ${d.weight * 100}%`).join(", ")}.`, { compliance: z.number().min(0).max(100), attribute: z.number().min(0).max(100), selling: z.number().min(0).max(100), clarity: z.number().min(0).max(100), persona: z.number().min(0).max(100) }, async (scores) => {
      const total = DIMENSIONS.reduce((a, d) => a + scores[d.key] * d.weight, 0);
      const rounded = Math.round(total * 10) / 10;
      return json({ total: rounded, grade: grade(rounded), weights: Object.fromEntries(DIMENSIONS.map((d) => [d.key, d.weight])) });
    }),
  ];

  if (h10Connected()) {
    tools.push(
      tool("helium10", `Call one of the seller's Helium 10 tools (paid data: name "Helium 10" as the source in the report). Allowed tools: ${H10_ALLOWED.join(", ")}. This report may use at most ${h10MaxCalls} Helium 10 calls, so plan them. Typical arguments: retrieve_listing_by_asin {asin, marketplace}; get_listing_details {main_asin, marketplace}; get_keywords_by_asin {asin, marketplace, limit, exclude_variations}; check_asin_keyword_index {asin, marketplace, keywords[] (max 50)}; search_competitors_by_asin {asin, marketplace, filters?}; compare_listings {main_asin, competitor_asins[], marketplace}; get_asin_review_analysis {asin, marketplace}. Marketplace code here: ${mk.code}. Large results are shortened. Helium 10's index checker can be wrong; cross-check it against amazon_index_check controls.`, { tool: z.enum(H10_ALLOWED), arguments: z.record(z.string(), z.unknown()) }, async ({ tool: name, arguments: args }) => {
        if (h10Calls >= h10MaxCalls) return fail(new Error(`Helium 10 call limit for this report reached (${h10MaxCalls})`));
        h10Calls++;
        onStep(`Helium 10: ${name.replace(/_/g, " ")}`);
        try {
          return json(trimForModel(await h10Call(name, { context: "Listing audit report for the seller.", ...args })));
        } catch (e) {
          return fail(e);
        }
      }),
    );
  }

  return {
    server: createSdkMcpServer({ name: "listing", version: "1.0.0", tools }),
    toolNames: tools.map((t) => `mcp__listing__${t.name}`),
    close: () => browser.close(),
    h10Used: () => h10Calls,
  };
}
