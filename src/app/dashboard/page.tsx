"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import {
  ClockIcon3D,
  GridIcon3D,
  HelpIcon3D,
  LinkIcon3D,
  OrdersIcon3D,
  ReferralIcon3D,
  WalletIcon3D,
} from "@/components/nav-icons-3d";
import {
  DienMayXanhIcon,
  LazadaIcon,
  SendoIcon,
  ShopeeIcon,
  TikTokIcon,
  TikiIcon,
} from "@/components/channel-icons";
import { VIETNAM_BANKS } from "@/lib/vietnam-banks";
import Footer from "@/components/Footer";

interface UserInfo {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  has_withdraw_pin: boolean;
  created_at: string;
  last_login: string | null;
}

interface OrderData {
  id: number;
  order_code: string;
  store: string;
  amount: number;
  cashback: number;
  status: string;
  created_at: string;
}

interface WalletData {
  id: number;
  label: string;
  amount: number;
  type: string;
  created_at: string;
}

interface Stats {
  totalCashback: number;
  totalOrders: number;
  pendingOrders: number;
  walletBalance: number;
}

interface BankAccountData {
  id: number;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  is_default: number;
  created_at: string;
}

interface LeaderboardEntry {
  display_name: string;
  total_orders: number;
  total_cashback: number;
}

