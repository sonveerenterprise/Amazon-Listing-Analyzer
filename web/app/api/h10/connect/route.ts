import { h10StartConnect } from "@/lib/h10Client";
import { isTeam } from "@/lib/team";

export const dynamic = "force-dynamic";

// POST (not GET) so that merely visiting a link cannot reset the connection.
export async function POST(req: Request) {
  if (!isTeam(req)) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  try {
    return Response.json({ url: await h10StartConnect() });
  } catch (error) {
    console.error("Helium 10 connect failed", error);
    return Response.json({ error: "Could not reach Helium 10 to start the sign-in. Check the server's internet access and the H10_MCP_URL setting." }, { status: 502 });
  }
}
