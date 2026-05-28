"use client";

/**
 * Skeleton primitives — placeholder hiển thị shape page trong khi đang loading.
 * Dùng thay full-page spinner cho UX feel fast hơn nhiều lần.
 */

interface BoxProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Skeleton box cơ bản — animate-pulse với màu phù hợp light + dark. */
export function SkeletonBox({ className = "", style }: BoxProps) {
  return (
    <div
      className={`bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse ${className}`}
      style={style}
    />
  );
}

/** Dashboard overview skeleton — match layout thật. */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <SkeletonBox className="w-32 h-8" />
          <div className="flex items-center gap-3">
            <SkeletonBox className="w-9 h-9 rounded-full" />
            <SkeletonBox className="w-9 h-9 rounded-full" />
            <SkeletonBox className="w-9 h-9 rounded-full" />
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stat cards row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
              <SkeletonBox className="w-6 h-6 mb-3" />
              <SkeletonBox className="w-2/3 h-3 mb-2" />
              <SkeletonBox className="w-1/2 h-6" />
            </div>
          ))}
        </div>

        {/* Tier hero */}
        <div className="rounded-3xl border border-gray-200 dark:border-zinc-700 p-6">
          <div className="flex items-start gap-4">
            <SkeletonBox className="w-16 h-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <SkeletonBox className="w-1/3 h-3" />
              <SkeletonBox className="w-2/3 h-8" />
              <SkeletonBox className="w-1/2 h-4" />
            </div>
          </div>
          <SkeletonBox className="w-full h-2 mt-4 rounded-full" />
        </div>

        {/* Welcome banner */}
        <SkeletonBox className="w-full h-32 rounded-2xl" />

        {/* Activity chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 p-5">
          <SkeletonBox className="w-1/4 h-4 mb-4" />
          <SkeletonBox className="w-full h-40" />
        </div>
      </main>
    </div>
  );
}

/** Admin dashboard skeleton. */
export function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="hidden lg:block w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <SkeletonBox className="w-full h-12 mb-4" />
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <SkeletonBox key={i} className="w-full h-10" />
        ))}
      </aside>
      {/* Main */}
      <main className="flex-1 p-6 space-y-6">
        <SkeletonBox className="w-1/3 h-7" />
        {/* Live status bar */}
        <div className="flex gap-3">
          <SkeletonBox className="w-32 h-8 rounded-full" />
          <SkeletonBox className="w-40 h-8" />
        </div>
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <SkeletonBox className="w-6 h-6 mb-2" />
              <SkeletonBox className="w-2/3 h-3 mb-2" />
              <SkeletonBox className="w-1/2 h-7" />
            </div>
          ))}
        </div>
        {/* Activity feed */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <SkeletonBox className="w-1/3 h-5 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonBox className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <SkeletonBox className="w-3/4 h-4" />
                  <SkeletonBox className="w-1/4 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Single page skeleton — generic for /referral, /spin, /security, etc. */
export function PageSkeleton({ withHero = true }: { withHero?: boolean }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="bg-white/80 dark:bg-zinc-900/80 border-b border-gray-200 dark:border-zinc-800 h-14 flex items-center px-4">
        <SkeletonBox className="w-32 h-7" />
      </div>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {withHero && <SkeletonBox className="w-full h-48 rounded-3xl" />}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-700 p-5 space-y-3">
          <SkeletonBox className="w-1/3 h-5" />
          <SkeletonBox className="w-full h-4" />
          <SkeletonBox className="w-2/3 h-4" />
          <SkeletonBox className="w-3/4 h-4" />
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-700 p-5">
          <SkeletonBox className="w-1/4 h-5 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonBox className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <SkeletonBox className="w-2/3 h-3" />
                  <SkeletonBox className="w-1/3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Spin wheel page skeleton. */
export function SpinSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-50 dark:from-zinc-950 dark:to-black">
      <div className="bg-white/80 dark:bg-zinc-900/80 border-b border-gray-200 dark:border-zinc-800 h-14 flex items-center px-4">
        <SkeletonBox className="w-32 h-7" />
      </div>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-3">
          <SkeletonBox className="w-1/2 h-9 mx-auto" />
          <SkeletonBox className="w-1/3 h-4 mx-auto" />
        </div>
        {/* Wheel placeholder circle */}
        <SkeletonBox className="w-72 h-72 mx-auto rounded-full" />
        {/* Spin button */}
        <SkeletonBox className="w-1/2 h-12 mx-auto rounded-full" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBox className="w-full h-24 rounded-xl" />
          <SkeletonBox className="w-full h-24 rounded-xl" />
        </div>
      </main>
    </div>
  );
}
