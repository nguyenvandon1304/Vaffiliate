import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getStreakInfo } from "@/lib/streak";

/**
 * GET /api/streak — trả streak info cho user UI (read only).
 * Update streak được trigger ở /api/auth/login.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const info = await getStreakInfo(auth.user.id);
  return NextResponse.json({ success: true, info });
}
