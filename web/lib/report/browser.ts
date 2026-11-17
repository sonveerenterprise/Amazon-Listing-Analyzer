// Reads public Amazon pages in a real browser for the report agent.
// It behaves like one person browsing: one tab, a pause between pages, the
// browser's own identity, and no attempt to get past a robot check. When
// Amazon blocks a page the tool says so and the agent reports "not obtained".
import type { Browser, BrowserContext, Page } from "playwright";
import type { Marketplace } from "../marketplaces";

const MAX_PAGES_PER_REPORT = 90;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class AmazonBrowser {
  private browser: Browser | null = null;
  private ctx: BrowserContext | null = null;
  private page: Page | null = null;
  private pages = 0;
  private last = 0;
  private startError: string | null = null;

  constructor(private mk: Marketplace) {}

  private origin() {
    return `https://www.${this.mk.domain}`;
  }

  private async tab(): Promise<Page> {
    if (this.page) return this.page;
    if (this.startError) throw new Error(this.startError);
    try {
      const { chromium } = await import("playwright");
      const headless = process.env.BROWSER_HEADLESS !== "false";
      const opts = { headless, executablePath: process.env.CHROMIUM_PATH || undefined };
      try {
        // Prefer the Chrome already installed on the machine; fall back to Playwright's Chromium.
        this.browser = process.env.CHROMIUM_PATH ? await chromium.launch(opts) : await chromium.launch({ ...opts, channel: process.env.BROWSER_CHANNEL || "chrome" });
      } catch {
        this.browser = await chromium.launch(opts);
      }
      this.ctx = await this.browser.newContext({ locale: this.mk.language.replace("_", "-"), viewport: { width: 1366, height: 900 } });
      await this.ctx.addCookies([
        { name: "i18n-prefs", value: this.mk.currency, domain: `.${this.mk.domain}`, path: "/" },
        { name: "lc-main", value: this.mk.language, domain: `.${this.mk.domain}`, path: "/" },
      ]);
      this.page = await this.ctx.newPage();
      return this.page;
    } catch (e) {
      this.startError = `The browser could not be started on this server (${e instanceof Error ? e.message.split("\n")[0] : "error"}). Amazon pages are not available for this report.`;
      throw new Error(this.startError);
    }
  }

  /** Opens a path on the marketplace's own site, politely paced. */
  private async open(pathAndQuery: string): Promise<{ page: Page; blocked: boolean; status: number }> {
    if (!pathAndQuery.startsWith("/") || pathAndQuery.startsWith("//")) throw new Error("Only paths on the Amazon marketplace site can be opened.");
    if (++this.pages > MAX_PAGES_PER_REPORT) throw new Error(`Page limit for one report reached (${MAX_PAGES_PER_REPORT}). Finish the report with the data already collected.`);
    const page = await this.tab();
    const wait = 2500 + Math.random() * 2000 - (Date.now() - this.last);
    if (wait > 0) await sleep(wait);
    const res = await page.goto(this.origin() + pathAndQuery, { waitUntil: "domcontentloaded", timeout: 45_000 });
    this.last = Date.now();
    if (new URL(page.url()).hostname !== `www.${this.mk.domain}`) throw new Error("The page redirected away from the marketplace site.");
    const blocked = await page.evaluate(() => Boolean(document.querySelector('form[action*="validateCaptcha"]')) || /Enter the characters you see below|api-services-support@amazon/i.test(document.body?.innerText ?? ""));
    return { page, blocked, status: res?.status() ?? 0 };
  }

  private withLang(p: string) {
    return `${p}${p.includes("?") ? "&" : "?"}language=${this.mk.language}`;
  }

  async productPage(asin: string) {
    const { page, blocked, status } = await this.open(this.withLang(`/dp/${asin}?th=1&psc=1&currency=${this.mk.currency}`));
    if (blocked) return { blocked: true, note: "Amazon showed a robot check. Mark page data as not obtained." };
    if (status === 404) return { not_found: true };
    // Let lazy modules (A+, review insights) render.
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 2500);
      await sleep(500);
    }
    return page.evaluate(extractProductPage);
  }

  async search(keyword: string, pageNo: number) {
    const { page, blocked } = await this.open(this.withLang(`/s?k=${encodeURIComponent(keyword)}${pageNo > 1 ? `&page=${pageNo}` : ""}`));
    if (blocked) return { blocked: true, note: "Amazon showed a robot check. Mark this keyword as not obtained." };
    return { keyword, page: pageNo, ...(await page.evaluate(extractSearch)) };
  }

  /** Runs from the open tab so the requests are same-origin, as the skill describes. */
  private async onSite(): Promise<Page> {
    const page = await this.tab();
    if (!page.url().startsWith(this.origin())) await this.open(this.withLang("/"));
    return page;
  }

  async suggestions(prefixes: string[], marketplaceId: string) {
    const page = await this.onSite();
    const out: Record<string, string[] | string> = {};
    for (const prefix of prefixes) {
      await sleep(400 + Math.random() * 400);
      out[prefix] = await page.evaluate(
        async ({ prefix, mid, lop }) => {
          try {
            const r = await fetch(`/suggestions?limit=11&suggestion-type=KEYWORD&alias=aps&site-variant=desktop&version=3&lop=${lop}&mid=${mid}&prefix=${encodeURIComponent(prefix)}`);
            if (!r.ok) return `not obtained (status ${r.status})`;
            const j = await r.json();
            return (j.suggestions ?? []).map((s: { value: string }) => s.value);
          } catch {
            return "not obtained";
          }
        },
        { prefix, mid: marketplaceId, lop: this.mk.language },
      );
    }
    return out;
  }

  async indexCheck(asin: string, words: string[]) {
    const page = await this.onSite();
    const out: Record<string, boolean | string> = {};
    for (const word of words) {
      if (++this.pages > MAX_PAGES_PER_REPORT) break;
      await sleep(1500 + Math.random() * 1500);
      out[word] = await page.evaluate(
        async ({ asin, word }) => {
          try {
            const r = await fetch("/s?k=" + encodeURIComponent(asin + " " + word));
            if (!r.ok) return `not obtained (status ${r.status})`;
            const html = await r.text();
            if (/validateCaptcha/.test(html)) return "not obtained (robot check)";
            return html.includes(`data-asin="${asin}"`);
          } catch {
            return "not obtained";
          }
        },
        { asin, word },
      );
    }
    return out;
  }

  async pageText(pathAndQuery: string) {
    const { page, blocked } = await this.open(this.withLang(pathAndQuery));
    if (blocked) return { blocked: true };
    const text = await page.evaluate(() => ((document.querySelector("#dp, #search, #cm_cr-review_list, main") ?? document.body) as HTMLElement).innerText.replace(/\n{3,}/g, "\n\n"));
    return { url: page.url(), text: text.slice(0, 20_000), truncated: text.length > 20_000 };
  }

  async close() {
    await this.browser?.close().catch(() => undefined);
    this.browser = null;
    this.page = null;
  }
}

