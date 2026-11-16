import { allow, clientIp } from "@/lib/rateLimit";
import { checkPassword, teamCookie, teamEnabled } from "@/lib/team";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!teamEnabled()) return Response.json({ error: "Team sign-in is not set up on this server." }, { status: 404 });
  if (!allow(`login:${clientIp(req)}`, 10).ok) return Response.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  if (typeof body?.password !== "string" || !checkPassword(body.password)) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }
  return Response.json({ ok: true }, { headers: { "Set-Cookie": teamCookie() } });
}
