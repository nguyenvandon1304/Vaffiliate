"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

/**
 * Banner cảnh báo user chưa verify email — hiện sticky ở đầu dashboard.
 *
 * - Soft gate: dashboard vẫn dùng được, nhưng khóa rút tiền/đổi password/2FA
 *   ở backend (xem requireVerifiedUser).
 * - Auto-poll /api/auth/me mỗi 15s để biết user đã click link verify chưa
 * - Có nút "Gửi lại email" + "Tôi đã xác minh" (force refresh)
 */
interface BannerUser {
  email_verified: boolean;
  email: string | null;
}

export function EmailVerifyBanner({ user, onVerified }: { user: BannerUser; onVerified?: () => void }) {
  const toast = useToast();
  const [resending, setResending] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [verified, setVerified] = useState(user.email_verified);

  // Poll /api/auth/me mỗi 15s — phát hiện khi user click link verify ở email
  useEffect(() => {
    if (verified || !user.email) return;
    const id = window.setInterval(async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const d = await res.json();
        if (d.success && d.user?.email_verified) {
          setVerified(true);
          toast.success("✅ Email đã được xác minh thành công!");
          onVerified?.();
          window.clearInterval(id);
        }
      } catch { /* silent */ }
    }, 15_000);
    return () => window.clearInterval(id);
  }, [verified, user.email, toast, onVerified]);

  if (verified || hidden || !user.email) return null;

  const handleResend = async () => {
    if (!user.email) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("📨 Đã gửi lại email xác minh. Kiểm tra hộp thư của bạn.");
      } else {
        toast.error(d.error || "Không thể gửi email");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setResending(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const d = await res.json();
      if (d.success && d.user?.email_verified) {
        setVerified(true);
        toast.success("✅ Email đã được xác minh thành công!");
        onVerified?.();
      } else {
        toast.info("Email vẫn chưa được xác minh. Hãy click vào link trong hộp thư.");
      }
    } catch { toast.error("Lỗi kiểm tra"); }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-300 dark:border-amber-500/40 rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0">📧</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-1">
            🔓 Mở khóa tính năng nâng cao
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed mb-2">
            Xác minh email <strong className="font-mono break-all">{user.email}</strong> để mở khóa <strong>rút tiền</strong>, <strong>đổi mật khẩu</strong> và <strong>bật 2FA</strong>. Các tính năng khác bạn vẫn dùng bình thường.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {resending ? "Đang gửi..." : "📨 Gửi lại email"}
            </button>
            <button
              onClick={handleRefresh}
              className="text-xs font-semibold border border-amber-400 dark:border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              ↻ Tôi đã xác minh
            </button>
          </div>
        </div>
        <button
          onClick={() => setHidden(true)}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 text-lg leading-none px-1 shrink-0"
          aria-label="Tạm ẩn banner"
          title="Tạm ẩn (sẽ hiện lại lần đăng nhập sau)"
        >
          ×
        </button>
      </div>
    </div>
  );
}
