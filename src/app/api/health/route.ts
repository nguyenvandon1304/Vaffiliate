import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getRateLimitBackend } from "@/lib/rate-limit";

/**
 * GET /api/health — endpoint nhẹ cho monitoring (cron-job.org, UptimeRobot, Render health check).
 *
 * Query params:
 *   ?simple=1 → trả "ok" hoặc "down" (chỉ 2-3 bytes, dùng cho cron-job.org health check)
 *   Không có param → trả full JSON (dùng cho UptimeRobot/Render)
 *
 * Không cần auth. Cache no-store để mỗi check là kiểm tra thật.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const simple = searchParams.get("simple") === "1";

  // Simple mode: chỉ trả "ok" hoặc "down" — tối ưu cho cron-job.org (giới hạn response < 1KB)
  if (simple) {
    try {
      const db = await getDb();
      await db.get("SELECT 1 AS ok", []);
      return new Response("ok", {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    } catch {
      return new Response("down", {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }
  }

  // Full mode: trả JSON đầy đủ cho monitoring tools khác
  const startedAt = Date.now();
  let dbHealthy = false;
  try {
    const db = await getDb();
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
