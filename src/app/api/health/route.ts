import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getRateLimitBackend } from "@/lib/rate-limit";

/**
 * GET /api/health — endpoint nhẹ cho monitoring (cron-job.org, UptimeRobot, Render health check).
 *
 * Trả 200 nếu app + DB đều OK.
 * Trả 503 nếu DB không kết nối được.
 *
 * Response: { status: "ok" | "degraded" | "down", db: boolean, timestamp: string }
 *
 * Không cần auth. Cache no-store để mỗi check là kiểm tra thật.
 */
export async function GET() {
  const startedAt = Date.now();
  let dbHealthy = false;
  try {
    const db = await getDb();
    // Lightweight ping query — chỉ check connection.
    const row = await db.get("SELECT 1 AS ok", []);
    dbHealthy = !!row;
  } catch (e) {
    console.error("[health] DB check failed:", e);
    dbHealthy = false;
  }

  const status = dbHealthy ? "ok" : "down";
  const httpStatus = dbHealthy ? 200 : 503;
  const latencyMs = Date.now() - startedAt;

  return NextResponse.json(
    {
      status,
      db: dbHealthy,
      rateLimit: getRateLimitBackend(),
      latencyMs,
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.round(process.uptime()) : null,
    },
    {
      status: httpStatus,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