type PartnerDef = {
  name: string;
  cashback: string;
  active: boolean;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const partners: PartnerDef[] = [
  { name: "Shopee", cashback: "lên đến 50%", active: true, Icon: ShopeeIcon },
  { name: "Lazada", cashback: "lên đến 5%", active: false, Icon: LazadaIcon },
  { name: "Tiki", cashback: "lên đến 4%", active: false, Icon: TikiIcon },
  { name: "Sendo", cashback: "lên đến 3.5%", active: false, Icon: SendoIcon },
  { name: "TikTok Shop", cashback: "lên đến 5.5%", active: false, Icon: TikTokIcon },
  { name: "Điện Máy Xanh", cashback: "lên đến 2%", active: false, Icon: DienMayXanhIcon },
];

function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const viewParam = searchParams.get("view");
  const accountView = viewParam === "profile" || viewParam === "bank" ? viewParam : null;

  // Derive tab từ URL: nếu có tab hợp lệ thì dùng, không thì default "overview".
  const tabFromUrl: "overview" | "orders" | "wallet" | "create-link" | "link-history" =
    tabParam === "orders" || tabParam === "wallet" || tabParam === "link-history"
      ? tabParam
      : "overview";
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "wallet" | "create-link" | "link-history">(tabFromUrl);

  // Đồng bộ tab giữa URL ↔ state. URL là source of truth duy nhất:
  // mọi handler chỉ replace URL, effect dưới sẽ cập nhật state. Cách này
  // tránh race khi cả handler và effect cùng setState (gây nhảy về tab cũ).
  function goToTab(tab: "overview" | "orders" | "wallet" | "link-history") {
    if (tab === "overview") {
      router.replace("/dashboard");
    } else {
      router.replace(`/dashboard?tab=${tab}`);
    }
  }

  // Khi URL đổi → đồng bộ activeTab. Setstate đặt sau micro-task để tránh
  // rule `react-hooks/set-state-in-effect` (set sync trong effect body).
  useEffect(() => {
    queueMicrotask(() => setActiveTab(tabFromUrl));
  }, [tabFromUrl]);

  const [linkHistory, setLinkHistory] = useState<{id:number;product_name:string;product_price:number;commission:number;commission_rate:string;cashback:number;affiliate_link:string;created_at:string}[]>([]);
  const [linkCopiedId, setLinkCopiedId] = useState<number|null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchLinkHistory = async () => {
    try {
      const res = await fetch("/api/affiliate-history");
      const data = await res.json();
      if (data.success) setLinkHistory(data.links);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (activeTab === "link-history") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch async, setState sau await
      void fetchLinkHistory();
    }
  }, [activeTab]);

  const setAccountView = (view: "profile" | "bank" | null) => {
    if (view) {
      router.replace(`/dashboard?view=${view}`);
    } else if (activeTab !== "overview") {
      // Quay về dashboard nhưng giữ lại tab đang xem.
      router.replace(`/dashboard?tab=${activeTab}`);
    } else {
      router.replace("/dashboard");
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<Stats>({ totalCashback: 0, totalOrders: 0, pendingOrders: 0, walletBalance: 0 });
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [walletHistory, setWalletHistory] = useState<WalletData[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"month" | "all">("month");
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async (period: "month" | "all") => {
    try {
      const res = await fetch(`/api/leaderboard?period=${period}`);
      const data = await res.json();
      if (data.success) setLeaderboard(data.leaderboard);
    } catch { /* ignore */ }
  };

  const fetchBankAccounts = async () => {
    const res = await fetch("/api/bank");
    const data = await res.json();
    if (data.success) setBankAccounts(data.accounts);
  };

  // Load dashboard ban đầu. Setstate nằm trong .then() / async, không phải sync
  // với effect body.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          // Admin lạc vào /dashboard → bounce về panel admin (giữ lại /dashboard/security
          // cho admin đổi password + 2FA, xử lý ở các trang con).
          if (data.user?.role === "admin") {
            router.replace("/admin");
            return;
          }
          setUser(data.user);
          setStats(data.stats);
          setOrders(data.orders);
          setWalletHistory(data.wallet);
        } else {
          router.push("/");
        }
      } catch {
        if (!cancelled) router.push("/");
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) await fetchLeaderboard("month");
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async setState sau await
    void fetchLeaderboard(leaderboardPeriod);
  }, [leaderboardPeriod]);

  useEffect(() => {
    if (accountView === "bank") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch async, setState sau await
      void fetchBankAccounts();
    }
  }, [accountView]);

  const refreshUser = async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (data.success) setUser(data.user);
  };

  const refreshDashboard = async () => {
    const res = await fetch("/api/dashboard");
    const data = await res.json();
    if (data.success) {
      setStats(data.stats);
      setOrders(data.orders);
      setWalletHistory(data.wallet);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.replace("/dashboard")}
              className="cursor-pointer"
              title="Về trang chủ"
            >
              <CaffiliateLogo />
            </button>
            <div className="hidden md:block h-6 w-px bg-gray-200" />
            <nav className="hidden md:flex items-center gap-1">
              {(["overview", "create-link", "orders", "wallet", "link-history", "help", "referral"] as const).map((tab) => {
                const isActive = activeTab === tab && !accountView;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      if (tab === "create-link") {
                        router.push("/dashboard/cashback");
                      } else if (tab === "help") {
                        router.push("/dashboard/help");
                      } else if (tab === "referral") {
                        router.push("/dashboard/referral");
                      } else {
                        // Chỉ thay URL — effect sẽ cập nhật state.
                        if (accountView) {
                          router.replace(tab === "overview" ? "/dashboard" : `/dashboard?tab=${tab}`);
                        } else {
                          goToTab(tab);
                        }
                      }
                    }}
                    className={`nav-bubble group relative flex items-center justify-center w-10 h-10 rounded-full transition-transform ${
                      isActive ? "scale-110" : "hover:scale-105"
                    }`}
                    data-active={isActive ? "true" : "false"}
                    title={
                      tab === "overview" ? "Tổng quan" :
                      tab === "create-link" ? "Tạo link" :
                      tab === "orders" ? "Đơn hàng" :
                      tab === "wallet" ? "Ví tiền" :
                      tab === "link-history" ? "Lịch sử link" :
                      tab === "help" ? "Hướng dẫn" : "Giới thiệu bạn bè"
                    }
                  >
                    {tab === "overview" && <GridIcon3D active={isActive} size={32} />}
                    {tab === "create-link" && <LinkIcon3D active={isActive} size={32} />}
                    {tab === "orders" && <OrdersIcon3D active={isActive} size={32} />}
                    {tab === "wallet" && <WalletIcon3D active={isActive} size={32} />}
                    {tab === "link-history" && <ClockIcon3D active={isActive} size={32} />}
                    {tab === "help" && <HelpIcon3D active={isActive} size={32} />}
                    {tab === "referral" && <ReferralIcon3D active={isActive} size={32} />}
                    {isActive && (
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-orange-600 whitespace-nowrap">
                        {tab === "overview" && "Tổng quan"}
                        {tab === "create-link" && "Tạo link"}
                        {tab === "orders" && "Đơn hàng"}
                        {tab === "wallet" && "Ví tiền"}
                        {tab === "link-history" && "Lịch sử"}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle — đặt cạnh chuông cho gọn */}
            <ThemeToggleButton />
            {/* Notification Bell — realtime SSE qua hook chung */}
            <NotificationBell />

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="hidden sm:block text-sm text-gray-600 font-medium">{user?.display_name || user?.username || "..."}</span>
              <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {(user?.display_name || user?.username || "U").charAt(0).toUpperCase()}
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-3 z-50 animate-in fade-in slide-in-from-top-1">
                {/* User info header */}
                <div className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100">
                  <div className="w-11 h-11 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {(user?.display_name || user?.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{user?.display_name || user?.username}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="pt-2 px-2 space-y-0.5">
                  <button
                    onClick={() => { setAccountView("profile"); setShowDropdown(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Hồ sơ
                  </button>
                  <button
                    onClick={() => { setAccountView("bank"); setShowDropdown(false); fetchBankAccounts(); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" x2="23" y1="10" y2="10" />
                    </svg>
                    Tài chính
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); router.push("/dashboard/security"); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Bảo mật
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => { setShowDropdown(false); handleLogout(); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
        {accountView === "profile" && user && (
          <ProfileSection user={user} onProfileUpdated={refreshUser} onBack={() => setAccountView(null)} />
        )}
        {accountView === "bank" && user && (
          <BankSection bankAccounts={bankAccounts} onBankUpdated={fetchBankAccounts} onBack={() => setAccountView(null)} />
        )}

        {!accountView && (
        <>
        {/* Stats Cards — real data */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard label="Tổng hoàn tiền" value={formatVND(stats.totalCashback)} icon="💰" color="bg-orange-50 text-orange-600" />
          <StatCard label="Đơn hàng" value={String(stats.totalOrders)} icon="📦" color="bg-blue-50 text-blue-600" />
          <StatCard label="Đang xử lý" value={String(stats.pendingOrders)} icon="⏳" color="bg-amber-50 text-amber-600" />
          <StatCard label="Số dư ví" value={formatVND(stats.walletBalance)} icon="💳" color="bg-green-50 text-green-600" />
        </div>

        {activeTab === "overview" && (
          <>
          {/* Welcome Banner — thay cho phần "Bảng Xếp Hạng" cũ.
              Nội dung: lời chào + nhắc tỷ lệ 50% hoàn + 2 CTA (tạo link / mời bạn bè). */}
          <section className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 shadow-lg shadow-orange-500/20">
            {/* Decorative shapes */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/15" />
            <div className="pointer-events-none absolute -bottom-12 right-24 w-24 h-24 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute top-1/2 right-8 text-white/30 text-xl">★</div>

            <div className="relative p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar circle */}
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-white/25 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white text-2xl font-black">
                {(user?.display_name || user?.username || "U").charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0 text-white">
                <h2 className="text-xl sm:text-2xl font-black">
                  Xin chào, {user?.display_name || user?.username || "bạn"}!
                </h2>
                <p className="text-sm text-white/90 mt-1 leading-relaxed">
                  V-Affiliate <b>hoàn 50% hoa hồng</b> cho mọi đơn mua sắm qua link của bạn.
                  Lấy link → mua sắm → tiền về ví tự động.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => router.push("/dashboard/cashback")}
                    className="inline-flex items-center gap-2 bg-white hover:bg-orange-50 text-orange-600 text-xs sm:text-sm font-bold px-4 py-2 rounded-lg shadow-md transition-all hover:scale-105"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    Lấy link hoàn tiền
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/referral")}
                    className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm hover:bg-white/25 border border-white/30 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                    Mời 50 bạn → +5%
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/spin")}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 hover:from-yellow-500 hover:via-orange-500 hover:to-pink-600 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg shadow-md shadow-pink-500/40 transition-all hover:scale-105"
                    title="Vòng quay may mắn — quay 1 lần/ngày"
                  >
                    <span className="text-base">🎰</span>
                    Vòng quay
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/help")}
                    className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm hover:bg-white/25 border border-white/30 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Hướng dẫn
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Cột chính (2/3) — Đơn hàng + Đối tác */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Đơn Hàng Gần Đây */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <h2 className="text-base font-bold text-gray-800">Đơn Hàng Gần Đây</h2>
                  </div>
                  {orders.length > 0 && (
                    <button onClick={() => goToTab("orders")} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                      Xem tất cả →
                    </button>
                  )}
                </div>

                {orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-base font-bold text-gray-800 mb-2">Đừng để tiền rơi!</p>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-[260px] mb-5">
                      Hãy bắt đầu mua sắm qua link để hoàn 50% tiền hoa hồng ngay cho đơn mua sắm của bạn nhé.
                    </p>
                    <button
                      onClick={() => router.push("/dashboard/cashback")}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      LẤY LINK HOÀN TIỀN NGAY
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{order.store}</p>
                          <p className="text-xs text-gray-400 truncate">{formatDate(order.created_at)} · {order.order_code}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-orange-500">+{formatVND(order.cashback)}</p>
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Đối Tác Hoàn Tiền */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🤝</span>
                  <h2 className="text-base font-bold text-gray-800">Đối Tác Hoàn Tiền</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {partners.map((p) => {
                    const Icon = p.Icon;
                    return (
                    <div
                      key={p.name}
                      onClick={() => { if (p.active) router.push("/dashboard/cashback"); }}
                      className={`relative rounded-xl border-2 p-3 sm:p-4 text-center transition-all ${
                        p.active
                          ? "border-orange-200 bg-orange-50/50 hover:border-orange-400 hover:shadow-sm cursor-pointer"
                          : "border-gray-100 bg-gray-50/50 opacity-60"
                      }`}
                    >
                      <div className="mx-auto mb-2 flex justify-center">
                        <Icon size={36} />
                      </div>
                      <p className="text-xs font-bold text-gray-800 mb-0.5">{p.name}</p>
                      <p className={`text-[10px] font-medium ${p.active ? "text-orange-500" : "text-gray-400"}`}>
                        {p.active ? `Hoàn ${p.cashback}` : "Coming soon"}
                      </p>
                      {!p.active && (
                        <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none uppercase tracking-wider shadow-sm">
                          Soon
                        </span>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cột phụ (1/3) — Bảng xếp hạng */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-100 p-5 lg:sticky lg:top-20">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🏆</span>
                  <h2 className="text-base font-bold text-gray-800">Bảng Xếp Hạng</h2>
                </div>

                {/* Period Tabs */}
                <div className="flex items-center gap-1 mb-4 p-0.5 bg-gray-100 rounded-full">
                  {([["month", "Tháng này"], ["all", "Tất cả"]] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setLeaderboardPeriod(key)}
                      className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                        leaderboardPeriod === key
                          ? "bg-white text-orange-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Top 3 podium */}
                {leaderboard.length >= 1 && (
                  <div className="flex items-end justify-center gap-2 mb-4 px-2">
                    {/* #2 (left) */}
                    {leaderboard[1] ? (
                      <PodiumCard
                        rank={2}
                        name={leaderboard[1].display_name}
                        amount={Number(leaderboard[1].total_cashback)}
                        height="h-20"
                        gradient="from-gray-300 to-gray-400"
                        crown="🥈"
                      />
                    ) : <div className="flex-1" />}
                    {/* #1 (center) */}
                    <PodiumCard
                      rank={1}
                      name={leaderboard[0].display_name}
                      amount={Number(leaderboard[0].total_cashback)}
                      height="h-24"
                      gradient="from-amber-300 to-orange-500"
                      crown="🥇"
                      highlight
                    />
                    {/* #3 (right) */}
                    {leaderboard[2] ? (
                      <PodiumCard
                        rank={3}
                        name={leaderboard[2].display_name}
                        amount={Number(leaderboard[2].total_cashback)}
                        height="h-16"
                        gradient="from-orange-300 to-orange-400"
                        crown="🥉"
                      />
                    ) : <div className="flex-1" />}
                  </div>
                )}

                {/* Rest of leaderboard */}
                <div className="space-y-1.5">
                  {leaderboard.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Chưa có dữ liệu xếp hạng</p>
                  ) : (
                    leaderboard.slice(3).map((entry, index) => {
                      const rank = index + 4;
                      return (
                        <div key={index} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 hover:bg-orange-50/50 transition-colors">
                          <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                            {rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{entry.display_name}</p>
                            <p className="text-[10px] text-gray-400">{entry.total_orders} đơn</p>
                          </div>
                          <span className="text-xs font-bold text-green-600 shrink-0">
                            +{Number(entry.total_cashback).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* CTA */}
                {leaderboard.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => router.push("/dashboard/cashback")}
                      className="w-full text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50 py-2 rounded-lg transition-colors"
                    >
                      Mua sắm ngay để vào top →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          </>
        )}

        {activeTab === "link-history" && (
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Lịch sử tạo link</h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {linkHistory.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-400 text-sm">Chưa có link nào được tạo</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {linkHistory.map((link) => (
                    <div key={link.id} className="p-4 hover:bg-orange-50/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{link.product_name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span>Giá: {Number(link.product_price).toLocaleString("vi-VN")}đ</span>
                            <span>HH: {link.commission_rate} ({Number(link.commission).toLocaleString("vi-VN")}đ)</span>
                            <span className="text-orange-500 font-medium">Hoàn: {Number(link.cashback).toLocaleString("vi-VN")}đ</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <input readOnly value={link.affiliate_link} className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 truncate" />
                            <button
                              onClick={() => { navigator.clipboard.writeText(link.affiliate_link); setLinkCopiedId(link.id); setTimeout(() => setLinkCopiedId(null), 2000); }}
                              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${linkCopiedId === link.id ? "bg-green-500 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                            >
                              {linkCopiedId === link.id ? "Đã copy!" : "Copy"}
                            </button>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-300 whitespace-nowrap mt-1">{formatDate(link.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "orders" && (
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Tất cả đơn hàng</h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {orders.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-400 text-sm">Chưa có đơn hàng nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Mã đơn</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Cửa hàng</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Giá trị</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Hoàn tiền</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-500">Trạng thái</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-500">Ngày</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{order.order_code}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{order.store}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatVND(order.amount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-500">{formatVND(order.cashback)}</td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400 text-xs">{formatDate(order.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "wallet" && (
          <WalletTab
            stats={stats}
            walletHistory={walletHistory}
            bankAccounts={bankAccounts}
            onFetchBanks={fetchBankAccounts}
            onWithdrawSuccess={refreshDashboard}
          />
        )}
        </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function ProfileSection({ user, onProfileUpdated, onBack }: { user: UserInfo; onProfileUpdated: () => void; onBack: () => void }) {
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async () => {
    setSaving(true);
    setProfileMsg("");
    setProfileErr("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, email, phone: phone || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setProfileMsg("Cập nhật thành công!");
        onProfileUpdated();
      } else {
        setProfileErr(data.error || "Cập nhật thất bại");
      }
    } catch {
      setProfileErr("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500 mb-4 transition-colors">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Quay lại
      </button>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Hồ sơ cá nhân
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tên đăng nhập</label>
            <input type="text" value={user.username} disabled className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tên hiển thị</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nhập tên hiển thị" className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nhập email" className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Số điện thoại</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nhập số điện thoại" className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
          </div>
          {profileMsg && <p className="text-sm text-green-600 font-medium">{profileMsg}</p>}
          {profileErr && <p className="text-sm text-red-500 font-medium">{profileErr}</p>}
          <button onClick={handleProfileSave} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {/* Mật khẩu rút tiền */}
      <WithdrawPinSection hasPin={user.has_withdraw_pin} onPinUpdated={onProfileUpdated} />
    </div>
  );
}

function BankSection({ bankAccounts, onBankUpdated, onBack }: { bankAccounts: BankAccountData[]; onBankUpdated: () => void; onBack: () => void }) {
  const [showAddBank, setShowAddBank] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [accNumber, setAccNumber] = useState("");
  const [accHolder, setAccHolder] = useState("");
  const [bankMsg, setBankMsg] = useState("");
  const [bankErr, setBankErr] = useState("");
  const [bankSaving, setBankSaving] = useState(false);

  const handleAddBank = async () => {
    const bank = VIETNAM_BANKS.find((b) => b.code === selectedBank);
    if (!bank || !accNumber || !accHolder) { setBankErr("Vui lòng điền đầy đủ thông tin"); return; }
    setBankSaving(true); setBankMsg(""); setBankErr("");
    try {
      const res = await fetch("/api/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bank_code: bank.code, bank_name: `${bank.shortName} - ${bank.name}`, account_number: accNumber, account_holder: accHolder }),
      });
      const data = await res.json();
      if (data.success) {
        setBankMsg("Thêm tài khoản thành công!");
        setSelectedBank(""); setAccNumber(""); setAccHolder(""); setShowAddBank(false);
        onBankUpdated();
      } else { setBankErr(data.error || "Thêm thất bại"); }
    } catch { setBankErr("Lỗi kết nối"); }
    finally { setBankSaving(false); }
  };

  const handleDeleteBank = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa tài khoản này?")) return;
    await fetch(`/api/bank?id=${id}`, { method: "DELETE" });
    onBankUpdated();
  };

  const handleSetDefault = async (id: number) => {
    await fetch("/api/bank", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    onBankUpdated();
  };

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500 mb-4 transition-colors">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Quay lại
      </button>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" x2="23" y1="10" y2="10" />
            </svg>
            Tài chính
          </h2>
          <button onClick={() => setShowAddBank(!showAddBank)} className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors">
            {showAddBank ? "Hủy" : "+ Thêm mới"}
          </button>
        </div>

        {bankMsg && <p className="text-sm text-green-600 font-medium mb-3">{bankMsg}</p>}
        {bankErr && <p className="text-sm text-red-500 font-medium mb-3">{bankErr}</p>}

        {showAddBank && (
          <div className="bg-gray-50 rounded-lg p-4 mb-5 space-y-3 border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Ngân hàng</label>
              <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-white">
                <option value="">-- Chọn ngân hàng --</option>
                {VIETNAM_BANKS.map((b) => (<option key={b.code} value={b.code}>{b.shortName} - {b.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Số tài khoản</label>
              <input type="text" value={accNumber} onChange={(e) => setAccNumber(e.target.value)} placeholder="Nhập số tài khoản" className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Tên chủ tài khoản</label>
              <input type="text" value={accHolder} onChange={(e) => setAccHolder(e.target.value.toUpperCase())} placeholder="VD: NGUYEN VAN A" className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm uppercase focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
            </div>
            <button onClick={handleAddBank} disabled={bankSaving} className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {bankSaving ? "Đang thêm..." : "Thêm tài khoản"}
            </button>
          </div>
        )}

        {bankAccounts.length === 0 && !showAddBank ? (
          <div className="text-center py-8">
            <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" x2="23" y1="10" y2="10" />
            </svg>
            <p className="text-gray-400 text-sm">Chưa có tài khoản ngân hàng nào</p>
            <p className="text-gray-300 text-xs mt-1">Thêm tài khoản để rút tiền hoàn về</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bankAccounts.map((acc) => (
              <div key={acc.id} className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${acc.is_default ? "border-orange-300 bg-orange-50/30" : "border-gray-100 bg-white"}`}>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">{acc.bank_code.substring(0, 3)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{acc.bank_name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{acc.account_number}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{acc.account_holder}</p>
                  {acc.is_default ? <span className="inline-block mt-1 text-[10px] font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Mặc định</span> : null}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {!acc.is_default && <button onClick={() => handleSetDefault(acc.id)} className="text-[11px] text-orange-500 hover:text-orange-600 font-medium">Đặt mặc định</button>}
                  <button onClick={() => handleDeleteBank(acc.id)} className="text-[11px] text-red-400 hover:text-red-500 font-medium">Xóa</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WithdrawPinSection({ hasPin, onPinUpdated }: { hasPin: boolean; onPinUpdated: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

  const handleSavePin = async () => {
    if (newPin.length < 4 || newPin.length > 6) { setPinErr("Mật khẩu rút tiền phải từ 4-6 ký tự"); return; }
    if (newPin !== confirmPin) { setPinErr("Xác nhận mật khẩu không khớp"); return; }
    setPinSaving(true); setPinMsg(""); setPinErr("");
    try {
      const res = await fetch("/api/withdraw-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_pin: hasPin ? currentPin : undefined, new_pin: newPin }),
      });
      const data = await res.json();
      if (data.success) {
        setPinMsg(data.message);
        setCurrentPin(""); setNewPin(""); setConfirmPin(""); setShowForm(false);
        onPinUpdated();
      } else { setPinErr(data.error || "Thất bại"); }
    } catch { setPinErr("Lỗi kết nối"); }
    finally { setPinSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Mật khẩu rút tiền
        </h2>
        <button
          onClick={() => { setShowForm(!showForm); setPinMsg(""); setPinErr(""); }}
          className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
        >
          {showForm ? "Hủy" : hasPin ? "Đổi mật khẩu" : "Cài đặt"}
        </button>
      </div>

      {!showForm && !pinMsg && (
        <p className="text-sm text-gray-500">
          {hasPin
            ? "Đã cài đặt mật khẩu rút tiền."
            : "Chưa cài đặt. Vui lòng cài đặt mật khẩu để rút tiền."}
        </p>
      )}

      {pinMsg && <p className="text-sm text-green-600 font-medium">{pinMsg}</p>}

      {showForm && (
        <div className="space-y-3">
          {hasPin && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Mật khẩu hiện tại</label>
              <input type="password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} placeholder="Nhập mật khẩu hiện tại" className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Mật khẩu mới (4-6 ký tự)</label>
            <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="Nhập mật khẩu mới" maxLength={6} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Xác nhận mật khẩu mới</label>
            <input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} placeholder="Nhập lại mật khẩu mới" maxLength={6} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all" />
          </div>
          {pinErr && <p className="text-sm text-red-500 font-medium">{pinErr}</p>}
          <button onClick={handleSavePin} disabled={pinSaving} className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {pinSaving ? "Đang lưu..." : hasPin ? "Đổi mật khẩu" : "Cài đặt mật khẩu"}
          </button>
        </div>
      )}
    </div>
  );
}

const MIN_WITHDRAW = 50000;

function WalletTab({
  stats,
  walletHistory,
  bankAccounts,
  onFetchBanks,
  onWithdrawSuccess,
}: {
  stats: Stats;
  walletHistory: WalletData[];
  bankAccounts: BankAccountData[];
  onFetchBanks: () => void;
  onWithdrawSuccess: () => void;
}) {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPin, setWithdrawPin] = useState("");
  const [withdrawMsg, setWithdrawMsg] = useState("");
  const [withdrawErr, setWithdrawErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openWithdraw = () => {
    onFetchBanks();
    setShowWithdraw(true);
    setWithdrawMsg("");
    setWithdrawErr("");
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!selectedBankId) { setWithdrawErr("Vui lòng chọn tài khoản ngân hàng"); return; }
    if (!amount || amount < MIN_WITHDRAW) { setWithdrawErr(`Số tiền rút tối thiểu là ${formatVND(MIN_WITHDRAW)}`); return; }
    if (amount > stats.walletBalance) { setWithdrawErr("Số dư không đủ"); return; }
    if (!withdrawPin) { setWithdrawErr("Vui lòng nhập mật khẩu rút tiền"); return; }

    setSubmitting(true);
    setWithdrawErr("");
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bank_account_id: Number(selectedBankId), amount, pin: withdrawPin }),
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawMsg("Yêu cầu rút tiền đã được gửi!");
        setWithdrawAmount("");
        setSelectedBankId("");
        setWithdrawPin("");
        setShowWithdraw(false);
        onWithdrawSuccess();
      } else {
        setWithdrawErr(data.error || "Rút tiền thất bại");
      }
    } catch {
      setWithdrawErr("Lỗi kết nối");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white mb-6">
          <p className="text-sm opacity-80 mb-1">Số dư hiện tại</p>
          <p className="text-3xl font-bold mb-4">{formatVND(stats.walletBalance)}</p>
          <button
            onClick={openWithdraw}
            className="bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Rút tiền
          </button>
        </div>

        {withdrawMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-green-700 font-medium">{withdrawMsg}</p>
          </div>
        )}

        {showWithdraw && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" x2="12" y1="1" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Rút tiền về ngân hàng
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Chọn tài khoản ngân hàng</label>
                {bankAccounts.length === 0 ? (
                  <p className="text-sm text-red-400">Chưa có tài khoản ngân hàng. Vui lòng thêm trong phần <strong>Tài chính</strong>.</p>
                ) : (
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-white"
                  >
                    <option value="">-- Chọn tài khoản --</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bank_name} - {acc.account_number} ({acc.account_holder})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Số tiền rút</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Tối thiểu ${formatVND(MIN_WITHDRAW)}`}
                  min={MIN_WITHDRAW}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">Số dư khả dụng: <span className="font-semibold text-orange-500">{formatVND(stats.walletBalance)}</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Mật khẩu rút tiền</label>
                <input
                  type="password"
                  value={withdrawPin}
                  onChange={(e) => setWithdrawPin(e.target.value)}
                  placeholder="Nhập mật khẩu rút tiền"
                  maxLength={6}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                />
              </div>

              {withdrawErr && <p className="text-sm text-red-500 font-medium">{withdrawErr}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowWithdraw(false)}
                  className="flex-1 border-2 border-gray-200 text-gray-600 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={submitting || bankAccounts.length === 0}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận rút"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Lịch sử giao dịch</h3>
          {walletHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Chưa có giao dịch nào</p>
          ) : (
            <div className="space-y-3">
              {walletHistory.map((entry) => (
                <WalletItem
                  key={entry.id}
                  label={entry.label}
                  amount={entry.type === "credit" ? `+${formatVND(entry.amount)}` : `-${formatVND(Math.abs(entry.amount))}`}
                  date={formatDate(entry.created_at)}
                  positive={entry.type === "credit"}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className={`rounded-xl p-3 sm:p-4 ${color}`}>
      <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{icon}</div>
      <p className="text-[10px] sm:text-xs font-medium opacity-70 mb-0.5">{label}</p>
      <p className="text-sm sm:text-lg font-bold truncate">{value}</p>
    </div>
  );
}

/**
 * Podium card cho top 3 leaderboard.
 * Khác nhau ở chiều cao + gradient để tạo cảm giác "bục".
 */
function PodiumCard({
  rank, name, amount, height, gradient, crown, highlight,
}: {
  rank: number;
  name: string;
  amount: number;
  height: string;
  gradient: string;
  crown: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center min-w-0">
      {/* Avatar circle */}
      <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-md ${highlight ? "ring-2 ring-amber-300 ring-offset-2" : ""}`}>
        {(name || "?").charAt(0).toUpperCase()}
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-base">{crown}</span>
      </div>
      {/* Name */}
      <p className="text-[10px] font-bold text-gray-700 truncate w-full text-center mt-1.5 px-1">
        {name}
      </p>
      <p className="text-[9px] text-green-600 font-semibold truncate">
        +{(amount || 0).toLocaleString("vi-VN")}đ
      </p>
      {/* Bục */}
      <div className={`mt-1 w-full ${height} bg-gradient-to-t ${gradient} rounded-t-md flex items-center justify-center text-white font-black text-base shadow-inner`}>
        {rank}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "Đã hoàn tiền": "bg-green-100 text-green-700",
    "Đang xử lý": "bg-amber-100 text-amber-700",
    "Chờ xác nhận": "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function WalletItem({ label, amount, date, positive }: { label: string; amount: string; date: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{date}</p>
      </div>
      <span className={`text-sm font-bold ${positive ? "text-green-600" : "text-red-500"}`}>
        {amount}
      </span>
    </div>
  );
}
