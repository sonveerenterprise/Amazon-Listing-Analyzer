import { aiEnabled } from "@/lib/ai";
import { h10Connected, h10Usage } from "@/lib/h10Client";
import { isTeam, teamEnabled } from "@/lib/team";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const team = isTeam(req);
  // Helium 10 details are only revealed to signed-in team members.
  let h10: { connected: boolean; usage: { limit: number; used: number; remaining: number } | null } | null = null;
  if (team) {
    const connected = h10Connected();
    h10 = { connected, usage: connected ? await h10Usage().catch(() => null) : null };
  }
  return Response.json({ ai: aiEnabled(), teamEnabled: teamEnabled(), team, h10 });
}
