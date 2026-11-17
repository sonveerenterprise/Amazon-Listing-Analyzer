import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { confineTo } from "../lib/report/agent";
import { extractProductPage, extractSearch } from "../lib/report/browser";
import { readSkill, skillAvailable } from "../lib/report/skill";
import { countCharacters, trimForModel } from "../lib/report/tools";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ala-"));
process.env.REPORTS_DIR = path.join(tmp, "reports");
process.env.REPORT_FAKE_AGENT = "1";

describe("report tools", () => {
  it("counts characters and bytes exactly", () => {
    expect(countCharacters(["INDIGENOUS HONEY Raw Organic Honey 500g | USDA & NPOP Certified, NMR Tested", "₹ मधु"])).toEqual([
      { text: "INDIGENOUS HONEY Raw Organic Honey 500g | USDA & NPOP Certified, NMR Tested", characters: 75, bytes: 75 },
      { text: "₹ मधु", characters: 5, bytes: 13 },
    ]);
  });

  it("shortens large Helium 10 results and drops chart data", () => {
    const big = { data: { seed_data: { title: "t", image_url: "x" }, bsr_chart: { series: new Array(500).fill({ x: 1, y: 2 }) }, competitor_products: new Array(148).fill({ title: "A".repeat(300), brand: "B" }) }, error: null };
    const out = trimForModel(big);
    expect(out.length).toBeLessThan(46_000);
    expect(out).not.toContain("bsr_chart");
    expect(out).not.toContain("image_url");
    expect(out).toContain("more rows not shown");
    expect(trimForModel({ data: { a: 1 } })).toBe('{"data":{"a":1}}');
  });

  it("finds the skill in the repository", () => {
    expect(skillAvailable()).toBe(true);
    const skill = readSkill();
    expect(skill.startsWith("---")).toBe(false);
    expect(skill).toContain("Step 12 — Optimized listing");
  });
});

describe("file confinement", () => {
  const work = path.join(tmp, "work");
  fs.mkdirSync(work, { recursive: true });
  const hook = confineTo(work);
  const ask = async (tool_name: string, tool_input: Record<string, unknown>) => {
    const out = (await hook({ hook_event_name: "PreToolUse", tool_name, tool_input } as never, undefined, { signal: new AbortController().signal })) as { hookSpecificOutput?: { permissionDecision?: string } };
    return out.hookSpecificOutput?.permissionDecision ?? "allow";
  };
  it("allows files in the workspace and the listing tools", async () => {
    expect(await ask("Write", { file_path: path.join(work, "report.html") })).toBe("allow");
    expect(await ask("Read", { file_path: "skill/SKILL.md" })).toBe("allow");
    expect(await ask("Glob", { pattern: "skill/**/*.md" })).toBe("allow");
    expect(await ask("mcp__listing__amazon_search", { keyword: "x" })).toBe("allow");
  });
  it("denies everything else", async () => {
    expect(await ask("Read", { file_path: "/etc/passwd" })).toBe("deny");
    expect(await ask("Read", { file_path: "../../.env.local" })).toBe("deny");
    expect(await ask("Write", { file_path: path.join(work, "..", "x.html") })).toBe("deny");
    expect(await ask("Grep", { pattern: "KEY", path: "/home" })).toBe("deny");
    expect(await ask("Glob", { pattern: "../**" })).toBe("deny");
    expect(await ask("Bash", { command: "ls" })).toBe("deny");
    expect(await ask("mcp__other__thing", {})).toBe("deny");
    fs.symlinkSync("/etc", path.join(work, "link"));
    expect(await ask("Read", { file_path: "link/passwd" })).toBe("deny");
  });
});