// ---- Functions below run inside the page. They must be self-contained. ----

export function extractProductPage() {
  const clean = (s: string | null | undefined) => (s ?? "").replace(/[‎‏ ]/g, " ").replace(/\s+/g, " ").trim();
  const text = (sel: string) => clean(document.querySelector(sel)?.textContent);
  const all = (sel: string) => [...document.querySelectorAll(sel)];
  const attributes: Record<string, string> = {};
  const put = (k: string, v: string) => {
    const key = clean(k).replace(/\s*:\s*$/, "");
    if (key && clean(v) && !attributes[key] && key.length < 80) attributes[key] = clean(v).slice(0, 500);
  };
  for (const tr of all("#productOverview_feature_div tr, #productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #technicalSpecifications_section_1 tr, #prodDetails table tr")) {
    const cells = tr.querySelectorAll("th, td");
    if (cells.length >= 2) put(cells[0].textContent ?? "", cells[1].textContent ?? "");
  }
  for (const li of all("#detailBullets_feature_div li, #detailBulletsWrapper_feature_div li")) {
    const spans = li.querySelectorAll("span.a-list-item > span");
    if (spans.length >= 2) put(spans[0].textContent ?? "", spans[1].textContent ?? "");
  }
  const important: Record<string, string> = {};
  for (const el of all("#important-information .content, #important-information .a-section")) {
    const head = clean(el.querySelector("h4, h5, .a-text-bold")?.textContent);
    const body = clean(el.textContent).replace(head, "").trim();
    if (head && body && !important[head]) important[head] = body.slice(0, 1500);
  }

  // Images for the current variant only: the colorImages.initial block.
  let images: { variant: string; url: string; width?: number; height?: number }[] = [];
  let videoCount = 0;
  for (const s of all("script")) {
    const t = s.textContent ?? "";
    if (!t.includes("colorImages")) continue;
    // Cut out the JSON array that follows a key by matching brackets, since
    // the array contains nested brackets and braces.
    const arrayAfter = (key: RegExp): unknown[] | null => {
      const k = t.search(key);
      const start = k < 0 ? -1 : t.indexOf("[", k);
      if (start < 0) return null;
      let depth = 0;
      let inStr = false;
      for (let i = start; i < t.length; i++) {
        const ch = t[i];
        if (inStr) {
          if (ch === "\\") i++;
          else if (ch === '"') inStr = false;
        } else if (ch === '"') inStr = true;
        else if (ch === "[") depth++;
        else if (ch === "]" && --depth === 0) {
          try {
            return JSON.parse(t.slice(start, i + 1)) as unknown[];
          } catch {
            return null;
          }
        }
      }
      return null;
    };
    const initial = arrayAfter(/['"]colorImages['"]\s*:\s*\{\s*['"]initial['"]\s*:/) as { variant?: string; hiRes?: string | null; large?: string; main?: Record<string, [number, number]> }[] | null;
    if (initial) {
      images = initial.map((i) => {
        const url = i.hiRes || i.large || "";
        const dims = i.main ? Object.values(i.main).sort((x, y) => y[0] - x[0])[0] : undefined;
        return { variant: i.variant ?? "", url, width: dims?.[0], height: dims?.[1] };
      }).filter((i) => i.url);
    }
    videoCount = arrayAfter(/"videos"\s*:/)?.length ?? videoCount;
  }

  const aplus = all("#aplus .aplus-module, #aplus_feature_div .aplus-module, #aplusBrandStory_feature_div .aplus-module").map((m) => ({
    kind: [...m.classList].filter((c) => c !== "aplus-module").join(" ").slice(0, 80),
    brand_story: Boolean(m.closest("#aplusBrandStory_feature_div")),
    text: clean(m.textContent).slice(0, 700),
    images: [...m.querySelectorAll("img")].map((i) => ({ url: i.getAttribute("data-src") || i.getAttribute("src") || "", alt: i.getAttribute("alt") ?? "" })).filter((i) => /^https:\/\/m\.media-amazon\.com\//.test(i.url) && !/grey-pixel|transparent-pixel/.test(i.url)).slice(0, 8),
  }));

  const aspects = all('[aria-label*="aspect" i], #cr-product-insights-cards button, [data-hook="cr-insights-widget-aspects"] button').map((b) => clean(b.getAttribute("aria-label") || b.textContent)).filter(Boolean).slice(0, 20);
  const stars = all("#histogramTable tr, #histogramTable li, [data-hook='cr-filter-info-review-rating-count'] ~ * .a-histogram-row").map((r) => clean(r.getAttribute("aria-label") || r.textContent)).filter(Boolean).slice(0, 5);
  const variants = all("#twister_feature_div li, #twister li, #inline-twister-expander-content-size_name li").map((li) => clean(li.getAttribute("title") || li.textContent).replace(/^Click to select\s*/i, "").slice(0, 120)).filter(Boolean).slice(0, 20);
  const bullets = all("#feature-bullets ul li:not(.aok-hidden) span.a-list-item, #productFactsDesktopExpander ul li span.a-list-item").map((e) => clean(e.textContent)).filter(Boolean);
  const visible = clean((document.querySelector("#dp") ?? document.body).textContent ?? "");

  return {
    url: location.href,
    page_title_tag: document.title,
    title: text("#productTitle"),
    item_highlights: text(".dp-title-differentiators"),
    brand_byline: text("#bylineInfo"),
    bullets,
    description: text("#productDescription"),
    price: text("#corePriceDisplay_desktop_feature_div .a-price .a-offscreen, #corePrice_feature_div .a-price .a-offscreen, #apex_desktop .a-price .a-offscreen"),
    mrp: text("#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen, .basisPrice .a-offscreen"),
    unit_price: text("#corePriceDisplay_desktop_feature_div .pricePerUnit, .pricePerUnit"),
    rating: clean(document.querySelector("#acrPopover")?.getAttribute("title")),
    ratings_count: text("#acrCustomerReviewText"),
    badges: [text("#acBadge_feature_div"), text("#zeitgeistBadge_feature_div"), text(".ac-badge-wrapper")].filter(Boolean),
    best_sellers_rank: attributes["Best Sellers Rank"] ?? "",
    variants,
    images,
    video_count: videoCount,
    attributes,
    important_information: important,
    aplus_module_count: aplus.filter((m) => !m.brand_story).length,
    brand_story_present: aplus.some((m) => m.brand_story),
    aplus,
    customers_say: text("#product-summary, [data-hook='cr-insights-widget-summary']").slice(0, 900),
    review_aspects: aspects,
    star_distribution: stars,
    suppression_notice: /currently unavailable|page you are looking for/i.test(text("#availability, #outOfStock")) ? text("#availability, #outOfStock") : "",
    // Safety net: if a field above is empty the page layout may differ; read it from this text.
    visible_text_excerpt: visible.slice(0, 9000),
  };
}

export function extractSearch() {
  const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  const cards = [...document.querySelectorAll('div[data-component-type="s-search-result"][data-asin]')].filter((c) => c.getAttribute("data-asin"));
  let organic = 0;
  let sponsored = 0;
  const results = cards.map((c) => {
    const isSponsored = Boolean(c.querySelector(".puis-sponsored-label-text, .s-sponsored-label-text, [aria-label*='Sponsored' i], .puis-label-popover")) || c.classList.contains("AdHolder");
    const pos = isSponsored ? ++sponsored : ++organic;
    return {
      asin: c.getAttribute("data-asin") ?? "",
      sponsored: isSponsored,
      position: pos,
      title: clean(c.querySelector("h2")?.textContent).slice(0, 220),
      price: clean(c.querySelector(".a-price .a-offscreen")?.textContent),
      unit_price: clean(c.querySelector(".a-price + span, .a-size-base.a-color-secondary .a-price")?.parentElement?.textContent).match(/\(([^)]*\/[^)]*)\)/)?.[1] ?? "",
      rating: clean(c.querySelector("[aria-label*='out of 5' i]")?.getAttribute("aria-label")),
      ratings_count: clean(c.querySelector("a[href*='customerReviews'] span, [aria-label*='ratings' i]")?.textContent),
    };
  });
  const bar = clean(document.querySelector('[data-component-type="s-result-info-bar"] h1, [data-component-type="s-result-info-bar"] .a-section span')?.textContent);
  return { results_bar: bar, organic_count: organic, sponsored_count: sponsored, results };
}
