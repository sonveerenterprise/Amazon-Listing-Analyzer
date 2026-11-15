import { describe, expect, it } from "vitest";
import { FetchBlockedError, parseListingHtml } from "../lib/fetchListing";
import { getMarketplace, parseAsinInput } from "../lib/marketplaces";
import { allow } from "../lib/rateLimit";
import { runRules } from "../lib/rules";
import { buildScorecard, mergeItems } from "../lib/scoring";
import type { ItemScore, Listing } from "../lib/types";
import { parseListing } from "../lib/validate";

const base: Listing = {
  marketplace: "IN",
  category: "food",
  title: "Acme Raw Forest Honey 500 g Glass Jar",
  highlights: "Unprocessed multiflora honey | NMR tested",
  bullets: [
    "Net Quantity: 500 g raw forest honey in a glass jar",
    "Source: collected from multiflora forests in the Himalayan foothills",
    "How to use: stir one spoon into warm water, tea or oats",
    "Storage: keep in a cool dry place; crystallisation is normal",
    "In the box: one 500 g jar with a tamper-evident seal",
  ],
  description: "",
  brand: "Acme",
  attributes: {},
  keywords: [],
};
const item = (r: ReturnType<typeof runRules>, key: string) => r.items.find((i) => i.key === key);

describe("rules", () => {
  it("passes a clean listing", () => {
    const r = runRules(base);
    expect(r.findings.filter((f) => f.priority === "P0")).toEqual([]);
    expect(item(r, "title_length")?.score).toBe(25);
    expect(item(r, "title_content")?.score).toBe(20);
    expect(item(r, "bullet_content")?.score).toBe(15);
    expect(item(r, "size_spec")?.score).toBe(15);
  });

  it("flags an over-limit title as P0 on India and counts characters", () => {
    const title = "Acme Raw Forest Honey 500 g Glass Jar Unprocessed Multiflora Himalayan Natural Sweetener";
    const r = runRules({ ...base, title });
    expect(r.facts.titleLength).toBe(title.length);
    expect(item(r, "title_length")?.score).toBe(10);
    expect(r.findings.some((f) => f.priority === "P0" && f.where === "Title" && /limit is 75/.test(f.message))).toBe(true);
  });

  it("treats 200 as a reference limit elsewhere", () => {
    const r = runRules({ ...base, marketplace: "DE", title: "x".repeat(210) });
    expect(r.findings.find((f) => /reference limit/.test(f.message))?.priority).toBe("P1");
  });

  it("flags banned characters, promo and warranty words in the title", () => {
    const r = runRules({ ...base, title: "Acme Best Honey 500 g! Free Shipping Warranty" });
    const msgs = r.findings.filter((f) => f.where === "Title").map((f) => f.message).join(" | ");
    expect(msgs).toMatch(/banned characters: !/);
    expect(msgs).toMatch(/Free Shipping/);
    expect(msgs).toMatch(/Best/);
    expect(msgs).toMatch(/Warranty/);
    expect(item(r, "title_content")?.score).toBe(0);
  });

  it("does not flag words that merely contain a banned word", () => {
    const r = runRules({ ...base, title: "Acme Wholesale Bestow Honey 500 g" });
    expect(r.findings.filter((f) => f.where === "Title")).toEqual([]);
  });

  it("flags price, contact and review text in bullets", () => {
    const r = runRules({ ...base, bullets: ["Only ₹299 today", "Call us on 9876543210", "Rated 5 stars by customers", "Plain fact 500 g", "Another fact"] });
    expect(r.findings.filter((f) => f.dimension === "compliance" && f.priority === "P0").length).toBe(3);
    expect(item(r, "bullet_content")?.score).toBe(0);
  });

  it("flags disease claims as P0 and India food wording as P1", () => {
    const r = runRules({ ...base, bullets: [...base.bullets.slice(0, 4), "Diabetic friendly and 100% pure, NABL certified"] });
    const s = r.findings.filter((f) => f.dimension === "sensitive");
    expect(s.find((f) => /diabetic friendly/i.test(f.text ?? ""))?.priority).toBe("P0");
    expect(s.some((f) => f.text?.toLowerCase() === "pure" && f.priority === "P1")).toBe(true);
    expect(s.some((f) => /nabl certified/i.test(f.text ?? ""))).toBe(true);
  });

  it("does not treat 'best before' as a superlative", () => {
    const r = runRules({ ...base, bullets: [...base.bullets.slice(0, 4), "Shelf life: best before 18 months from packing"] });
    expect(r.findings.filter((f) => f.dimension === "sensitive")).toEqual([]);
  });

  it("flags Item Highlights over the India limit and empty highlights", () => {
    expect(runRules({ ...base, highlights: "h".repeat(80) }).findings.some((f) => f.where === "Item Highlights" && f.priority === "P0")).toBe(true);
    const r = runRules({ ...base, highlights: "" });
    expect(item(r, "highlights_filled")?.score).toBe(0);
  });

  it("scores visible category attributes", () => {
    const r = runRules({ ...base, attributes: { Ingredients: "Honey", "Diet Type": "Vegetarian", "Net Quantity": "500 g" } });
    expect(item(r, "structured_fields")?.score).toBe(0);
    expect(item(r, "structured_fields")?.note).toBe("3/9 key attributes visible");
    expect(item(runRules(base), "structured_fields")).toBeUndefined();
  });

  it("builds the keyword matrix", () => {
    const r = runRules({ ...base, keywords: ["forest honey", "raw honey", "manuka"] });
    expect(r.keywordRows).toEqual([
      { keyword: "forest honey", inTitle: true, inHighlights: false, inBullets: true },
      { keyword: "raw honey", inTitle: false, inHighlights: false, inBullets: false },
      { keyword: "manuka", inTitle: false, inHighlights: false, inBullets: false },
    ]);
  });
});

