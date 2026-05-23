import { NextRequest, NextResponse } from "next/server";
import { getDbStats } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;
  const stats = await getDbStats();
  return NextResponse.json({ success: true, stats });
}
