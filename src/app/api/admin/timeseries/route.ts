import { NextRequest, NextResponse } from "next/server";
import { getAdminTimeseries } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(Number(searchParams.get("days") ?? 7) || 7, 1), 90);
  const points = await getAdminTimeseries(days);
  return NextResponse.json({ success: true, points });
}
