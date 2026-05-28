"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { trackEvent } from "@/components/Analytics";
import {
  ClockIcon3D,
  GridIcon3D,
  HelpIcon3D,
  LinkIcon3D,
  OrdersIcon3D,
  ReferralIcon3D,
  WalletIcon3D,
} from "@/components/nav-icons-3d";
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
import { ShareTargetsPanel } from "@/components/ShareTargetsPanel";

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
  // hasCopiedOnce: đã từng copy ít nhất 1 lần với link hiện tại → mở khoá panel
  // group V-Affiliate. Reset khi tạo link mới hoặc clear. Khác với `copied`
  // (chỉ flash 2s cho hiệu ứng "Đã copy" trên nút).
  const [hasCopiedOnce, setHasCopiedOnce] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [error, setError] = useState("");

  // Tier info của user — để hiện đúng % hoàn tiền theo hạng (Bronze 50% / Silver 53% / Gold 55% / VIP 58%)
  const [userTier, setUserTier] = useState<{ ratePercent: number; tierName: string; tierCode: string } | null>(null);

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

  const handleGenerate = async () => {
    if (!productLink.trim()) return;
    setGenerating(true);
    setCopied(false);
    setHasCopiedOnce(false); // tạo link mới → reset trạng thái panel group
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
    setHasCopiedOnce(true); // sticky — chỉ reset khi tạo link mới hoặc clear
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setProductLink("");
    setProduct(null);
    setError("");
    setCopied(false);
    setHasCopiedOnce(false);
  };

  const formatPrice = (n: number) => n.toLocaleString("vi-VN");

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-gray-50 to-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="cursor-pointer"
              title="Về trang chủ"
            >
              <CaffiliateLogo />
            </button>
            <div className="hidden md:block h-6 w-px bg-gray-200" />
            <nav className="hidden md:flex items-center gap-1">
              {([
                { key: "overview" as const, label: "Tổng quan", Icon: GridIcon3D, href: "/dashboard" },
                { key: "create-link" as const, label: "Tạo link", Icon: LinkIcon3D, href: "/dashboard/cashback" },
                { key: "orders" as const, label: "Đơn hàng", Icon: OrdersIcon3D, href: "/dashboard?tab=orders" },
                { key: "wallet" as const, label: "Ví tiền", Icon: WalletIcon3D, href: "/dashboard?tab=wallet" },
                { key: "link-history" as const, label: "Lịch sử link", Icon: ClockIcon3D, href: "/dashboard?tab=link-history" },
                { key: "help" as const, label: "Hướng dẫn", Icon: HelpIcon3D, href: "/dashboard/help" },
                { key: "referral" as const, label: "Giới thiệu", Icon: ReferralIcon3D, href: "/dashboard/referral" },
              ]).map((item) => {
                const isActive = item.key === "create-link";
                const Icon = item.Icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (item.key === "create-link") return;
                      router.push(item.href);
                    }}
                    className={`nav-bubble group relative flex items-center justify-center w-10 h-10 rounded-full transition-transform ${
                      isActive ? "scale-110" : "hover:scale-105"
                    }`}
                    data-active={isActive ? "true" : "false"}
                    title={item.label}
                  >
                    <Icon active={isActive} size={32} />
                    {isActive && (
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-orange-600 whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 font-medium transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <button onClick={() => router.push("/dashboard")} className="hover:text-orange-500 transition-colors">Trang chủ</button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-600 font-medium">Hoàn Tiền</span>
        </nav>

        {/* Hero Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">
            Công Cụ <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400">Hoàn Tiền</span>
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
                  className="w-full pl-10 pr-16 py-3.5 border-2 border-gray-200 rounded-full text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
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
                    Đang tạo...
                  </>
                ) : (
                  <>
                    Lấy Link
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

            {/* Product Result Card */}
            {product && (
              <div className="mt-5">
                <div className="h-1 w-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 mb-5" />

                {/* Product info — ảnh + tên */}
                <div className="flex gap-4 mb-5">
                  {product.image ? (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-gray-200 shrink-0 bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Ảnh sản phẩm từ Shopee CDN, host bất kỳ, không biết trước để cấu hình next/image */}
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl border border-gray-200 shrink-0 bg-gray-50 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" x2="21" y1="6" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                        SHOPEE
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 leading-snug line-clamp-3">{product.name}</h3>
                    {product.price > 0 && (
                      <p className="text-lg font-extrabold text-red-500 mt-1">₫{formatPrice(product.price)}</p>
                    )}
                  </div>
                </div>

                {/* Hoa hồng + Hoàn tiền */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-green-600 text-lg font-bold">%</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Hoa hồng đối tác</p>
                      <p className="text-base font-bold text-green-600">{product.commissionRate || "0%"}</p>
                      <p className="text-xs text-green-500">~đ{formatPrice(product.commission)}</p>
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wider">
                        Hoàn tiền {product.cashbackRate ?? 50}% cho bạn
                        {product.tierName && product.tierCode !== "bronze" && (
                          <span className="ml-1 text-amber-500 normal-case font-bold">({product.tierName})</span>
                        )}
                      </p>
                      <p className="text-base font-bold text-orange-500">~đ{formatPrice(product.cashback)}</p>
                    </div>
                  </div>
                </div>

                {/* Link hoàn tiền — link Shopee đầy đủ với mmp_pid + sub_id của user.
                    Khi share lên FB:
                      - Trang cá nhân: FB có thể không auto-link nếu domain mới
                        chưa được FB trust (hiện tại Shopee LUÔN xanh).
                      - Group / Page: FB auto-link bình thường → khuyến nghị
                        user share vào group bằng nút "Đăng vào nhóm" bên dưới. */}
                <div className="border border-gray-200 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-400 mb-2">Link hoàn tiền:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={product.affiliateLink}
                      readOnly
                      className="flex-1 text-sm text-gray-600 bg-transparent outline-none font-mono truncate"
                    />
                    <button
                      onClick={handleCopy}
                      className={`p-2 rounded-lg transition-all shrink-0 ${
                        copied ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                      title="Sao chép"
                    >
                      {copied ? (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* "Đăng vào nhóm" — workaround cho FB anti-spam:
                    FB không auto-link domain mới ở wall cá nhân nhưng VẪN auto-link
                    trong group. User lưu sẵn link group → bấm 1 nút mở group/page,
                    paste link đã copy là xong. */}
                <ShareTargetsPanel hasCopied={hasCopiedOnce} onCopyAgain={handleCopy} />

                {/* CTA Buttons — Copy link + Mua ngay */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handleCopy}
                    className={`flex items-center justify-center gap-2 text-white text-sm font-bold py-4 rounded-xl transition-all shadow-sm ${
                      copied
                        ? "bg-green-500"
                        : "bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600"
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ĐÃ COPY LINK
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        COPY LINK
                      </>
                    )}
                  </button>
                  {/*
                    Nút "Mua ngay" — mở link affiliate trong tab mới.
                    Quan trọng: link đã chứa `mmp_pid=an_<SHOPEE_AFFILIATE_ID>` và
                    `sub_id1=uid_<userId>`. Khi user mua xong và bạn export CSV từ
                    Shopee Affiliate Center → import vào admin → hệ thống tự match
                    sub_id để gán đơn về đúng user.
                  */}
                  <a
                    href={product.affiliateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-white text-sm font-bold py-4 rounded-xl transition-all shadow-sm bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    MUA NGAY
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17l9.2-9.2M17 17V7H7" />
                    </svg>
                  </a>
                </div>

                {/* Chú ý */}
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-yellow-700 mb-1.5">✨ Cách săn thêm voucher:</p>
                    <ul className="text-xs text-yellow-600 leading-relaxed space-y-0.5 list-none">
                      <li>• Comment link vào <span className="font-semibold">bài ghim group V-Affiliate</span></li>
                      <li>• <span className="font-semibold">Voucher 20-25% từ social media</span> sẽ ngẫu nhiên xuất hiện tuỳ shop có đang chạy chiến dịch</li>
                      <li>• Nếu không có voucher: cứ mua bình thường, <span className="font-semibold">tiền hoàn vẫn được cập nhật đầy đủ</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-3">
            Hệ thống tự động phát hiện và tối ưu hóa hoa hồng tốt nhất cho bạn.
          </p>
        </div>

        {/* ═══ TWO-COLUMN: Hướng Dẫn + placeholder ═══ */}
        <div className="mb-8">

          {/* ── Hướng Dẫn Sử Dụng ── */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 text-sm px-6 pt-5 sm:px-8">
              <span className="text-orange-500 text-base">✨</span>
              <span className="text-gray-600">Cách săn thêm</span>
              <span className="font-bold text-gray-800">voucher 20-25%</span>
              <span className="text-gray-600">từ Shopee</span>
            </div>

            {/* Content with max-height + fade */}
            <div className="relative">
              <div
                className={`px-6 sm:px-8 pt-4 pb-2 space-y-5 transition-all duration-500 ease-in-out overflow-hidden ${
                  showGuide ? "max-h-[2000px]" : "max-h-[320px]"
                }`}
              >
                {/* Tổng quan voucher social */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🎁</span>
                    <h3 className="text-sm font-bold text-gray-800">Voucher social từ Shopee là gì?</h3>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-3 ml-6">
                    <p className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                      <span className="text-orange-500 shrink-0">💰</span>
                      <span>
                        Khi bạn comment link sản phẩm vào <span className="font-bold">bài viết ghim trong group V-Affiliate</span>,
                        Shopee có thể tặng thêm <span className="font-bold text-orange-600">voucher giảm 20-25%</span> trên giá sản phẩm.
                        Voucher xuất hiện <span className="font-semibold">ngẫu nhiên</span> tuỳ shop có chạy chiến dịch hay không.
                      </span>
                    </p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 ml-6">
                    <p className="text-xs text-gray-700">
                      <span className="text-emerald-600 font-bold">✓ Yên tâm:</span> Dù có voucher hay không,
                      <span className="font-bold"> tiền hoàn 50% vẫn về ví đầy đủ</span> như đã cam kết.
                    </p>
                  </div>
                </div>

                {/* Chiến thuật 3 bước */}
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-4">Quy trình 3 bước</p>

                  <div className="relative pl-10 pb-6 border-l-2 border-orange-200 ml-3">
                    <div className="absolute left-[-13px] top-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-orange-200">1</div>
                    <h4 className="text-sm font-bold text-gray-800 mb-1">Tạo link và bấm COPY LINK</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Dán link sản phẩm Shopee vào ô phía trên → bấm <span className="font-semibold">Lấy Link</span>.
                      Sau khi hệ thống tạo xong, bấm <span className="font-semibold text-orange-600">COPY LINK</span> để lưu vào clipboard.
                    </p>
                  </div>

                  <div className="relative pl-10 pb-6 border-l-2 border-orange-200 ml-3">
                    <div className="absolute left-[-13px] top-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-orange-200">2</div>
                    <h4 className="text-sm font-bold text-gray-800 mb-1">Mở bài viết ghim group V-Affiliate</h4>
                    <p className="text-xs text-gray-500 leading-relaxed mb-2">
                      Bấm nút <span className="font-semibold text-orange-600">📌 Group V-Affiliate (bài ghim)</span> màu cam đã sáng lên.
                      Tab mới sẽ tự động mở thẳng vào bài viết.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                      <p className="text-[11px] text-blue-700">📘 Group đã đăng ký affiliate với Shopee → comment vào đây mới được nhận voucher social.</p>
                    </div>
                  </div>

                  <div className="relative pl-10 pb-1 ml-3">
                    <div className="absolute left-[-13px] top-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-orange-200">3</div>
                    <h4 className="text-sm font-bold text-gray-800 mb-1">Comment link và quay lại bấm mua</h4>
                    <p className="text-xs text-gray-500 leading-relaxed mb-2">
                      Trong bài viết ghim → kéo xuống ô bình luận → <span className="font-semibold">paste link</span> đã copy → đăng comment.
                      Sau đó bấm vào chính link vừa comment để mở Shopee và mua hàng.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      <p className="text-[11px] text-amber-700">⚡ Nếu shop đang chạy chiến dịch social, voucher 20-25% sẽ tự động áp vào đơn hàng của bạn.</p>
                    </div>
                  </div>
                </div>

                {/* Mẹo thêm */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-xs text-gray-700 leading-relaxed">
                    <span className="text-purple-600 font-bold">💡 Mẹo thêm: Tăng tỉ lệ trúng voucher</span><br />
                    Comment <span className="font-bold">nhiều sản phẩm khác nhau</span> trong cùng phiên mua sắm — voucher social
                    không apply cho mọi shop, càng nhiều link càng tăng cơ hội ít nhất 1 sản phẩm trúng voucher.
                    Mỗi link là 1 lần hệ thống Shopee xét chiến dịch social bonus.
                  </p>
                </div>
              </div>

              {/* Fade overlay + arrow khi chưa mở rộng */}
              {!showGuide && (
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />
              )}
            </div>

            {/* Expand / Collapse button */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-center gap-2 py-3 border-t border-gray-100 text-sm font-medium text-orange-500 hover:text-orange-600 hover:bg-orange-50/30 transition-colors"
            >
              {showGuide ? "Thu gọn" : "Xem hướng dẫn săn voucher đầy đủ"}
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
        <p className="text-center text-xs text-gray-400 pb-4">
          Mọi thông tin tổng hợp và tài liệu mua hàng tốt nhất cho bạn.
        </p>
      </main>
      <Footer />
    </div>
  );
}
