import { NextRequest, NextResponse } from "next/server";
import { getImportHistory } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;
  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const history = await getImportHistory(limit);
  return NextResponse.json({ success: true, history });
}
