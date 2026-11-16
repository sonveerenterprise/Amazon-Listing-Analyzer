import { H10NotConnectedError, h10Call, h10Usage, h10UsageInvalidate } from "@/lib/h10Client";
import { H10_CALLS_PER_LOAD, H10_MARKETPLACES, gatherH10 } from "@/lib/h10Data";
import { parseAsinInput } from "@/lib/marketplaces";
import { isTeam } from "@/lib/team";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!isTeam(req)) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { input?: unknown; marketplace?: unknown; keywords?: unknown } | null;
  if (!body || typeof body.input !== "string" || body.input.length > 500) return Response.json({ error: "Enter an ASIN or an Amazon product link." }, { status: 400 });
  const parsed = parseAsinInput(body.input, typeof body.marketplace === "string" ? body.marketplace : "IN");
  if (!parsed) return Response.json({ error: "That doesn't look like an ASIN (10 letters and digits) or an Amazon product link." }, { status: 400 });
  if (!H10_MARKETPLACES.has(parsed.marketplace.code)) {
    return Response.json({ error: `Helium 10 data is not available for ${parsed.marketplace.name}. Use "Fetch from Amazon" or paste the listing.` }, { status: 400 });
  }
  const keywords = Array.isArray(body.keywords) ? body.keywords.filter((k): k is string => typeof k === "string" && k.length <= 120).slice(0, 10) : [];

  try {
    // Keep a reserve so the app never spends the account's last calls.
    const reserve = Number(process.env.H10_RESERVE_CALLS) || 20;
    const usage = await h10Usage(0);
    if (usage.remaining < H10_CALLS_PER_LOAD + reserve) {
      return Response.json({ error: `Only ${usage.remaining} Helium 10 calls are left this period (the app keeps ${reserve} in reserve). Use "Fetch from Amazon" or paste the listing.`, usage }, { status: 429 });
    }
    const result = await gatherH10(h10Call, parsed.asin, parsed.marketplace, keywords);
    h10UsageInvalidate();
    return Response.json({ ...result, usage: await h10Usage(0).catch(() => null) });
  } catch (error) {
    if (error instanceof H10NotConnectedError) return Response.json({ error: error.message, notConnected: true }, { status: 409 });
    console.error("Helium 10 load failed", error);
    return Response.json({ error: error instanceof Error ? error.message.slice(0, 300) : "Helium 10 could not load this listing." }, { status: 502 });
  }
}
