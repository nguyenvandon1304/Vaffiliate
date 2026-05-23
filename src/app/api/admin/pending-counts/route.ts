import { NextRequest, NextResponse } from "next/server";
import { getPendingCounts } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** GET /api/admin/pending-counts — số việc admin cần xử lý. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;
  const counts = await getPendingCounts();
  return NextResponse.json({ success: true, counts });
}
