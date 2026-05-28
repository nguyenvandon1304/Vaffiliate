"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart } from "@/components/BarChart";
import { BrandLogo } from "@/components/icons";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";
import { UsersTab } from "@/components/admin/UsersTab";
import { AdminLiveWidgets, AdminFAB } from "@/components/admin/AdminLiveWidgets";
import { AdminSkeleton } from "@/components/Skeleton";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { WithdrawalsTab } from "@/components/admin/WithdrawalsTab";
import { BroadcastTab } from "@/components/admin/BroadcastTab";
import { FraudTab } from "@/components/admin/FraudTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { ImportHistoryTab } from "@/components/admin/ImportHistoryTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { IpBlocklistTab } from "@/components/admin/IpBlocklistTab";
import { playNotificationSound } from "@/lib/notification-sound";

interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  totalCashback: number;
  pendingWithdrawals: number;
  totalWithdrawn: number;
}

interface PendingCounts {
  pendingWithdrawals: number;
  unverifiedUsers: number;
  stuckOrders: number;
}

type Tab =
  | "overview"
  | "analytics"
  | "users"
  | "orders"
  | "withdrawals"
  | "balance"
  | "import"
  | "import-history"
  | "broadcast"
  | "fraud"
  | "ip-blocklist"
  | "settings";

const VALID_TABS: Tab[] = [
  "overview", "analytics", "users", "orders", "withdrawals",
  "balance", "import", "import-history", "broadcast", "fraud", "ip-blocklist", "settings",
];

interface TimeseriesPoint { date: string; orders: number; cashback: number; revenue: number; }

interface ImportResultItem {
  orderCode: string; itemId: string; userId?: number; username?: string; status: string; message: string;
}
interface ImportResult {
  total: number; matched: number; unmatched: number; duplicated: number; updated: number;
  results: ImportResultItem[];
}

function formatVND(n: number) { return (n || 0).toLocaleString("vi-VN") + "đ"; }

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminPageInner />
    </Suspense>
  );
}

function AdminPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  // URL-based tab — `?tab=users` ; mặc định overview.
  // useSearchParams() sống cùng `useRouter().push(?tab=...)` để khi user back/forward
  // vẫn về đúng tab.
  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "overview";

  // Mobile drawer (≤lg) — đóng mặc định, mở khi bấm hamburger.
  // Khai báo trước setTab để callback có thể dùng setMobileSidebarOpen.
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const setTab = useCallback((t: Tab) => {
    const next = new URLSearchParams(params.toString());
    if (t === "overview") next.delete("tab");
    else next.set("tab", t);
    router.replace(`/admin?${next}`);
    setMobileSidebarOpen(false); // Đóng drawer sau khi chọn tab
  }, [params, router]);

  // Khi click card "Cần xử lý" → setTab + filter status. Reset filter cũ để tránh xung đột.
  const setTabWithStatus = useCallback((t: Tab, statusVal: string) => {
    const next = new URLSearchParams();
    next.set("tab", t);
    next.set("status", statusVal);
    router.replace(`/admin?${next}`);
    setMobileSidebarOpen(false);
  }, [router]);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalOrders: 0, totalCashback: 0, pendingWithdrawals: 0, totalWithdrawn: 0 });
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ pendingWithdrawals: 0, unverifiedUsers: 0, stuckOrders: 0 });
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [tsRange, setTsRange] = useState<7 | 14 | 30>(7);
  // Bật/tắt âm thanh thông báo — lưu vào localStorage để giữ giữa các session.
  const [soundOn, setSoundOn] = useState(true);
  // Ref giữ giá trị pendingWithdrawals lần fetch trước — để chỉ kêu khi tăng.
  const lastWithdrawCountRef = useRef<number | null>(null);

  // Balance form
  const [balUser, setBalUser] = useState("");
  const [balAmount, setBalAmount] = useState("");
  const [balType, setBalType] = useState<"credit" | "debit">("credit");
  const [balLabel, setBalLabel] = useState("");

  // Import state
  const [importRaw, setImportRaw] = useState("");
  const [importParsed, setImportParsed] = useState<{orderCode: string; shopId: string; itemId: string; productName: string; amount: number; commission: number; status: string}[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState("");
  const [importFileName, setImportFileName] = useState<string | null>(null);

  const reloadStats = useCallback(async () => {
    const r = await fetch("/api/admin/stats");
    const d = await r.json();
    if (d.success) { setStats(d.stats); setLoading(false); }
    else router.push("/");
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch chỉ chạy mount/route change
    reloadStats().catch(() => router.push("/"));
  }, [reloadStats, router]);

  // Auto-poll pending counts mỗi 30s — cho widget + badge sidebar.
  // Khi pendingWithdrawals tăng → kêu "ding-ding" + toast + flash title.
  useEffect(() => {
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const r = await fetch("/api/admin/pending-counts", { cache: "no-store" });
        const d = await r.json();
        if (cancelled || !d.success) return;
        const newCounts = d.counts as PendingCounts;
        const prev = lastWithdrawCountRef.current;
        // Chỉ kêu khi: (1) đã có giá trị trước đó (bỏ qua lần đầu) (2) số tăng (3) sound bật
        if (prev !== null && newCounts.pendingWithdrawals > prev && soundOn) {
          const delta = newCounts.pendingWithdrawals - prev;
          playNotificationSound();
          toast.info(`🔔 Có ${delta} yêu cầu rút tiền mới!`);
        }
        lastWithdrawCountRef.current = newCounts.pendingWithdrawals;
        setPendingCounts(newCounts);
      } catch { /* nuốt lỗi mạng — sẽ thử lại lần sau */ }
    };
    fetchCounts();
    const id = setInterval(fetchCounts, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [soundOn, toast]);

  // Đọc/lưu sound preference từ localStorage.
  useEffect(() => {
    const saved = localStorage.getItem("admin_sound_on");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chỉ sync 1 lần khi mount
    if (saved === "0") setSoundOn(false);
  }, []);
  useEffect(() => {
    localStorage.setItem("admin_sound_on", soundOn ? "1" : "0");
  }, [soundOn]);

  // Flash document.title khi có yêu cầu rút tiền chờ + tab không active.
  useEffect(() => {
    const baseTitle = "Admin V-Affiliate";
    if (pendingCounts.pendingWithdrawals > 0) {
      document.title = `(${pendingCounts.pendingWithdrawals}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    return () => { document.title = baseTitle; };
  }, [pendingCounts.pendingWithdrawals]);

  useEffect(() => {
    if (tab !== "overview") return;
    fetch(`/api/admin/timeseries?days=${tsRange}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTimeseries(d.points); });
  }, [tab, tsRange]);

  const handleBalance = async () => {
    if (!balUser || !balAmount) { toast.error("Nhập username và số tiền"); return; }
    const res = await fetch("/api/admin/balance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: balUser, amount: Number(balAmount), type: balType, label: balLabel || undefined }),
    });
    const d = await res.json();
    if (d.success) { toast.success(d.message); setBalAmount(""); reloadStats(); }
    else toast.error(d.error || "Lỗi");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) return <AdminSkeleton />;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Tổng quan", icon: "📊" },
    { key: "analytics", label: "Analytics chi tiết", icon: "📈" },
    { key: "users", label: "Người dùng", icon: "👥" },
    { key: "orders", label: "Đơn hàng", icon: "📦" },
    { key: "withdrawals", label: "Rút tiền", icon: "💸" },
    { key: "balance", label: "Nạp/Trừ tiền", icon: "💰" },
    { key: "import", label: "Import đơn", icon: "📥" },
    { key: "import-history", label: "Lịch sử import", icon: "📋" },
    { key: "broadcast", label: "Gửi thông báo", icon: "📨" },
    { key: "fraud", label: "Phát hiện gian lận", icon: "🚨" },
    { key: "ip-blocklist", label: "IP Blocklist", icon: "🚫" },
    { key: "settings", label: "Cấu hình", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Mobile top header — chỉ hiện ≤lg */}
      <header
        className="lg:hidden fixed top-0 inset-x-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 gap-2"
        style={{
          paddingTop: "env(safe-area-inset-top, 0)",
          minHeight: "calc(env(safe-area-inset-top, 0) + 3.5rem)",
        }}
      >
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="p-2 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
          aria-label="Mở menu"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex-1 min-w-0 py-1.5">
          <BrandLogo title="Admin" subtitle={tabs.find((t) => t.key === tab)?.label ?? "Bảng điều khiển"} />
        </div>
        <ThemeToggleButton />
        {pendingCounts.pendingWithdrawals > 0 && (
          <button
            onClick={() => setTabWithStatus("withdrawals", "pending")}
            className="relative p-2 -mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
            aria-label="Yêu cầu rút tiền chờ duyệt"
          >
            <span className="text-xl">💸</span>
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
              {pendingCounts.pendingWithdrawals > 99 ? "99+" : pendingCounts.pendingWithdrawals}
            </span>
          </button>
        )}
      </header>

      {/* Backdrop khi sidebar mở trên mobile */}
      {mobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — desktop static, mobile drawer */}
      <aside className={`fixed lg:sticky top-0 left-0 h-[100dvh] lg:h-screen w-64 lg:w-60 z-50 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-out ${
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top, 0)" }}
      >
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className="cursor-pointer text-left flex-1 min-w-0"
            title="Về tổng quan"
          >
            <BrandLogo title="Admin V-Affiliate" subtitle="Bảng điều khiển" />
          </button>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1 -mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
            aria-label="Đóng menu"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overscroll-contain">
          {tabs.map(t => {
            const badge = t.key === "withdrawals" ? pendingCounts.pendingWithdrawals : 0;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.key ? "bg-orange-500 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <span>{t.icon}</span>
                <span className="flex-1 text-left">{t.label}</span>
                {badge > 0 && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center ${
                    tab === t.key ? "bg-white text-orange-600" : "bg-red-500 text-white animate-pulse"
                  }`}>{badge > 99 ? "99+" : badge}</span>
                )}
              </button>
            );
          })}
          <a href="/admin/audit" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white">
            <span>📜</span><span>Audit Log</span>
          </a>
          <a href="/dashboard/security" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white" title="Đổi mật khẩu / Bật 2FA cho tài khoản admin">
            <span>🔐</span><span>Bảo mật cá nhân</span>
          </a>
        </nav>
        <div
          className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 shrink-0"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0), 0.75rem)" }}
        >
          <ThemeToggleButton />
          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              if (next) {
                // Test âm thanh ngay khi bật để user biết kêu thế nào + unlock AudioContext.
                playNotificationSound();
                toast.success("Đã bật âm thanh thông báo");
              } else {
                toast.info("Đã tắt âm thanh");
              }
            }}
            title={soundOn ? "Tắt âm thanh thông báo" : "Bật âm thanh thông báo"}
            className={`p-2 rounded-lg transition-colors ${
              soundOn
                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
                : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            aria-label={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
          >
            <span className="text-base">{soundOn ? "🔔" : "🔕"}</span>
          </button>
          <button onClick={handleLogout} className="flex-1 text-sm text-red-500 hover:text-red-400 py-2">Đăng xuất</button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 pt-20 lg:pt-6 overflow-auto min-w-0">
        {tab === "overview" && (
          <OverviewSection stats={stats} timeseries={timeseries} tsRange={tsRange} setTsRange={setTsRange} pendingCounts={pendingCounts} setTabWithStatus={setTabWithStatus} />
        )}

        {tab === "users" && <UsersTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "withdrawals" && <WithdrawalsTab />}
        {tab === "import-history" && <ImportHistoryTab />}
        {tab === "broadcast" && <BroadcastTab />}
        {tab === "fraud" && <FraudTab />}
        {tab === "ip-blocklist" && <IpBlocklistTab />}
        {tab === "settings" && <SettingsTab />}

        {tab === "balance" && (
          <>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Nạp / Trừ Tiền</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Username</label>
                  <input value={balUser} onChange={e => setBalUser(e.target.value)} placeholder="Nhập username" className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Số tiền (VNĐ)</label>
                  <input value={balAmount} onChange={e => setBalAmount(e.target.value)} placeholder="100000" type="number" className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Loại</label>
                  <div className="flex gap-2">
                    <button onClick={() => setBalType("credit")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${balType === "credit" ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>+ Cộng tiền</button>
                    <button onClick={() => setBalType("debit")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${balType === "debit" ? "bg-red-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>- Trừ tiền</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Ghi chú (tuỳ chọn)</label>
                  <input value={balLabel} onChange={e => setBalLabel(e.target.value)} placeholder="VD: Thưởng tháng 5" className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-orange-500" />
                </div>
                <button onClick={handleBalance} className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                  Xác nhận
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "import" && (
          <ImportSection
            importRaw={importRaw} setImportRaw={setImportRaw}
            importParsed={importParsed} setImportParsed={setImportParsed}
            importResult={importResult} setImportResult={setImportResult}
            importing={importing} setImporting={setImporting}
            importErr={importErr} setImportErr={setImportErr}
            importFileName={importFileName} setImportFileName={setImportFileName}
            onImportDone={() => reloadStats()}
          />
        )}
      </main>

      {/* Floating action button — duyệt rút tiền nhanh */}
      <AdminFAB
        pendingWithdrawals={pendingCounts.pendingWithdrawals}
        onClick={() => setTabWithStatus("withdrawals", "pending")}
      />
    </div>
  );
}

/* ─────────────── Overview ─────────────── */

function OverviewSection({ stats, timeseries, tsRange, setTsRange, pendingCounts, setTabWithStatus }: {
  stats: AdminStats; timeseries: TimeseriesPoint[]; tsRange: 7 | 14 | 30; setTsRange: (n: 7 | 14 | 30) => void;
  pendingCounts: PendingCounts; setTabWithStatus: (t: Tab, status: string) => void;
}) {
  const totalPending = pendingCounts.pendingWithdrawals + pendingCounts.unverifiedUsers + pendingCounts.stuckOrders;
  return (
    <>
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Tổng Quan Hệ Thống</h2>

      {/* Live widgets — KPI delta + online count + activity feed */}
      <div className="mb-6">
        <AdminLiveWidgets />
      </div>

      {/* Cần xử lý — chỉ hiển thị khi có việc */}
      {totalPending > 0 && (
        <div className="mb-5 sm:mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🔔</span>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Cần xử lý</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">({totalPending} mục)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {pendingCounts.pendingWithdrawals > 0 && (
              <button
                onClick={() => setTabWithStatus("withdrawals", "pending")}
                className="group text-left rounded-xl p-4 border border-red-300 dark:border-red-500/40 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10 hover:shadow-lg hover:scale-[1.01] transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-2xl">💸</div>
                  <span className="text-red-600 dark:text-red-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{pendingCounts.pendingWithdrawals}</p>
                <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">yêu cầu rút tiền chờ duyệt</p>
              </button>
            )}
            {pendingCounts.unverifiedUsers > 0 && (
              <button
                onClick={() => setTabWithStatus("users", "unverified")}
                className="group text-left rounded-xl p-4 border border-amber-300 dark:border-amber-500/40 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 hover:shadow-lg hover:scale-[1.01] transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-2xl">📧</div>
                  <span className="text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCounts.unverifiedUsers}</p>
                <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">user chưa xác minh email</p>
              </button>
            )}
            {pendingCounts.stuckOrders > 0 && (
              <button
                onClick={() => setTabWithStatus("orders", "Đang xử lý")}
                className="group text-left rounded-xl p-4 border border-blue-300 dark:border-blue-500/40 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 hover:shadow-lg hover:scale-[1.01] transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-2xl">⏱️</div>
                  <span className="text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingCounts.stuckOrders}</p>
                <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">đơn đang xử lý &gt; 30 ngày</p>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Người dùng" value={String(stats.totalUsers)} icon="👥" bg="bg-blue-500/10 border-blue-500/30" text="text-blue-600 dark:text-blue-400" />
        <StatCard label="Đơn hàng" value={String(stats.totalOrders)} icon="📦" bg="bg-green-500/10 border-green-500/30" text="text-green-600 dark:text-green-400" />
        <StatCard label="Tổng cashback" value={formatVND(stats.totalCashback)} icon="💰" bg="bg-orange-500/10 border-orange-500/30" text="text-orange-600 dark:text-orange-400" />
        <StatCard label="Chờ rút tiền" value={String(stats.pendingWithdrawals)} icon="⏳" bg="bg-amber-500/10 border-amber-500/30" text="text-amber-600 dark:text-amber-400" />
        <StatCard label="Đã rút" value={formatVND(stats.totalWithdrawn)} icon="✅" bg="bg-emerald-500/10 border-emerald-500/30" text="text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Hoạt động gần đây</h3>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg p-0.5">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setTsRange(d)}
                className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                  tsRange === d
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >{d} ngày</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Đơn hàng / ngày</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Tổng: <span className="font-bold text-gray-700 dark:text-gray-200">{timeseries.reduce((s, p) => s + p.orders, 0)}</span></p>
            </div>
            <BarChart data={timeseries.map((p) => ({ label: p.date.slice(5).replace("-", "/"), value: p.orders }))} color="#3b82f6" height={180} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Cashback / ngày</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Tổng: <span className="font-bold text-orange-600 dark:text-orange-400">{formatVND(timeseries.reduce((s, p) => s + p.cashback, 0))}</span></p>
            </div>
            <BarChart data={timeseries.map((p) => ({ label: p.date.slice(5).replace("-", "/"), value: p.cashback }))} formatValue={(n) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n))} color="#fb923c" height={180} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Doanh thu (giá trị đơn) / ngày</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Tổng: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatVND(timeseries.reduce((s, p) => s + p.revenue, 0))}</span></p>
        </div>
        <BarChart
          data={timeseries.map((p) => ({ label: p.date.slice(5).replace("-", "/"), value: p.revenue }))}
          formatValue={(n) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n))}
          color="#10b981"
          height={200}
        />
      </div>
    </>
  );
}

function StatCard({ label, value, icon, bg, text }: { label: string; value: string; icon: string; bg: string; text: string }) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${bg}`}>
      <div className="flex items-start justify-between mb-1.5 sm:mb-2">
        <span className="text-xl sm:text-2xl">{icon}</span>
      </div>
      <p className={`text-base sm:text-xl font-bold ${text} truncate`}>{value}</p>
      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{label}</p>
    </div>
  );
}

