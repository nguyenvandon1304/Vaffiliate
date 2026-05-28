import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * /api/share-image?type=tier&data=<base64> — sinh ảnh PNG động cho user share.
 *
 * Hỗ trợ 3 loại:
 *  - tier: "Tôi vừa lên Silver" với icon + cashback%
 *  - achievement: "Tôi vừa nhận badge X"
 *  - earnings: "Tôi đã tiết kiệm Y đ"
 *
 * Image size 1200x630 — chuẩn OG card.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "tier";
  const username = searchParams.get("u") || "Bạn";
  const display = searchParams.get("name") || username;

  // Format big number
  const fmtBig = (s: string): string => {
    const n = parseInt(s, 10) || 0;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " triệu";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
    return String(n);
  };

  let title = "";
  let subtitle = "";
  let bigText = "";
  let emoji = "🎉";
  let gradient = "linear-gradient(135deg, #fb923c 0%, #f59e0b 50%, #ea580c 100%)";

  if (type === "tier") {
    const tier = searchParams.get("tier") || "Silver";
    const percent = searchParams.get("p") || "53";
    const tierColors: Record<string, string> = {
      Bronze: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #b45309 100%)",
      Silver: "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 50%, #475569 100%)",
      Gold: "linear-gradient(135deg, #fde047 0%, #f59e0b 50%, #c2410c 100%)",
      VIP: "linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #7c3aed 100%)",
    };
    const tierEmoji: Record<string, string> = {
      Bronze: "🥉",
      Silver: "🥈",
      Gold: "🥇",
      VIP: "💎",
    };
    title = "Vừa thăng hạng";
    bigText = tier;
    subtitle = `Hoàn ${percent}% mỗi đơn Shopee`;
    emoji = tierEmoji[tier] || "🏅";
    gradient = tierColors[tier] || gradient;
  } else if (type === "earnings") {
    const amount = searchParams.get("amount") || "0";
    title = "Đã tiết kiệm cùng V-Affiliate";
    bigText = `${fmtBig(amount)}đ`;
    subtitle = "Hoàn tiền 50% mỗi đơn Shopee — đơn giản, minh bạch";
    emoji = "💰";
    gradient = "linear-gradient(135deg, #34d399 0%, #10b981 50%, #047857 100%)";
  } else if (type === "achievement") {
    const badge = searchParams.get("badge") || "Huy hiệu mới";
    title = "Vừa mở khóa";
    bigText = badge;
    subtitle = "Thêm 1 thành tích trong hành trình V-Affiliate";
    emoji = "🏅";
    gradient = "linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #7c3aed 100%)";
  } else {
    // Default fallback
    title = "Tham gia V-Affiliate";
    bigText = "Hoàn 50%";
    subtitle = "Hoa hồng Shopee về thẳng ví";
    emoji = "🎁";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: gradient,
          padding: 60,
          color: "white",
          fontFamily: '"Inter", system-ui, sans-serif',
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative orbs */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -80,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
          }}
        />

        {/* V-Affiliate brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 900,
              color: "#ea580c",
              boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
            }}
          >
            V
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>V-Affiliate</span>
            <span style={{ fontSize: 14, opacity: 0.9 }}>Thương mại liên kết · Hoàn tiền Shopee</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 60, flex: 1 }}>
          <span style={{ fontSize: 26, fontWeight: 700, opacity: 0.95 }}>
            {display} {title.toLowerCase()}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginTop: 22,
            }}
          >
            <span style={{ fontSize: 130 }}>{emoji}</span>
            <span
              style={{
                fontSize: 124,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -3,
                textShadow: "0 6px 20px rgba(0,0,0,0.25)",
              }}
            >
              {bigText}
            </span>
          </div>
          <p style={{ fontSize: 32, fontWeight: 600, opacity: 0.9, marginTop: 24, lineHeight: 1.3 }}>
            {subtitle}
          </p>
        </div>

        {/* CTA footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 16, opacity: 0.85, fontWeight: 600 }}>
              Tham gia cùng tôi tại
            </span>
            <span style={{ fontSize: 28, fontWeight: 900 }}>vaffiliate.vn/r/{username}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "white",
              color: "#ea580c",
              padding: "14px 26px",
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 900,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
          >
            Tham gia →
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    }
  );
}