describe("report jobs", () => {
  it("runs a job, records steps and saves the report", async () => {
    const { startJob, getJob, listJobs, runningJob, reportPath } = await import("../lib/report/jobs");
    const job = startJob({ asin: "B0ABCD1234", marketplace: "IN", competitorAsins: [], notes: "" });
    expect(job.id).toMatch(/^B0ABCD1234-\d{14}-[a-f0-9]{6}$/);
    expect(runningJob()?.id).toBe(job.id);
    for (let i = 0; i < 80 && getJob(job.id)?.status === "running"; i++) await new Promise((r) => setTimeout(r, 100));
    const done = getJob(job.id)!;
    expect(done.status).toBe("done");
    expect(done.steps.map((s) => s.label)).toContain("Writing the report");
    expect(done.hasReport).toBe(true);
    expect(fs.readFileSync(reportPath(job.id), "utf8")).toContain("Sample report");
    expect(runningJob()).toBeNull();
    expect(listJobs()[0].id).toBe(job.id);
    expect(getJob("../../etc")).toBeNull();
  }, 15_000);

  it("can be cancelled, and marks interrupted jobs as failed", async () => {
    const { startJob, getJob, cancelJob } = await import("../lib/report/jobs");
    const job = startJob({ asin: "B0ABCD9999", marketplace: "IN", competitorAsins: [], notes: "" });
    expect(cancelJob(job.id)).toBe(true);
    for (let i = 0; i < 50 && getJob(job.id)?.status === "running"; i++) await new Promise((r) => setTimeout(r, 100));
    expect(getJob(job.id)?.status).toBe("cancelled");
    const ghost = "B0GHOST000-20261117000000-abcdef";
    fs.mkdirSync(path.join(process.env.REPORTS_DIR!, ghost), { recursive: true });
    fs.writeFileSync(path.join(process.env.REPORTS_DIR!, ghost, "job.json"), JSON.stringify({ id: ghost, asin: "B0GHOST000", status: "running", createdAt: "2026-11-17T00:00:00Z", steps: [] }));
    expect(getJob(ghost)?.status).toBe("failed");
  }, 15_000);
});

// The page functions run inside a real browser against a local sample page.
describe("page extraction", () => {
  let browser: import("playwright").Browser;
  beforeAll(async () => {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  });
  afterAll(async () => {
    await browser?.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("reads a product page", async () => {
    const page = await browser.newPage();
    await page.setContent(fs.readFileSync(path.join(__dirname, "fixtures", "product.html"), "utf8"));
    const d = await page.evaluate(extractProductPage);
    expect(d.title).toBe("ACME Raw Forest Honey 500 g Glass Jar");
    expect(d.item_highlights).toBe("Unprocessed Multiflora Honey");
    expect(d.bullets).toEqual(["Net Quantity: 500 g", "Storage: cool dry place"]);
    expect(d.price).toBe("₹449.00");
    expect(d.mrp).toBe("₹500.00");
    expect(d.rating).toBe("4.3 out of 5 stars");
    expect(d.images).toEqual([
      { variant: "MAIN", url: "https://m.media-amazon.com/images/I/a1.jpg", width: 2560, height: 2560 },
      { variant: "PT01", url: "https://m.media-amazon.com/images/I/a2.jpg", width: 1500, height: 1500 },
    ]);
    expect(d.video_count).toBe(1);
    expect(d.attributes).toMatchObject({ Brand: "Acme", "Net Quantity": "500 gram", "Best Sellers Rank": "#120 in Grocery" });
    expect(d.important_information.Ingredients).toBe("Raw honey");
    expect(d.aplus_module_count).toBe(2);
    expect(d.brand_story_present).toBe(true);
    expect(d.aplus[0].images).toEqual([{ url: "https://m.media-amazon.com/images/S/aplus/1.jpg", alt: "B0-module-1" }]);
    expect(d.review_aspects).toEqual(["Positive aspect, quality, 254 mentions", "Mixed aspect, pureness, 80 mentions"]);
    expect(d.variants).toEqual(["500 g (Pack of 1)", "500 g (Pack of 2)"]);
    expect(d.badges).toEqual(["Amazon's Choice"]);
    expect(d.visible_text_excerpt).toContain("Storage: cool dry place");
    await page.close();
  });

  it("reads a search page with separate organic and sponsored positions", async () => {
    const page = await browser.newPage();
    await page.setContent(fs.readFileSync(path.join(__dirname, "fixtures", "search.html"), "utf8"));
    const d = await page.evaluate(extractSearch);
    expect(d.results_bar).toBe("1-48 of over 2,000 results for");
    expect(d.organic_count).toBe(2);
    expect(d.sponsored_count).toBe(1);
    expect(d.results.map((r) => [r.asin, r.sponsored, r.position])).toEqual([["B0SPONSOR01", true, 1], ["B0ORGANIC01", false, 1], ["B0ORGANIC02", false, 2]]);
    expect(d.results[1]).toMatchObject({ title: "Bee Example Raw Honey 500g", price: "₹389", rating: "4.1 out of 5 stars" });
    await page.close();
  });
});