/* ─────────────── Import section ─────────────── */

interface ImportSectionProps {
  importRaw: string; setImportRaw: (v: string) => void;
  importParsed: ImportSectionProps["importParsedT"][]; setImportParsed: (v: ImportSectionProps["importParsedT"][]) => void;
  importResult: ImportResult | null; setImportResult: (v: ImportResult | null) => void;
  importing: boolean; setImporting: (v: boolean) => void;
  importErr: string; setImportErr: (v: string) => void;
  importFileName: string | null; setImportFileName: (v: string | null) => void;
  importParsedT: { orderCode: string; shopId: string; itemId: string; productName: string; amount: number; commission: number; status: string };
  onImportDone: () => void;
}

function ImportSection(props: Omit<ImportSectionProps, "importParsedT">) {
  const {
    importRaw, setImportRaw, importParsed, setImportParsed,
    importResult, setImportResult, importing, setImporting,
    importErr, setImportErr, importFileName, setImportFileName,
    onImportDone,
  } = props;
  const toast = useToast();

  const submitImport = async (items: typeof importParsed, fileName: string | null) => {
    const res = await fetch("/api/admin/import-orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, fileName }),
    });
    const d = await res.json();
    if (d.success) {
      setImportResult(d.result);
      toast.success(`Import xong: ${d.result.matched} match, ${d.result.updated} update, ${d.result.unmatched} không match`);
      onImportDone();
    } else {
      setImportErr(d.error);
      toast.error(d.error || "Lỗi import");
    }
  };

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Import Đơn Hàng Từ Shopee</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Upload CSV từ Shopee Affiliate → hệ thống tự match user qua Sub_id (uid_X) hoặc affiliate_links đã tạo</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Bước 1: Upload CSV hoặc Paste dữ liệu</h3>

          <div className="mb-4 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 transition-colors">
            <label className="cursor-pointer flex flex-col items-center gap-2">
              <span className="text-2xl">{importing ? "⏳" : "📄"}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{importing ? "Đang xử lý..." : "Upload file CSV từ Shopee Affiliate"}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">(Báo cáo chuyển đổi → Xuất dữ liệu → tự động import ngay)</span>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" disabled={importing} onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const text = ev.target?.result as string;
                  if (!text) return;
                  setImportErr(""); setImportResult(null); setImporting(true);
                  setImportFileName(file.name);
                  try {
                    const items = parseShopeeCsv(text, (msg) => setImportErr(msg));
                    if (!items || items.length === 0) { setImporting(false); return; }
                    setImportRaw(`[CSV] ${file.name} — ${items.length} đơn`);
                    await submitImport(items, file.name);
                  } catch { setImportErr("Lỗi xử lý file"); toast.error("Lỗi xử lý file"); }
                  finally { setImporting(false); }
                };
                reader.readAsText(file);
                e.target.value = "";
              }} />
            </label>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-500 dark:text-gray-400">hoặc paste thủ công</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <textarea
            value={importRaw}
            onChange={e => setImportRaw(e.target.value)}
            placeholder={`VD:\n260514BQYBA8DR | 1291089905 | 27077693959 | Ron dán chân cửa | 35182 | 3518 | Đang chờ xử lý`}
            rows={6}
            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-orange-500 font-mono resize-y"
          />
          <button
            onClick={() => {
              setImportErr("");
              const lines = importRaw.split("\n").map(l => l.trim()).filter(Boolean);
              const items = lines.map(line => {
                const parts = line.split("|").map(p => p.trim());
                if (parts.length < 7) return null;
                return {
                  orderCode: parts[0], shopId: parts[1], itemId: parts[2],
                  productName: parts[3], amount: Number(parts[4]) || 0,
                  commission: Number(parts[5]) || 0, status: parts[6],
                };
              }).filter(Boolean) as typeof importParsed;
              if (items.length === 0) { setImportErr("Không parse được dòng nào. Kiểm tra format."); return; }
              setImportParsed(items);
              setImportFileName(null);
            }}
            className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >Parse dữ liệu</button>
          {importErr && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{importErr}</p>}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Bước 2: Xem trước & Import</h3>
          {importParsed.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có dữ liệu để import.</p>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Đã parse <span className="text-orange-600 dark:text-orange-400 font-bold">{importParsed.length}</span> đơn:</p>
              <div className="max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-3">
                {importParsed.map((it, i) => (
                  <div key={i} className="text-xs text-gray-600 dark:text-gray-300 py-1 border-b border-gray-200 dark:border-gray-700/50 last:border-0">
                    <span className="font-mono text-orange-600 dark:text-orange-400">{it.orderCode}</span>
                    <span className="text-gray-400 mx-1">|</span>
                    <span className="text-gray-500 dark:text-gray-400">item {it.itemId}</span>
                    <span className="text-gray-400 mx-1">|</span>
                    <span className="text-green-600 dark:text-green-400">+{Math.round(it.commission * 0.5).toLocaleString("vi-VN")}đ</span>
                    <span className="text-gray-400 mx-1">|</span>
                    <span className="text-blue-600 dark:text-blue-400">{it.status}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={async () => {
                  setImporting(true); setImportErr("");
                  await submitImport(importParsed, importFileName);
                  setImporting(false);
                }}
                disabled={importing}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >{importing ? "Đang import..." : `Import ${importParsed.length} đơn`}</button>
            </>
          )}
        </div>
      </div>

      {importResult && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Kết quả Import</h3>
          <div className="grid grid-cols-5 gap-3 mb-4">
            <ResultCard color="blue" label="Tổng dòng" value={importResult.total} />
            <ResultCard color="green" label="Match thành công" value={importResult.matched} />
            <ResultCard color="cyan" label="Cập nhật" value={importResult.updated} />
            <ResultCard color="amber" label="Đã tồn tại" value={importResult.duplicated} />
            <ResultCard color="red" label="Không match" value={importResult.unmatched} />
          </div>
          <div className="max-h-80 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
            {importResult.results.map((r, i) => (
              <div key={i} className={`text-xs py-1.5 border-b border-gray-200 dark:border-gray-700/50 last:border-0 ${
                r.status === "ok" ? "text-green-600 dark:text-green-400" :
                r.status === "updated" ? "text-cyan-600 dark:text-cyan-400" :
                r.status === "skip" ? "text-amber-600 dark:text-amber-400" :
                "text-red-600 dark:text-red-400"
              }`}>
                <span className="font-mono">{r.orderCode}</span> · {r.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ResultCard({ color, label, value }: { color: "blue" | "green" | "cyan" | "amber" | "red"; label: string; value: number }) {
  const map: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
    green: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
    cyan: "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
  };
  return (
    <div className={`border rounded-lg p-3 text-center ${map[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

/* ─────────────── CSV parser (extracted) ─────────────── */

interface ParsedItem { orderCode: string; shopId: string; itemId: string; productName: string; amount: number; commission: number; status: string; subId?: string; }

/**
 * Parse CSV xuất từ Shopee Affiliate Center. Xem `docs/research/INSPECTION_GUIDE.md`
 * + smoke test trong commit lịch sử nếu cần thay đổi sâu hơn.
 *
 * - Strip BOM \ufeff
 * - Bỏ qua 1–6 dòng metadata trước header thật
 * - Header tiếng Việt: `ID đơn hàng`, `Tên Item`, `Trạng thái đặt hàng`,
 *   `Tổng hoa hồng đơn hàng`, `Giá trị đơn hàng (₫)`, `Sub_id1..5`…
 * - Đơn nhiều sản phẩm: aggregate theo orderCode (commission/amount chỉ điền ở row đầu)
 */
function parseShopeeCsv(text: string, onError: (msg: string) => void): ParsedItem[] | null {
  const cleaned = text.replace(/^\ufeff/, "");
  const allLines = cleaned.split(/\r?\n/).filter(l => l.trim());
  if (allLines.length < 2) { onError("File rỗng"); return null; }
  const headerKeywords = ["id đơn hàng", "mã đơn hàng", "mã đơn", "order id", "order_id", "orderid"];
  let headerIdx = allLines.findIndex(l => {
    const low = l.toLowerCase();
    return headerKeywords.some(k => low.includes(k));
  });
  if (headerIdx === -1) headerIdx = 0;
  const lines = allLines.slice(headerIdx);
  if (lines.length < 2) { onError("File không có dòng dữ liệu sau header"); return null; }
  lines[0] = lines[0].replace(/^\ufeff/, "");
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const norm = (s: string) => s.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, " ");
  const headers = lines[0].split(sep).map(norm);

  const findCol = (priorities: string[]): number => {
    for (const k of priorities) { const i = headers.indexOf(k); if (i !== -1) return i; }
    for (const k of priorities) { const i = headers.findIndex(h => h.includes(k)); if (i !== -1) return i; }
    return -1;
  };
  const colOrder = findCol(["id đơn hàng", "mã đơn hàng", "mã đơn", "order id", "order_id", "orderid"]);
  const colShop = findCol(["shop id", "shop_id", "shopid", "mã shop", "shop name"]);
  const colItem = findCol(["item id", "item_id", "itemid", "mã sản phẩm", "mã sp"]);
  const colName = findCol(["tên item", "tên sản phẩm", "tên sp", "item name", "product name", "itemname", "productname"]);
  const colOrderValue = findCol(["giá trị đơn hàng (₫)", "giá trị đơn hàng", "tổng giá đơn hàng"]);
  const colPrice = findCol(["giá(₫)", "giá (₫)", "đơn giá", "giá sản phẩm", "item price", "price", "giá"]);
  const colCommission = findCol(["tổng hoa hồng đơn hàng", "tổng số dư hoa hồng dự kiến", "số dư hoa hồng dự kiến", "hoa hồng dự kiến", "tổng hoa hồng sản phẩm", "tổng hoa hồng", "item total commission", "total commission", "commission"]);
  const colStatus = findCol(["trạng thái đặt hàng", "trạng thái đơn hàng", "order status", "orderstatus", "trạng thái", "status"]);
  const subIdCols = headers.map((h, i) => ({ h, i })).filter(({ h }) => /^sub[_ ]?id\s?\d?$/.test(h) || h === "sub_id" || h === "subid" || h === "sub id" || h === "utm_content").map(({ i }) => i);

  if (colOrder === -1 || colShop === -1 || colItem === -1) {
    onError(`Không tìm thấy cột cần thiết. Headers: ${headers.join(", ")}`);
    return null;
  }

  function parseLine(line: string): string[] {
    const out: string[] = []; let cur = ""; let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (c === sep && !inQuote) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map(c => c.trim());
  }

  function parseVndNumber(raw: string): number {
    if (!raw) return 0;
    const c = raw.replace(/[^\d.,-]/g, "").trim();
    if (!c) return 0;
    const lastDot = c.lastIndexOf(".");
    const lastComma = c.lastIndexOf(",");
    let n = c;
    if (lastDot >= 0 && lastComma >= 0) {
      if (lastComma > lastDot) n = c.replace(/\./g, "").replace(",", ".");
      else n = c.replace(/,/g, "");
    } else if (lastDot >= 0) {
      const parts = c.split(".");
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) n = c.replace(/\./g, "");
    } else if (lastComma >= 0) n = c.replace(/,/g, "");
    const num = Number(n);
    return Number.isFinite(num) ? num : 0;
  }

  const parsedRaw = lines.slice(1).map(line => {
    const cols = parseLine(line);
    if (cols.length < 3) return null;
    let subId: string | undefined;
    for (const i of subIdCols) {
      const v = (cols[i] || "").trim();
      if (v && v !== "-") { subId = v; break; }
    }
    return {
      orderCode: (cols[colOrder] || "").replace(/^"|"$/g, "").trim(),
      shopId: (cols[colShop] || "").replace(/^"|"$/g, "").trim(),
      itemId: (cols[colItem] || "").replace(/^"|"$/g, "").trim(),
      productName: colName !== -1 ? (cols[colName] || "Sản phẩm Shopee").trim() : "Sản phẩm Shopee",
      orderValue: colOrderValue !== -1 ? Math.round(parseVndNumber(cols[colOrderValue])) : 0,
      itemPrice: colPrice !== -1 ? Math.round(parseVndNumber(cols[colPrice])) : 0,
      commission: colCommission !== -1 ? Math.round(parseVndNumber(cols[colCommission])) : 0,
      status: colStatus !== -1 ? (cols[colStatus] || "PENDING").trim() : "PENDING",
      subId,
    };
  }).filter(Boolean) as Array<{ orderCode: string; shopId: string; itemId: string; productName: string; orderValue: number; itemPrice: number; commission: number; status: string; subId?: string; }>;

  const map = new Map<string, ParsedItem>();
  for (const r of parsedRaw) {
    if (!r.orderCode) continue;
    const existing = map.get(r.orderCode);
    if (!existing) {
      map.set(r.orderCode, {
        orderCode: r.orderCode, shopId: r.shopId, itemId: r.itemId,
        productName: r.productName,
        amount: r.orderValue || r.itemPrice,
        commission: r.commission, status: r.status, subId: r.subId,
      });
    } else {
      if (r.orderValue > existing.amount) existing.amount = r.orderValue;
      else if (existing.amount === 0) existing.amount += r.itemPrice;
      if (r.commission > existing.commission) existing.commission = r.commission;
      if (!existing.subId && r.subId) existing.subId = r.subId;
      if (!existing.status || existing.status === "PENDING") {
        if (r.status && r.status !== "PENDING") existing.status = r.status;
      }
    }
  }
  const out = Array.from(map.values());
  if (out.length === 0) { onError("Không parse được dòng nào từ CSV"); return null; }
  return out;
}
