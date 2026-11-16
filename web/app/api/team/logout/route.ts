import { teamCookie } from "@/lib/team";

export const dynamic = "force-dynamic";

export function POST() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": teamCookie(true) } });
}
