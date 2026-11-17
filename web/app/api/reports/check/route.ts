import { getMarketplace, parseAsinInput } from "@/lib/marketplaces";
import { AmazonBrowser } from "@/lib/report/browser";
import { runningJob } from "@/lib/report/jobs";
import { isTeam } from "@/lib/team";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Free check (no Claude): can this server's browser read an Amazon product page and a search page? */
export async function POST(req: Request) {
  if (!isTeam(req)) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  if (runningJob()) return Response.json({ error: "A report is being written; run the check when it has finished." }, { status: 409 });
  const body = (await req.json().catch(() => null)) as { input?: unknown; marketplace?: unknown } | null;
  const parsed = typeof body?.input === "string" ? parseAsinInput(body.input, typeof body.marketplace === "string" ? body.marketplace : "IN") : null;
  if (!parsed) return Response.json({ error: "Enter an ASIN first." }, { status: 400 });
  const browser = new AmazonBrowser(getMarketplace(parsed.marketplace.code));
  try {
    const p = (await browser.productPage(parsed.asin)) as Record<string, unknown>;
    if (p.blocked || p.not_found) return Response.json({ ok: false, product: p.blocked ? "Amazon showed a robot check." : "The ASIN was not found." });
    const title = String(p.title ?? "");
    const s = (await browser.search(title.split(/\s+/).slice(0, 4).join(" ") || parsed.asin, 1)) as Record<string, unknown>;
    return Response.json({
      ok: Boolean(title),
      product: {
        title,
        item_highlights: p.item_highlights,
        bullets: (p.bullets as unknown[]).length,
        images: (p.images as unknown[]).length,
        attributes: Object.keys(p.attributes as object).length,
        aplus_modules: p.aplus_module_count,
        price: p.price,
        rating: p.rating,
        review_aspects: (p.review_aspects as unknown[]).length,
      },
      search: s.blocked ? "Amazon showed a robot check." : { results_bar: s.results_bar, organic: s.organic_count, sponsored: s.sponsored_count },
    });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 400) : "The check failed." });
  } finally {
    await browser.close();
  }
}
