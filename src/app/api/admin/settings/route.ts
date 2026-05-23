import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SETTINGS, getAllSettings, logAudit, setSetting } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;
  const settings = await getAllSettings();
  return NextResponse.json({ success: true, settings });
}

/**
 * POST /api/admin/settings
 *   body { settings: Record<string, string> } — chỉ cập nhật những key trong DEFAULT_SETTINGS.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const incoming = body?.settings;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ success: false, error: "Thiếu settings" }, { status: 400 });
  }

  const allowedKeys = Object.keys(DEFAULT_SETTINGS);
  const updated: Record<string, string> = {};
  for (const key of allowedKeys) {
    if (key in incoming) {
      const v = String(incoming[key]).slice(0, 1000);
      await setSetting(key, v);
      updated[key] = v;
    }
  }

  await logAudit("admin.settings.update", {
    userId: auth.user.id,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    detail: JSON.stringify(updated),
  });

  const fresh = await getAllSettings();
  return NextResponse.json({ success: true, settings: fresh });
}
