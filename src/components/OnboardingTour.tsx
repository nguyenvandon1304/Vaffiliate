"use client";

import { useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/Confetti";

const STORAGE_KEY = "onboarding_done";

interface Step {
  emoji: string;
  title: string;
  description: string;
  highlight?: string;
  /** CSS selector tới element cần spotlight. Nếu không có → modal centered. */
  targetSelector?: string;
  /** Callback khi user vào step này — vd. scroll target vào view. */
  onEnter?: () => void;
}

const STEPS: Step[] = [
  {
    emoji: "👋",
    title: "Chào bạn đến với V-Affiliate!",
    description: "Hệ thống hoàn tiền 50-58% từ Shopee dành riêng cho bạn. Cùng khám phá nhanh các tính năng chính nhé.",
  },
  {
    emoji: "🔗",
    title: "Tạo link hoàn tiền",
    description: "Dán link sản phẩm Shopee vào tab Tạo link → hệ thống tạo link riêng cho bạn → bạn mua qua link đó là tự động hoàn tiền.",
    highlight: "Tạo link",
    targetSelector: "[data-onboard='create-link']",
  },
  {
    emoji: "💰",
    title: "Ví của bạn",
    description: "Tiền hoàn về sẽ vào ví. Đủ 50.000đ là rút về ngân hàng được. Có cả lịch sử giao dịch chi tiết nữa.",
    highlight: "Ví tiền",
    targetSelector: "[data-onboard='wallet']",
  },
  {
    emoji: "🤝",
    title: "Mời bạn bè — nhân thưởng",
    description: "Mỗi người bạn mời thành công, bạn lên hạng nhanh hơn. Bronze → Silver → Gold → VIP với cashback lên đến 58%.",
    highlight: "Giới thiệu",
    targetSelector: "[data-onboard='referral']",
  },
  {
    emoji: "🎰",
    title: "Vòng quay may mắn",
    description: "Mỗi 10 đơn cashback hoặc mời 5 bạn = 1 lượt quay miễn phí. Cơ hội nhận tiền thưởng đến 50.000đ mỗi lượt!",
    highlight: "Vòng quay",
  },
  {
    emoji: "🎉",
    title: "Sẵn sàng rồi!",
    description: "Hoàn tất hướng dẫn — bạn vừa nhận được +1 lượt quay miễn phí làm phần thưởng. Bắt đầu tiết kiệm ngay nào!",
  },
];

/** Bounding rect của target element + buffer padding cho spotlight. */
interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function useTargetRect(selector?: string): SpotlightRect | null {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!selector) {
      queueMicrotask(() => setRect(null));
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(selector);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      // Add 8px padding around target
      setRect({
        top: r.top - 8,
        left: r.left - 8,
        width: r.width + 16,
        height: r.height + 16,
      });
    };

    // Try multiple times in case target not yet mounted
    const ids: number[] = [];
    [50, 200, 500].forEach((delay) => {
      ids.push(window.setTimeout(updateRect, delay));
    });

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [selector]);

  return rect;
}

/** Spotlight overlay — backdrop với "lỗ" sáng quanh target. */
function SpotlightOverlay({ rect }: { rect: SpotlightRect | null }) {
  if (!rect) {
    return <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />;
  }
  // SVG mask cắt 1 lỗ rounded rect.
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      <defs>
        <mask id="spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={rect.left}
            y={rect.top}
            width={rect.width}
            height={rect.height}
            rx={16}
            ry={16}
            fill="black"
          />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#spotlight-mask)" />
      {/* Glow ring around target */}
      <rect
        x={rect.left}
        y={rect.top}
        width={rect.width}
        height={rect.height}
        rx={16}
        ry={16}
        fill="none"
        stroke="#fb923c"
        strokeWidth="3"
        strokeDasharray="6 3"
        className="animate-pulse"
        style={{ filter: "drop-shadow(0 0 12px #fb923c)" }}
      />
    </svg>
  );
}

/**
 * Onboarding tour với spotlight effect + confetti reward.
 * - Bước 1, cuối: modal centered (không spotlight)
 * - Bước giữa: spotlight target + tooltip cạnh element
 * - Hoàn tất: confetti burst
 */
