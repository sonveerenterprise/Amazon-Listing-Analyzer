import { h10FinishConnect } from "@/lib/h10Client";
import { isTeam } from "@/lib/team";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const home = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const back = (status: string) => Response.redirect(`${home}/?h10=${status}`, 302);
  if (!isTeam(req)) return back("signin");
  const code = url.searchParams.get("code");
  if (!code) return back("cancelled");
  try {
    await h10FinishConnect(code, url.searchParams.get("state"));
    return back("connected");
  } catch (error) {
    console.error("Helium 10 callback failed", error);
    return back("failed");
  }
}
