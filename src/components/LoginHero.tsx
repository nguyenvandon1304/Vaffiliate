"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setParallax({ x: dx * 12, y: dy * 8 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setParallax({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      className="hero-illustration relative w-full max-w-md mx-auto h-[340px] overflow-visible"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Layer 0: Ambient background glow */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${parallax.x * 0.2}px, ${parallax.y * 0.2}px)`,
          transition: "transform 0.3s ease-out",
        }}
      >
        <div className="w-72 h-72 bg-orange-500/25 rounded-full blur-3xl animate-pulse-slow" />
        <div
          className="absolute top-1/3 left-1/4 w-40 h-40 bg-amber-400/20 rounded-full blur-2xl animate-pulse-slow"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-28 h-28 bg-emerald-400/15 rounded-full blur-2xl animate-pulse-slow"
          style={{ animationDelay: "0.8s" }}
        />
      </div>

      {/* Layer 1: Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="particle-dot"
            style={{
              left: `${[8, 15, 22, 30, 38, 45, 55, 62, 70, 78, 85, 92][i]}%`,
              top: `${[75, 20, 50, 85, 15, 60, 30, 90, 45, 70, 10, 40][i]}%`,
              animationDelay: `${(i * 0.4) % 3}s`,
              animationDuration: `${2.5 + (i % 3)}s`,
              width: `${[4, 3, 5, 3, 4, 5, 3, 4, 3, 5, 4, 3][i]}px`,
              height: `${[4, 3, 5, 3, 4, 5, 3, 4, 3, 5, 4, 3][i]}px`,
            }}
          />
        ))}
      </div>

      {/* Layer 2: Main credit card — 3D tilt with parallax */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-[90px] z-10 card-3d"
        style={{
          transform: `translateX(-50%) translate(${parallax.x}px, ${parallax.y}px) rotateY(${parallax.x * 0.8}deg) rotateX(${-parallax.y * 0.8}deg)`,
          transition: "transform 0.2s ease-out",
        }}
      >
        <div className="relative w-[260px] h-[165px] rounded-[20px] overflow-hidden shadow-[0_8px_32px_rgba(249,115,22,0.4),0_2px_8px_rgba(0,0,0,0.2)]">
          {/* Metallic gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-400 to-orange-600" />
          <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-amber-200/20 to-orange-700/30" />
          {/* Shimmer sweep */}
          <div className="illu-shimmer" />
          {/* Top row */}
          <div className="relative flex items-start justify-between p-4 z-10">
            <div>
              <span className="text-white/90 font-black tracking-[0.2em] text-xs">V-AFFILIATE</span>
              <div className="mt-0.5 w-8 h-1 rounded-full bg-amber-200/50" />
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-4 rounded-sm bg-amber-200/80" />
              <div className="w-6 h-4 rounded-sm bg-amber-200/50" />
            </div>
          </div>
          {/* Chip */}
          <div className="relative mx-4 mt-1 w-10 h-8 rounded-sm bg-gradient-to-br from-amber-200 via-amber-100 to-amber-300 shadow-inner overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)" }} />
          </div>
          {/* Card number */}
          <div className="relative px-4 mt-3">
            <span className="text-white/95 font-black text-base tracking-[0.25em] font-mono drop-shadow-sm">4282 ···· ····</span>
          </div>
          {/* Bottom row */}
          <div className="relative flex items-end justify-between p-4 mt-auto">
            <div>
              <span className="text-white/70 text-[9px] tracking-wider font-medium">CARD HOLDER</span>
              <div className="text-white/95 font-bold text-xs tracking-wider mt-0.5">VIP · CASHBACK</div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-white/70 text-[9px] tracking-wider font-medium">TIER</span>
              <span className="bg-white text-orange-500 font-black text-sm px-2.5 py-0.5 rounded-full shadow-sm mt-0.5">58%</span>
            </div>
          </div>
          {/* Glow edge */}
          <div className="absolute inset-0 rounded-[20px] border border-white/20 pointer-events-none" />
        </div>
      </div>

      {/* Layer 3: Floating reward badge — top-left */}
      <div
        className="absolute left-[-5px] top-[30px] z-20 card-3d"
        style={{
          transform: `translate(${parallax.x * 1.6}px, ${parallax.y * 1.6}px)`,
          transition: "transform 0.2s ease-out",
        }}
      >
        <div className="w-[105px] h-[62px] rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-[0_4px_20px_rgba(34,197,94,0.4)] p-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-0.5">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-white" fill="currentColor">
              <path d="M8 1l1.97 4.03 4.42.64-3.2 3.12.75 4.4L8 11.27 4.06 13.19l.75-4.4-3.2-3.12 4.42-.64L8 1z" />
            </svg>
            <span className="text-white/90 font-bold text-[10px]">REWARD</span>
          </div>
          <span className="text-white font-black text-lg leading-none tracking-tight">+50.000đ</span>
          <span className="text-white/80 font-semibold text-[9px]">Hoàn tiền</span>
        </div>
      </div>

      {/* Layer 4: VIP tier badge — top-right */}
      <div
        className="absolute right-[-5px] top-[75px] z-20 card-3d"
        style={{
          transform: `translate(${parallax.x * 1.4}px, ${parallax.y * 1.4}px)`,
          transition: "transform 0.2s ease-out",
        }}
      >
        <div className="w-[100px] h-[60px] rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 shadow-[0_4px_20px_rgba(139,92,246,0.4)] p-3 flex flex-col justify-center items-center">
          <span className="text-white/90 font-black text-[10px] tracking-wider">TIER VIP</span>
          <span className="text-white font-black text-xl leading-none mt-0.5">58<span className="text-lg">%</span></span>
          <div className="flex gap-0.5 mt-0.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-white/80" />
            ))}
          </div>
        </div>
      </div>

      {/* Layer 5: Floating coin 1 */}
      <div
        className="absolute left-[5px] bottom-[85px] z-20 coin-float"
        style={{
          transform: `translate(${parallax.x * 1.8}px, ${parallax.y * 1.8}px)`,
          transition: "transform 0.2s ease-out",
        }}
      >
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-[0_4px_16px_rgba(251,191,36,0.5)] flex items-center justify-center ring-2 ring-amber-200/40">
          <span className="text-white font-black text-xl leading-none drop-shadow-sm">đ</span>
        </div>
      </div>

      {/* Layer 6: Floating coin 2 */}
      <div
        className="absolute right-[10px] bottom-[60px] z-20 coin-float"
        style={{
          transform: `translate(${parallax.x * 2}px, ${parallax.y * 2}px)`,
          transition: "transform 0.2s ease-out",
          animationDelay: "0.4s",
        }}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-[0_3px_12px_rgba(251,191,36,0.4)] flex items-center justify-center ring-2 ring-amber-200/30">
          <span className="text-white font-black text-base leading-none drop-shadow-sm">đ</span>
        </div>
      </div>

      {/* Layer 7: Floating coin 3 */}
      <div
        className="absolute right-[55px] top-[55px] z-20 coin-float"
        style={{
          transform: `translate(${parallax.x * 2.2}px, ${parallax.y * 2.2}px)`,
          transition: "transform 0.2s ease-out",
          animationDelay: "0.8s",
        }}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-[0_2px_10px_rgba(251,191,36,0.35)] flex items-center justify-center ring-2 ring-amber-200/20">
          <span className="text-white font-black text-sm leading-none drop-shadow-sm">đ</span>
        </div>
      </div>

      {/* Layer 8: Star sparkles */}
      <div
        className="absolute left-[25px] top-[140px] z-20 sparkle-spin"
        style={{
          transform: `translate(${parallax.x * 2.5}px, ${parallax.y * 2.5}px)`,
          transition: "transform 0.2s ease-out",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M14 1L16.5 10.5L26 14L16.5 17.5L14 27L11.5 17.5L2 14L11.5 10.5L14 1Z" fill="#fbbf24" />
        </svg>
      </div>

      <div
        className="absolute right-[25px] top-[170px] z-20 sparkle-spin"
        style={{
          transform: `translate(${parallax.x * 2.5}px, ${parallax.y * 2.5}px)`,
          transition: "transform 0.2s ease-out",
          animationDelay: "0.7s",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 0L12 7.5L19.5 10L12 12.5L10 20L8 12.5L0.5 10L8 7.5L10 0Z" fill="#fbbf24" />
        </svg>
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-[15px] z-20 sparkle-spin"
        style={{
          transform: `translate(${parallax.x * 2.5}px, ${parallax.y * 2.5}px)`,
          transition: "transform 0.2s ease-out",
          animationDelay: "1.2s",
        }}
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
      </div>

      {/* Layer 9: Checkmark badge */}
      <div
        className="absolute right-[15px] top-[150px] z-20 badge-bounce"
        style={{
          transform: `translate(${parallax.x * 1.5}px, ${parallax.y * 1.5}px)`,
          transition: "transform 0.2s ease-out",
        }}
      >
        <div className="w-10 h-10 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] flex items-center justify-center ring-2 ring-emerald-200">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      {/* Layer 10: Decorative rings */}
      <div
        className="absolute left-[10px] top-[55px] z-[5] ring-float"
        style={{
          transform: `translate(${parallax.x * 0.3}px, ${parallax.y * 0.3}px)`,
          transition: "transform 0.2s ease-out",
        }}
      >
        <div className="w-16 h-16 rounded-full border-2 border-amber-400/20" />
      </div>

      <div
        className="absolute right-[5px] bottom-[105px] z-[5] ring-float"
        style={{
          transform: `translate(${parallax.x * 0.3}px, ${parallax.y * 0.3}px)`,
          transition: "transform 0.2s ease-out",
          animationDelay: "1.5s",
        }}
      >
        <div className="w-12 h-12 rounded-full border-2 border-orange-400/15" />
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
