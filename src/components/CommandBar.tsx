"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface CommandItem {
  id: string;
  /** Hiển thị (có thể có icon emoji prefix). */
  label: string;
  /** Mô tả phụ. */
  description?: string;
  /** Group label. */
  group: "Điều hướng" | "Tài khoản" | "Hành động" | "Cài đặt";
  /** Keyword để fuzzy match (lowercase, không dấu). */
  keywords?: string;
  /** Action: navigate hoặc custom callback. */
  href?: string;
  onAction?: () => void;
  /** Icon emoji. */
  icon: string;
  /** Phím tắt hiển thị bên phải (vd. "G then D"). */
  shortcut?: string;
}

/**
 * Strip Vietnamese diacritics for case-insensitive search.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
}

/** Fuzzy score: 0 = không match, cao hơn = match tốt hơn. */
function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 1;
  const h = normalize(haystack);
  const n = normalize(needle);
  if (h.includes(n)) {
    // Match đầu chuỗi tốt hơn match giữa
    const idx = h.indexOf(n);
    return 100 - idx;
  }
  // Subsequence match (gõ "ddh" match "Đơn Đặt Hàng")
  let score = 0;
  let hi = 0;
  for (const c of n) {
    const found = h.indexOf(c, hi);
    if (found === -1) return 0;
    score += found - hi === 0 ? 5 : 1;
    hi = found + 1;
  }
  return score;
}

interface Props {
  /** Có open hay không (controlled). */
  open: boolean;
  onClose: () => void;
}

