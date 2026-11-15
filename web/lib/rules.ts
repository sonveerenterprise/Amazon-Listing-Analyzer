// Deterministic checks that need no AI. Rules come from SKILL.md,
// references/scoring_criteria.md and references/sensitive_words.md.
import { getMarketplace, type Marketplace } from "./marketplaces";
import type { CategoryKey, Finding, ItemScore, KeywordRow, Listing, Priority, RuleReport } from "./types";

const item = (key: string, max: number, score: number | null, note: string): ItemScore => ({
  key,
  name: key,
  max,
  score,
  note,
  source: score === null ? "none" : "rule",
});

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whole-phrase, case-insensitive match that also works next to punctuation. */
const phrase = (p: string) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(p).replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}])`, "iu");
const findPhrase = (text: string, p: string): string | null => text.match(phrase(p))?.[0] ?? null;

// ---------- Title ----------

const BANNED_TITLE_CHARS = ["!", "$", "?", "_", "{", "}", "^", "~"];
const TITLE_PROMO = ["free shipping", "free delivery", "sale", "discount", "offer", "deal", "limited time", "bestseller", "best seller", "top rated", "hot item", "new arrival", "100% quality"];
const TITLE_SUBJECTIVE = ["best", "cheap", "cheapest", "#1", "no. 1", "no.1", "number one", "amazing", "awesome", "perfect", "premium quality", "top quality", "world's best"];
const TITLE_FILLER = ["original", "authentic", "genuine"];
const TITLE_WARRANTY = ["warranty", "guarantee", "guaranteed", "money back"];

function checkTitle(l: Listing, mk: Marketplace, findings: Finding[]): ItemScore[] {
  const title = l.title.trim();
  const len = [...title].length;
  const over = len - mk.titleLimit;
  let lengthScore = 25;
  if (!title) {
    findings.push({ priority: "P0", dimension: "compliance", where: "Title", message: "The title is empty.", fix: "Add a title that states what the product is, the key variant and the quantity." });
    return [item("title_length", 25, 0, "No title"), item("title_content", 20, 0, "No title")];
  }
  if (over > 0) {
    lengthScore = over <= 25 ? 10 : 0;
    findings.push({
      priority: mk.titleLimitEnforced ? "P0" : "P1",
      dimension: "compliance",
      where: "Title",
      text: title,
      message: mk.titleLimitEnforced
        ? `Title is ${len} characters; the ${mk.name} limit is ${mk.titleLimit} (${over} over).`
        : `Title is ${len} characters; ${mk.titleLimit} is the reference limit for ${mk.name}. Confirm the exact limit for this category in Seller Central.`,
      fix: `Cut ${over} characters. Keep brand, product type, key variant and quantity; move the rest to Item Highlights or bullets.`,
    });
  }

  let content = 20;
  let serious = false;
  const chars = BANNED_TITLE_CHARS.filter((c) => title.includes(c));
  if (chars.length) {
    content -= 5 * chars.length;
    serious = true;
    findings.push({ priority: "P0", dimension: "compliance", where: "Title", text: chars.join(" "), message: `Title contains banned characters: ${chars.join(" ")}`, fix: "Remove these characters from the title." });
  }
  for (const w of TITLE_PROMO) {
    const hit = findPhrase(title, w);
    if (hit) {
      content -= 5;
      serious = true;
      findings.push({ priority: "P0", dimension: "compliance", where: "Title", text: hit, message: `Promotional wording in the title: "${hit}".`, fix: `Remove "${hit}". Promotions belong in deals and coupons, not the title.` });
    }
  }
  for (const w of TITLE_SUBJECTIVE) {
    const hit = findPhrase(title, w);
    if (hit) {
      content -= 5;
      serious = true;
      findings.push({ priority: "P0", dimension: "compliance", where: "Title", text: hit, message: `Subjective or superlative wording in the title: "${hit}".`, fix: `Remove "${hit}" and state a verifiable fact instead (size, material, count).` });
    }
  }
  for (const w of TITLE_WARRANTY) {
    const hit = findPhrase(title, w);
    if (hit) {
      content -= 8;
      serious = true;
      findings.push({ priority: "P0", dimension: "compliance", where: "Title", text: hit, message: `Warranty or guarantee wording in the title: "${hit}".`, fix: "Remove it from the title and use the Seller Central warranty field instead." });
    }
  }
  for (const w of TITLE_FILLER) {
    const hit = findPhrase(title, w);
    if (hit) {
      content -= 3;
      findings.push({ priority: "P2", dimension: "compliance", where: "Title", text: hit, message: `Filler word in the title: "${hit}".`, fix: `Remove "${hit}" or back it with a fact; it uses characters without helping the buyer.` });
    }
  }
  const brandWords = new Set(l.brand.toUpperCase().split(/\s+/).filter(Boolean));
  const caps = title.split(/\s+/).filter((w) => /^[A-Z]{4,}$/.test(w) && !brandWords.has(w));
  if (caps.length >= 2) {
    content -= 2;
    findings.push({ priority: "P2", dimension: "compliance", where: "Title", text: caps.join(", "), message: "Words in all capitals in the title.", fix: "Use title case. Capitals are only acceptable for a brand registered in capitals." });
  }
  const counts = new Map<string, number>();
  for (const w of title.toLowerCase().match(/[\p{L}]{4,}/gu) ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
  const repeated = [...counts].filter(([, n]) => n > 2).map(([w]) => w);
  if (repeated.length) {
    content -= 5;
    findings.push({ priority: "P1", dimension: "compliance", where: "Title", text: repeated.join(", "), message: "The same word appears more than twice in the title.", fix: "Use each word at most twice; replace repeats with a different fact." });
  }
  content = Math.max(0, content);
  return [
    item("title_length", 25, lengthScore, `${len}/${mk.titleLimit} characters`),
    item("title_content", 20, content, content === 20 ? "No banned characters or promotional words found" : serious ? "Policy issues found" : "Minor wording issues"),
  ];
}

// ---------- Bullets ----------

const BULLET_PATTERNS: { re: RegExp; label: string; fix: string }[] = [
  { re: /(?:₹|\$|£|€|\bRs\.?|\bINR|\bUSD|\bMRP)\s?\d[\d,.]*/i, label: "a price", fix: "Remove prices from bullets; Amazon shows the price itself." },
  { re: /\b(?:discount|on sale|sale price|coupon|limited[- ]time|special offer|buy \d+ get|\d+\s?% off|lowest price)\b/i, label: "promotional wording", fix: "Remove promotion wording; use deals or coupons in Seller Central." },
  { re: /\b(?:free (?:shipping|delivery)|ships (?:in|within|today)|same[- ]day delivery|fast delivery|cash on delivery)\b/i, label: "shipping information", fix: "Remove shipping promises; Amazon shows delivery details." },
  { re: /[\w.+-]+@[\w-]+\.[a-z]{2,}|\bhttps?:\/\/|\bwww\.|\b(?:whatsapp|call us|contact us|customer care number)\b|(?:\+?\d[\s-]?){10,}/i, label: "contact details or a link", fix: "Remove contact details and links from bullets." },
  { re: /\b(?:\d(?:\.\d)?\s?stars?|five[- ]star|customers? (?:say|love|rated)|top reviews?|rated \d)\b/i, label: "a review quote or rating", fix: "Remove review and rating references; describe the product fact instead." },
];

function checkBullets(l: Listing, findings: Finding[]): ItemScore[] {
  const bullets = l.bullets.map((b) => b.trim()).filter(Boolean);
  if (!bullets.length) {
    findings.push({ priority: "P1", dimension: "clarity", where: "Bullets", message: "No bullet points were provided.", fix: "Add five bullets: core benefit, supporting facts, use case, how to use, what's in the box." });
    return [];
  }
  let content = 15;
  bullets.forEach((b, i) => {
    for (const p of BULLET_PATTERNS) {
      const hit = b.match(p.re)?.[0];
      if (hit) {
        content -= 5;
        findings.push({ priority: "P0", dimension: "compliance", where: `Bullet ${i + 1}`, text: hit.trim(), message: `Bullet ${i + 1} contains ${p.label}.`, fix: p.fix });
      }
    }
  });

  // Repetition: near-duplicate bullets by shared significant words.
  const sig = (s: string) => new Set((s.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []));
  const sets = bullets.map(sig);
  let dedup = 15;
  for (let a = 0; a < sets.length; a++) {
    for (let b = a + 1; b < sets.length; b++) {
      const inter = [...sets[a]].filter((w) => sets[b].has(w)).length;
      const union = new Set([...sets[a], ...sets[b]]).size;
      if (union && inter / union >= 0.5) {
        dedup -= 4;
        findings.push({ priority: "P2", dimension: "clarity", where: `Bullets ${a + 1} and ${b + 1}`, message: `Bullets ${a + 1} and ${b + 1} largely repeat each other.`, fix: "Merge them into one bullet and use the freed bullet for a fact the listing doesn't cover yet." });
      }
    }
  }

  let readability = 10;
  const long = bullets.map((b, i) => ([...b].length > 250 ? i + 1 : 0)).filter(Boolean);
  if (long.length) {
    readability -= 3;
    findings.push({ priority: "P2", dimension: "clarity", where: `Bullet ${long.join(", ")}`, message: "Bullets over 250 characters are hard to read on mobile.", fix: "Cut to one topic and under 200 characters; move detail to the description or A+." });
  }
  const shouting = bullets.map((b, i) => (b.length > 30 && b === b.toUpperCase() && /[A-Z]/.test(b) ? i + 1 : 0)).filter(Boolean);
  if (shouting.length) {
    readability -= 3;
    findings.push({ priority: "P1", dimension: "clarity", where: `Bullet ${shouting.join(", ")}`, message: "Bullets written entirely in capitals.", fix: "Use sentence case; capitals only for a short header." });
  }
  const noHeader = bullets.filter((b) => !/^[^.]{2,45}(?::| [-–—] )/.test(b)).length;
  if (noHeader === bullets.length && bullets.length >= 3) {
    readability -= 2;
    findings.push({ priority: "P2", dimension: "clarity", where: "Bullets", message: "No bullet starts with a short header.", fix: 'Start each bullet with a 2–4 word header and a colon, for example "Net Quantity: ...".' });
  }
  if (bullets.length < 5) {
    findings.push({ priority: "P2", dimension: "selling", where: "Bullets", message: `Only ${bullets.length} bullet${bullets.length === 1 ? "" : "s"}; five are available.`, fix: "Use all five bullets." });
  }
  return [
    item("bullet_content", 15, Math.max(0, content), content === 15 ? "No price, promotion, shipping, contact or review text found" : "Prohibited content found"),
    item("dedup", 15, Math.max(5, dedup), dedup === 15 ? "No near-duplicate bullets" : "Near-duplicate bullets found"),
    item("readability", 10, Math.max(0, readability), readability === 10 ? "Length, case and headers look fine" : "Readability issues found"),
  ];
}

// ---------- Attributes ----------

const CATEGORY_ATTRS: Record<Exclude<CategoryKey, "other">, [string, RegExp][]> = {
  food: [
    ["Ingredients", /ingredient/i],
    ["Diet type", /diet|vegetarian|vegan/i],
    ["Allergens", /allergen/i],
    ["Storage", /storage|store/i],
    ["Shelf life", /shelf life|best before|expiry/i],
    ["Nutrition", /nutrition|energy|calorie|protein/i],
    ["Net quantity", /net quantity|net weight|net content|item weight|volume/i],
    ["Container", /container|package type|packaging/i],
    ["FSSAI licence", /fssai/i],
  ],
  furniture: [["Dimensions", /dimension|size/i], ["Material", /material/i], ["Colour", /colou?r/i], ["Load capacity", /load|weight limit|capacity/i], ["Assembly", /assembly/i], ["Weight", /weight/i]],
  electronics: [["Power / voltage", /power|voltage|wattage|battery/i], ["Ports / connectivity", /port|connect|interface|bluetooth|wireless/i], ["Compatibility", /compatib/i], ["Certifications", /certif|bis|fcc|ce\b/i]],
  kitchen: [["Capacity", /capacity|volume/i], ["Material", /material/i], ["Dimensions", /dimension|size/i], ["Dishwasher safe", /dishwasher/i], ["Heat range", /heat|temperature|microwave|oven/i]],
  apparel: [["Size", /size/i], ["Fabric", /fabric|material/i], ["Care", /care|wash/i], ["Weight", /weight|gsm/i]],
  toys: [["Age range", /age/i], ["Certifications", /certif|bis|astm|en ?71/i], ["Material", /material/i]],
  outdoor: [["Dimensions", /dimension|size/i], ["Load capacity", /load|capacity/i], ["Waterproof rating", /water/i], ["Material", /material/i]],
};

function checkAttributes(l: Listing, mk: Marketplace, findings: Finding[]): ItemScore[] {
  const out: ItemScore[] = [];
  const hl = l.highlights.trim();
  const hlLen = [...hl].length;
  out.push(item("highlights_filled", 10, hl ? 10 : 0, hl ? `${hlLen} characters` : "Empty"));
  if (!hl) {
    findings.push({ priority: "P1", dimension: "attribute", where: "Item Highlights", message: "Item Highlights is empty.", fix: `Fill Item Highlights${mk.highlightsLimit ? ` (up to ${mk.highlightsLimit} characters)` : ""} with the core keyword and the two facts buyers compare first.` });
  } else if (mk.highlightsLimit && hlLen > mk.highlightsLimit) {
    findings.push({ priority: "P0", dimension: "compliance", where: "Item Highlights", text: hl, message: `Item Highlights is ${hlLen} characters; the ${mk.name} limit is ${mk.highlightsLimit}.`, fix: `Cut ${hlLen - mk.highlightsLimit} characters.` });
  }

  if (l.page?.aplusModules !== undefined) {
    const a = l.page.aplusModules > 0 ? 10 : l.description.trim() ? 5 : 0;
    out.push(item("aplus_exists", 10, a, a === 10 ? `A+ present (${l.page.aplusModules} modules)` : a === 5 ? "Text description only" : "No A+ or description"));
    if (a < 10) findings.push({ priority: "P1", dimension: "attribute", where: "A+ content", message: "No A+ content was found on the page.", fix: "Add A+ with a comparison chart, a how-to-use module and an FAQ (Standard Text) module." });
  }

  const keys = Object.keys(l.attributes);
  if (l.category !== "other" && keys.length > 0) {
    const required = CATEGORY_ATTRS[l.category];
    const haystack = keys.map((k) => `${k}: ${l.attributes[k]}`);
    const missing = required.filter(([, re]) => !haystack.some((h) => re.test(h.split(":")[0]) && h.split(":").slice(1).join(":").trim())).map(([n]) => n);
    const fill = (required.length - missing.length) / required.length;
    const score = fill >= 0.9 ? 35 : fill >= 0.7 ? 25 : fill >= 0.5 ? 15 : 0;
    out.push(item("structured_fields", 35, score, `${required.length - missing.length}/${required.length} key attributes visible`));
    if (missing.length) {
      findings.push({
        // P1, not P0: the public page or a pasted list rarely shows every backend field.
        priority: "P1",
        dimension: "attribute",
        where: "Product attributes",
        message: `Key attributes not visible: ${missing.join(", ")}.`,
        fix: "Fill these in Seller Central. If they are already filled in the backend but not shown on the page, ignore this item.",
      });
    }
  }
  return out;
}

// ---------- Selling points (only what can be measured) ----------

const UNIT_RE = /\d+(?:[.,]\d+)?\s?(?:kg|g|gm|grams?|mg|ml|l|litres?|liters?|oz|lb|lbs|cm|mm|m|inch(?:es)?|in|ft|pcs?|pieces?|pack|count|tablets?|capsules?|sachets?|w|watts?|v|mah|gb|tb)\b/i;

function checkSelling(l: Listing, findings: Finding[]): ItemScore[] {
  const text = [l.title, l.highlights, ...l.bullets].join(" \n ");
  if (!text.trim()) return [];
  if (UNIT_RE.test(text)) return [item("size_spec", 15, 15, "Exact size or quantity stated")];
  findings.push({ priority: "P1", dimension: "selling", where: "Title and bullets", message: "No exact size or quantity (number with a unit) found in the title, highlights or bullets.", fix: "State the exact size or net quantity, for example \"500 g\" or \"Pack of 2\", in the title and one bullet." });
  return [item("size_spec", 15, 0, "No number with a unit found")];
}

// ---------- Sensitive claims ----------

interface Claim { words: string[]; type: string; priority: Priority; fix: string; sets: Marketplace["claims"][]; foodOnly?: boolean; skipTitle?: boolean }
const ALL: Marketplace["claims"][] = ["IN", "US", "EU", "JP", "GEN"];

const CLAIMS: Claim[] = [
  { words: ["cure", "cures", "treat", "treats", "heals", "prevents", "for diabetes", "diabetic friendly", "diabetes friendly", "lowers blood sugar", "reduces cholesterol", "heart health", "cardiovascular", "anti-cancer", "blood pressure", "arthritis", "pain relief"], type: "Disease or medical claim", priority: "P0", fix: "Remove. Describe a neutral fact instead (for example \"no added sugar\").", sets: ALL },
  { words: ["boosts immunity", "immunity booster", "boost immunity", "improves digestion", "glowing skin", "detox", "weight loss", "burns fat", "oxidative stress"], type: "Health-benefit claim", priority: "P1", fix: "Needs scientific substantiation. Use a factual statement such as \"contains naturally occurring antioxidants\".", sets: ALL },
  { words: ["best", "#1", "no. 1", "number one", "world's best", "perfect", "strongest", "100%"], type: "Absolute or superlative", priority: "P1", fix: "Replace with a measurable fact, or remove.", sets: ALL, skipTitle: true },
  { words: ["full refund", "money back", "unconditional guarantee", "lifetime guarantee", "lifetime warranty", "100% guarantee", "satisfaction guaranteed"], type: "Guarantee promise", priority: "P0", fix: "Remove. Put a real manufacturer warranty in the Seller Central warranty field.", sets: ALL },
  { words: ["warranty", "guaranteed"], type: "Warranty statement", priority: "P1", fix: "Don't promote a warranty on the detail page; use the Seller Central warranty field.", sets: ALL, skipTitle: true },
  { words: ["bestseller", "best seller", "amazon's choice", "amazon choice", "prime"], type: "Quoting Amazon data or badges", priority: "P0", fix: "Remove references to Amazon badges, rankings or Prime.", sets: ALL },
  { words: ["fda approved", "fda-approved"], type: "Unsupported certification", priority: "P0", fix: "Remove unless the product holds FDA approval and you can show it.", sets: ALL },
  { words: ["patented", "patent pending"], type: "Patent claim", priority: "P1", fix: "Add the patent number, or remove the claim.", sets: ALL },
  { words: ["medical grade", "hospital grade", "non-toxic", "child-safe", "eco-friendly", "biodegradable"], type: "Claim needing certification", priority: "P1", fix: "Name the certificate that supports it, or remove.", sets: ["US", "EU", "GEN", "JP"] },
  { words: ["nabl certified", "lab certified", "nabl approved"], type: "Certification wording (India)", priority: "P1", fix: "Products aren't certified by NABL. Use \"tested at an NABL-accredited lab\" only if true.", sets: ["IN"] },
  { words: ["fssai approved", "fssai certified"], type: "Certification wording (India)", priority: "P1", fix: "FSSAI licenses businesses, not products. Use \"FSSAI Lic. No. ...\".", sets: ["IN"] },
  { words: ["pure", "natural"], type: "\"Pure\" / \"natural\" (FSSAI)", priority: "P1", fix: "Allowed only for single-ingredient foods with nothing added. For blends use \"made from natural ingredients\".", sets: ["IN"], foodOnly: true },
  { words: ["organic"], type: "Organic claim (India)", priority: "P1", fix: "Needs NPOP or PGS-India certification and the Jaivik Bharat logo. Lead with those; remove if not certified.", sets: ["IN"], foodOnly: true },
  { words: ["rich in", "high in", "source of", "zero sugar", "sugar free", "zero calorie", "low calorie", "low fat", "low glycemic", "low gi"], type: "Nutrition claim", priority: "P1", fix: "Check it against the nutrition table and the regulatory threshold before keeping it.", sets: ["IN", "EU"], foodOnly: true },
  { words: ["ce certified", "tüv", "tuv certified", "rohs", "ukca"], type: "Certification mark", priority: "P1", fix: "Keep only if the certificate exists for this exact product.", sets: ["EU"] },
];

function checkSensitive(l: Listing, mk: Marketplace, findings: Finding[]) {
  const fields: [string, string][] = [
    ["Title", l.title],
    ["Item Highlights", l.highlights],
    ...l.bullets.map((b, i) => [`Bullet ${i + 1}`, b] as [string, string]),
    ["Description", l.description],
  ];
  for (const c of CLAIMS) {
    if (!c.sets.includes(mk.claims)) continue;
    if (c.foodOnly && l.category !== "food") continue;
    for (const [where, text] of fields) {
      if (!text || (c.skipTitle && where === "Title")) continue;
      const seen = new Set<string>();
      for (const w of c.words) {
        const hit = findPhrase(text, w);
        if (!hit || seen.has(hit.toLowerCase())) continue;
        // "best" inside "best before" is a date label, not a superlative.
        if (w === "best" && /best\s+(before|by)/i.test(text) && !phrase("best").test(text.replace(/best\s+(before|by)/gi, ""))) continue;
        seen.add(hit.toLowerCase());
        findings.push({ priority: c.priority, dimension: "sensitive", where, text: hit, message: `${c.type}: "${hit}".`, fix: c.fix });
      }
    }
  }
}

// ---------- Keywords ----------

function checkKeywords(l: Listing, findings: Finding[]): KeywordRow[] {
  const bullets = l.bullets.join(" \n ");
  const rows = l.keywords.map((k) => ({
    keyword: k,
    inTitle: phrase(k).test(l.title),
    inHighlights: phrase(k).test(l.highlights),
    inBullets: phrase(k).test(bullets),
  }));
  if (rows.length) {
    if (!rows.some((r) => r.inTitle)) findings.push({ priority: "P1", dimension: "keywords", where: "Title", message: "None of your keywords appears in the title as an exact phrase.", fix: `Work "${rows[0].keyword}" into the title.` });
    if (l.highlights.trim() && !rows.some((r) => r.inHighlights)) findings.push({ priority: "P1", dimension: "keywords", where: "Item Highlights", message: "None of your keywords appears in Item Highlights.", fix: `Add a keyword the title doesn't already use, for example "${(rows.find((r) => !r.inTitle) ?? rows[0]).keyword}".` });
    for (const r of rows.filter((r) => !r.inTitle && !r.inHighlights && !r.inBullets)) {
      findings.push({ priority: "P2", dimension: "keywords", where: "Whole listing", text: r.keyword, message: `"${r.keyword}" doesn't appear anywhere in the listing text.`, fix: "Add it to a bullet or to backend search terms, if it truly describes the product." });
    }
  }
  return rows;
}

// ---------- Entry point ----------

const ORDER: Record<Priority, number> = { P0: 0, P1: 1, P2: 2 };

export function runRules(l: Listing): RuleReport {
  const mk = getMarketplace(l.marketplace);
  const findings: Finding[] = [];
  const items = [...checkTitle(l, mk, findings), ...checkBullets(l, findings), ...checkAttributes(l, mk, findings), ...checkSelling(l, findings)];
  checkSensitive(l, mk, findings);
  const keywordRows = checkKeywords(l, findings);
  findings.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
  return {
    findings,
    items,
    keywordRows,
    facts: {
      titleLength: [...l.title.trim()].length,
      titleLimit: mk.titleLimit,
      highlightsLength: [...l.highlights.trim()].length,
      highlightsLimit: mk.highlightsLimit,
      bulletCount: l.bullets.filter((b) => b.trim()).length,
    },
  };
}
