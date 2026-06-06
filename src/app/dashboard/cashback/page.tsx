"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { trackEvent } from "@/components/Analytics";
import {
  DienMayXanhIcon,
  LazadaIcon,
  SendoIcon,
  ShopeeFoodIcon,
  ShopeeIcon,
  TikTokIcon,
  TikiIcon,
} from "@/components/channel-icons";
import Footer from "@/components/Footer";

type ChannelDef = {
  name: string;
  active: boolean;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const channels: ChannelDef[] = [
  { name: "Shopee", active: true, Icon: ShopeeIcon },
  { name: "S.P.Food", active: false, Icon: ShopeeFoodIcon },
  { name: "TikTok", active: false, Icon: TikTokIcon },
  { name: "Lazada", active: false, Icon: LazadaIcon },
  { name: "TIKI", active: false, Icon: TikiIcon },
];

// 2 kênh mở rộng — chỉ hiện khi user bấm "Xem thêm".
const extraChannels: ChannelDef[] = [
  { name: "Sendo", active: false, Icon: SendoIcon },
  { name: "Điện Máy Xanh", active: false, Icon: DienMayXanhIcon },
];

interface ProductInfo {
  name: string;
  image: string;
  price: number;
  commission: number;
  commissionRate: string;
  cashback: number;
  cashbackRate?: number; // % theo tier user (50/53/55/58)
  tierCode?: string;
  tierName?: string;
  affiliateLink: string;
  shortLink?: string;   // link rút gọn đẹp (goaffiliate.online/XXX) để share
  hasVoucher?: boolean; // true nếu link có nhúng voucher Social Media
  productUrl?: string;
  shopId?: string;
  itemId?: string;
  shop: string;
}

export default function CashbackPage() {
  const router = useRouter();
  const [selectedChannel, setSelectedChannel] = useState("Shopee");
  const [productLink, setProductLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showAllChannels, setShowAllChannels] = useState(false);
  const [copied, setCopied] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [error, setError] = useState("");

  // Tier info của user — để hiện đúng % hoàn tiền theo hạng (Bronze 50% / Silver 53% / Gold 55% / VIP 58%)
  const [userTier, setUserTier] = useState<{ ratePercent: number; tierName: string; tierCode: string } | null>(null);
  // Facebook Pinned Post URL — được admin cấu hình trong /admin/settings
  const [facebookPostUrl, setFacebookPostUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tier", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success) return;
        setUserTier({
          ratePercent: d.info.cashbackPercent,
          tierName: d.info.current?.name ?? "Đồng",
          tierCode: d.info.current?.code ?? "bronze",
        });
      })
      .catch(() => { /* silent — fallback 50% */ });
    return () => { cancelled = true; };
  }, []);

  // Fetch Facebook post URL từ settings (public, không cần auth)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success) return;
        setFacebookPostUrl(d.facebookPostUrl || "");
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);

  const handleGenerate = async () => {
    if (!productLink.trim()) return;
    setGenerating(true);
    setCopied(false);
    setError("");
    setProduct(null);

    try {
      const res = await fetch("/api/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl: productLink }),
      });
      const data = await res.json();
      if (data.needLogin) {
        router.push("/?msg=login_required");
        return;
      }
      if (data.success && data.product) {
        setProduct(data.product);
        // Track funnel: link created event
        trackEvent("link_created", {
          cashback_amount: Number(data.product.cashback || 0),
          cashback_rate: String(data.product.cashbackRate || ""),
        });
      } else {
        setError(data.error || "Không thể lấy thông tin sản phẩm");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!product?.affiliateLink) return;
    navigator.clipboard.writeText(product.affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setProductLink("");
    setProduct(null);
    setError("");
    setCopied(false);
  };

  const formatPrice = (n: number) => n.toLocaleString("vi-VN");

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-gray-50 to-gray-50">
      {/* Header đầy đủ — đồng bộ với trang chính /dashboard */}
      <DashboardHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <button onClick={() => router.push("/dashboard")} className="hover:text-orange-500 transition-colors">Trang chủ</button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-600 font-medium">Hoàn Tiền</span>
        </nav>

        {/* Hero Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-2">
            Công Cụ <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400">Hoàn Tiền</span>
          </h1>
          <p className="text-sm text-gray-500 max-w-md">
            Chọn sàn thương mại điện tử và dán link sản phẩm để lấy link mua sắm hoàn{" "}
            <strong className="text-orange-500">{userTier?.ratePercent ?? 50}%</strong> tiền hoa hồng
            {userTier && userTier.tierCode !== "bronze" && (
              <span className="ml-1 text-amber-600 font-semibold">(hạng {userTier.tierName})</span>
            )}
            .
          </p>
        </div>

        {/* ═══ STEP 1: CHỌN KÊNH ═══ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">1</div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Chọn Kênh Hoàn Tiền</h2>
          </div>

          <div className="flex flex-wrap gap-2.5 mb-3">
            {(showAllChannels ? [...channels, ...extraChannels] : channels).map((ch) => {
              const Icon = ch.Icon;
              return (
              <button
                key={ch.name}
                onClick={() => { if (ch.active) { setSelectedChannel(ch.name); setTimeout(() => document.getElementById("dan-link")?.scrollIntoView({ behavior: "smooth", block: "center" }), 100); } }}
                disabled={!ch.active}
                className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                  ch.active && selectedChannel === ch.name
                    ? "border-orange-400 bg-orange-50 shadow-sm text-gray-800"
                    : ch.active
                    ? "border-gray-200 hover:border-orange-200 text-gray-700 cursor-pointer"
                    : "border-gray-100 bg-gray-50/80 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Icon size={28} className="shrink-0" />
                {ch.name}
                {!ch.active && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full leading-none uppercase tracking-wider shadow-sm">
                    Coming&nbsp;soon
                  </span>
                )}
              </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowAllChannels((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors"
            aria-expanded={showAllChannels}
          >
            {showAllChannels ? "Thu gọn" : "Xem thêm 2 kênh khác"}
            <svg
              viewBox="0 0 24 24"
              className={`w-3.5 h-3.5 transition-transform ${showAllChannels ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* ═══ LƯU Ý + QUY TRÌNH (full width) ═══ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6">
          {/* Lưu Ý Quan Trọng */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Lưu Ý Quan Trọng</h2>
              <p className="text-[11px] text-gray-400">Đọc kỹ để đảm bảo nhận điểm mua sắm</p>
            </div>
          </div>

          <div className="space-y-2.5 mb-6 pl-1">
            {[
              { num: "1", text: <><span className="font-semibold">Xóa sản phẩm tương tự</span> đã có trong giỏ hàng trước khi bấm link.</>, color: "text-red-500" },
              { num: "2", text: <><span className="font-semibold">Không bấm link khác</span> (live, video, quảng cáo) khi đang mua hàng.</>, color: "text-orange-500" },
              { num: "3", text: <>Hoàn tất mua hàng trong <span className="font-semibold">cùng một phiên</span> trình duyệt.</>, color: "text-blue-500" },
              { num: "4", text: <>Việc ghi nhận đơn hàng là do <span className="font-semibold">đối tác (sàn TMĐT)</span> quyết định. V-Affiliate <span className="font-semibold">không thể can thiệp</span>.</>, color: "text-gray-500" },
            ].map((note, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`text-xs font-bold ${note.color} mt-0.5 shrink-0 w-4 text-center`}>{note.num}</span>
                <p className="text-[13px] text-gray-600 leading-relaxed">{note.text}</p>
              </div>
            ))}
          </div>

          {/* Quy Trình Hoàn Tiền — 2x2 grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { platform: "SHOPEE, TIKTOK", label: "Ghi nhận", highlight: "hôm sau", icon: "⚡", bg: "bg-amber-50", border: "border-amber-200" },
              { platform: "LAZADA", label: "Ghi nhận", highlight: "tối đa 48h", icon: "⏱️", bg: "bg-blue-50", border: "border-blue-200" },
              { platform: "SHOPEE", label: "Duyệt trong", highlight: "7-14 ngày", icon: "📋", bg: "bg-green-50", border: "border-green-200" },
              { platform: "SÀN KHÁC", label: "Duyệt cam kết", highlight: "≤ 30 ngày", icon: "✅", bg: "bg-emerald-50", border: "border-emerald-200" },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} border ${s.border} rounded-xl p-4 text-center`}>
                <div className="text-lg mb-1">{s.icon}</div>
                <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">{s.platform}</p>
                <p className="text-sm text-gray-700">{s.label} <span className="font-bold text-orange-500">{s.highlight}</span></p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ STEP 2: DÁN LINK (bottom) ═══ */}
        <div id="dan-link" className="mb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">2</div>
            <h2 className="text-lg font-bold text-gray-800">Dán Link Sản Phẩm</h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            {/* Input row */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                  placeholder="Dán link sản phẩm vào đây..."
                  className="w-full pl-10 pr-16 py-3.5 border-2 border-gray-200 rounded-full text-base focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                />
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {productLink && (
                  <button onClick={handleClear} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                )}
              </div>
              <button
                onClick={handleGenerate}
                disabled={!productLink.trim() || generating}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-7 py-3.5 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm shadow-orange-200 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang chuyển đổi...
                  </>
                ) : (
                  <>
                    Chuyển đổi
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </>
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* Product Result Card - Redesigned for conversion */}
            {product && (
              <div className="mt-6">
                {/* ─── Conversion Panel ─── */}
                <div className="bg-white border-2 border-orange-200 rounded-2xl shadow-lg shadow-orange-100 overflow-hidden">

                  {/* Panel Header — Trust Badge */}
                  <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 bg-[length:200%_100%] animate-shimmer px-5 py-3.5 flex items-center justify-between overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-white font-black text-sm">Link đã gắn hoàn tiền!</span>
                        <p className="text-white/70 text-[11px] font-medium">Shopee sẽ ghi nhận đơn hàng tự động</p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                      <span className="text-white text-[11px] font-bold">{product?.cashbackRate ?? 50}% hoàn tiền</span>
                    </div>
                  </div>

                  {/* Product + Cashback Row */}
                  <div className="p-4">
                    <div className="flex gap-3 items-start">

                      {/* Product thumbnail */}
                      {product.image && (
                        <div className="shrink-0">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-16 h-16 object-contain rounded-xl bg-gray-50 border border-gray-100"
                          />
                        </div>
                      )}

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-base font-black text-gray-900">đ{formatPrice(product.price)}</span>
                          {product.shop && (
                            <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{product.shop}</span>
                          )}
                        </div>
                      </div>

                      {/* Cashback badge — compact pill, top-aligned */}
                      <div className="shrink-0 text-right">
                        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl px-3 py-2 text-center shadow-md shadow-orange-500/20">
                          <p className="text-[9px] text-white/80 font-semibold uppercase tracking-wide leading-none mb-0.5">Cashback</p>
                          <p className="text-lg font-black text-white leading-none">
                            đ{formatPrice(product.cashback)}
                          </p>
                          <div className="mt-1 bg-white/20 rounded-full px-1.5 py-0.5">
                            <p className="text-[10px] font-bold text-white">
                              ≈ {product.cashbackRate ?? 50}%
                              {product.tierName && product.tierCode !== "bronze" && (
                                <span className="font-medium"> ({product.tierName})</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent" />

                  {/* ─── CTA Section ─── */}
                  <div className="px-4 pb-4">

                    {/* Primary: MUA NGAY — vivid with shimmer pulse */}
                    <a
                      href={product.affiliateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative flex items-center justify-center gap-2.5 w-full text-white text-sm font-black py-3.5 rounded-xl overflow-hidden mb-3"
                    >
                      {/* Animated background */}
                      <span className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 bg-[length:200%_100%] animate-shimmer" />
                      {/* Shadow */}
                      <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 translate-y-0.5" />
                      {/* Content */}
                      <span className="relative flex items-center gap-2.5">
                        <span className="text-base">🛒</span>
                        MUA NGAY — CASHBACK SẼ VỀ VÍ
                        <svg viewBox="0 0 24 24" className="w-4 h-4 relative transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </span>
                    </a>

                    {/* Trust strip */}
                    <div className="flex items-center justify-center gap-4 mb-3">
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                        Không phát sinh phí
                      </div>
                      <div className="w-px h-3 bg-gray-200" />
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                        Hệ thống tự ghi nhận
                      </div>
                      <div className="w-px h-3 bg-gray-200" />
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                        Miễn phí sử dụng
                      </div>
                    </div>

                    {/* Secondary actions row */}
                    <div className="flex gap-2.5">
                      <button
                        onClick={handleCopy}
                        className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold px-3 py-3 rounded-xl border-2 transition-all ${
                          copied
                            ? "border-emerald-300 bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-200"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50 hover:shadow-sm"
                        }`}
                      >
                        {copied ? (
                          <>
                            <svg viewBox="0 0 24 24" className="w-4 h-4 animate-btn-pop" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            <span>Đã copy!</span>
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                            </svg>
                            <span>Sao chép link</span>
                          </>
                        )}
                      </button>

                      {/* Facebook — chỉ hiện khi có facebook_post_url */}
                      {facebookPostUrl && (
                        <a
                          href={facebookPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-[2] relative flex items-center justify-center gap-2 text-white text-xs font-bold px-3 py-3 rounded-xl overflow-hidden"
                        >
                          <span className="absolute inset-0 bg-blue-500" />
                          <span className="relative flex items-center gap-1.5">
                            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            Mở bài ghim Facebook
                            <span className="bg-white/20 dark:bg-white/30 text-[9px] font-black px-1 py-0.5 rounded-md">+Voucher</span>
                          </span>
                        </a>
                      )}
                    </div>

                    {/* Voucher callout — chỉ hiện khi có Facebook URL */}
                    {facebookPostUrl && (
                      <div className="mt-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">🎁</span>
                          <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400">Nhận voucher Facebook — 3 bước đơn giản:</p>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">Bấm <b>&ldquo;Sao chép link&rdquo;</b> bên trên để copy link mua hàng.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">Bấm <b>&ldquo;Mở bài ghim Facebook&rdquo;</b> để mở bài viết ghim, sau đó <b>dán link đã copy</b> vào comment bài viết đó.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">Bấm vào <b>link trong comment</b> vừa đăng — Shopee sẽ mở ra với <b>voucher đã được áp dụng sẵn</b>. Mua hàng như bình thường để nhận cả voucher lẫn cashback.</p>
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] text-blue-500 dark:text-blue-500/80 italic border-t border-blue-100 dark:border-blue-900/50 pt-2">
                          💡 Lưu ý: Cashback hoàn toàn không phụ thuộc voucher. Dù có hay không có voucher, bạn vẫn nhận đủ {product?.cashbackRate ?? 50}% cashback về ví.
                        </p>
                      </div>
                    )}

                    {/* Guarantee */}
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      <p className="text-[11px] text-emerald-600 font-medium">
                        Đảm bảo {product.cashbackRate ?? 50}% cashback về ví · Không phát sinh phí · Miễn phí sử dụng
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-3">
            Mỗi đơn mua qua link đều được hoàn tiền minh bạch về ví của bạn.
          </p>
        </div>

        {/* ═══ TWO-COLUMN: Hướng Dẫn + placeholder ═══ */}
        <div className="mb-8">

          {/* ── Hướng Dẫn Sử Dụng ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Header — professional */}
            <div className="px-6 pt-6 sm:px-8 sm:pt-8 pb-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span className="text-[11px] font-bold text-orange-500 uppercase tracking-widest">Hướng dẫn</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                    Cách mua &amp; nhận hoàn tiền
                  </h2>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                    Theo 3 bước đơn giản để vừa tiết kiệm chi phí, vừa nhận hoàn tiền tối đa về ví.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-full px-3 py-1.5">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    <span className="text-[11px] font-bold text-orange-600">Hoàn tiền {product?.cashbackRate ?? 50}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content with max-height + fade */}
            <div className="relative">
              <div
                className={`px-6 sm:px-8 pt-5 pb-2 space-y-6 transition-all duration-500 ease-in-out overflow-hidden ${
                  showGuide ? "max-h-[3000px]" : "max-h-[400px]"
                }`}
              >

                {/* ── 2-Column Overview Stats ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cashback stat */}
                  <div className="relative bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 rounded-2xl p-4 overflow-hidden group hover:shadow-md hover:shadow-orange-100 dark:hover:shadow-orange-900/20 transition-all">
                    <div className="absolute right-0 top-0 w-24 h-24 rounded-full bg-orange-100/60 dark:bg-orange-900/30 -translate-y-6 translate-x-6" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-orange-500 dark:bg-orange-600 flex items-center justify-center shadow-sm shadow-orange-200 dark:shadow-orange-900/50">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        </div>
                        <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Hoàn tiền</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-orange-100 leading-none mb-0.5">{product?.cashbackRate ?? 50}%</p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">Mỗi đơn mua — tự động về ví ngay khi đơn hoàn tất, không cần thao tác thêm.</p>
                    </div>
                  </div>

                  {/* Voucher stat */}
                  <div className="relative bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 overflow-hidden group hover:shadow-md hover:shadow-blue-100 dark:hover:shadow-blue-900/20 transition-all">
                    <div className="absolute right-0 top-0 w-24 h-24 rounded-full bg-blue-100/60 dark:bg-blue-900/30 -translate-y-6 translate-x-6" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-500 dark:bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200 dark:shadow-blue-900/50">
                          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 12 20 22 4 22 4 12" /><rect width="22" height="5" x="1" y="3" rx="1" /><line width="22" x1="12" x2="12" y1="3" y2="8" />
                          </svg>
                        </div>
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Voucher</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-blue-100 leading-none mb-0.5">Shopee</p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">Voucher giảm giá bổ sung từ Facebook — áp dụng tự động ở bước thanh toán.</p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-100 dark:bg-slate-700" />
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium uppercase tracking-widest">Chọn luồng phù hợp với bạn</span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-slate-700" />
                </div>

                {/* Luồng Facebook khuyến nghị */}
                {facebookPostUrl && (
                  <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-base font-black text-gray-900 dark:text-gray-100">Luồng khuyến nghị</h3>
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">+Voucher</span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">Nhận cả hoàn tiền lẫn voucher giảm giá Shopee</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/30 rounded-full px-2.5 py-1">
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        Khuyến nghị
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
                      {[
                        { n: "1", text: "Bấm &ldquo;Sao chép link&rdquo;", sub: "Copy link đã gắn mã hoàn tiền" },
                        { n: "2", text: "Mở bài ghim Facebook", sub: "Dán link vừa copy vào comment" },
                        { n: "3", text: "Bấm link trong comment", sub: "Shopee mở ra kèm voucher" },
                        { n: "4", text: "Mua & nhận hoàn tiền", sub: "Cashback + voucher đều được ghi nhận" },
                      ].map(({ n, text, sub }) => (
                        <div key={n} className="relative">
                          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl p-3.5 h-full">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-blue-50 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 text-[11px] font-black">{n}</div>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-100 leading-tight">{text}</p>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{sub}</p>
                          </div>
                          {n !== "4" && (
                            <div className="hidden sm:flex absolute right-[-13px] top-1/2 -translate-y-1/2 z-10">
                              <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <a
                      href={facebookPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-sm overflow-hidden"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span>Mở bài ghim Facebook — Nhận voucher ngay</span>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </a>
                  </div>
                )}

                {/* Luồng Direct */}
                <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-700 dark:text-gray-200">Luồng nhanh — Chỉ cần hoàn tiền</h3>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">Không cần voucher — tiền vẫn về đủ {product?.cashbackRate ?? 50}%</p>
                    </div>
                  </div>

                  <div className="relative pl-9 pb-5 border-l border-gray-200 dark:border-slate-700 ml-3 space-y-5">
                    <div className="relative">
                      <div className="absolute left-[-25px] top-0 w-6 h-6 rounded-full bg-gray-400 dark:bg-slate-600 flex items-center justify-center text-white text-[11px] font-black shadow-sm">1</div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Tạo link hoàn tiền</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        Dán link sản phẩm Shopee vào ô bên trên → bấm <span className="font-semibold text-orange-600 dark:text-orange-400">Chuyển đổi</span>.
                        Hệ thống tạo link gắn mã hoàn tiền của bạn tự động.
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute left-[-25px] top-0 w-6 h-6 rounded-full bg-gray-400 dark:bg-slate-600 flex items-center justify-center text-white text-[11px] font-black shadow-sm">2</div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Mua hàng qua link</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                        Bấm <span className="font-semibold text-orange-600 dark:text-orange-400">MUA NGAY</span> để mở app Shopee.
                      </p>
                      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 flex items-start gap-2">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400">Dùng máy tính? Bấm <span className="font-semibold">&ldquo;Sao chép link&rdquo;</span> rồi gửi sang điện thoại để mở app Shopee.</p>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute left-[-25px] top-0 w-6 h-6 rounded-full bg-emerald-400 dark:bg-emerald-600 flex items-center justify-center text-white text-[11px] font-black shadow-sm">
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Nhận hoàn tiền tự động</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        Sau khi nhận hàng, <span className="font-bold text-orange-600 dark:text-orange-400">{product?.cashbackRate ?? 50}% hoa hồng</span> tự động về ví — không cần làm gì thêm.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mẹo */}
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4">
                  <div className="w-7 h-7 rounded-lg bg-orange-500 dark:bg-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">Mẹo tối ưu chi phí</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300/80 leading-relaxed">
                      Gộp nhiều món vào cùng 1 đơn vừa tiết kiệm phí ship, vừa dễ đạt điều kiện Shopee voucher.
                      Cashback vẫn tính đủ trên tổng giá trị đơn.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fade overlay */}
              {!showGuide && (
                <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white dark:from-[#09090b] via-white/85 dark:via-[#09090b]/85 to-transparent pointer-events-none" />
              )}
            </div>

            {/* Expand / Collapse */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-center gap-2 py-3.5 border-t border-gray-100 dark:border-slate-700 text-sm font-semibold text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50/40 dark:hover:bg-orange-950/20 transition-colors"
            >
              <span className="dark:text-orange-100">{showGuide ? "Thu gọn hướng dẫn" : "Xem hướng dẫn mua & nhận hoàn tiền"}</span>
              <svg
                viewBox="0 0 24 24"
                className={`w-4 h-4 transition-transform duration-300 ${showGuide ? "rotate-180" : "animate-bounce"}`}
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4">
          V-Affiliate — mua sắm Shopee thông minh, hoàn tiền về ví.
        </p>
      </main>
      <Footer />
    </div>
  );
}


