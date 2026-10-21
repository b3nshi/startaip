import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Hit once a day by an external cron so the Supabase free tier doesn't pause the project.
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const expected = process.env.HEALTH_CHECK_API_KEY;
  const provided = request.headers.get("x-api-key");
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Head-only count: a real round trip to Postgres without returning any row data.
  const { error } = await createAdminClient().from("companies").select("id", { count: "exact", head: true });
  if (error) {
    console.error("health-check: supabase query failed", error.message);
    return Response.json({ ok: false, error: "Database check failed" }, { status: 503 });
  }

  return Response.json({ ok: true, timestamp: new Date().toISOString() });
}