export function OnboardingTour({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const closedRef = useRef(false);

  const current = STEPS[step];
  const targetRect = useTargetRect(current.targetSelector);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Trigger onEnter for current step + auto-scroll target into view
  useEffect(() => {
    if (current.onEnter) current.onEnter();
    if (current.targetSelector) {
      const el = document.querySelector(current.targetSelector);
      if (el) {
        // smooth scroll target into center
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [step, current]);

  const close = (completed = false) => {
    if (closedRef.current) return;
    closedRef.current = true;

    if (completed) {
      // Fire confetti burst before fadeout
      setConfetti(true);
      window.setTimeout(() => setClosing(true), 1500);
      window.setTimeout(() => {
        try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
        setVisible(false);
        onComplete?.();
      }, 2200);
    } else {
      setClosing(true);
      try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
      window.setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 200);
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close(true);
  };
  const prev = () => { if (step > 0) setStep(step - 1); };

  if (!visible) return null;

  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const hasSpotlight = !!targetRect;

  // Compute tooltip position when spotlight active.
  // Place tooltip above target if there's space, else below.
  let tooltipStyle: React.CSSProperties = {};
  if (hasSpotlight && targetRect) {
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      // Mobile: bottom sheet style
      tooltipStyle = {
        position: "fixed",
        bottom: "max(1rem, env(safe-area-inset-bottom, 0))",
        left: "1rem",
        right: "1rem",
      };
    } else {
      // Desktop: place near target
      const above = targetRect.top > 200;
      tooltipStyle = above
        ? {
            position: "fixed",
            top: targetRect.top - 16,
            left: Math.max(16, Math.min(window.innerWidth - 380, targetRect.left + targetRect.width / 2 - 180)),
            transform: "translateY(-100%)",
          }
        : {
            position: "fixed",
            top: targetRect.top + targetRect.height + 16,
            left: Math.max(16, Math.min(window.innerWidth - 380, targetRect.left + targetRect.width / 2 - 180)),
          };
    }
  }

  return (
    <>
      {confetti && <Confetti count={120} onDone={() => setConfetti(false)} />}
      <div
        className={`fixed inset-0 z-[110] transition-opacity duration-200 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        {/* Backdrop with optional spotlight */}
        <div className="absolute inset-0" onClick={() => close(false)}>
          <SpotlightOverlay rect={targetRect} />
        </div>

        {/* Tooltip / Modal */}
        <div
          className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-700 overflow-hidden transition-all duration-300 ${
            closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
          } ${hasSpotlight ? "" : "mx-auto mt-[20vh] max-w-sm"}`}
          style={hasSpotlight ? { ...tooltipStyle, width: "min(360px, calc(100vw - 2rem))" } : { maxWidth: "20rem" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Skip button góc trên phải */}
          <button
            onClick={() => close(false)}
            className="absolute top-2 right-2 z-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-[11px] font-medium bg-white/80 dark:bg-zinc-800/80 backdrop-blur px-2 py-0.5 rounded-full"
            aria-label="Bỏ qua hướng dẫn"
          >
            Bỏ qua ✕
          </button>

          {/* Hero — emoji + gradient bg */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 px-4 py-4 text-center">
            <div className="text-4xl sm:text-5xl animate-bounce-once" key={step}>
              {current.emoji}
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-5 py-3 sm:py-4">
            <h2 id="onboarding-title" className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1.5 text-center break-words">
              {current.title}
            </h2>
            <p className="text-[13px] sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-center break-words">
              {current.description}
            </p>

            {current.highlight && (
              <div className="mt-2.5 text-center">
                <span className="inline-block bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  💡 Bấm vào icon &quot;{current.highlight}&quot; trên thanh điều hướng
                </span>
              </div>
            )}

            {/* Reward badge — show on last step */}
            {isLast && (
              <div className="mt-3 mx-auto max-w-xs rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-500/[0.08] dark:to-yellow-500/[0.06] p-3 text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  Phần thưởng
                </p>
                <p className="mt-1 text-sm font-black text-gray-800 dark:text-zinc-100">
                  🎁 +1 lượt vòng quay may mắn
                </p>
                <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                  Quay ngay sau khi hoàn tất tour!
                </p>
              </div>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 pb-1">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-orange-500"
                    : i < step
                      ? "w-1.5 bg-orange-300"
                      : "w-1.5 bg-gray-200 dark:bg-gray-700"
                }`}
                aria-label={`Bước ${i + 1}`}
              />
            ))}
          </div>

          {/* Footer buttons */}
          <div className="px-4 sm:px-5 pb-4 pt-2 flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={prev}
                className="flex-1 px-2.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors whitespace-nowrap"
              >
                ← Quay lại
              </button>
            )}
            <button
              onClick={next}
              className={`px-3 py-2 text-xs sm:text-sm font-bold text-white rounded-lg transition-all shadow-sm hover:shadow-md whitespace-nowrap ${
                isLast
                  ? "flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                  : isFirst
                    ? "flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    : "flex-1 bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {isLast ? "🎁 Nhận thưởng — Hoàn tất!" : isFirst ? "Bắt đầu khám phá →" : "Tiếp theo →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Hook tự kiểm tra localStorage + render onboarding tour nếu chưa thấy lần nào.
 */
export function useOnboarding() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        const id = window.setTimeout(() => setShouldShow(true), 800);
        return () => window.clearTimeout(id);
      }
    } catch { /* localStorage bị chặn — bỏ qua */ }
  }, []);

  return shouldShow ? <OnboardingTour onComplete={() => setShouldShow(false)} /> : null;
}
