"use client";

import { Suspense } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CommandBar, useCommandBar } from "@/components/CommandBar";

/**
 * Wrapper client cho mọi trang `/dashboard/*` — render children + bottom nav mobile.
 * Suspense bọc nav vì component dùng useSearchParams (Next yêu cầu).
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { open, close } = useCommandBar();

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
      <CommandBar open={open} onClose={close} />
    </>
  );
}
