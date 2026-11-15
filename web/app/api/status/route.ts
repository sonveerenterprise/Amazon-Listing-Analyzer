import { aiEnabled } from "@/lib/ai";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ai: aiEnabled() });
}
