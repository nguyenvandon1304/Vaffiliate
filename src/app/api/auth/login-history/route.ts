import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUserLoginHistory } from "@/lib/geo";

/**
 * GET /api/auth/login-history
 * Trả về 50 lần login gần nhất của user hiện tại.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const history = await getUserLoginHistory(auth.user.id, 50);
  return NextResponse.json({ success: true, history });
}
