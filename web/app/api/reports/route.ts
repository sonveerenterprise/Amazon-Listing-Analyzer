import { aiEnabled } from "@/lib/ai";
import { parseAsinInput } from "@/lib/marketplaces";
import { listJobs, runningJob, startJob } from "@/lib/report/jobs";
import { skillAvailable } from "@/lib/report/skill";
import { isTeam } from "@/lib/team";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  if (!isTeam(req)) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  return Response.json({ jobs: listJobs() });
}

export async function POST(req: Request) {
  if (!isTeam(req)) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  if (process.env.REPORT_FAKE_AGENT !== "1") {
    if (!aiEnabled()) return Response.json({ error: "Full reports need an Anthropic API key on the server (ANTHROPIC_API_KEY in .env.local)." }, { status: 400 });
    if (!skillAvailable()) return Response.json({ error: "The skill files (SKILL.md and assets/report_template.html) were not found. Set SKILL_DIR to the repository folder." }, { status: 500 });
  }
  const body = (await req.json().catch(() => null)) as { input?: unknown; marketplace?: unknown; competitors?: unknown; notes?: unknown } | null;
  if (!body || typeof body.input !== "string" || body.input.length > 500) return Response.json({ error: "Enter an ASIN or an Amazon product link." }, { status: 400 });
  const parsed = parseAsinInput(body.input, typeof body.marketplace === "string" ? body.marketplace : "IN");
  if (!parsed) return Response.json({ error: "That doesn't look like an ASIN (10 letters and digits) or an Amazon product link." }, { status: 400 });
  const competitorAsins = (typeof body.competitors === "string" ? body.competitors : "").toUpperCase().match(/\b[A-Z0-9]{10}\b/g)?.slice(0, 8) ?? [];
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : "";

  const busy = runningJob();
  if (busy) return Response.json({ error: `A report for ${busy.asin} is already being written. Wait for it to finish or cancel it.`, running: busy.id }, { status: 409 });
  const job = startJob({ asin: parsed.asin, marketplace: parsed.marketplace.code, competitorAsins, notes });
  return Response.json({ job }, { status: 202 });
}
