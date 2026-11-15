// Fetches a public Amazon product page and extracts the listing fields.
// Amazon often answers automated requests with a robot check; that case is
// reported as "blocked" so the UI can ask the user to paste the listing.
import * as cheerio from "cheerio";
import { productUrl, type Marketplace } from "./marketplaces";

export interface FetchedListing {
  asin: string;
  marketplace: string;
  title: string;
  highlights: string;
  bullets: string[];
  description: string;
  brand: string;
  attributes: Record<string, string>;
  page: {
    price?: string;
    rating?: string;
    reviewCount?: string;
    imageCount?: number;
    aplusModules?: number;
    hasVideo?: boolean;
    bestSellersRank?: string;
  };
  warnings: string[];
}

export class FetchBlockedError extends Error {}

const clean = (s: string) => s.replace(/[‎‏ ]/g, " ").replace(/\s+/g, " ").trim();

export function parseListingHtml(html: string, asin: string, mk: Marketplace): FetchedListing {
  if (/\/errors\/validateCaptcha|api-services-support@amazon\.com|Enter the characters you see below/i.test(html)) {
    throw new FetchBlockedError("Amazon asked for a robot check.");
  }
  const $ = cheerio.load(html);
  const warnings: string[] = [];

  let title = clean($("#productTitle").first().text());
  if (!title) throw new FetchBlockedError("The page did not contain a product title.");
  let highlights = clean($(".dp-title-differentiators").first().text());
  if (!highlights && title.includes("|")) {
    const [t, ...rest] = title.split("|");
    title = clean(t);
    highlights = clean(rest.join("|"));
  }

  const bulletSel = ["#feature-bullets ul li:not(.aok-hidden) span.a-list-item", "#productFactsDesktopExpander ul li span.a-list-item"];
  let bullets: string[] = [];
  for (const sel of bulletSel) {
    bullets = $(sel).map((_, el) => clean($(el).text())).get().filter(Boolean);
    if (bullets.length) break;
  }

  const byline = clean($("#bylineInfo").first().text());
  const brand = byline.replace(/^Visit the\s+/i, "").replace(/\s+Store$/i, "").replace(/^Brand:\s*/i, "");

  const attributes: Record<string, string> = {};
  const put = (k: string, v: string) => {
    const key = clean(k).replace(/\s*:\s*$/, "");
    const val = clean(v);
    if (key && val && !attributes[key] && key.length < 80) attributes[key] = val.slice(0, 600);
  };
  $("#productOverview_feature_div tr, #productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #technicalSpecifications_section_1 tr, table.a-keyvalue tr").each((_, tr) => {
    const cells = $(tr).children("th, td");
    if (cells.length >= 2) put($(cells[0]).text(), $(cells[1]).text());
  });
  $("#detailBullets_feature_div li, #detailBulletsWrapper_feature_div li").each((_, li) => {
    const spans = $(li).find("span.a-list-item > span");
    if (spans.length >= 2) put($(spans[0]).text(), $(spans[1]).text());
  });
  $("#important-information .content").each((_, el) => {
    const head = $(el).find("h4, h5, .a-text-bold").first().text();
    const body = $(el).clone().find("h4, h5").remove().end().text();
    put(head, body);
  });

  const description = clean($("#productDescription").first().text());
  const price = clean($("#corePriceDisplay_desktop_feature_div .a-price .a-offscreen, #corePrice_feature_div .a-price .a-offscreen, #apex_desktop .a-price .a-offscreen").first().text());
  const rating = clean($("#acrPopover").first().attr("title") ?? "");
  const reviewCount = clean($("#acrCustomerReviewText").first().text());

  const imgBlock = html.match(/'colorImages'\s*:\s*\{[\s\S]*?\}\s*,\s*'colorToAsin'/)?.[0] ?? html.match(/"colorImages"\s*:\s*\{[\s\S]{0,60000}?\]\s*\}/)?.[0] ?? "";
  const imageCount = Math.max((imgBlock.match(/"hiRes"\s*:\s*"http/g) ?? []).length, (imgBlock.match(/"large"\s*:\s*"http/g) ?? []).length) || undefined;
  const hasAplusBlock = $("#aplus, #aplus_feature_div").length > 0;
  const aplusModules = $("#aplus .aplus-module").length || (hasAplusBlock && clean($("#aplus").text()).length > 80 ? 1 : 0);
  const hasVideo = /"videos"\s*:\s*\[\s*\{/.test(html) || $("#main-video-container, .vse-player-container").length > 0;

  const currencyOk = !price || price.includes(symbolFor(mk.currency)) || /^[\d.,\s]+$/.test(price);
  if (!currencyOk) warnings.push(`The price (${price}) is not in ${mk.currency}; the page may be showing another region.`);
  if (!bullets.length) warnings.push("No bullet points were found on the page; paste them if the listing has them.");
  if (!highlights) warnings.push("Item Highlights only render in a browser and were not in the fetched page; paste them if the listing has them.");
  if (!Object.keys(attributes).length) warnings.push("No attribute table was found; this does not prove the backend attributes are empty.");

  return {
    asin,
    marketplace: mk.code,
    title,
    highlights,
    bullets,
    description,
    brand,
    attributes,
    page: {
      price: price || undefined,
      rating: rating || undefined,
      reviewCount: reviewCount || undefined,
      imageCount,
      aplusModules,
      hasVideo,
      bestSellersRank: attributes["Best Sellers Rank"],
    },
    warnings,
  };
}

function symbolFor(currency: string): string {
  return ({ INR: "₹", USD: "$", GBP: "£", EUR: "€", JPY: "¥", CAD: "$", AUD: "$", MXN: "$", BRL: "R$", SGD: "$" } as Record<string, string>)[currency] ?? currency;
}

export async function fetchListing(asin: string, mk: Marketplace): Promise<FetchedListing> {
  const lang = mk.language.replace("_", "-");
  let res: Response;
  try {
    res = await fetch(productUrl(asin, mk), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": `${lang},en;q=0.8`,
        Cookie: `i18n-prefs=${mk.currency}; lc-main=${mk.language}`,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
  } catch {
    throw new FetchBlockedError("Amazon could not be reached.");
  }
  if (res.status === 404) throw new Error(`ASIN ${asin} was not found on ${mk.domain}.`);
  if (!res.ok) throw new FetchBlockedError(`Amazon answered with status ${res.status}.`);
  return parseListingHtml(await res.text(), asin, mk);
}
