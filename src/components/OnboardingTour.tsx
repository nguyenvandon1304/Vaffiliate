"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "onboarding_done";

interface Step {
  emoji: string;
  title: string;
  description: string;
  highlight?: string;
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
    description: "Dán link sản phẩm Shopee vào tab \"Hoàn tiền\" → hệ thống tạo link riêng → bạn mua qua link đó là tự động hoàn tiền.",
    highlight: "Hoàn tiền",
  },
  {
    emoji: "💰",
    title: "Ví của bạn",
    description: "Tiền hoàn về sẽ vào ví trong tab \"Tài khoản\". Đủ 50.000đ là bạn rút về ngân hàng được.",
    highlight: "Tài khoản",
  },
  {
    emoji: "🤝",
    title: "Mời bạn bè — nhân thưởng",
    description: "Mỗi người bạn mời thành công, bạn lên hạng nhanh hơn. Bronze → Silver → Gold → VIP với cashback lên đến 58%.",
    highlight: "Mời bạn",
  },
  {
    emoji: "🎉",
    title: "Sẵn sàng rồi!",
    description: "Bắt đầu mua sắm thông minh và nhận tiền hoàn ngay hôm nay. Chúc bạn shopping vui vẻ!",
  },
];

/**
 * Onboarding tour 5 bước cho user mới đăng nhập lần đầu.
 * Hiện 1 lần duy nhất, lưu localStorage để không hiện lại.
 *
 * Trigger: tự động mount khi component được render. User có thể skip bất kỳ
 * lúc nào hoặc đi từng bước qua nút Tiếp theo / Quay lại.
 */
export function OnboardingTour({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const close = () => {
    setClosing(true);
    try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    window.setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 200);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  };

  const prev = () => { if (step > 0) setStep(step - 1); };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div
      className={`fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 transition-opacity duration-200 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      style={{
        paddingTop: "max(env(safe-area-inset-top), 0.75rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
        paddingLeft: "max(env(safe-area-inset-left), 0.75rem)",
        paddingRight: "max(env(safe-area-inset-right), 0.75rem)",
      }}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto overflow-x-hidden transition-all duration-300 ${
          closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Skip button góc trên phải */}
        <button
          onClick={close}
          className="absolute top-2 right-2 z-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-[11px] font-medium bg-white/80 dark:bg-gray-800/80 backdrop-blur px-2 py-0.5 rounded-full"
          aria-label="Bỏ qua hướng dẫn"
        >
          Bỏ qua ✕
        </button>

        {/* Hero — emoji + gradient bg, gọn hơn cho mobile */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 px-4 py-5 text-center">
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
                💡 Thử ngay tab &quot;{current.highlight}&quot;
              </span>
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
              className="flex-1 px-2.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors whitespace-nowrap"
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
            {isLast ? "🚀 Bắt đầu thôi!" : isFirst ? "Bắt đầu khám phá →" : "Tiếp theo →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook tự kiểm tra localStorage + render onboarding tour nếu chưa thấy lần nào.
 *
 * Usage: trong dashboard component:
 *   const onboardingNode = useOnboarding();
 *   ...
 *   {onboardingNode}
 */
export function useOnboarding() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        // Delay 800ms để dashboard render xong, đỡ giật
        const id = window.setTimeout(() => setShouldShow(true), 800);
        return () => window.clearTimeout(id);
      }
    } catch { /* localStorage bị chặn — bỏ qua */ }
  }, []);

  return shouldShow ? <OnboardingTour onComplete={() => setShouldShow(false)} /> : null;
}
