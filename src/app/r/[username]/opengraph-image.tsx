import { ImageResponse } from "next/og";
import { getReferralUserInfo, getPublicStats } from "@/lib/db";

export const runtime = "nodejs";
export const alt = "Tham gia V-Affiliate cùng tôi — Hoàn 50% hoa hồng Shopee";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Ctx {
  params: Promise<{ username: string }>;
}

/**
 * Open Graph image động cho /r/[username].
 * Khi user paste link giới thiệu lên FB / Zalo / Telegram, bot crawl URL này
 * và hiện preview card đẹp với:
 *  - Avatar + tên người mời
 *  - Tagline "Hoàn 50% hoa hồng Shopee"
 *  - Stats công khai (X user · Y đ đã hoàn)
 *
 * Dùng Next.js ImageResponse — render server-side, cache CDN edge.
 */
export default async function OGImage({ params }: Ctx) {
  const { username } = await params;
  const [referrer, stats] = await Promise.all([
    getReferralUserInfo(username),
    getPublicStats().catch(() => ({ totalUsers: 0, totalCashback: 0, totalOrders: 0 })),
  ]);

  const displayName = referrer?.displayName || referrer?.username || "Bạn";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Format big number gọn cho display
  const formatBig = (n: number): string => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " tỷ";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "tr";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
    return String(n);
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #fb923c 0%, #f59e0b 50%, #ea580c 100%)",
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
            background: "rgba(253, 224, 71, 0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(244, 63, 94, 0.25)",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 900,
              color: "#ea580c",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            V
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.5 }}>
              V-Affiliate
            </span>
            <span style={{ fontSize: 16, opacity: 0.85, marginTop: 2 }}>
              Thương mại liên kết · Hoàn tiền Shopee
            </span>
          </div>
        </div>

        {/* Main message */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 50, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
              padding: "12px 22px",
              borderRadius: 999,
              alignSelf: "flex-start",
              border: "1px solid rgba(255,255,255,0.35)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 900,
                color: "#ea580c",
              }}
            >
              {avatarLetter}
            </div>
            <span style={{ fontSize: 26, fontWeight: 700 }}>
              {displayName} mời bạn tham gia
            </span>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 900,
              lineHeight: 1.05,
              marginTop: 28,
              letterSpacing: -2.5,
              textShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            Hoàn 50% hoa hồng
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -2.5,
              textShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            cho mỗi đơn Shopee
          </div>
        </div>

        {/* Stats footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: 30,
          }}
        >
          <div style={{ display: "flex", gap: 28 }}>
            {stats.totalUsers >= 10 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 36, fontWeight: 900 }}>🔥 {formatBig(stats.totalUsers)}+</span>
                <span style={{ fontSize: 18, opacity: 0.9 }}>user đã tham gia</span>
              </div>
            )}
            {stats.totalCashback >= 100_000 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 36, fontWeight: 900 }}>💚 {formatBig(stats.totalCashback)}đ</span>
                <span style={{ fontSize: 18, opacity: 0.9 }}>đã hoàn cho user</span>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "white",
              color: "#ea580c",
              padding: "12px 24px",
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 900,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
          >
            Tham gia ngay →
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
