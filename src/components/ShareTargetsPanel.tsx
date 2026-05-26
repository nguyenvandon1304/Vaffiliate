"use client";

import { useEffect, useState } from "react";

/**
 * Panel "Đăng vào group V-Affiliate" — workaround cho FB anti-spam.
 *
 * Chỉ hiển thị duy nhất 1 nút: bài viết ghim trong group V-Affiliate (do admin
 * cấu hình qua Settings). Mục đích:
 *   1. User chỉ đăng vào đúng group đã đăng ký với Shopee Affiliate
 *      → mới được nhận voucher social bonus từ Shopee.
 *   2. FB auto-link xanh trong group (dù domain mới) → link click được.
 *   3. Tăng traffic group + warm-up trust domain trên FB.
 *
 * UX trạng thái:
 *   - Trước khi user bấm COPY LINK: nút xám (disabled) + tip "Bấm COPY LINK trước".
 *   - Sau khi copy: nút sáng cam VĨNH VIỄN, không tắt — user click lúc nào cũng được.
 */

interface CommunityTarget {
  url: string;
  label: string;
  platform: string;
}

interface Props {
  hasCopied: boolean;
  /** Re-copy link trước khi mở tab — đảm bảo clipboard luôn có link mới nhất. */
  onCopyAgain: () => void;
}

export function ShareTargetsPanel({ hasCopied, onCopyAgain }: Props) {
  const [community, setCommunity] = useState<CommunityTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/share-targets/community", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.success && d.target) setCommunity(d.target);
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleOpen = () => {
    if (!community || !hasCopied) return;
    // Copy link 1 lần nữa cho chắc — phòng clipboard bị clear bởi user lúc browse.
    onCopyAgain();
    window.open(community.url, "_blank", "noopener,noreferrer");
    setOpened(true);
    setTimeout(() => setOpened(false), 3500);
  };

  // Không render gì nếu admin tắt feature (hoặc đang load).
  if (loading || !community) return null;

  return (
    <div className="border border-orange-200 bg-gradient-to-br from-orange-50/60 to-amber-50/40 rounded-xl p-3 mb-4">
      <button
        type="button"
        onClick={handleOpen}
        disabled={!hasCopied}
        title={hasCopied ? `Mở: ${community.label}` : "Bấm COPY LINK trước rồi quay lại đây"}
        className={`relative w-full text-left rounded-xl p-3.5 transition-all border-2 ${
          hasCopied
            ? "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white border-transparent shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-[1.01] cursor-pointer"
            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
        }`}
      >
        <span className={`absolute -top-2 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
          hasCopied ? "bg-white text-orange-600 shadow" : "bg-gray-200 text-gray-500"
        }`}>
          ⭐ Khuyên dùng
        </span>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
            hasCopied ? "bg-white/20" : "bg-gray-200"
          }`}>
            📌
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${
              hasCopied ? "text-white/80" : "text-gray-400"
            }`}>
              Cộng đồng V-Affiliate
            </p>
            <p className={`text-sm font-bold truncate ${hasCopied ? "text-white" : "text-gray-500"}`}>
              {opened ? "✓ Đã mở — paste link Shopee vào comment!" : community.label}
            </p>
          </div>
          <svg viewBox="0 0 24 24" className={`w-5 h-5 shrink-0 ${hasCopied ? "text-white/80" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17l9.2-9.2M17 17V7H7" />
          </svg>
        </div>
      </button>

      {/* Tip dưới nút — text contrast cao, đọc rõ trên cả light/dark mode. */}
      {hasCopied ? (
        <p className="text-xs text-gray-600 mt-2.5 px-1 leading-relaxed text-center">
          💡 Sau khi mở: kéo xuống ô bình luận → paste link → đăng.
        </p>
      ) : (
        <p className="text-xs text-orange-600 mt-2.5 text-center font-semibold">
          Tip: Bấm <span className="font-bold underline decoration-orange-400 underline-offset-2">COPY LINK</span> trước, rồi click nút trên để mở bài viết.
        </p>
      )}
    </div>
  );
}
