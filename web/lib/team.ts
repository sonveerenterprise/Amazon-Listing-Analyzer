// Team sign-in: one shared password (TEAM_PASSWORD) unlocks the Helium 10
// features. Without TEAM_PASSWORD set, team features are switched off.
import { createHmac, timingSafeEqual } from "node:crypto";

export const TEAM_COOKIE = "ala_team";

export const teamEnabled = () => Boolean(process.env.TEAM_PASSWORD && process.env.TEAM_PASSWORD.length >= 8);

const token = () => createHmac("sha256", process.env.TEAM_PASSWORD ?? "").update("ala-team-v1").digest("hex");

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function checkPassword(password: string): boolean {
  return teamEnabled() && safeEqual(createHmac("sha256", "pw").update(password).digest("hex"), createHmac("sha256", "pw").update(process.env.TEAM_PASSWORD ?? "").digest("hex"));
}

export function isTeam(req: Request): boolean {
  if (!teamEnabled()) return false;
  const cookie = req.headers.get("cookie") ?? "";
  const value = cookie.split(/;\s*/).find((c) => c.startsWith(`${TEAM_COOKIE}=`))?.slice(TEAM_COOKIE.length + 1) ?? "";
  return safeEqual(value, token());
}

export function teamCookie(clear = false): string {
  const secure = (process.env.APP_URL ?? "").startsWith("https://") ? "; Secure" : "";
  return clear
    ? `${TEAM_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
    : `${TEAM_COOKIE}=${token()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`;
}
