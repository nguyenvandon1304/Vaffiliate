import { NextRequest, NextResponse } from "next/server";
import {
  confirmTotpSetup,
  countBackupCodes,
  disableTotp,
  generateBackupCodes,
  getTotpStatus,
  logAudit,
  startTotpSetup,
} from "@/lib/db";
import { requireUser, requireVerifiedUser } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;
  const [status, backups] = await Promise.all([
    getTotpStatus(auth.user.id),
    countBackupCodes(auth.user.id),
  ]);
  return NextResponse.json({ success: true, ...status, backupCodes: backups });
}

/**
 * POST /api/auth/totp
 *   body { action: "setup" | "confirm" | "disable" | "regenerate-backup-codes", code?: string }
 *   - setup: trả secret + otpauth url để hiển thị QR
 *   - confirm: kích hoạt TOTP với code đầu tiên + sinh 10 backup code
 *   - disable: tắt TOTP (cần code hoặc backup code hợp lệ)
 *   - regenerate-backup-codes: tạo lại 10 backup code mới (huỷ code cũ)
 */
export async function POST(request: NextRequest) {
  // Bắt buộc verify email để bật/đổi 2FA — chống attacker chiếm tài khoản
  // chưa verify rồi lock chủ thật ra ngoài bằng cách bật 2FA của họ.
  const auth = await requireVerifiedUser(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  if (action === "setup") {
    const data = await startTotpSetup(auth.user.id);
    return NextResponse.json({ success: true, secret: data.secret, otpauthUrl: data.otpauthUrl });
  }

  if (action === "confirm") {
    const code = String(body?.code || "");
    const result = await confirmTotpSetup(auth.user.id, code);
    if (!result.success) return NextResponse.json(result, { status: 400 });
    // Sinh 10 backup code lần đầu enable. User PHẢI lưu lại — chỉ trả 1 lần.
    const backupCodes = await generateBackupCodes(auth.user.id);
    await logAudit("auth.totp.enable", { userId: auth.user.id, ip, userAgent });
    return NextResponse.json({ ...result, backupCodes });
  }

  if (action === "disable") {
    const code = String(body?.code || "");
    const result = await disableTotp(auth.user.id, code);
    if (!result.success) return NextResponse.json(result, { status: 400 });
    await logAudit("auth.totp.disable", { userId: auth.user.id, ip, userAgent });
    return NextResponse.json(result);
  }

  if (action === "regenerate-backup-codes") {
    // Yêu cầu xác thực bằng TOTP code hợp lệ — tránh ai đó chiếm session sinh code mới.
    const code = String(body?.code || "");
    const status = await getTotpStatus(auth.user.id);
    if (!status.enabled) {
      return NextResponse.json({ success: false, error: "TOTP chưa bật" }, { status: 400 });
    }
    // Verify code hiện tại bằng cách re-dùng disable+setup logic — nhưng không tắt thật.
    // Đơn giản hơn: cho phép generate mới nếu user nhập đúng 1 code TOTP hiện tại.
    const { decryptSecret, verifyTotpCode } = await import("@/lib/db");
    const { getDb } = await import("@/lib/db");
    const db = await getDb();
    const row = await db.get("SELECT totp_secret FROM users WHERE id = ?", [auth.user.id]);
    const secret = row?.totp_secret ? decryptSecret(row.totp_secret as string) : null;
    if (!secret || !verifyTotpCode(secret, code)) {
      return NextResponse.json({ success: false, error: "Mã xác thực không đúng" }, { status: 400 });
    }
    const backupCodes = await generateBackupCodes(auth.user.id);
    await logAudit("auth.totp.regen_backup_codes", { userId: auth.user.id, ip, userAgent });
    return NextResponse.json({ success: true, backupCodes });
  }

  return NextResponse.json({ success: false, error: "action không hợp lệ" }, { status: 400 });
}
