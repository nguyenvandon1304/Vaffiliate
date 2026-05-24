"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";

interface WishlistItem {
  id: number;
  shop_id: string;
  item_id: string;
  product_name: string;
  product_image: string | null;
  product_link: string;
  initial_price: number;
  current_price: number;
  lowest_price: number;
  commission_rate: string | null;
  last_checked_at: string;
  created_at: string;
  priceChangePercent: number;
  stale: boolean;
}

function formatVND(n: number) {
  if (!n) return "—";
  return n.toLocaleString("vi-VN") + "đ";
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "vừa xong";
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`;
  return `${Math.floor(sec / 86400)} ngày trước`;
}

export default function WishlistPage() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reload = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const url = refresh ? "/api/wishlist?refresh=1" : "/api/wishlist";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        if (data.refreshed) {
          const { updated, dropped } = data.refreshed;
          if (updated > 0) {
            toast.success(`Đã cập nhật giá ${updated} sản phẩm${dropped > 0 ? ` (${dropped} giảm giá!)` : ""}`);
          } else if (refresh) {
            toast.info("Tất cả sản phẩm đã có giá mới nhất");
          }
        }
      } else if (res.status === 401) {
        router.push("/");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState sau await
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy mount
  }, []);

  const handleAdd = async () => {
    if (!newUrl.trim()) {
      inputRef.current?.focus();
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã thêm vào wishlist");
        setNewUrl("");
        void reload();
      } else {
        toast.error(data.error || "Không thể thêm");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: number, name: string) => {
    if (!confirm(`Bỏ khỏi wishlist: ${name}?`)) return;
    const res = await fetch(`/api/wishlist?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Đã bỏ khỏi wishlist");
    } else {
      toast.error(data.error || "Lỗi");
    }
  };

  const handleBuy = async (productLink: string) => {
    // Tạo affiliate link qua /api/affiliate (đã có sẵn)
    try {
      const res = await fetch("/api/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productLink }),
      });
      const data = await res.json();
      if (data.success && data.product?.affiliateLink) {
        window.open(data.product.affiliateLink, "_blank", "noopener,noreferrer");
      } else {
        // Fallback: mở link gốc
        window.open(productLink, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open(productLink, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-gray-50 to-gray-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="cursor-pointer" title="Về trang chủ">
            <CaffiliateLogo />
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 dark:text-zinc-400 font-medium transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-rose-500 to-fuchsia-500 bg-clip-text text-transparent">
            ❤️ Wishlist của tôi
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Lưu sản phẩm Shopee — app tự theo dõi giá và báo bạn khi giảm
          </p>
        </div>

        {/* Add form */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Dán link sản phẩm Shopee..."
              className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-500/20 outline-none transition-all"
              disabled={adding}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newUrl.trim()}
              className="bg-gradient-to-r from-rose-500 to-fuchsia-500 hover:from-rose-600 hover:to-fuchsia-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-md shadow-rose-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? "..." : "+ Thêm"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-2">
            💡 Hỗ trợ link Shopee thường, link rút gọn (s.shopee.vn), link share từ app
          </p>
        </div>

        {/* List header + refresh */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-zinc-400">
            {items.length === 0 ? "Chưa có sản phẩm nào" : `${items.length} sản phẩm đang theo dõi`}
          </h2>
          {items.length > 0 && (
            <button
              onClick={() => reload(true)}
              disabled={refreshing}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-rose-400 hover:text-rose-500 transition-colors disabled:opacity-50"
              title="Cập nhật giá mới nhất"
            >
              {refreshing ? "🔄 Đang cập nhật..." : "🔄 Cập nhật giá"}
            </button>
          )}
        </div>

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm py-12 text-center">
            <div className="text-6xl mb-3">🛍️</div>
            <p className="text-sm font-semibold text-gray-700 dark:text-zinc-200 mb-1">
              Wishlist của bạn trống
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Dán link sản phẩm Shopee ở trên để bắt đầu theo dõi giá
            </p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-20 h-20 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Items list */}
        <div className="space-y-3">
          {items.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onRemove={() => handleRemove(item.id, item.product_name)}
              onBuy={() => handleBuy(item.product_link)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function WishlistCard({
  item,
  onRemove,
  onBuy,
}: {
  item: WishlistItem;
  onRemove: () => void;
  onBuy: () => void;
}) {
  const isPriceDrop = item.priceChangePercent < 0;
  const isPriceUp = item.priceChangePercent > 0;
  const isLowestNow = item.current_price === item.lowest_price && item.current_price > 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-3 p-3">
        {/* Image */}
        <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 relative">
          {item.product_image ? (
            // eslint-disable-next-line @next/next/no-img-element -- Shopee CDN, no need for next/image
            <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
          )}
          {isPriceDrop && (
            <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              -{Math.abs(item.priceChangePercent)}%
            </span>
          )}
          {isLowestNow && !isPriceDrop && (
            <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              ⬇ THẤP NHẤT
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-100 line-clamp-2 mb-1">
            {item.product_name}
          </h3>
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-base font-bold ${isPriceDrop ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"}`}>
              {formatVND(item.current_price)}
            </span>
            {isPriceDrop && (
              <span className="text-xs text-gray-400 dark:text-zinc-500 line-through">
                {formatVND(item.initial_price)}
              </span>
            )}
            {isPriceUp && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400">
                +{item.priceChangePercent}%
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 dark:text-zinc-500">
            {item.commission_rate && (
              <span>💰 Hoa hồng: {item.commission_rate}</span>
            )}
            {item.lowest_price > 0 && item.lowest_price < item.initial_price && (
              <span>📉 Thấp nhất: {formatVND(item.lowest_price)}</span>
            )}
            <span>🕒 Cập nhật {timeAgo(item.last_checked_at)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex items-center gap-2">
        <button
          onClick={onBuy}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-all active:scale-95"
        >
          <span>🛒</span>
          MUA NGAY (hoàn tiền)
        </button>
        <button
          onClick={onRemove}
          className="text-xs font-medium px-3 py-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Bỏ khỏi wishlist"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