describe("scoring", () => {
  const s = (key: string, max: number, score: number | null, source: ItemScore["source"] = "rule"): ItemScore => ({ key, name: key, max, score, note: "", source });

  it("leaves unassessed items out of the maths", () => {
    const sc = buildScorecard([s("title_length", 25, 25), s("title_content", 20, 10)]);
    const c = sc.dimensions[0];
    expect(c.score).toBe(77.8);
    expect(c.coverage).toBeCloseTo(0.45);
    expect(sc.dimensions[4].score).toBeNull();
    expect(sc.total).toBe(77.8);
    // one small item is not enough to score a whole dimension
    expect(buildScorecard([s("size_spec", 15, 15)]).dimensions[2].score).toBeNull();
  });

  it("matches the python calculator when everything is assessed", () => {
    const full = buildScorecard(
      [["title_length", 25], ["title_content", 20], ["main_image", 20], ["bullet_content", 15], ["variation", 10], ["image_video", 10]].map(([k, m]) => s(k as string, m as number, (m as number) * 0.8)),
    );
    expect(full.dimensions[0].score).toBe(80);
    expect(full.dimensions[0].coverage).toBe(1);
  });

  it("keeps measured title length over an AI score", () => {
    const merged = mergeItems([s("title_length", 25, 10), s("dedup", 15, 15)], [s("title_length", 25, 25, "ai"), s("dedup", 15, 7, "ai"), s("order", 25, null, "none")]);
    expect(merged.find((i) => i.key === "title_length")?.score).toBe(10);
    expect(merged.find((i) => i.key === "dedup")?.score).toBe(7);
    expect(merged.find((i) => i.key === "order")).toBeUndefined();
  });
});

