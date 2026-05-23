import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listFraudFlags, resolveFraudFlag, type FraudSeverity } from "@/lib/fraud";
import { logAudit } from "@/lib/db";
import { getClientIp } from "@/lib/turnstile";

/**
 * GET /api/admin/fraud — list flags với filter resolved/severity.
 * Query: ?resolved=0|1 ?severity=low|medium|high ?limit=50
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const resolvedParam = url.searchParams.get("resolved");
  const severityParam = url.searchParams.get("severity") as FraudSeverity | null;

  const flags = await listFraudFlags({
    resolved: resolvedParam === null ? false : resolvedParam === "1",
    severity: severityParam ?? undefined,
    limit: Number(url.searchParams.get("limit")) || 50,
  });

  return NextResponse.json({ success: true, flags });
}

/**
 * PATCH /api/admin/fraud — đánh dấu flag đã review.
 * Body: { id }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const body = await request.json();
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ success: false, error: "Thiếu id" }, { status: 400 });

  await resolveFraudFlag(id, auth.user.id);
  await logAudit("admin.fraud.resolve", {
    userId: auth.user.id,
    target: `flag_id=${id}`,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ success: true });
}
