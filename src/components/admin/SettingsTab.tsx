"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

interface DbStats {
  users: number;
  orders: number;
  withdrawals: number;
  wallet_entries: number;
  notifications: number;
  audit_logs: number;
  sessions_active: number;
  db_size_bytes: number | null;
  db_path: string;
}

function formatBytes(n: number | null) {
  if (n === null || n === undefined) return "—";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + " MB";
  return (n / 1024 / 1024 / 1024).toFixed(2) + " GB";
}

export function SettingsTab() {
  const toast = useToast();
  const [s, setS] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<DbStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => {
      if (d.success) { setS(d.settings); setLoaded(true); }
    });
    fetch("/api/admin/db-stats").then((r) => r.json()).then((d) => { if (d.success) setStats(d.stats); });
  }, []);

  const set = (k: string, v: string) => setS((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    const r = await fetch("/api/admin/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: s }),
    });
    const d = await r.json();
    if (d.success) { toast.success("Đã lưu cấu hình"); setS(d.settings); }
    else toast.error(d.error || "Lỗi");
    setSaving(false);
  };

  if (!loaded) return <p className="text-sm text-gray-400">Đang tải…</p>;

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Cấu Hình Hệ Thống</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Tính năng người dùng</h3>

          <ToggleRow
            label="Cho phép đăng ký mới" hint="Tắt để tạm dừng việc tạo tài khoản mới."
            checked={s.registration_enabled === "1"}
            onChange={(v) => set("registration_enabled", v ? "1" : "0")}
          />

          <ToggleRow
            label="Cho phép rút tiền" hint="Tắt khi đối soát hệ thống — user vẫn vào được nhưng không gửi yêu cầu rút."
            checked={s.withdrawals_enabled === "1"}
            onChange={(v) => set("withdrawals_enabled", v ? "1" : "0")}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Số tiền rút tối thiểu</label>
            <input
              type="number"
              value={s.min_withdraw_amount}
              onChange={(e) => set("min_withdraw_amount", e.target.value)}
              className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">VNĐ. Mặc định 50.000.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Bảo trì</h3>

          <ToggleRow
            label="Bật chế độ bảo trì" hint="User thường không đăng nhập được. Admin vẫn vào bình thường."
            checked={s.maintenance_mode === "1"}
            onChange={(v) => set("maintenance_mode", v ? "1" : "0")}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Thông điệp khi bảo trì</label>
            <textarea
              value={s.maintenance_message}
              onChange={(e) => set("maintenance_message", e.target.value)}
              rows={3}
              className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">URL bài viết Facebook ghim</label>
              <input
                type="url"
                value={s.facebook_post_url || ""}
                onChange={(e) => set("facebook_post_url", e.target.value)}
                placeholder="https://www.facebook.com/groups/xxx/posts/xxx"
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Link bài viết Facebook có comment chứa link Shopee có voucher. Để trống = ẩn luồng Facebook.</p>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <ToggleRow
              label="Bắt buộc 2FA cho admin"
              hint="Khi bật, admin chưa setup 2FA sẽ không login được. Nhớ kích hoạt 2FA cho tài khoản admin của bạn TRƯỚC khi bật mục này (vào /dashboard/security)."
              checked={s.require_admin_2fa === "1"}
              onChange={(v) => set("require_admin_2fa", v ? "1" : "0")}
            />
          </div>
        </div>
      </div>

      {/* Tier cashback */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Cấu hình Tier hoàn tiền</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Mỗi tier có ngưỡng đơn hoàn tiền và/hoặc bạn mời riêng. User đạt tier khi đáp ứng <b>1 trong 2</b> điều kiện.
        </p>

        {/* Bronze tier */}
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🥉</span>
            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">Bronze</h4>
            <span className="text-xs text-amber-600 dark:text-amber-300">(Mặc định)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Tỷ lệ hoàn (%)</label>
              <input
                type="number" min="0" max="100"
                value={s.cashback_base_percent}
                onChange={(e) => set("cashback_base_percent", e.target.value)}
                className="mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Silver tier */}
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-500/10 rounded-lg border border-slate-200 dark:border-slate-500/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🥈</span>
            <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">Silver</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Đơn hoàn tiền</label>
              <input
                type="number" min="0"
                value={s.tier_silver_orders || "50"}
                onChange={(e) => set("tier_silver_orders", e.target.value)}
                className="mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Bạn mời</label>
              <input
                type="number" min="0"
                value={s.tier_silver_referrals || "25"}
                onChange={(e) => set("tier_silver_referrals", e.target.value)}
                className="mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Tỷ lệ (%)</label>
              <input
                type="number" min="0" max="100"
                value={s.tier_silver_percent || "53"}
                onChange={(e) => set("tier_silver_percent", e.target.value)}
                className="mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Gold tier */}
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg border border-yellow-200 dark:border-yellow-500/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🥇</span>
            <h4 className="text-sm font-bold text-yellow-700 dark:text-yellow-400">Gold</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Đơn hoàn tiền</label>
              <input
                type="number" min="0"
                value={s.tier_gold_orders || "100"}
                onChange={(e) => set("tier_gold_orders", e.target.value)}
                className="mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Bạn mời</label>
              <input
                type="number" min="0"
                value={s.tier_gold_referrals || "50"}
                onChange={(e) => set("tier_gold_referrals", e.target.value)}
                className="mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Tỷ lệ (%)</label>
              <input
                type="number" min="0" max="100"
                value={s.tier_gold_percent || "55"}
                onChange={(e) => set("tier_gold_percent", e.target.value)}
                className="mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* VIP tier */}
        <div className="mb-4 p-3 bg-violet-50 dark:bg-violet-500/10 rounded-lg border border-violet-200 dark:border-violet-500/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💎</span>
            <h4 className="text-sm font-bold text-violet-700 dark:text-violet-300">VIP</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Đơn hoàn tiền</label>
              <input
                type="number" min="0"
                value={s.tier_vip_orders || "300"}
                onChange={(e) => set("tier_vip_orders", e.target.value)}
                className="mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Bạn mời</label>
              <input
                type="number" min="0"
                value={s.tier_vip_referrals || "100"}
                onChange={(e) => set("tier_vip_referrals", e.target.value)}
                className="mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Tỷ lệ (%)</label>
              <input
                type="number" min="0" max="100"
                value={s.tier_vip_percent || "58"}
                onChange={(e) => set("tier_vip_percent", e.target.value)}
                className="mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

      </div>

      <div className="mt-4">
        <button
          disabled={saving}
          onClick={save}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? "Đang lưu..." : "💾 Lưu cấu hình"}
        </button>
      </div>

      {/* DB stats */}
      {stats && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Thống Kê Database</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <DbCount label="Users" value={stats.users} />
            <DbCount label="Orders" value={stats.orders} />
            <DbCount label="Withdrawals" value={stats.withdrawals} />
            <DbCount label="Wallet entries" value={stats.wallet_entries} />
            <DbCount label="Notifications" value={stats.notifications} />
            <DbCount label="Audit logs" value={stats.audit_logs} />
            <DbCount label="Active sessions" value={stats.sessions_active} />
            <DbCount label="DB size" value={formatBytes(stats.db_size_bytes)} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 font-mono break-all">
            Database: {stats.db_path === "supabase" ? "Supabase Postgres" : stats.db_path}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            💡 Backup tự động: Supabase Free tier giữ daily backup 7 ngày. Pro tier: Point-in-time recovery.
          </p>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Dọn session hết hạn, token hết hạn, notification cũ &gt;90 ngày. Khuyên cron hằng đêm (vacuum=false).
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const r = await fetch("/api/admin/cleanup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ vacuum: false }),
                  });
                  const d = await r.json();
                  if (d.success) {
                    toast.success(`Cleanup OK: ${d.result.expiredSessions} sessions, ${d.result.expiredResetTokens + d.result.expiredVerifyTokens} tokens, ${d.result.oldNotifications} notifs`);
                    const dr = await fetch("/api/admin/db-stats");
                    const dd = await dr.json();
                    if (dd.success) setStats(dd.stats);
                  } else toast.error(d.error || "Lỗi");
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
              >
                🧹 Cleanup nhanh
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Cleanup + VACUUM (lock DB ~10s với DB lớn). Tiếp tục?")) return;
                  const r = await fetch("/api/admin/cleanup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ vacuum: true }),
                  });
                  const d = await r.json();
                  if (d.success) {
                    toast.success("Cleanup + VACUUM xong");
                    const dr = await fetch("/api/admin/db-stats");
                    const dd = await dr.json();
                    if (dd.success) setStats(dd.stats);
                  } else toast.error(d.error || "Lỗi");
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20"
              >
                ⚙️ Cleanup + VACUUM
              </button>
            </div>
          </div>
        </div>
      )}

      <TestEmailSection />
    </>
  );
}

function TestEmailSection() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTest = async () => {
    if (!email) { toast.error("Nhập email"); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      if (data.success) {
        toast.success(`✅ Email gửi thành công (${data.elapsedMs}ms). Check hộp thư!`);
      } else {
        toast.error(`❌ ${data.error || "Lỗi gửi email"}`);
      }
    } catch (e) {
      setResult(String(e));
      toast.error("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">📨 Test gửi email SMTP</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Gửi email thật tới địa chỉ bên dưới để verify SMTP cấu hình đúng. Nếu fail, kết quả sẽ hiện chi tiết error.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@gmail.com"
          className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
        />
        <button
          onClick={handleTest}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? "Đang gửi..." : "📤 Test gửi"}
        </button>
      </div>
      {result && (
        <pre className="mt-3 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
          {result}
        </pre>
      )}
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 w-4 h-4 accent-orange-500" />
      <div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

function DbCount({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <p className="text-xl font-bold text-gray-900 dark:text-white">{typeof value === "number" ? value.toLocaleString("vi-VN") : value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
