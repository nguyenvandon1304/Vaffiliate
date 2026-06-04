"use client";

import { useEffect, useState } from "react";

interface PublicStats {
  totalUsers: number;
  totalCashback: number;
  totalOrders: number;
}

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  rating: number;
  quote: string;
  earned?: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Minh Anh",
    role: "Sinh viên · Hà Nội",
    avatar: "🌸",
    rating: 5,
    quote: "Mình mua đồ Shopee thường xuyên, giờ qua V-Affiliate là có hoàn tiền về ví. Sinh viên mà — tiết kiệm được đồng nào hay đồng đó!",
  },
  {
    name: "Anh Tuấn",
    role: "Văn phòng · TP.HCM",
    avatar: "👨‍💻",
    rating: 5,
    quote: "Trước mua thẳng Shopee, giờ chỉ mất 30 giây tạo link là có hoàn tiền. Thao tác đơn giản, tiền về ví rõ ràng minh bạch.",
  },
  {
    name: "Chị Hương",
    role: "Mẹ bỉm · Đà Nẵng",
    avatar: "🤱",
    rating: 5,
    quote: "App dùng dễ, hoàn tiền minh bạch, lại có thông báo khi shop giảm giá. Mua đồ cho bé cũng được hoàn — rất đáng dùng!",
  },
];

