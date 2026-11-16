import { h10Disconnect } from "@/lib/h10Client";
import { isTeam } from "@/lib/team";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  if (!isTeam(req)) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  h10Disconnect();
  return Response.json({ ok: true });
}