describe("input parsing", () => {
  it("accepts ASINs and Amazon links, and takes the marketplace from the link", () => {
    expect(parseAsinInput("b0abcd1234", "IN")).toMatchObject({ asin: "B0ABCD1234", marketplace: { code: "IN" } });
    expect(parseAsinInput("https://www.amazon.co.uk/Some-Name/dp/B0ABCD1234/ref=sr_1?x=1", "IN")).toMatchObject({ asin: "B0ABCD1234", marketplace: { code: "UK" } });
    expect(parseAsinInput("amazon.com/gp/product/B0ABCD1234", "IN")?.marketplace.code).toBe("US");
  });
  it("rejects other hosts", () => {
    expect(parseAsinInput("https://evil.example/dp/B0ABCD1234", "IN")).toBeNull();
    expect(parseAsinInput("https://amazon.in.evil.example/dp/B0ABCD1234", "IN")).toBeNull();
    expect(parseAsinInput("http://169.254.169.254/dp/B0ABCD1234", "IN")).toBeNull();
    expect(parseAsinInput("hello", "IN")).toBeNull();
  });
  it("validates analyse input", () => {
    expect("error" in parseListing({ marketplace: "IN", title: "" })).toBe(true);
    expect("error" in parseListing({ marketplace: "XX", title: "a" })).toBe(true);
    const ok = parseListing({ marketplace: "US", title: "A title", bullets: [" one ", ""] });
    expect("listing" in ok && ok.listing.bullets).toEqual(["one"]);
  });
  it("rate limits per key", () => {
    expect(allow("t", 2, 0).ok).toBe(true);
    expect(allow("t", 2, 1).ok).toBe(true);
    expect(allow("t", 2, 2).ok).toBe(false);
    expect(allow("t", 2, 60 * 60 * 1000 + 5).ok).toBe(true);
  });
});

describe("page parser", () => {
  const html = `<html><body>
    <span id="productTitle">  Acme Raw Forest Honey 500 g  </span>
    <div class="dp-title-differentiators">Unprocessed | NMR tested</div>
    <a id="bylineInfo">Visit the Acme Store</a>
    <div id="feature-bullets"><ul>
      <li><span class="a-list-item"> Net Quantity: 500 g </span></li>
      <li class="aok-hidden"><span class="a-list-item">hidden</span></li>
      <li><span class="a-list-item">Storage: cool dry place</span></li>
    </ul></div>
    <div id="corePriceDisplay_desktop_feature_div"><span class="a-price"><span class="a-offscreen">₹449.00</span></span></div>
    <span id="acrPopover" title="4.3 out of 5 stars"></span><span id="acrCustomerReviewText">1,234 ratings</span>
    <div id="productOverview_feature_div"><table><tr><td>Brand</td><td>Acme</td></tr><tr><td>Diet Type</td><td>Vegetarian</td></tr></table></div>
    <div id="detailBullets_feature_div"><ul><li><span class="a-list-item"><span>Net Quantity ‏ : ‎</span><span>500 gram</span></span></li></ul></div>
    <div id="aplus"><div class="aplus-module">a</div><div class="aplus-module">b</div></div>
    <script>var data = {'colorImages': { 'initial': [{"hiRes":"https://m.media/1.jpg","large":"https://m.media/1s.jpg"},{"hiRes":"https://m.media/2.jpg","large":"https://m.media/2s.jpg"},{"hiRes":null,"large":"https://m.media/3.jpg"}]}, 'colorToAsin': {}};</script>
  </body></html>`;

  it("extracts listing fields", () => {
    const l = parseListingHtml(html, "B0ABCD1234", getMarketplace("IN"));
    expect(l.title).toBe("Acme Raw Forest Honey 500 g");
    expect(l.highlights).toBe("Unprocessed | NMR tested");
    expect(l.brand).toBe("Acme");
    expect(l.bullets).toEqual(["Net Quantity: 500 g", "Storage: cool dry place"]);
    expect(l.attributes).toMatchObject({ Brand: "Acme", "Diet Type": "Vegetarian", "Net Quantity": "500 gram" });
    expect(l.page).toMatchObject({ price: "₹449.00", rating: "4.3 out of 5 stars", reviewCount: "1,234 ratings", imageCount: 3, aplusModules: 2, hasVideo: false });
    expect(l.warnings).toEqual([]);
  });

  it("reports a robot check as blocked", () => {
    expect(() => parseListingHtml('<form action="/errors/validateCaptcha">', "B0ABCD1234", getMarketplace("IN"))).toThrow(FetchBlockedError);
    expect(() => parseListingHtml("<html></html>", "B0ABCD1234", getMarketplace("IN"))).toThrow(FetchBlockedError);
  });
});
