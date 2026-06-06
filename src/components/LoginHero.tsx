"use client";

import { useEffect, useState } from "react";
import { Tilt3D } from "@/components/Tilt3D";

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
    earned: 320000,
  },
  {
    name: "Anh Tuấn",
    role: "Văn phòng · TP.HCM",
    avatar: "👨‍💻",
    rating: 5,
    quote: "Trước mua thẳng Shopee, giờ chỉ mất 30 giây tạo link là có hoàn tiền. Rút tiền nhanh, lại minh bạch.",
    earned: 750000,
  },
  {
    name: "Chị Hương",
    role: "Mẹ bỉm · Đà Nẵng",
    avatar: "🤱",
    rating: 5,
    quote: "App dùng dễ, hoàn tiền minh bạch, lại có thông báo khi shop giảm giá. Mua đồ cho bé cũng được hoàn — rất đáng dùng!",
    earned: 580000,
  },
  {
    name: "Anh Khoa",
    role: "Kinh doanh · Cần Thơ",
    avatar: "💼",
    rating: 5,
    quote: "Bán hàng online mà dùng V-Affiliate thì vừa mua vừa nhận hoàn tiền, lợi cả đôi đường. Tháng nào cũng tiết kiệm được vài triệu.",
  },
  {
    name: "Chị Linh",
    role: "Freelancer · Hải Phòng",
    avatar: "🎨",
    rating: 5,
    quote: "Mình mua đồ công nghệ, spa, du lịch gì cũng có hoàn tiền. Rút về ngân hàng nhanh, không phải chờ đợi.",
    earned: 2100000,
  },
  {
    name: "Anh Đức",
    role: "Kỹ sư · Bình Dương",
    avatar: "⚙️",
    rating: 5,
    quote: "Hoàn tiền thật 100%, không có trò lừa đảo. Đã giới thiệu cho cả team cùng dùng, ai cũng khen.",
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
 * Each animated element is a real DOM div (not SVG <g>) so CSS animations
 * are guaranteed to work in all browsers and production builds.
 */
function Illustration() {
  return (
    <div className="relative w-full max-w-md mx-auto h-[300px]">
      {/* Glowing background orbs */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Main credit card — floats as a whole unit */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[80px] z-10 svg-card-float drop-shadow-2xl">
        {/* Card body */}
        <div className="relative w-[250px] h-[160px] rounded-[20px] bg-gradient-to-br from-orange-400 via-amber-400 to-orange-500 shadow-xl shadow-orange-500/30 overflow-hidden">
          {/* Card glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-400 to-orange-500 opacity-75" />
          {/* Top row */}
          <div className="relative flex items-start justify-between p-4">
            <span className="text-white/90 font-bold tracking-widest text-xs">V-AFFILIATE</span>
            <div className="w-10 h-7 rounded bg-amber-100/90">
              <div className="w-7 h-4 rounded-sm bg-amber-800/30 m-[6px]" />
            </div>
          </div>
          {/* Card number */}
          <div className="relative px-4 mt-2">
            <span className="text-white font-black text-lg tracking-widest font-mono">•••• •••• 5168</span>
          </div>
          {/* Bottom row */}
          <div className="relative flex items-end justify-between p-4 mt-2">
            <span className="text-white/80 text-[11px]">CASHBACK VIP · TIER 3</span>
            <div className="flex items-center gap-1">
              <span className="bg-white text-orange-500 font-black text-xs px-2 py-0.5 rounded-full">58%</span>
            </div>
          </div>
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-[shimmer_3s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Floating mini card — green cashback */}
      <div className="absolute left-0 top-0 z-20 svg-float-up" style={{ animationDelay: "0.5s" }}>
        <div className="w-[90px] h-[55px] rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-500/20 flex flex-col items-start justify-center px-2">
          <span className="text-white/85 font-bold text-[10px]">+50.000đ</span>
          <span className="text-white font-extrabold text-xs">Hoàn tiền</span>
        </div>
      </div>

      {/* Floating mini card — purple VIP */}
      <div className="absolute right-0 top-[40px] z-20 svg-float-up-2" style={{ animationDelay: "1s" }}>
        <div className="w-[95px] h-[55px] rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 shadow-lg shadow-purple-500/20 flex flex-col items-start justify-center px-2">
          <span className="text-white/85 font-bold text-[10px]">TIER VIP</span>
          <span className="text-white font-extrabold text-sm">Hoàn 58%</span>
        </div>
      </div>

      {/* Floating coin 1 */}
      <div className="absolute left-0 bottom-[70px] z-20 svg-float-coin">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-500/30 flex items-center justify-center">
          <span className="text-white font-black text-lg leading-none">đ</span>
        </div>
      </div>

      {/* Floating coin 2 */}
      <div className="absolute right-0 bottom-[50px] z-20 svg-float-coin-2" style={{ animationDelay: "0.7s" }}>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-500/30 flex items-center justify-center">
          <span className="text-white font-black text-sm leading-none">đ</span>
        </div>
      </div>

      {/* Floating coin 3 */}
      <div className="absolute right-[15px] top-[70px] z-20 svg-float-coin-3" style={{ animationDelay: "1.2s" }}>
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-500/30 flex items-center justify-center">
          <span className="text-white font-black text-xs leading-none">đ</span>
        </div>
      </div>

      {/* Sparkle 1 */}
      <div className="absolute left-0 top-[130px] z-20 svg-sparkle">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M13 1L15.2 9.8L24 12L15.2 14.2L13 23L10.8 14.2L2 12L10.8 9.8L13 1Z" fill="#fbbf24" />
        </svg>
      </div>

      {/* Sparkle 2 */}
      <div className="absolute right-0 top-[170px] z-20 svg-sparkle-2" style={{ animationDelay: "0.5s" }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 0L10.5 6.8L17 8.2L10.5 9.6L9 16.5L7.5 9.6L1 8.2L7.5 6.8L9 0Z" fill="#fbbf24" />
        </svg>
      </div>

      {/* Sparkle 3 */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-20 svg-sparkle-3" style={{ animationDelay: "1s" }}>
        <div className="w-2 h-2 rounded-full bg-amber-400" />
      </div>

      {/* Checkmark badge */}
      <div className="absolute right-[15px] top-[140px] z-20 svg-float-up-3" style={{ animationDelay: "0.3s" }}>
        <div className="w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      {/* Extra ambient dots */}
      <div className="absolute left-1/4 -bottom-4 z-10 svg-float-coin-2" style={{ animationDelay: "0.5s" }}>
        <div className="w-8 h-8 rounded-full bg-amber-400/30 blur-sm" />
      </div>
      <div className="absolute right-1/4 -top-2 z-10 svg-float-coin-3" style={{ animationDelay: "1s" }}>
        <div className="w-6 h-6 rounded-full bg-orange-400/30 blur-sm" />
      </div>
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
    fetch("/api/public-stats")
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
  const cashbackTarget = stats?.totalCashback ?? 0;
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
        <Tilt3D max={3} lift={3}>
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
        </Tilt3D>

        {/* Cashback card */}
        <Tilt3D max={3} lift={3}>
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
        </Tilt3D>

        {/* Orders card */}
        <Tilt3D max={3} lift={3}>
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
        </Tilt3D>
      </div>

      {/* Redesigned Testimonial with gradient border */}
      <Tilt3D max={3} lift={4}>
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
      </Tilt3D>
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
