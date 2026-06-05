"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";

interface NavItem {
  key: string;
  label: string;
  href: string;
  match: (path: string, tab: string | null) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Home", href: "/dashboard", match: (p, t) => p === "/dashboard" && (!t || t === "overview") },
  { key: "cashback", label: "Hoàn Tiền", href: "/dashboard/cashback", match: (p) => p === "/dashboard/cashback" },
  { key: "orders", label: "Đơn hàng", href: "/dashboard?tab=orders", match: (p, t) => p === "/dashboard" && t === "orders" },
  { key: "wallet", label: "Tài Chính", href: "/dashboard?tab=wallet", match: (p, t) => p === "/dashboard" && t === "wallet" },
];

interface MoreItem {
  key: string;
  label: string;
  href: string;
  desc: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}

const MORE_ITEMS: MoreItem[] = [
  {
    key: "link-history", label: "Lịch sử link", href: "/dashboard?tab=link-history", desc: "Các link đã tạo",
    color: "text-blue-500", bg: "bg-blue-500/10",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  },
  {
    key: "spin", label: "Vòng quay may mắn", href: "/dashboard/spin", desc: "Mua hàng & mời bạn để nhận lượt quay",
    color: "text-orange-500", bg: "bg-orange-500/10",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>,
  },
  {
    key: "wishlist", label: "Wishlist", href: "/dashboard/wishlist", desc: "Theo dõi giá Shopee",
    color: "text-red-500", bg: "bg-red-500/10",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
  },
  {
    key: "referral", label: "Giới thiệu bạn bè", href: "/dashboard/referral", desc: "Mời bạn để nâng tier",
    color: "text-emerald-500", bg: "bg-emerald-500/10",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  },
  {
    key: "help", label: "Hướng dẫn sử dụng", href: "/dashboard/help", desc: "FAQ và 5 bước cơ bản",
    color: "text-amber-500", bg: "bg-amber-500/10",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  },
  {
    key: "security", label: "Bảo mật & 2FA", href: "/dashboard/security", desc: "Đổi mật khẩu, session",
    color: "text-indigo-500", bg: "bg-indigo-500/10",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  },
  {
    key: "profile", label: "Hồ sơ cá nhân", href: "/dashboard?view=profile", desc: "Chỉnh thông tin tài khoản",
    color: "text-orange-500", bg: "bg-orange-500/10",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  },
  {
    key: "bank", label: "Tài khoản ngân hàng", href: "/dashboard?view=bank", desc: "Quản lý ngân hàng + PIN rút tiền",
    color: "text-teal-500", bg: "bg-teal-500/10",
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>,
  },
];

/* ── Inline SVG nav icons (stroke-based, no emoji) ── */
function HomeIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function SparkleIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L13.5 9 L20 10.5 L13.5 12 L12 18 L10.5 12 L4 10.5 L10.5 9 Z" />
      <circle cx="18" cy="5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BoxIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 L21 19 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 L3 8" />
      <path d="M2 8 L12 3 L22 8 L12 13 Z" />
      <path d="M12 13 L12 21" />
    </svg>
  );
}

function WalletIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10 L18 10" />
      <circle cx="17" cy="13" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MoreBarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="18" y2="18" />
    </svg>
  );
}

const NAV_ICONS = [HomeIcon, SparkleIcon, BoxIcon, WalletIcon];

export function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const params = useSearchParams();
  const tab = params.get("tab");
  const [showMore, setShowMore] = useState(false);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: close sheet on navigation
    setShowMore(false);
  }, [pathname, tab]);

  useEffect(() => {
    if (!showMore) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [showMore]);

  const isMoreActive = !NAV_ITEMS.some((i) => i.match(pathname, tab)) &&
    (pathname.startsWith("/dashboard/help")
      || pathname.startsWith("/dashboard/referral")
      || pathname.startsWith("/dashboard/security")
      || tab === "link-history"
      || params.get("view") !== null);

  const goTo = (href: string) => {
    setShowMore(false);
    router.push(href);
  };

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-black/5 dark:border-white/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 max-w-md mx-auto">
          {NAV_ITEMS.map((item, idx) => {
            const isActive = item.match(pathname, tab);
            const Icon = NAV_ICONS[idx];
            return (
              <button
                key={item.key}
                onClick={() => goTo(item.href)}
                className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-all min-h-[52px] ${
                  isActive ? "text-orange-500" : "text-gray-500 dark:text-zinc-500"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-orange-500" />
                )}
                <Icon active={isActive} className="w-6 h-6 transition-transform active:scale-90" />
                <span className={`text-[10px] font-semibold ${isActive ? "text-orange-500" : ""}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Thêm button */}
          <button
            onClick={() => setShowMore(true)}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-all min-h-[52px] ${
              isMoreActive || showMore ? "text-orange-500" : "text-gray-500 dark:text-zinc-500"
            }`}
          >
            {isMoreActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-orange-500" />
            )}
            <div className="relative">
              <MoreBarIcon className="w-6 h-6 transition-transform active:scale-90" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold ${isMoreActive || showMore ? "text-orange-500" : ""}`}>
              Thêm
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col">
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setShowMore(false)}
            className="flex-1 bg-black/40 backdrop-blur-sm"
          />
          <div className="bg-white dark:bg-[#18181b] rounded-t-3xl shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 dark:bg-zinc-700 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-2 pb-4">
              <h3 className="text-base font-black text-gray-900 dark:text-zinc-100">Tất cả mục</h3>
              <button
                onClick={() => setShowMore(false)}
                className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            {/* Items grid */}
            <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-1">
                {MORE_ITEMS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => goTo(m.href)}
                    className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/[0.04] transition-colors text-left w-full"
                  >
                    <div className={`w-11 h-11 rounded-2xl ${m.bg} flex items-center justify-center shrink-0 ${m.color} group-hover:scale-105 transition-transform`}>
                      {m.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-zinc-100">{m.label}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{m.desc}</p>
                    </div>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-300 dark:text-zinc-700 shrink-0 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
