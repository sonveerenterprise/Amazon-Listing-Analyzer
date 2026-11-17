import { cancelJob, getJob } from "@/lib/report/jobs";
import { isTeam } from "@/lib/team";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTeam(req)) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  const job = getJob((await params).id);
  return job ? Response.json({ job }) : Response.json({ error: "Report not found." }, { status: 404 });
}

/** Cancels a running report. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTeam(req)) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  return Response.json({ cancelled: cancelJob((await params).id) });
}
