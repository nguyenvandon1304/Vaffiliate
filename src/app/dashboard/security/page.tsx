"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { TwoFactorSection } from "@/components/TwoFactorSection";

interface SessionItem {
  id: number;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string | null;
  expires_at: string;
  is_current: boolean;
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("vi-VN");
}

function shortUA(ua: string | null): string {
  if (!ua) return "Không rõ";
  // Giảm tải hiển thị: lấy phần trình duyệt + OS chính.
  const browser = ua.match(/(Chrome|Firefox|Safari|Edg|Opera)\/[\d.]+/)?.[0] ?? "Trình duyệt";
  const os = ua.match(/Windows NT [\d.]+|Mac OS X [\d._]+|Android [\d.]+|iPhone OS [\d_]+|Linux/)?.[0] ?? "OS";
  return `${browser} · ${os}`;
}

export default function SecurityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Đường về dashboard chính tuỳ role: admin → /admin, user → /dashboard
  const dashboardPath = isAdmin ? "/admin" : "/dashboard";

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwOk, setPwOk] = useState("");

  // Delete account
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function loadSessions() {
    try {
      const res = await fetch("/api/auth/sessions");
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      } else if (res.status === 401) {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }

  // Lấy role để biết nút quay lại trỏ về đâu (admin → /admin, user → /dashboard).
  async function loadRole() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) setIsAdmin(data.user?.role === "admin");
    } catch {
      /* ignore — fallback dashboardPath = /dashboard */
    }
  }

  useEffect(() => {
    void loadSessions();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async setState sau await
    void loadRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi mount
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwOk("");
    if (newPassword.length < 6) {
      setPwError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Xác nhận mật khẩu không khớp");
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPwOk(data.message || "Đổi mật khẩu thành công");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        await loadSessions();
      } else {
        setPwError(data.error || "Không thể đổi mật khẩu");
      }
    } catch {
      setPwError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setPwLoading(false);
    }
  }

  async function revokeSession(id: number) {
    const res = await fetch("/api/auth/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  }

  async function revokeAllOthers() {
    if (!confirm("Đăng xuất toàn bộ thiết bị khác (giữ lại phiên hiện tại)?")) return;
    const res = await fetch("/api/auth/sessions", { method: "DELETE" });
    if (res.ok) {
      await loadSessions();
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Xoá tài khoản KHÔNG THỂ HOÀN TÁC. Bạn chắc chắn?")) return;
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/");
      } else {
        setDeleteError(data.error || "Không thể xoá tài khoản");
      }
    } catch {
      setDeleteError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push(dashboardPath)} className="cursor-pointer" title="Về trang chủ">
            <CaffiliateLogo />
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button
              onClick={() => router.push(dashboardPath)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 dark:text-zinc-400 font-medium transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              {isAdmin ? "Admin" : "Dashboard"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-zinc-100">Bảo mật tài khoản</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Đổi mật khẩu, quản lý thiết bị đăng nhập, và xoá tài khoản.</p>
        </div>

        {/* Đổi mật khẩu */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 dark:text-zinc-100 mb-1">Đổi mật khẩu</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mb-4">Sau khi đổi, mọi thiết bị khác sẽ bị đăng xuất.</p>

          <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Mật khẩu hiện tại"
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950/40 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20 outline-none transition-all"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mật khẩu mới (≥ 6 ký tự)"
              required
              minLength={6}
              className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950/40 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20 outline-none transition-all"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Xác nhận mật khẩu mới"
              required
              minLength={6}
              className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950/40 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20 outline-none transition-all"
            />
            {pwError && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{pwError}</p>
            )}
            {pwOk && (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">{pwOk}</p>
            )}
            <button
              type="submit"
              disabled={pwLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pwLoading ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </form>
        </section>

        {/* Sessions */}
        <TwoFactorSection />

        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-zinc-100">Thiết bị đang đăng nhập</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">Phiên đang mở của tài khoản.</p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={revokeAllOthers}
                className="text-xs font-semibold text-red-500 hover:text-red-600 underline"
              >
                Đăng xuất tất cả thiết bị khác
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 dark:text-zinc-500">Đang tải...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-zinc-500">Không có phiên nào.</p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${s.is_current ? "border-orange-200 bg-orange-50/50 dark:bg-orange-500/5" : "border-gray-100 dark:border-zinc-800"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100 truncate">
                        {shortUA(s.user_agent)}
                      </p>
                      {s.is_current && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white px-1.5 py-0.5 rounded">Hiện tại</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      IP: <span className="font-mono">{s.ip ?? "—"}</span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                      Đăng nhập: {formatDate(s.created_at)} · Hoạt động: {formatDate(s.last_seen_at)}
                    </p>
                  </div>
                  {!s.is_current && (
                    <button
                      onClick={() => revokeSession(s.id)}
                      className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
                    >
                      Đăng xuất
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Delete account */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm p-6">
          <h2 className="text-base font-bold text-red-600 dark:text-red-400 mb-1">Xoá tài khoản</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mb-4">
            Tài khoản và mọi dữ liệu liên quan (đơn hàng, ví, link, thông báo, ngân hàng) sẽ bị xoá vĩnh viễn. Hành động không thể hoàn tác.
          </p>

          {!showDeleteForm ? (
            <button
              onClick={() => setShowDeleteForm(true)}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
            >
              Tôi muốn xoá tài khoản
            </button>
          ) : (
            <form onSubmit={handleDeleteAccount} className="space-y-3 max-w-md">
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Nhập mật khẩu để xác nhận"
                required
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950/40 border-2 border-red-200 dark:border-red-900/50 rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-500/20 outline-none transition-all"
              />
              {deleteError && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{deleteError}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={deleteLoading || !deletePassword}
                  className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? "Đang xoá..." : "Xác nhận xoá"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDeleteForm(false); setDeletePassword(""); setDeleteError(""); }}
                  className="text-sm font-medium text-gray-600 dark:text-zinc-300 px-4 py-2.5"
                >
                  Huỷ
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