export function CommandBar({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Build command list — memoize để tránh re-create mỗi render.
  const commands: CommandItem[] = useMemo(
    () => [
      // Điều hướng
      {
        id: "nav-overview", group: "Điều hướng", icon: "🏠",
        label: "Tổng quan", description: "Xem dashboard chính",
        href: "/dashboard", keywords: "home overview tong quan dashboard",
      },
      {
        id: "nav-create-link", group: "Điều hướng", icon: "🔗",
        label: "Tạo link hoàn tiền", description: "Công cụ cashback Shopee",
        href: "/dashboard/cashback", keywords: "create link cashback hoan tien",
      },
      {
        id: "nav-orders", group: "Điều hướng", icon: "📦",
        label: "Đơn hàng của tôi", description: "Xem trạng thái + cashback",
        href: "/dashboard?tab=orders", keywords: "orders don hang",
      },
      {
        id: "nav-wallet", group: "Điều hướng", icon: "💳",
        label: "Ví tiền", description: "Số dư + rút tiền",
        href: "/dashboard?tab=wallet", keywords: "wallet vi tien rut tien",
      },
      {
        id: "nav-history", group: "Điều hướng", icon: "🕒",
        label: "Lịch sử link", description: "Tất cả link đã tạo",
        href: "/dashboard?tab=link-history", keywords: "history lich su link",
      },
      {
        id: "nav-help", group: "Điều hướng", icon: "📖",
        label: "Hướng dẫn", description: "5 bước bắt đầu",
        href: "/dashboard/help", keywords: "huong dan help guide",
      },
      {
        id: "nav-referral", group: "Điều hướng", icon: "🤝",
        label: "Giới thiệu bạn bè", description: "Mời nhận thưởng + tier",
        href: "/dashboard/referral", keywords: "referral gioi thieu ban be invite",
      },
      {
        id: "nav-spin", group: "Điều hướng", icon: "🎰",
        label: "Vòng quay may mắn", description: "Đổi lượt từ đơn hàng & mời bạn",
        href: "/dashboard/spin", keywords: "spin vong quay luck",
      },
      {
        id: "nav-wishlist", group: "Điều hướng", icon: "❤️",
        label: "Wishlist", description: "Theo dõi giá Shopee",
        href: "/dashboard/wishlist", keywords: "wishlist yeu thich gia",
      },

      // Tài khoản
      {
        id: "acc-security", group: "Tài khoản", icon: "🔐",
        label: "Bảo mật", description: "Đổi mật khẩu, 2FA, sessions",
        href: "/dashboard/security", keywords: "security bao mat password 2fa",
      },
      {
        id: "acc-bank", group: "Tài khoản", icon: "🏦",
        label: "Tài khoản ngân hàng", description: "Quản lý ngân hàng để rút",
        href: "/dashboard?tab=wallet&view=bank", keywords: "bank ngan hang account",
      },

      // Hành động
      {
        id: "act-create-link", group: "Hành động", icon: "✨",
        label: "Tạo link mới ngay", description: "Mở công cụ cashback",
        href: "/dashboard/cashback", keywords: "create new link tao moi",
      },
      {
        id: "act-withdraw", group: "Hành động", icon: "💸",
        label: "Rút tiền", description: "Mở wizard rút tiền",
        href: "/dashboard?tab=wallet&action=withdraw", keywords: "withdraw rut tien",
      },
      {
        id: "act-share-ref", group: "Hành động", icon: "📤",
        label: "Chia sẻ link giới thiệu", description: "Mời bạn bè tham gia",
        href: "/dashboard/referral", keywords: "share refer chia se",
      },
    ],
    [],
  );

  // Filter + sort by fuzzy score
  const filtered = useMemo(() => {
    if (!query) return commands;
    return commands
      .map((c) => ({
        c,
        score: Math.max(
          fuzzyScore(c.label, query),
          fuzzyScore(c.keywords ?? "", query),
          fuzzyScore(c.description ?? "", query),
        ),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);
  }, [commands, query]);

  // Group filtered items
  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Focus input when open
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    // Reset state when opening — defer setState to avoid cascading-render warning
    queueMicrotask(() => {
      setQuery("");
      setActiveIdx(0);
    });
    // Block body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Reset activeIdx when query changes
  useEffect(() => {
    queueMicrotask(() => setActiveIdx(0));
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLButtonElement>("[data-cmd-item]");
    items[activeIdx]?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const handleSelect = (item: CommandItem) => {
    onClose();
    if (item.onAction) {
      item.onAction();
      return;
    }
    if (item.href) {
      router.push(item.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIdx];
      if (item) handleSelect(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-20 sm:pt-32 px-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-gray-200/70 dark:border-zinc-700 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400 dark:text-zinc-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Gõ để tìm trang, hành động..."
            className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-zinc-200">
                Không tìm thấy &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Thử từ khoá khác — vd. &quot;wallet&quot;, &quot;cashback&quot;, &quot;rut tien&quot;
              </p>
            </div>
          ) : (
            (() => {
              let runningIdx = 0;
              return groups.map(([group, items]) => (
                <div key={group} className="mb-1">
                  <p className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                    {group}
                  </p>
                  {items.map((item) => {
                    const myIdx = runningIdx++;
                    const active = myIdx === activeIdx;
                    return (
                      <button
                        key={item.id}
                        data-cmd-item
                        type="button"
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setActiveIdx(myIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          active
                            ? "bg-orange-500 text-white"
                            : "text-gray-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                        }`}
                      >
                        <span className={`shrink-0 text-lg ${active ? "" : ""}`}>{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${active ? "text-white" : "text-gray-800 dark:text-zinc-100"}`}>
                            {item.label}
                          </p>
                          {item.description && (
                            <p className={`text-[11px] truncate ${active ? "text-white/80" : "text-gray-500 dark:text-zinc-500"}`}>
                              {item.description}
                            </p>
                          )}
                        </div>
                        {active && (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              ));
            })()
          )}
        </div>

        {/* Footer with hints */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-900/60 text-[11px] text-gray-500 dark:text-zinc-500">
          <span className="inline-flex items-center gap-2">
            <kbd className="font-mono font-bold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded px-1 py-0.5">↑↓</kbd>
            điều hướng
          </span>
          <span className="inline-flex items-center gap-2">
            <kbd className="font-mono font-bold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded px-1 py-0.5">↵</kbd>
            chọn
          </span>
          <span className="inline-flex items-center gap-2">
            <kbd className="font-mono font-bold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded px-1 py-0.5">esc</kbd>
            đóng
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook quản lý global Cmd+K shortcut. Trả về open/setOpen + element trigger.
 * Mount once ở DashboardShell hoặc cao hơn.
 */
export function useCommandBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K (Mac) hoặc Ctrl+K (Windows)
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen, close: () => setOpen(false) };
}

/**
 * Trigger button — hiện trong header. Click hoặc Cmd+K để open.
 */
export function CommandBarTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Tìm kiếm nhanh (Ctrl+K)"
      className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 transition-colors text-xs text-gray-500 dark:text-zinc-400"
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span>Tìm kiếm...</span>
      <kbd className="ml-2 font-mono font-bold text-[10px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded px-1.5 py-0.5">
        Ctrl K
      </kbd>
    </button>
  );
}
