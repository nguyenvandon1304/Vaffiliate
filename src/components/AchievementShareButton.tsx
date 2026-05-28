"use client";

import { useState } from "react";

interface BaseProps {
  username: string;
  displayName?: string;
  className?: string;
  variant?: "primary" | "secondary";
}

interface TierShareProps extends BaseProps {
  type: "tier";
  tier: "Bronze" | "Silver" | "Gold" | "VIP";
  cashbackPercent: number;
}

interface EarningsShareProps extends BaseProps {
  type: "earnings";
  amount: number;
}

interface AchievementShareProps extends BaseProps {
  type: "achievement";
  badgeName: string;
}

type Props = TierShareProps | EarningsShareProps | AchievementShareProps;

const SITE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://vaffiliate.vn";

/**
 * Achievement Share Button — sinh ảnh động + share lên FB/Zalo/Telegram + clipboard.
 *
 * Click → mở modal chọn nền tảng share.
 * Nếu trình duyệt hỗ trợ Web Share API native → share thẳng (mobile).
 */
export function AchievementShareButton(props: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build share image URL
  const params = new URLSearchParams({
    type: props.type,
    u: props.username,
    name: props.displayName || props.username,
  });
  if (props.type === "tier") {
    params.set("tier", props.tier);
    params.set("p", String(props.cashbackPercent));
  } else if (props.type === "earnings") {
    params.set("amount", String(props.amount));
  } else if (props.type === "achievement") {
    params.set("badge", props.badgeName);
  }

  const shareUrl = `${SITE_URL}/r/${props.username}`;
  const imageUrl = `${SITE_URL}/api/share-image?${params.toString()}`;

  let shareText = "";
  if (props.type === "tier") {
    shareText = `Tôi vừa lên hạng ${props.tier} tại V-Affiliate! Hoàn ${props.cashbackPercent}% mỗi đơn Shopee. Tham gia cùng tôi nhé:`;
  } else if (props.type === "earnings") {
    shareText = `Tôi đã tiết kiệm ${props.amount.toLocaleString("vi-VN")}đ với V-Affiliate. Mua sắm thông minh hơn — hoàn tiền 50% mỗi đơn Shopee:`;
  } else {
    shareText = `Tôi vừa nhận huy hiệu "${props.badgeName}" tại V-Affiliate. Tham gia cùng tôi để có hành trình mua sắm tiết kiệm:`;
  }

  const tryNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "V-Affiliate",
          text: shareText,
          url: shareUrl,
        });
        return true;
      } catch { /* user cancel */ }
    }
    return false;
  };

  const handleClick = async () => {
    // Try native share first (mobile)
    if (await tryNativeShare()) return;
    setOpen(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  const variant = props.variant ?? "primary";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 transition-all hover:scale-105 ${
          variant === "primary"
            ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-4 py-2 rounded-xl shadow-md shadow-orange-500/30"
            : "bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
        } ${props.className ?? ""}`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Khoe với bạn bè
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200/70 dark:border-zinc-700 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-gray-800 dark:text-zinc-100">
                Khoe thành tích với bạn bè
              </h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-gray-400"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Image preview */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-800 dark:to-zinc-900 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Preview ảnh share"
                className="w-full rounded-xl shadow-md aspect-[1200/630] object-cover bg-orange-100 dark:bg-zinc-800"
              />
            </div>

            {/* Share buttons */}
            <div className="p-4 grid grid-cols-2 gap-2">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2.5 rounded-lg transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" /></svg>
                Facebook
              </a>
              <a
                href={`https://zalo.me/share?u=${encodeURIComponent(shareUrl)}&t=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-2.5 rounded-lg transition-colors"
              >
                <span className="font-black">Z</span>
                Zalo
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-3 py-2.5 rounded-lg transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" /></svg>
                Telegram
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-2.5 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Đã copy
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy link
                  </>
                )}
              </button>
            </div>

            {/* Tip */}
            <div className="px-4 pb-4">
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 text-center leading-relaxed">
                💡 Mỗi bạn đăng ký qua link của bạn = +1 bạn active để bạn lên tier cao hơn,
                tăng cashback lên đến 58%!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
