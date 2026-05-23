"use client";

import { Suspense } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";

/**
 * Wrapper client cho mọi trang `/dashboard/*` — render children + bottom nav mobile.
 * Suspense bọc nav vì component dùng useSearchParams (Next yêu cầu).
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </>
  );
}
