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
  { key: "referral", title: "Giới thiệu", href: "/dashboard/referral" },
];

const ICONS: Record<TabKey, React.ComponentType<{ active?: boolean; size?: number }>> = {
  overview: GridIcon3D,
  "create-link": LinkIcon3D,
  orders: OrdersIcon3D,
  wallet: WalletIcon3D,
  "link-history": ClockIcon3D,
  help: HelpIcon3D,
  referral: ReferralIcon3D,
};

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
    <nav className="hidden md:flex items-center gap-0.5">
      {TABS.map((t) => {
        const active = isActive(t.key);
        const Icon = ICONS[t.key];
        return (
          <button
            key={t.key}
            onClick={() => router.push(t.href)}
            className={`nav-bubble group relative inline-flex items-center justify-center rounded-xl transition-all duration-200 ${
              active
                ? "bg-orange-500/10 shadow-sm"
                : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            data-active={active ? "true" : "false"}
            title={t.title}
          >
            <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${
              active
                ? "scale-110"
                : "group-hover:scale-105"
            }`}>
              <Icon active={active} size={28} />
            </div>
          </button>
        );
      })}
    </nav>
  );
}
