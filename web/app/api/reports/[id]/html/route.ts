import fs from "node:fs";
import { getJob, reportPath } from "@/lib/report/jobs";
import { isTeam } from "@/lib/team";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTeam(req)) return new Response("Team sign-in required.", { status: 401 });
  const job = getJob((await params).id);
  if (!job || !fs.existsSync(reportPath(job.id))) return new Response("Report not found.", { status: 404 });
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(fs.readFileSync(reportPath(job.id)), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // The report contains text taken from web pages, so it is shown as a
      // static document: no scripts, no forms, images only from Amazon.
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src https://m.media-amazon.com https://images-na.ssl-images-amazon.com https://images-eu.ssl-images-amazon.com data:; style-src 'unsafe-inline'; font-src data:",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      ...(download ? { "Content-Disposition": `attachment; filename="listing_analysis_${job.asin}_${job.createdAt.slice(0, 10).replace(/-/g, "")}.html"` } : {}),
    },
  });
}
