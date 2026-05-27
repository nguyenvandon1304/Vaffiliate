"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ClockIcon3D,
  GridIcon3D,
  HelpIcon3D,
  LinkIcon3D,
  OrdersIcon3D,
  ReferralIcon3D,
  WalletIcon3D,
} from "@/components/nav-icons-3d";

type TabKey =
  | "overview"
  | "create-link"
  | "orders"
  | "wallet"
  | "link-history"
  | "help"
  | "referral";

const TABS: { key: TabKey; title: string; href: string }[] = [
  { key: "overview", title: "Tổng quan", href: "/dashboard" },
  { key: "create-link", title: "Tạo link", href: "/dashboard/cashback" },
  { key: "orders", title: "Đơn hàng", href: "/dashboard?tab=orders" },
  { key: "wallet", title: "Ví tiền", href: "/dashboard?tab=wallet" },
  { key: "link-history", title: "Lịch sử link", href: "/dashboard?tab=link-history" },
  { key: "help", title: "Hướng dẫn", href: "/dashboard/help" },
  { key: "referral", title: "Giới thiệu bạn bè", href: "/dashboard/referral" },
];

/**
 * Nav icons row dùng chung cho các sub-page (`/dashboard/help`, `/dashboard/referral`...)
 * — match design với navbar chính trên `/dashboard` để user không bị mất context.
 *
 * Trên mobile vẫn dựa vào `MobileBottomNav` (đã render qua DashboardShell), nên
 * row này chỉ hiện ở `md:` trở lên giống navbar chính.
 */
export function DashboardNavIcons() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const params = useSearchParams();
  const tabParam = params.get("tab");

  function isActive(key: TabKey): boolean {
    if (key === "overview") return pathname === "/dashboard" && !tabParam;
    if (key === "create-link") return pathname.startsWith("/dashboard/cashback");
    if (key === "help") return pathname.startsWith("/dashboard/help");
    if (key === "referral") return pathname.startsWith("/dashboard/referral");
    return pathname === "/dashboard" && tabParam === key;
  }

  return (
    <nav className="hidden md:flex items-center gap-1">
      {TABS.map((t) => {
        const active = isActive(t.key);
        return (
          <button
            key={t.key}
            onClick={() => router.push(t.href)}
            className={`nav-bubble group relative flex items-center justify-center w-10 h-10 rounded-full transition-transform ${
              active ? "scale-110" : "hover:scale-105"
            }`}
            data-active={active ? "true" : "false"}
            title={t.title}
          >
            {t.key === "overview" && <GridIcon3D active={active} size={32} />}
            {t.key === "create-link" && <LinkIcon3D active={active} size={32} />}
            {t.key === "orders" && <OrdersIcon3D active={active} size={32} />}
            {t.key === "wallet" && <WalletIcon3D active={active} size={32} />}
            {t.key === "link-history" && <ClockIcon3D active={active} size={32} />}
            {t.key === "help" && <HelpIcon3D active={active} size={32} />}
            {t.key === "referral" && <ReferralIcon3D active={active} size={32} />}
            {active && (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-orange-600 whitespace-nowrap">
                {t.key === "overview" && "Tổng quan"}
                {t.key === "create-link" && "Tạo link"}
                {t.key === "orders" && "Đơn hàng"}
                {t.key === "wallet" && "Ví tiền"}
                {t.key === "link-history" && "Lịch sử"}
                {t.key === "help" && "Hướng dẫn"}
                {t.key === "referral" && "Giới thiệu"}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
