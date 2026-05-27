"use client";

import { useEffect, useRef, useState } from "react";

interface ShareMenuProps {
  /** Link để chia sẻ. */
  url: string;
  /** Message kèm link. */
  text?: string;
  /** Ẩn icon copy ở đầu danh sách (mặc định hiện). */
  hideCopy?: boolean;
  /** Trigger button content. */
  children?: React.ReactNode;
  /** Class on the trigger. */
  buttonClass?: string;
  /** Callback khi copy thành công. */
  onCopied?: () => void;
}

interface SharePlatform {
  name: string;
  icon: React.ReactNode;
  color: string; // bg color hover
  buildUrl: (link: string, text: string) => string;
}

const PLATFORMS: SharePlatform[] = [
  {
    name: "Zalo",
    color: "hover:bg-blue-50 dark:hover:bg-blue-500/10",
    icon: (
      <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-black">
        Z
      </div>
    ),
    buildUrl: (link, _text) => `https://zalo.me/share?u=${encodeURIComponent(link)}`,
  },
  {
    name: "Messenger",
    color: "hover:bg-blue-50 dark:hover:bg-blue-500/10",
    icon: (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.04 2 11.04c0 2.81 1.42 5.32 3.66 6.97V22l3.34-1.83c.89.25 1.83.38 2.8.38 5.52 0 10-4.04 10-9.04S17.52 2 12 2zm.99 12.16l-2.55-2.72-4.97 2.72 5.46-5.8 2.61 2.72 4.91-2.72-5.46 5.8z" />
        </svg>
      </div>
    ),
    buildUrl: (link, _text) => `https://www.facebook.com/dialog/send?app_id=140586622674265&link=${encodeURIComponent(link)}&redirect_uri=${encodeURIComponent(link)}`,
  },
  {
    name: "Facebook",
    color: "hover:bg-indigo-50 dark:hover:bg-indigo-500/10",
    icon: (
      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
        </svg>
      </div>
    ),
    buildUrl: (link, text) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(text)}`,
  },
  {
    name: "Telegram",
    color: "hover:bg-sky-50 dark:hover:bg-sky-500/10",
    icon: (
      <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
          <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
        </svg>
      </div>
    ),
    buildUrl: (link, text) => `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
  },
];

export function ShareMenu({ url, text = "Tham gia V-Affiliate cùng mình để hoàn tiền cho mỗi đơn Shopee!", hideCopy, children, buttonClass = "", onCopied }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close khi click ngoài + ESC
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  const shareTo = (platform: SharePlatform) => {
    const shareUrl = platform.buildUrl(url, text);
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=600");
    setOpen(false);
  };

  // Native share API trên mobile
  const tryNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url, text });
        setOpen(false);
        return true;
      } catch { /* user cancelled */ }
    }
    return false;
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={async () => {
          // Mobile: try native share first
          if (await tryNativeShare()) return;
          setOpen(!open);
        }}
        className={buttonClass}
      >
        {children ?? (
          <span className="inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Chia sẻ
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-xl backdrop-blur-md p-2 animate-tier-card-in">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 px-3 py-2">
            Chia sẻ qua
          </p>

          {!hideCopy && (
            <button
              type="button"
              onClick={copyToClipboard}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white">
                {copied ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">
                  {copied ? "Đã sao chép!" : "Sao chép link"}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                  Dán nơi nào bạn thích
                </p>
              </div>
            </button>
          )}

          <div className="h-px bg-gray-100 dark:bg-zinc-800 my-1.5 mx-3" />

          <div className="grid grid-cols-1 gap-0.5">
            {PLATFORMS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => shareTo(p)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${p.color}`}
              >
                {p.icon}
                <span className="text-sm font-semibold text-gray-800 dark:text-zinc-100">{p.name}</span>
                <svg viewBox="0 0 24 24" className="ml-auto w-4 h-4 text-gray-300 dark:text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
