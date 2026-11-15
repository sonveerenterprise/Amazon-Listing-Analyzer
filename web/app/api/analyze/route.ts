import { AiUnavailableError, aiEnabled, runAi, type AiReport } from "@/lib/ai";
import { allow, clientIp } from "@/lib/rateLimit";
import { runRules } from "@/lib/rules";
import { buildScorecard, mergeItems } from "@/lib/scoring";
import { parseListing } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { listing?: unknown; useAi?: unknown } | null;
  const parsed = parseListing(body?.listing);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  const { listing } = parsed;

  const rules = runRules(listing);
  let ai: AiReport | null = null;
  let aiNotice: string | null = null;

  if (body?.useAi === true) {
    if (!aiEnabled()) {
      aiNotice = "AI analysis is not configured on this server; showing rule checks only.";
    } else {
      const limit = Number(process.env.AI_RATE_LIMIT_PER_HOUR) || 5;
      const gate = allow(`ai:${clientIp(req)}`, limit);
      if (!gate.ok) {
        aiNotice = `AI analysis limit reached (${limit} per hour). Try again in ${Math.ceil(gate.retryAfterSec / 60)} minutes; showing rule checks only.`;
      } else {
        try {
          ai = await runAi(listing, rules);
        } catch (error) {
          if (!(error instanceof AiUnavailableError)) console.error("AI analysis failed", error);
          aiNotice = `${error instanceof AiUnavailableError ? error.message : "AI analysis failed."} Showing rule checks only.`;
        }
      }
    }
  }

  const scorecard = buildScorecard(mergeItems(rules.items, ai?.itemScores ?? []));
  return Response.json({ listing, rules, ai, aiNotice, scorecard, analysedAt: new Date().toISOString() });
}
