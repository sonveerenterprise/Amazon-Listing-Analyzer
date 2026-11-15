import { FetchBlockedError, fetchListing } from "@/lib/fetchListing";
import { parseAsinInput } from "@/lib/marketplaces";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { input?: unknown; marketplace?: unknown } | null;
  if (!body || typeof body.input !== "string" || body.input.length > 500) {
    return Response.json({ error: "Enter an ASIN or an Amazon product link." }, { status: 400 });
  }
  const parsed = parseAsinInput(body.input, typeof body.marketplace === "string" ? body.marketplace : "IN");
  if (!parsed) {
    return Response.json({ error: "That doesn't look like an ASIN (10 letters and digits) or an Amazon product link." }, { status: 400 });
  }
  const gate = allow(`fetch:${clientIp(req)}`, 30);
  if (!gate.ok) return Response.json({ error: "Too many lookups. Try again later." }, { status: 429 });

  try {
    const listing = await fetchListing(parsed.asin, parsed.marketplace);
    return Response.json({ listing });
  } catch (error) {
    if (error instanceof FetchBlockedError) {
      return Response.json(
        { blocked: true, asin: parsed.asin, marketplace: parsed.marketplace.code, error: `${error.message} Paste the listing text below instead.` },
        { status: 502 },
      );
    }
    return Response.json({ error: error instanceof Error ? error.message : "Could not fetch the listing." }, { status: 404 });
  }
}
