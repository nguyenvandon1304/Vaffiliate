import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 200) || 200, 1), 1000);
  const logs = await getAuditLogs(limit);
  return NextResponse.json({ success: true, logs });
}
