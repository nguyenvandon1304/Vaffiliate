"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Bottom navigation cho mobile (≤ md). Cố định fixed dưới màn hình.
 * 5 nút: Home / Hoàn Tiền / Đơn hàng / Tài chính / Thêm.
 * Nút "Thêm" mở bottom sheet với các mục còn lại + badge unreadCount.
 *
 * Component tự đọc URL hiện tại (pathname + ?tab=) để highlight nút active.
 * Tự fetch unread count để badge "Thêm" hiển thị đúng. Dùng tail `pb-20 md:pb-0`
 * trên main container để không bị nav che khuất.
 */

interface NavItem {
  key: string;
  label: string;
  href: string;
  // Khi nào active (so sánh path + tab):
  match: (path: string, tab: string | null) => boolean;
  Icon: React.ComponentType<{ active?: boolean; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    label: "Home",
    href: "/dashboard",
    match: (p, t) => p === "/dashboard" && (!t || t === "overview"),
    Icon: HomeIcon,
  },
  {
    key: "cashback",
    label: "Hoàn Tiền",
    href: "/dashboard/cashback",
    match: (p) => p === "/dashboard/cashback",
    Icon: SparkleIcon,
  },
  {
    key: "orders",
    label: "Đơn hàng",
    href: "/dashboard?tab=orders",
    match: (p, t) => p === "/dashboard" && t === "orders",
    Icon: BoxIcon,
  },
  {
    key: "wallet",
    label: "Tài Chính",
    href: "/dashboard?tab=wallet",
    match: (p, t) => p === "/dashboard" && t === "wallet",
    Icon: WalletIcon,
  },
];

interface MoreItem {
  key: string;
  label: string;
  href: string;
  emoji: string;
  desc?: string;
}

const MORE_ITEMS: MoreItem[] = [
  { key: "link-history", label: "Lịch sử link", href: "/dashboard?tab=link-history", emoji: "🕒", desc: "Xem các link đã tạo" },
  { key: "spin", label: "Vòng quay may mắn", href: "/dashboard/spin", emoji: "🎰", desc: "Quay 1 lần/ngày, trúng thưởng vào ví" },
  { key: "referral", label: "Giới thiệu bạn bè", href: "/dashboard/referral", emoji: "👥", desc: "Mời bạn để nâng tier" },
  { key: "help", label: "Hướng dẫn sử dụng", href: "/dashboard/help", emoji: "💡", desc: "FAQ và 5 bước cơ bản" },
  { key: "security", label: "Bảo mật & 2FA", href: "/dashboard/security", emoji: "🔒", desc: "Đổi mật khẩu, session" },
  { key: "profile", label: "Hồ sơ cá nhân", href: "/dashboard?view=profile", emoji: "👤", desc: "Chỉnh thông tin tài khoản" },
  { key: "bank", label: "Tài khoản ngân hàng", href: "/dashboard?view=bank", emoji: "🏦", desc: "Quản lý ngân hàng + PIN rút tiền" },
];

export function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const params = useSearchParams();
  const tab = params.get("tab");
  const [showMore, setShowMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count để hiện badge trên nút "Thêm".
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/notifications");
        const d = await r.json();
        if (!cancelled && d.success) setUnreadCount(d.unreadCount || 0);
      } catch { /* ignore */ }
    };
    void load();
    // Re-fetch mỗi 60s để bắt thông báo mới (đủ tần suất, không spam server).
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Đóng sheet khi route đổi (tránh kẹt sheet sau khi chuyển trang).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close sheet on route change
    setShowMore(false);
  }, [pathname, tab]);

  // Khoá scroll body khi sheet mở.
  useEffect(() => {
    if (!showMore) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [showMore]);

  const isMoreActive = !NAV_ITEMS.some((i) => i.match(pathname, tab))
    && (pathname.startsWith("/dashboard/help")
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match(pathname, tab);
            const Icon = item.Icon;
            return (
              <button
                key={item.key}
                onClick={() => goTo(item.href)}
                className={`flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
                  isActive ? "text-orange-500" : "text-gray-500 dark:text-zinc-400"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon active={isActive} className="w-6 h-6" />
                <span className={`text-[11px] font-medium ${isActive ? "text-orange-500" : ""}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Nút Thêm */}
          <button
            onClick={() => setShowMore(true)}
            className={`relative flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
              isMoreActive || showMore ? "text-orange-500" : "text-gray-500 dark:text-zinc-400"
            }`}
          >
            <div className="relative">
              <MoreIcon active={isMoreActive || showMore} className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[11px] font-medium ${isMoreActive || showMore ? "text-orange-500" : ""}`}>
              Thêm
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet "Thêm" */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col">
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setShowMore(false)}
            className="flex-1 bg-black/40 backdrop-blur-sm"
          />
          <div
            className="bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="text-base font-bold text-gray-800 dark:text-zinc-100">Tất cả mục</h3>
              <button
                onClick={() => setShowMore(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-gray-400"
                aria-label="Đóng"
              >×</button>
            </div>
            {/* Drag handle */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 dark:bg-zinc-700 rounded-full" />
            <div className="px-3 pb-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-1">
                {MORE_ITEMS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => goTo(m.href)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors text-left"
                  >
                    <span className="text-2xl flex-shrink-0">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">{m.label}</p>
                      {m.desc && <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{m.desc}</p>}
                    </div>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-300 dark:text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
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

/* ─────────────── Icons (stroke-based, scale theo currentColor) ─────────────── */

function HomeIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SparkleIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L13.5 9 L20 10.5 L13.5 12 L12 18 L10.5 12 L4 10.5 L10.5 9 Z" />
      <circle cx="18" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="3" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BoxIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 L21 19 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 L3 8" />
      <path d="M2 8 L12 3 L22 8 L12 13 Z" />
      <path d="M12 13 L12 21" />
    </svg>
  );
}

function WalletIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M16 14 a1 1 0 1 1 0 -2 H22 V14 Z" fill="currentColor" stroke="none" opacity="0.2" />
      <circle cx="17" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <path d="M2 10 L18 10" />
    </svg>
  );
}

function MoreIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="14" y2="12" />
      <line x1="3" y1="18" x2="18" y2="18" />
    </svg>
  );
}
