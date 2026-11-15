// Source: references/multi_site_adaptation.md
export interface Marketplace {
  code: string;
  name: string;
  domain: string;
  language: string;
  currency: string;
  titleLimit: number;
  /** false = 200 is only a reference value; the seller must confirm in Seller Central. */
  titleLimitEnforced: boolean;
  highlightsLimit: number | null;
  /** Which sensitive-claim rule set applies. */
  claims: "IN" | "US" | "EU" | "JP" | "GEN";
}

const m = (
  code: string,
  name: string,
  domain: string,
  language: string,
  currency: string,
  claims: Marketplace["claims"],
  titleLimit = 200,
  titleLimitEnforced = false,
  highlightsLimit: number | null = null,
): Marketplace => ({ code, name, domain, language, currency, titleLimit, titleLimitEnforced, highlightsLimit, claims });

export const MARKETPLACES: Marketplace[] = [
  m("IN", "India", "amazon.in", "en_IN", "INR", "IN", 75, true, 75),
  m("US", "United States", "amazon.com", "en_US", "USD", "US", 75, true),
  m("UK", "United Kingdom", "amazon.co.uk", "en_GB", "GBP", "EU"),
  m("DE", "Germany", "amazon.de", "de_DE", "EUR", "EU"),
  m("FR", "France", "amazon.fr", "fr_FR", "EUR", "EU"),
  m("IT", "Italy", "amazon.it", "it_IT", "EUR", "EU"),
  m("ES", "Spain", "amazon.es", "es_ES", "EUR", "EU"),
  m("NL", "Netherlands", "amazon.nl", "nl_NL", "EUR", "EU"),
  m("SE", "Sweden", "amazon.se", "sv_SE", "SEK", "EU"),
  m("PL", "Poland", "amazon.pl", "pl_PL", "PLN", "EU"),
  m("CA", "Canada", "amazon.ca", "en_CA", "CAD", "US"),
  m("MX", "Mexico", "amazon.com.mx", "es_MX", "MXN", "GEN"),
  m("BR", "Brazil", "amazon.com.br", "pt_BR", "BRL", "GEN"),
  m("JP", "Japan", "amazon.co.jp", "ja_JP", "JPY", "JP"),
  m("AU", "Australia", "amazon.com.au", "en_AU", "AUD", "GEN"),
  m("SG", "Singapore", "amazon.sg", "en_SG", "SGD", "GEN"),
  m("AE", "UAE", "amazon.ae", "en_AE", "AED", "GEN"),
  m("SA", "Saudi Arabia", "amazon.sa", "en_AE", "SAR", "GEN"),
  m("TR", "Turkey", "amazon.com.tr", "tr_TR", "TRY", "GEN"),
  m("EG", "Egypt", "amazon.eg", "ar_EG", "EGP", "GEN"),
];

export function getMarketplace(code: string): Marketplace {
  return MARKETPLACES.find((x) => x.code === code) ?? MARKETPLACES[0];
}

const ASIN_RE = /^[A-Z0-9]{10}$/;

/**
 * Accepts a bare ASIN or an Amazon product URL. The marketplace is taken from
 * the URL's domain when it is one we know; nothing else from the URL is used,
 * so the server only ever requests a URL it builds itself.
 */
export function parseAsinInput(input: string, fallbackMarketplace: string): { asin: string; marketplace: Marketplace } | null {
  const raw = input.trim();
  if (ASIN_RE.test(raw.toUpperCase())) {
    return { asin: raw.toUpperCase(), marketplace: getMarketplace(fallbackMarketplace) };
  }
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|smile|m)\./, "");
  const marketplace = MARKETPLACES.find((x) => x.domain === host);
  if (!marketplace) return null;
  const match = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|product-reviews)\/([A-Za-z0-9]{10})(?:[/?]|$)/);
  if (!match) return null;
  return { asin: match[1].toUpperCase(), marketplace };
}

export function productUrl(asin: string, mk: Marketplace): string {
  return `https://www.${mk.domain}/dp/${asin}?language=${mk.language}&currency=${mk.currency}&th=1&psc=1`;
}
