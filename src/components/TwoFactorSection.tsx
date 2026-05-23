"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { QrCode } from "@/components/QrCode";
import { useToast } from "@/components/Toast";

/**
 * Section 2FA TOTP cho trang /dashboard/security.
 * Flow:
 *   1. Bấm "Bật 2FA" → POST {action:"setup"} → server trả secret + otpauth URL
 *   2. Hiển thị secret (text) cho user nhập vào Google Authenticator / Authy / 1Password
 *   3. User nhập 6 số → POST {action:"confirm", code} → bật totp_enabled=1
 *   4. Để tắt: nhập code hợp lệ → POST {action:"disable", code}
 *
 * Không kèm QR (giảm phụ thuộc thư viện) — user copy secret hoặc otpauth URL vào app.
 */
export function TwoFactorSection() {
  const toast = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showQrZoom, setShowQrZoom] = useState(false);
  // Backup codes — hiện sau khi enable 2FA thành công, user PHẢI lưu trước khi đóng modal.
  const [showBackupCodes, setShowBackupCodes] = useState<string[] | null>(null);
  const [backupRemaining, setBackupRemaining] = useState<number>(0);

  useEffect(() => {
    fetch("/api/auth/totp").then((r) => r.json()).then((d) => {
      if (d.success) {
        setEnabled(d.enabled);
        if (d.backupCodes) setBackupRemaining(d.backupCodes.remaining || 0);
      }
    });
  }, []);

  const startSetup = async () => {
    setBusy(true);
    const r = await fetch("/api/auth/totp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup" }),
    });
    const d = await r.json();
    if (d.success) { setSetupSecret(d.secret); setSetupUrl(d.otpauthUrl); }
    else toast.error(d.error || "Lỗi");
    setBusy(false);
  };

  const confirmSetup = async () => {
    if (!/^\d{6}$/.test(code)) { toast.error("Mã gồm 6 chữ số"); return; }
    setBusy(true);
    const r = await fetch("/api/auth/totp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", code }),
    });
    const d = await r.json();
    if (d.success) {
      toast.success("Đã bật 2FA");
      setEnabled(true);
      setSetupSecret(null);
      setSetupUrl(null);
      setCode("");
      // Backup codes chỉ trả 1 lần — hiện modal bắt buộc user lưu lại.
      if (d.backupCodes && Array.isArray(d.backupCodes)) {
        setShowBackupCodes(d.backupCodes);
        setBackupRemaining(d.backupCodes.length);
      }
    }
    else toast.error(d.error || "Mã không hợp lệ");
    setBusy(false);
  };

  const regenBackupCodes = async () => {
    const codeInput = window.prompt("Nhập mã TOTP 6 chữ số hiện tại để sinh lại backup codes:");
    if (!codeInput || !/^\d{6}$/.test(codeInput.trim())) {
      toast.error("Mã 6 chữ số không hợp lệ");
      return;
    }
    setBusy(true);
    const r = await fetch("/api/auth/totp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate-backup-codes", code: codeInput.trim() }),
    });
    const d = await r.json();
    if (d.success && d.backupCodes) {
      toast.success("Đã sinh mã mới — code cũ đã vô hiệu");
      setShowBackupCodes(d.backupCodes);
      setBackupRemaining(d.backupCodes.length);
    } else {
      toast.error(d.error || "Lỗi");
    }
    setBusy(false);
  };

  const cancelSetup = () => { setSetupSecret(null); setSetupUrl(null); setCode(""); };

  const disable = async () => {
    if (!/^\d{6}$/.test(code)) { toast.error("Mã gồm 6 chữ số"); return; }
    if (!confirm("Tắt 2FA? Tài khoản sẽ kém an toàn hơn.")) return;
    setBusy(true);
    const r = await fetch("/api/auth/totp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable", code }),
    });
    const d = await r.json();
    if (d.success) { toast.success("Đã tắt 2FA"); setEnabled(false); setShowDisable(false); setCode(""); }
    else toast.error(d.error || "Lỗi");
    setBusy(false);
  };

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6">
      <h2 className="text-base font-bold text-gray-800 dark:text-zinc-100 mb-1">Xác thực 2 lớp (2FA)</h2>
      <p className="text-xs text-gray-500 dark:text-zinc-500 mb-4">
        Tăng bảo mật bằng app Google Authenticator, Authy, 1Password hoặc bất kỳ ứng dụng TOTP nào.
      </p>

      {enabled === null && <p className="text-sm text-gray-400">Đang tải…</p>}

      {enabled === false && !setupSecret && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={startSetup} disabled={busy} className="text-sm font-semibold px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60">
            {busy ? "Đang tạo..." : "🔐 Bật 2FA"}
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="text-sm font-medium px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 inline-flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Hướng dẫn chi tiết
          </button>
        </div>
      )}

      {enabled === false && setupSecret && (
        <div className="space-y-3">
          {/* CẢNH BÁO ĐỎ — user iPhone hay nhầm dùng Camera mặc định */}
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-900/40 rounded-xl p-3 sm:p-4 flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-base">⚠️</div>
            <div className="flex-1 min-w-0 text-xs sm:text-sm">
              <p className="font-bold text-red-700 dark:text-red-300">
                KHÔNG dùng Camera mặc định của iPhone/Android để quét!
              </p>
              <p className="text-red-600/90 dark:text-red-400/90 mt-1 leading-relaxed">
                Camera mặc định không hỗ trợ scheme <code className="font-mono text-[10px] bg-red-100 dark:bg-red-900/40 px-1 rounded">otpauth://</code>.
                Bạn <b>BẮT BUỘC</b> phải cài app authenticator (Google Authenticator / Authy / Microsoft Authenticator) rồi quét QR <b>từ trong app đó</b>.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href="https://apps.apple.com/vn/app/google-authenticator/id388497605" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 px-2.5 py-1 rounded-lg">
                  📱 Cài cho iPhone
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 px-2.5 py-1 rounded-lg">
                  🤖 Cài cho Android
                </a>
                <button onClick={() => setShowGuide(true)} className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-2.5 py-1 rounded-lg">
                  💡 Hướng dẫn chi tiết
                </button>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-zinc-300">
            <b>Bước 1:</b> Trong app authenticator (KHÔNG phải Camera!), bấm <b>+ Thêm tài khoản</b> → chọn <b>Quét mã QR</b> → quét QR bên phải. Hoặc copy Secret bên trái và nhập tay vào app.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
            {/* Cột trái: secret + url */}
            <div className="bg-gray-50 dark:bg-zinc-950/40 rounded-lg p-3 space-y-2 min-w-0">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1 flex items-center justify-between">
                  <span>Secret (copy vào app authenticator)</span>
                  <button
                    onClick={() => {
                      if (!setupSecret) return;
                      navigator.clipboard.writeText(setupSecret).then(() => toast.success("Đã copy Secret"));
                    }}
                    className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 inline-flex items-center gap-1"
                  >
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    COPY
                  </button>
                </p>
                <code className="block text-sm font-mono break-all bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-2 py-1.5 text-gray-900 dark:text-zinc-100">
                  {setupSecret}
                </code>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">URL otpauth (cho app hỗ trợ paste link)</p>
                <code className="block text-xs font-mono break-all bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-2 py-1.5 text-gray-700 dark:text-zinc-300">
                  {setupUrl}
                </code>
              </div>
            </div>

            {/* Cột phải: QR code — quét bằng app authenticator (Google / Authy / MS) */}
            {setupUrl && (
              <div className="flex flex-col items-center gap-2 mx-auto md:mx-0">
                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 dark:border-zinc-700 shadow-sm">
                  <QrCode data={setupUrl} size={240} alt="QR code 2FA — quét bằng app authenticator" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrZoom(true)}
                  className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
                >
                  🔍 Phóng to QR
                </button>
                <p className="text-[10px] text-gray-500 dark:text-zinc-500 leading-relaxed text-center max-w-[240px]">
                  Mở Google Authenticator → <b>+</b> → <b>Quét mã QR</b>.
                  Camera điện thoại mặc định <b>không quét được</b>.
                </p>
              </div>
            )}
          </div>

          {/* Cách B — fallback luôn 100% hoạt động */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-900/40 rounded-xl p-3 sm:p-4">
            <p className="font-bold text-amber-800 dark:text-amber-300 text-sm flex items-center gap-1.5">
              💡 Cách quét không được? Nhập tay (luôn hoạt động)
            </p>
            <ol className="mt-2 space-y-1.5 text-xs text-amber-700 dark:text-amber-300/90 list-decimal list-inside leading-relaxed">
              <li>Trong Google Authenticator → bấm <b>+</b> → chọn <b>Nhập khoá thiết lập</b> (Enter setup key)</li>
              <li>Tên tài khoản: nhập <b>V-Affiliate</b> (hoặc tuỳ ý)</li>
              <li>Khoá của bạn: <b>copy Secret bên trên</b> rồi dán vào</li>
              <li>Loại khoá: chọn <b>Theo thời gian</b> (Time based) — đây là mặc định</li>
              <li>Bấm <b>Thêm</b>. Mã 6 số sẽ hiện ngay → nhập vào ô bên dưới</li>
            </ol>
          </div>
          <p className="text-sm text-gray-600 dark:text-zinc-300"><b>Bước 2:</b> Nhập mã 6 chữ số hiện tại từ app:</p>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoFocus
              className="w-32 px-3 py-2 bg-white dark:bg-zinc-950/40 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-base font-mono text-center tracking-widest text-gray-900 dark:text-zinc-100 focus:border-orange-400 outline-none"
            />
            <button onClick={confirmSetup} disabled={busy} className="text-sm font-semibold px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-60">
              Bật
            </button>
            <button onClick={cancelSetup} className="text-sm font-medium px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
              Huỷ
            </button>
            <button
              onClick={() => setShowGuide(true)}
              className="text-sm font-medium px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 inline-flex items-center gap-1.5"
              title="Xem hướng dẫn chi tiết"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Hướng dẫn chi tiết
            </button>
          </div>
        </div>
      )}

      {enabled === true && (
        <div className="space-y-3">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">✓ 2FA đang bật</p>

          {/* Backup codes status — cảnh báo nếu sắp hết */}
          <div className={`rounded-xl p-3 border ${backupRemaining <= 2 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40" : "bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700"}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">
                  Backup codes: <span className={backupRemaining <= 2 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}>{backupRemaining}</span> còn lại
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Mỗi mã dùng 1 lần khi mất điện thoại. {backupRemaining <= 2 && "Sắp hết, hãy sinh mới."}
                </p>
              </div>
              <button
                onClick={regenBackupCodes}
                disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 disabled:opacity-60"
              >
                🔄 Sinh mã mới
              </button>
            </div>
          </div>
          {!showDisable ? (
            <button onClick={() => setShowDisable(true)} className="text-sm font-medium px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
              Tắt 2FA
            </button>
          ) : (
            <div className="flex gap-2 max-w-xs">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Nhập mã hiện tại"
                inputMode="numeric"
                className="flex-1 px-3 py-2 bg-white dark:bg-zinc-950/40 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-base font-mono text-center tracking-widest text-gray-900 dark:text-zinc-100 focus:border-orange-400 outline-none"
              />
              <button onClick={disable} disabled={busy} className="text-sm font-semibold px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-60">
                Tắt
              </button>
              <button onClick={() => { setShowDisable(false); setCode(""); }} className="text-sm font-medium px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                Huỷ
              </button>
            </div>
          )}
        </div>
      )}

      <TwoFactorGuideModal open={showGuide} onClose={() => setShowGuide(false)} />

      {/* Modal phóng to QR — user dí điện thoại sát màn hình quét cho dễ */}
      {setupUrl && (
        <Modal open={showQrZoom} onClose={() => setShowQrZoom(false)} title="Quét mã QR" size="md">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
              Mở app authenticator → bấm <b>+</b> → <b>Quét mã QR</b> → hướng camera vào QR bên dưới.
            </p>
            <div className="inline-block bg-white p-5 rounded-xl border-2 border-gray-200 shadow-sm">
              <QrCode data={setupUrl} size={320} alt="QR code 2FA phóng to" />
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-4">
              Nếu quét không được, đóng modal này và copy <b>Secret</b> để nhập tay.
            </p>
          </div>
        </Modal>
      )}

      {/* Modal backup codes — hiện sau enable 2FA hoặc regenerate */}
      <BackupCodesModal
        codes={showBackupCodes}
        onClose={() => setShowBackupCodes(null)}
      />
    </section>
  );
}


/**
 * Modal hướng dẫn chi tiết cách bật 2FA — dành cho người mới chưa từng dùng
 * authenticator app trước đây. Step-by-step kèm gợi ý app phổ biến + ảnh
 * minh hoạ minh dạng emoji + lưu ý quan trọng.
 */
function TwoFactorGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Hướng dẫn bật 2FA chi tiết" size="lg">
      <div className="space-y-5 text-sm text-gray-700 dark:text-zinc-300">
        {/* Intro */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4">
          <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">2FA là gì?</p>
          <p className="text-xs leading-relaxed text-blue-700/80 dark:text-blue-300/80">
            Xác thực 2 lớp (Two-Factor Authentication) là lớp bảo vệ thêm cho tài khoản.
            Mỗi lần đăng nhập, ngoài mật khẩu bạn còn cần nhập mã 6 chữ số đổi mỗi 30 giây
            từ một ứng dụng trên điện thoại. Kể cả khi mật khẩu bị lộ, hacker vẫn không
            vào được tài khoản nếu không có điện thoại của bạn.
          </p>
        </div>

        {/* Step 1 */}
        <GuideStep
          num={1}
          title="Cài app xác thực trên điện thoại"
          color="orange"
        >
          <p className="mb-2">Mở App Store (iPhone) hoặc Google Play (Android), tìm và cài 1 trong các app sau (miễn phí):</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <AppCard name="Google Authenticator" subtitle="Phổ biến nhất, đơn giản" emoji="🔐" />
            <AppCard name="Microsoft Authenticator" subtitle="Có cloud backup" emoji="🛡" />
            <AppCard name="Authy" subtitle="Sync nhiều thiết bị" emoji="🔑" />
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">
            💡 Khuyên dùng <b>Microsoft Authenticator</b> hoặc <b>Authy</b> nếu bạn lo mất điện thoại — cả 2 đều có chức năng backup lên cloud.
          </p>
        </GuideStep>

        {/* Step 2 */}
        <GuideStep
          num={2}
          title="Mở app, chọn Thêm tài khoản"
          color="blue"
        >
          <p>Trong app vừa cài, tìm nút <b>+ Thêm tài khoản</b> (tiếng Anh: <i>Add account</i>). App sẽ hỏi:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
            <li><b>Quét mã QR</b> — chọn cái này nếu app hỏi</li>
            <li>Hoặc <b>Nhập key thủ công</b> — chọn nếu không quét được</li>
          </ul>
        </GuideStep>


        {/* Step 3 */}
        <GuideStep
          num={3}
          title="Dán Secret hoặc URL otpauth"
          color="purple"
        >
          <p>Sau khi bấm <b>+ Thêm tài khoản</b> ở app, có 2 cách:</p>
          <div className="mt-3 space-y-2">
            <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-zinc-200 mb-1">📋 Cách A — Dán Secret (đơn giản nhất)</p>
              <ol className="text-xs space-y-1 list-decimal list-inside text-gray-600 dark:text-zinc-400">
                <li>Copy chuỗi <b className="font-mono">Secret</b> trong ô bên trên (vd: <span className="font-mono text-orange-500">RUIWPFC47N2VYRXJMEYO</span>)</li>
                <li>Trong app, chọn &quot;Nhập key thủ công&quot;</li>
                <li>Đặt tên tài khoản tuỳ ý (vd: V-Affiliate)</li>
                <li>Dán secret vào ô Key, bấm Lưu</li>
              </ol>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-zinc-200 mb-1">🔗 Cách B — Dùng URL otpauth (nhanh)</p>
              <ol className="text-xs space-y-1 list-decimal list-inside text-gray-600 dark:text-zinc-400">
                <li>Copy chuỗi <b className="font-mono">otpauth://...</b> bên trên</li>
                <li>Nếu app hỗ trợ paste link → dán vào, bấm Add</li>
                <li>Authy / Microsoft Authenticator hỗ trợ. Google Authenticator không, dùng Cách A</li>
              </ol>
            </div>
          </div>
        </GuideStep>

        {/* Step 4 */}
        <GuideStep
          num={4}
          title="Lấy mã 6 chữ số từ app"
          color="green"
        >
          <p>Sau khi thêm tài khoản, app sẽ hiển thị 1 dãy 6 chữ số dạng:</p>
          <div className="my-3 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-200 dark:border-orange-900/40 rounded-lg p-4 text-center">
            <p className="text-3xl font-mono font-bold tracking-widest text-orange-600 dark:text-orange-400">
              4 8 2 9 3 7
            </p>
            <p className="text-xs text-orange-700/70 dark:text-orange-400/70 mt-1">Ví dụ — số thật trên app sẽ khác</p>
          </div>
          <p className="text-xs">Mã này <b>tự đổi mỗi 30 giây</b>. Có vạch màu chạy bên cạnh báo thời gian còn lại.</p>
        </GuideStep>

        {/* Step 5 */}
        <GuideStep
          num={5}
          title='Nhập mã vào ô bên trên rồi bấm "Bật"'
          color="emerald"
        >
          <p>Quay về trang này, nhập 6 chữ số vừa lấy vào ô <b>000000</b>, bấm nút xanh <b>Bật</b>. Nếu mã đúng → 2FA được kích hoạt ngay.</p>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">
            ⏱ Phải nhập trong khi mã đang còn hiệu lực (30s). Nếu báo sai, đợi mã mới rồi thử lại.
          </p>
        </GuideStep>


        {/* Lưu ý quan trọng */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4">
          <p className="font-bold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Lưu ý quan trọng
          </p>
          <ul className="text-xs space-y-1.5 list-disc list-inside text-amber-800/90 dark:text-amber-300/90">
            <li><b>Sao lưu Secret</b> ra giấy hoặc ghi chú riêng. Nếu mất điện thoại, bạn cần Secret này để cài lại trên điện thoại mới.</li>
            <li>Đừng chia sẻ Secret cho ai. Ai có Secret là vào được tài khoản bạn.</li>
            <li>Mỗi lần đăng nhập, sau khi nhập mật khẩu sẽ phải nhập thêm 6 chữ số. Mở app trên điện thoại để lấy.</li>
            <li>Mất điện thoại → liên hệ admin qua mail support để được reset 2FA (cần xác minh danh tính).</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Đã hiểu, đóng hướng dẫn
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────── Mini components ─────────────── */

function GuideStep({ num, title, color, children }: {
  num: number;
  title: string;
  color: "orange" | "blue" | "purple" | "green" | "emerald";
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    orange: "from-orange-400 to-orange-500",
    blue: "from-blue-400 to-blue-500",
    purple: "from-purple-400 to-purple-500",
    green: "from-green-400 to-green-500",
    emerald: "from-emerald-400 to-emerald-500",
  };
  return (
    <div className="flex gap-3">
      <div className={`flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${colorMap[color]} text-white font-black flex items-center justify-center text-sm shadow-md`}>
        {num}
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <h4 className="text-base font-bold text-gray-800 dark:text-zinc-100 mb-1.5">{title}</h4>
        <div className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function AppCard({ name, subtitle, emoji }: { name: string; subtitle: string; emoji: string }) {
  return (
    <div className="bg-white dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700 rounded-lg p-3 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-100 leading-tight">{name}</p>
      <p className="text-[10px] text-gray-500 dark:text-zinc-500 mt-0.5">{subtitle}</p>
    </div>
  );
}


/**
 * Hiển thị backup codes 1 lần — user PHẢI tải/copy/in trước khi đóng.
 * Codes không thể xem lại sau modal này đóng (chỉ lưu hash trong DB).
 */
function BackupCodesModal({ codes, onClose }: { codes: string[] | null; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  if (!codes) return null;

  const allText = codes.join("\n");

  const downloadTxt = () => {
    const blob = new Blob([
      `V-Affiliate Backup Codes\n`,
      `Sinh: ${new Date().toLocaleString("vi-VN")}\n`,
      `─────────────────────────\n`,
      ...codes.map((c, i) => `${(i + 1).toString().padStart(2, "0")}. ${c}\n`),
      `─────────────────────────\n`,
      `LƯU Ý:\n`,
      `- Mỗi mã chỉ dùng 1 lần khi đăng nhập (thay TOTP).\n`,
      `- Lưu file này ở chỗ an toàn (USB, password manager).\n`,
      `- Nếu mất, sinh lại bằng nút "🔄 Sinh mã mới" — codes cũ sẽ vô hiệu.\n`,
    ], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `v-affiliate-backup-codes-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const copy = () => navigator.clipboard.writeText(allText);

  const printPage = () => window.print();

  return (
    <Modal open onClose={confirmed ? onClose : () => { /* require confirm */ }} title="🛡 Backup codes — LƯU NGAY" size="md">
      <div className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-900/40 rounded-xl p-3">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">⚠️ ĐÂY LÀ LẦN DUY NHẤT BẠN THẤY DANH SÁCH NÀY</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            Lưu xuống máy / in ra giấy / copy vào password manager.
            Mỗi mã dùng 1 lần để đăng nhập khi mất điện thoại.
          </p>
        </div>

        {/* List codes */}
        <div className="grid grid-cols-2 gap-2 font-mono">
          {codes.map((c, i) => (
            <div key={i} className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm tracking-wider text-center">
              {c}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={downloadTxt} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors">
            <span className="text-lg">⬇</span>Tải .txt
          </button>
          <button onClick={copy} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs font-semibold transition-colors">
            <span className="text-lg">📋</span>Copy
          </button>
          <button onClick={printPage} className="flex flex-col items-center gap-1 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors">
            <span className="text-lg">🖨</span>In
          </button>
        </div>

        {/* Confirm checkbox + close */}
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
          <span className="text-gray-700 dark:text-zinc-300">
            Tôi đã lưu các mã này ở nơi an toàn. Tôi hiểu nếu mất, không thể xem lại.
          </span>
        </label>

        <button
          onClick={onClose}
          disabled={!confirmed}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
        >
          Đóng (đã lưu)
        </button>
      </div>
    </Modal>
  );
}
