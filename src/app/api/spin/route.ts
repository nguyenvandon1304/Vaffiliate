import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getSpinStatus, performSpin, SPIN_SEGMENTS } from "@/lib/spin";
import { logAudit } from "@/lib/db";
import { getClientIp } from "@/lib/turnstile";

/**
 * GET /api/spin — trạng thái spin hiện tại của user + danh sách segment để
 * UI render vòng quay.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const status = await getSpinStatus(auth.user.id);
  return NextResponse.json({
    success: true,
    status,
    segments: SPIN_SEGMENTS.map((s) => ({
      index: s.index,
      amount: s.amount,
      label: s.label,
      color: s.color,
    })),
  });
}

/**
 * POST /api/spin — thực hiện 1 lượt quay.
 * Server random, trả `segmentIndex` để client animate đúng vị trí.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const result = await performSpin(auth.user.id);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  await logAudit("user.spin", {
    userId: auth.user.id,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    detail: `segment=${result.segmentIndex} amount=${result.amount}`,
  });

  return NextResponse.json(result);
}