/** Hook count-up cho big number. */
function useCountUp(target: number, duration = 1500): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const startTime = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/** Format big number gọn ("1.2 triệu", "850k"). */
function formatBig(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " triệu";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

/** Star rating compact. */
function Stars({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={`w-3.5 h-3.5 ${i < count ? "fill-current" : "fill-gray-200 dark:fill-zinc-700"}`}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

/**
 * Redesigned illustration: floating dashboard cards with cashback theme.
 */
function Illustration() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glowing background orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Main floating card */}
      <div className="relative z-10" style={{ animation: "float 4s ease-in-out infinite" }}>
        <svg viewBox="0 0 400 300" className="w-full drop-shadow-2xl">
          <defs>
            <linearGradient id="heroCard" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <linearGradient id="greenCard" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="purpleCard" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Shadow layer */}
          <rect x="90" y="88" width="250" height="160" rx="20" fill="#00000010" transform="translate(0, 8)" />

          {/* Main credit card */}
          <rect x="85" y="80" width="250" height="160" rx="20" fill="url(#heroCard)" filter="url(#glow)" />
          <rect x="85" y="80" width="250" height="160" rx="20" fill="url(#heroCard)" />

          {/* Card texture */}
          <rect x="85" y="80" width="250" height="160" rx="20" fill="url(#heroCard)" opacity="0.85" />

          {/* Card content */}
          <text x="110" y="115" fontSize="14" fill="white" opacity="0.9" fontWeight="700" letterSpacing="2">V-AFFILIATE</text>
          <rect x="110" y="130" width="40" height="30" rx="4" fill="#fef3c7" opacity="0.9" />
          <rect x="116" y="137" width="28" height="16" rx="2" fill="#92400e" opacity="0.3" />
          <text x="110" y="200" fontSize="22" fill="white" fontWeight="900" fontFamily="monospace">•••• •••• 5168</text>
          <text x="110" y="222" fontSize="11" fill="white" opacity="0.8">CASHBACK VIP · TIER 3</text>

          {/* Cashback badge */}
          <rect x="260" y="90" width="60" height="28" rx="14" fill="white" opacity="0.9" />
          <text x="290" y="109" fontSize="12" fill="#f97316" fontWeight="900" textAnchor="middle">58%</text>

          {/* Floating mini cards */}
          <g style={{ animation: "floatUp 3s ease-in-out infinite", animationDelay: "0.5s" }}>
            <rect x="30" y="30" width="90" height="55" rx="12" fill="url(#greenCard)" opacity="0.95" />
            <text x="45" y="55" fontSize="10" fill="white" fontWeight="700" opacity="0.85">+50.000đ</text>
            <text x="45" y="72" fontSize="12" fill="white" fontWeight="800">Hoàn tiền</text>
          </g>

          <g style={{ animation: "floatUp 3.5s ease-in-out infinite", animationDelay: "1s" }}>
            <rect x="285" y="40" width="95" height="55" rx="12" fill="url(#purpleCard)" opacity="0.95" />
            <text x="300" y="65" fontSize="10" fill="white" fontWeight="700" opacity="0.85">⭐ TIER VIP</text>
            <text x="300" y="82" fontSize="14" fill="white" fontWeight="900">Hoàn 58%</text>
          </g>

          {/* Floating coins */}
          <g style={{ animation: "floatCoin 2.5s ease-in-out infinite" }}>
            <circle cx="45" cy="230" r="18" fill="url(#coinGrad)" />
            <circle cx="45" cy="230" r="18" fill="url(#coinGrad)" opacity="0.8" />
            <text x="45" y="237" fontSize="20" fill="white" fontWeight="900" textAnchor="middle">đ</text>
          </g>

          <g style={{ animation: "floatCoin 3s ease-in-out infinite", animationDelay: "0.7s" }}>
            <circle cx="370" cy="250" r="14" fill="url(#coinGrad)" />
            <text x="370" y="256" fontSize="16" fill="white" fontWeight="900" textAnchor="middle">đ</text>
          </g>

          <g style={{ animation: "floatCoin 2.8s ease-in-out infinite", animationDelay: "1.2s" }}>
            <circle cx="355" cy="70" r="12" fill="url(#coinGrad)" />
            <text x="355" y="76" fontSize="14" fill="white" fontWeight="900" textAnchor="middle">đ</text>
          </g>

          {/* Sparkles */}
          <g style={{ animation: "sparkle 2s ease-in-out infinite" }}>
            <path d="M30 130 L33 120 L36 130 L46 133 L36 136 L33 146 L30 136 L20 133 Z" fill="#fbbf24" opacity="0.8" />
          </g>
          <g style={{ animation: "sparkle 2.5s ease-in-out infinite", animationDelay: "0.5s" }}>
            <path d="M365 170 L367 163 L369 170 L376 172 L369 174 L367 181 L365 174 L358 172 Z" fill="#fbbf24" opacity="0.8" />
          </g>
          <g style={{ animation: "sparkle 1.8s ease-in-out infinite", animationDelay: "1s" }}>
            <circle cx="200" cy="280" r="4" fill="#fbbf24" opacity="0.6" />
          </g>

          {/* Checkmark badge */}
          <g style={{ animation: "floatUp 3.2s ease-in-out infinite", animationDelay: "0.3s" }}>
            <circle cx="355" cy="140" r="18" fill="white" />
            <circle cx="355" cy="140" r="18" fill="white" opacity="0.9" />
            <path d="M347 140 L352 145 L363 134" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </div>

      {/* Additional decorative elements */}
      <div className="absolute -bottom-4 left-1/4 w-8 h-8 bg-amber-400/30 rounded-full blur-sm" style={{ animation: "floatCoin 3s ease-in-out infinite", animationDelay: "0.5s" }} />
      <div className="absolute -top-2 right-1/4 w-6 h-6 bg-orange-400/30 rounded-full blur-sm" style={{ animation: "floatCoin 2.8s ease-in-out infinite", animationDelay: "1s" }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatCoin {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-6px) scale(1.1); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

/**
 * Hero panel cho login page — chỉ hiện trên desktop ≥ lg.
 * Redesigned: stronger headline, better social proof, improved testimonial.
 */
export function LoginHero() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Fetch public stats (cached 60s server-side)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public-stats", { cache: "force-cache" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setStats({
          totalUsers: d.totalUsers ?? 0,
          totalCashback: d.totalCashback ?? 0,
          totalOrders: d.totalOrders ?? 0,
        });
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);

  // Auto-rotate testimonials every 5s
  useEffect(() => {
    const id = window.setInterval(() => {
      setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  // Floor stats để show số tròn đẹp (vd. 12 user → "10+", 1.234.567đ → "1.2 triệu+")
  const usersDisplay = stats && stats.totalUsers > 0
    ? `${formatBig(stats.totalUsers)}${stats.totalUsers >= 10 ? '+' : ''}`
    : "Cộng đồng đang phát triển";
  const cashbackTarget = Math.max(stats?.totalCashback ?? 0, 1_000_000);
  const cashbackAnim = useCountUp(cashbackTarget, 2000);
  const ordersDisplay = stats && stats.totalOrders > 0
    ? `${formatBig(stats.totalOrders)}${stats.totalOrders >= 10 ? '+' : ''} đơn`
    : "Sẵn sàng phục vụ";

  const t = TESTIMONIALS[testimonialIdx];

  return (
    <div className="hidden lg:flex flex-col items-start justify-center w-full max-w-xl space-y-8">
      {/* Hero badge */}
      <div className="space-y-3">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 border border-orange-200 dark:border-orange-500/30 rounded-full text-xs font-bold text-orange-600 dark:text-orange-400 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 animate-pulse" />
          HOÀN TIỀN ĐẾN 58% · HOÀN TIỀN THẬT
        </span>

        {/* Stronger headline */}
        <h1 className="text-5xl xl:text-6xl font-black leading-[1.1]">
          <span className="text-gray-900 dark:text-white">Mỗi đơn hàng,</span>
          <br />
          <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
            hoàn tiền về ví
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-base text-gray-500 dark:text-zinc-400 leading-relaxed max-w-lg">
          Tạo link cashback cho sản phẩm bạn muốn mua → mua như bình thường → tiền tự về ví trong vòng{" "}
          <span className="font-bold text-orange-500">60 phút</span>.
        </p>

        {/* Trust badges inline */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
            <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">Bảo mật tuyệt đối</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">Rút tiền nhanh</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
            <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">Hỗ trợ 08:00-22:00</span>
          </div>
        </div>
      </div>

      {/* Redesigned Illustration */}
      <Illustration />

      {/* Redesigned Social Proof Bar */}
      <div className="grid grid-cols-3 gap-4 w-full">
        {/* Users card */}
        <div className="group relative rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/5 border border-orange-200/60 dark:border-orange-500/20 p-4 shadow-lg shadow-orange-500/10 hover:shadow-xl hover:shadow-orange-500/15 hover:scale-[1.02] transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center mb-3 shadow-md shadow-orange-500/20">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {usersDisplay}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">user đã tham gia</p>
          </div>
        </div>

        {/* Cashback card */}
        <div className="group relative rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/5 border border-emerald-200/60 dark:border-emerald-500/20 p-4 shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/15 hover:scale-[1.02] transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mb-3 shadow-md shadow-emerald-500/20">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" x2="12" y1="2" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {cashbackAnim.toLocaleString("vi-VN")}đ
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">đã hoàn cho user</p>
          </div>
        </div>

        {/* Orders card */}
        <div className="group relative rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/5 border border-blue-200/60 dark:border-blue-500/20 p-4 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/15 hover:scale-[1.02] transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-3 shadow-md shadow-blue-500/20">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
              {ordersDisplay}
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">hoàn thành</p>
          </div>
        </div>
      </div>

      {/* Redesigned Testimonial with gradient border */}
      <div className="relative w-full">
        {/* Gradient border effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-2xl opacity-30 blur-sm" />

        <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-3xl shadow-lg shadow-orange-500/30 ring-4 ring-orange-100 dark:ring-orange-500/20">
              {t.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-gray-900 dark:text-zinc-100">{t.name}</p>
                  <Stars count={t.rating} />
                </div>
                {t.earned && (
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Đã rút {formatBig(t.earned)}đ
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mb-2">{t.role}</p>
              <p className="text-sm text-gray-700 dark:text-zinc-200 leading-relaxed italic">
                &ldquo;{t.quote}&rdquo;
              </p>
            </div>
          </div>

          {/* Dots + Arrows navigation */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTestimonialIdx(i)}
                  aria-label={`Đánh giá ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === testimonialIdx
                      ? "w-6 bg-gradient-to-r from-orange-500 to-amber-500"
                      : "w-2 bg-gray-200 dark:bg-zinc-700 hover:bg-orange-300 dark:hover:bg-orange-500"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTestimonialIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-orange-100 dark:hover:bg-orange-500/20 flex items-center justify-center transition-colors"
                aria-label="Đánh giá trước"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button
                onClick={() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-orange-100 dark:hover:bg-orange-500/20 flex items-center justify-center transition-colors"
                aria-label="Đánh giá tiếp"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Animated typing placeholder — rotate through multiple texts.
 */
export function useTypingPlaceholder(texts: string[], speedMs = 80, pauseMs = 1500): string {
  const [textIdx, setTextIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIdx];
    if (!current) return;

    let timer: number | null = null;

    if (!deleting && charIdx < current.length) {
      timer = window.setTimeout(() => setCharIdx(charIdx + 1), speedMs);
    } else if (!deleting && charIdx === current.length) {
      timer = window.setTimeout(() => setDeleting(true), pauseMs);
    } else if (deleting && charIdx > 0) {
      timer = window.setTimeout(() => setCharIdx(charIdx - 1), speedMs / 2);
    } else if (deleting && charIdx === 0) {
      timer = window.setTimeout(() => {
        setDeleting(false);
        setTextIdx((textIdx + 1) % texts.length);
      }, 0);
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [textIdx, charIdx, deleting, texts, speedMs, pauseMs]);

  return texts[textIdx]?.slice(0, charIdx) ?? "";
}
