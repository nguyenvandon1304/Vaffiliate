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
    quote: "Mua đồ Shopee qua link V-Affiliate, tháng nào cũng có thêm 100-200k vào ví. Sinh viên mà — tiết kiệm được đồng nào hay đồng đó!",
    earned: 1250000,
  },
  {
    name: "Anh Tuấn",
    role: "Văn phòng · TP.HCM",
    avatar: "👨‍💻",
    rating: 5,
    quote: "Trước đây mua đồ thẳng Shopee, giờ chỉ mất 30s tạo link là có hoàn tiền. Vợ ngồi shopping mệt nghỉ, tháng vừa rồi rút được 850k!",
    earned: 850000,
  },
  {
    name: "Chị Hương",
    role: "Mẹ bỉm · Đà Nẵng",
    avatar: "🤱",
    rating: 5,
    quote: "App dùng dễ, hoàn tiền nhanh, có cả thông báo khi shop giảm giá. Mua đồ cho bé cũng được hoàn — quá hời!",
    earned: 2100000,
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
 * Big illustration: animated dashboard card + cash flying in.
 * Pure CSS / SVG — no library.
 */
function Illustration() {
  return (
    <div className="relative w-full max-w-md aspect-[4/3]">
      {/* Background blob */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-200/40 via-amber-200/40 to-yellow-200/30 rounded-[40%] blur-3xl animate-tier-float" />

      <svg viewBox="0 0 400 300" className="relative w-full h-full">
        <defs>
          <linearGradient id="card1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="card2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="card3" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* Main credit card */}
        <g style={{ transformOrigin: "200px 150px", animation: "tier-float 4s ease-in-out infinite" }}>
          <rect x="80" y="80" width="240" height="150" rx="16" fill="url(#card1)" />
          <rect x="80" y="80" width="240" height="150" rx="16" fill="url(#card1)" opacity="0.8" />
          <text x="100" y="115" fontSize="14" fill="white" opacity="0.85" fontWeight="700">V-AFFILIATE</text>
          <text x="100" y="195" fontSize="20" fill="white" fontWeight="900" fontFamily="ui-monospace, monospace">•••• 5168</text>
          <text x="100" y="220" fontSize="11" fill="white" opacity="0.85">CASHBACK • PREMIUM</text>
          {/* Chip */}
          <rect x="100" y="135" width="36" height="28" rx="4" fill="#fef3c7" />
          <rect x="106" y="142" width="24" height="14" rx="2" fill="#92400e" opacity="0.4" />
        </g>

        {/* Floating mini cards */}
        <g style={{ transformOrigin: "75px 60px", animation: "tier-float 3.5s ease-in-out infinite", animationDelay: "0.3s" }}>
          <rect x="40" y="40" width="80" height="48" rx="10" fill="url(#card2)" />
          <text x="52" y="62" fontSize="9" fill="white" fontWeight="700" opacity="0.85">+50.000đ</text>
          <text x="52" y="78" fontSize="11" fill="white" fontWeight="900">Hoàn tiền</text>
        </g>

        <g style={{ transformOrigin: "330px 75px", animation: "tier-float 3.8s ease-in-out infinite", animationDelay: "0.6s" }}>
          <rect x="290" y="50" width="80" height="48" rx="10" fill="url(#card3)" />
          <text x="302" y="72" fontSize="9" fill="white" fontWeight="700" opacity="0.85">⭐ TIER VIP</text>
          <text x="302" y="88" fontSize="11" fill="white" fontWeight="900">58% ⚡</text>
        </g>

        {/* Coin icons floating */}
        <g style={{ animation: "tier-float 2.8s ease-in-out infinite" }}>
          <circle cx="50" cy="220" r="14" fill="#fbbf24" />
          <text x="50" y="226" fontSize="16" fill="white" fontWeight="900" textAnchor="middle">đ</text>
        </g>
        <g style={{ animation: "tier-float 3.2s ease-in-out infinite", animationDelay: "0.4s" }}>
          <circle cx="350" cy="240" r="10" fill="#fbbf24" />
          <text x="350" y="245" fontSize="11" fill="white" fontWeight="900" textAnchor="middle">đ</text>
        </g>

        {/* Sparkles */}
        <text x="40" y="120" fontSize="18" fill="#fbbf24">✦</text>
        <text x="350" y="180" fontSize="14" fill="#fbbf24">★</text>
        <text x="200" y="280" fontSize="12" fill="#fbbf24">✦</text>
      </svg>
    </div>
  );
}

/**
 * Hero panel cho login page — chỉ hiện trên desktop ≥ lg.
 * Bao gồm:
 *   - Headline + subtitle
 *   - Illustration animated
 *   - Social proof bar (X user · Y đ đã hoàn)
 *   - Testimonial slider
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
  // Default fallback nếu chưa có stats: 100+ user, 1 triệu đ
  const usersDisplay = stats && stats.totalUsers >= 10
    ? `${formatBig(stats.totalUsers)}+`
    : "Cộng đồng đang phát triển";
  const cashbackTarget = Math.max(stats?.totalCashback ?? 0, 1_000_000);
  const cashbackAnim = useCountUp(cashbackTarget, 2000);
  const ordersDisplay = stats && stats.totalOrders >= 10
    ? `${formatBig(stats.totalOrders)}+ đơn`
    : "Sẵn sàng phục vụ";

  const t = TESTIMONIALS[testimonialIdx];

  return (
    <div className="hidden lg:flex flex-col items-start justify-center w-full max-w-xl space-y-6">
      {/* Hero text */}
      <div className="space-y-3">
        <span className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100/80 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-full text-xs font-bold text-orange-600 dark:text-orange-400">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          V-AFFILIATE · MUA HÀNG HOÀN TIỀN
        </span>
        <h1 className="text-4xl xl:text-5xl font-black leading-tight">
          Mỗi đơn Shopee,{" "}
          <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
            tiết kiệm 50%
          </span>{" "}
          hoa hồng
        </h1>
        <p className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed max-w-lg">
          Tạo link cashback cho sản phẩm bạn muốn mua → mua như bình thường → tiền tự về ví. Đơn giản, minh bạch, không phí ẩn.
        </p>
      </div>

      {/* Illustration */}
      <Illustration />

      {/* Social proof bar */}
      <div className="grid grid-cols-3 gap-3 w-full">
        <div className="rounded-2xl border border-orange-200/70 dark:border-orange-500/20 bg-gradient-to-br from-orange-50/80 to-orange-100/40 dark:from-orange-500/[0.06] dark:to-orange-500/[0.03] backdrop-blur-sm p-3">
          <div className="flex items-center gap-1 text-xs">🔥</div>
          <p className="mt-1 text-base font-black text-orange-700 dark:text-orange-300 tabular-nums">
            {usersDisplay}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">user đã tham gia</p>
        </div>

        <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-500/[0.06] dark:to-emerald-500/[0.03] backdrop-blur-sm p-3">
          <div className="flex items-center gap-1 text-xs">💚</div>
          <p className="mt-1 text-base font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
            {cashbackAnim.toLocaleString("vi-VN")}đ
          </p>
          <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">đã hoàn cho user</p>
        </div>

        <div className="rounded-2xl border border-blue-200/70 dark:border-blue-500/20 bg-gradient-to-br from-blue-50/80 to-blue-100/40 dark:from-blue-500/[0.06] dark:to-blue-500/[0.03] backdrop-blur-sm p-3">
          <div className="flex items-center gap-1 text-xs">📦</div>
          <p className="mt-1 text-base font-black text-blue-700 dark:text-blue-300 tabular-nums">
            {ordersDisplay}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">hoàn thành</p>
        </div>
      </div>

      {/* Testimonial slider */}
      <div className="w-full rounded-2xl border border-gray-200/70 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-amber-400 flex items-center justify-center text-2xl shadow-md">
            {t.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-800 dark:text-zinc-100">{t.name}</p>
                <Stars count={t.rating} />
              </div>
              {t.earned && (
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                  Đã rút {formatBig(t.earned)}đ
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-500 mb-1.5">{t.role}</p>
            <p className="text-sm text-gray-700 dark:text-zinc-200 leading-relaxed">
              &ldquo;{t.quote}&rdquo;
            </p>
          </div>
        </div>

        {/* Dots indicator */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setTestimonialIdx(i)}
              aria-label={`Đánh giá ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === testimonialIdx ? "w-6 bg-orange-500" : "w-1.5 bg-gray-300 dark:bg-zinc-600 hover:bg-orange-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Animated typing placeholder — rotate through multiple texts.
 * Dùng cho input username/email để gợi ý.
 *
 * Usage:
 *   const placeholder = useTypingPlaceholder([
 *     "Tên đăng nhập...",
 *     "Email của bạn...",
 *   ]);
 *   <input placeholder={placeholder} />
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
      // Typing
      timer = window.setTimeout(() => setCharIdx(charIdx + 1), speedMs);
    } else if (!deleting && charIdx === current.length) {
      // Pause then start deleting
      timer = window.setTimeout(() => setDeleting(true), pauseMs);
    } else if (deleting && charIdx > 0) {
      // Deleting
      timer = window.setTimeout(() => setCharIdx(charIdx - 1), speedMs / 2);
    } else if (deleting && charIdx === 0) {
      // Move to next text — defer state update to avoid cascading-render warning
      timer = window.setTimeout(() => {
        setDeleting(false);
        setTextIdx((textIdx + 1) % texts.length);
      }, 0);
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [textIdx, charIdx, deleting, texts, speedMs, pauseMs]);

  return texts[textIdx]?.slice(0, charIdx) ?? "";
}
