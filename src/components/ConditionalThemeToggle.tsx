"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Wrapper bọc ThemeToggle floating — ẨN khi user ở route mà page có sẵn
 * theme toggle inline (vd. /admin có nút trong header + sidebar).
 *
 * Tránh:
 *   1. Duplicate (2 toggle cùng visible).
 *   2. Floating button đè lên action buttons (vd. "+ Block IP", "Refresh").
 */
const HIDE_ON_PATHS = [
  "/admin",       // admin đã có toggle inline trong header + sidebar
  "/dashboard",   // dashboard đã có toggle trong header
];

export function ConditionalThemeToggle() {
  const pathname = usePathname() || "";
  const shouldHide = HIDE_ON_PATHS.some((p) => pathname.startsWith(p));
  if (shouldHide) return null;
  return <ThemeToggle />;
}
