// Report jobs: one long analysis at a time, tracked in files under
// data/reports/<id>/ so finished reports survive a restart.
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { runReportAgent, type ReportOutcome, type ReportRequest, type ReportRunner } from "./agent";

export interface Job extends ReportRequest {
  id: string;
  status: "running" | "done" | "failed" | "cancelled";
  createdAt: string;
  finishedAt?: string;
  steps: { at: string; label: string }[];
  summary?: string;
  error?: string;
  costUsd?: number | null;
  h10Calls?: number;
  hasReport?: boolean;
}

const root = () => process.env.REPORTS_DIR || path.join(process.cwd(), "data", "reports");
const ID_RE = /^[A-Z0-9]{10}-\d{14}-[a-f0-9]{6}$/;
const dir = (id: string) => path.join(root(), id);
const file = (id: string) => path.join(dir(id), "job.json");
export const reportPath = (id: string) => path.join(dir(id), "work", "report.html");

// Survives hot reloads in development.
const g = globalThis as unknown as { __alaRunning?: Map<string, AbortController> };
const running = (g.__alaRunning ??= new Map());

function save(job: Job) {
  fs.mkdirSync(dir(job.id), { recursive: true });
  const tmp = `${file(job.id)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(job));
  fs.renameSync(tmp, file(job.id));
}

export function getJob(id: string): Job | null {
  if (!ID_RE.test(id)) return null;
  try {
    const job = JSON.parse(fs.readFileSync(file(id), "utf8")) as Job;
    // A job marked running that this process is not running was cut off by a restart.
    if (job.status === "running" && !running.has(id)) {
      job.status = "failed";
      job.error = "The server restarted while this report was being written.";
      job.finishedAt = new Date().toISOString();
      save(job);
    }
    return job;
  } catch {
    return null;
  }
}

export function listJobs(limit = 30): Job[] {
  let ids: string[] = [];
  try {
    ids = fs.readdirSync(root()).filter((n) => ID_RE.test(n));
  } catch {
    return [];
  }
  return ids.map(getJob).filter((j): j is Job => Boolean(j)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export const runningJob = (): Job | null => {
  const id = [...running.keys()][0];
  return id ? getJob(id) : null;
};

/** A stand-in used for testing the screens without calling Claude (REPORT_FAKE_AGENT=1). */
const fakeRunner: ReportRunner = async (req, workDir, onStep, signal) => {
  for (const s of ["Starting the analysis", `Reading product page ${req.asin}`, "Looking at 4 images", 'Searching "sample keyword"', "Writing the report"]) {
    if (signal.aborted) return { ok: false, summary: "", costUsd: null, turns: null, h10Calls: 0, error: "The report was cancelled." };
    onStep(s);
    await new Promise((r) => setTimeout(r, 700));
  }
  fs.writeFileSync(path.join(workDir, "report.html"), `<!doctype html><html><head><meta charset="utf-8"><title>Sample report ${req.asin}</title></head><body style="font-family:sans-serif;max-width:800px;margin:40px auto"><h1>Sample report — ${req.asin}</h1><p>This is a stand-in report written without Claude, for testing the app's screens.</p><script>document.body.innerHTML="SCRIPT RAN"</script></body></html>`);
  return { ok: true, summary: "Sample report written (test mode, no analysis was run).", costUsd: 0, turns: 0, h10Calls: 0 };
};

export function startJob(req: ReportRequest): Job {
  const now = new Date();
  const id = `${req.asin}-${now.toISOString().replace(/\D/g, "").slice(0, 14)}-${randomBytes(3).toString("hex")}`;
  const job: Job = { ...req, id, status: "running", createdAt: now.toISOString(), steps: [] };
  const workDir = path.join(dir(id), "work");
  fs.mkdirSync(workDir, { recursive: true });
  const abort = new AbortController();
  running.set(id, abort);
  save(job);

  const onStep = (label: string) => {
    const last = job.steps[job.steps.length - 1];
    if (last?.label === label) return;
    job.steps.push({ at: new Date().toISOString(), label });
    if (job.steps.length > 400) job.steps.splice(0, job.steps.length - 400);
    save(job);
  };
  const runner = process.env.REPORT_FAKE_AGENT === "1" ? fakeRunner : runReportAgent;
  const hardStop = setTimeout(() => abort.abort(), (Number(process.env.REPORT_MAX_MINUTES) || 45) * 60_000);

  void runner(req, workDir, onStep, abort.signal)
    .catch((e): ReportOutcome => ({ ok: false, summary: "", costUsd: null, turns: null, h10Calls: 0, error: `The analysis failed: ${e instanceof Error ? e.message.slice(0, 300) : "error"}` }))
    .then((out) => {
      clearTimeout(hardStop);
      running.delete(id);
      job.status = out.ok ? "done" : abort.signal.aborted ? "cancelled" : "failed";
      job.summary = out.summary;
      job.error = out.ok ? undefined : out.error;
      job.costUsd = out.costUsd;
      job.h10Calls = out.h10Calls;
      job.hasReport = fs.existsSync(reportPath(id));
      job.finishedAt = new Date().toISOString();
      save(job);
    });
  return job;
}

export function cancelJob(id: string): boolean {
  const a = running.get(id);
  if (!a) return false;
  a.abort();
  return true;
}
