import { Resend } from "resend";

/**
 * Email service — Resend HTTPS API.
 *
 * Tại sao Resend thay vì Gmail SMTP?
 * - Render Free tier BLOCK SMTP outbound (port 25/465/587) chống abuse spam.
 * - Resend dùng HTTPS API → không bị block.
 * - Free 100 email/ngày, 3000/tháng — đủ cho V-Affiliate launch.
 * - DKIM/SPF auto setup khi verify domain → Outlook/Gmail nhận vào Inbox.
 * - Email gửi từ `[email protected]` → branding chuyên nghiệp.
 *
 * Setup:
 *   1. https://resend.com → Sign up + verify domain `vaffiliate.vn`
 *   2. API Keys → Create → copy key
 *   3. Render env:
 *        RESEND_API_KEY=re_xxxxxxxxxxxx
 *        RESEND_FROM_EMAIL=noreply@vaffiliate.vn  (optional, default below)
 *
 * Fallback:
 * - Nếu thiếu RESEND_API_KEY → email sẽ fail với error rõ ràng (không crash).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "V-Affiliate <noreply@vaffiliate.vn>";
const SECURITY_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "V-Affiliate Bảo mật <noreply@vaffiliate.vn>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

async function sendEmail(opts: {
  to: string;
  from?: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: "RESEND_API_KEY chưa cấu hình. Liên hệ admin.",
    };
  }
  try {
    const result = await resend.emails.send({
      from: opts.from ?? FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (result.error) {
      console.error("[Email] Resend error:", result.error);
      return { success: false, error: result.error.message ?? "Resend API error" };
    }
    return { success: true };
  } catch (err) {
    console.error("[Email] Failed to send:", err);
    return { success: false, error: "Không thể gửi email. Vui lòng thử lại sau." };
  }
}

export async function sendPasswordResetEmail(to: string, username: string, resetToken: string): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://vaffiliate.vn";
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 32px 24px; text-align: center;">
            <div style="display: inline-block; width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: 800; color: white; margin-bottom: 12px;">V</div>
            <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700;">V-Affiliate</h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 4px 0 0 0;">Thương mại liên kết</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 24px;">
            <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 8px 0;">Đặt lại mật khẩu</h2>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              Xin chào <strong>${username}</strong>, chúng tôi nhận được yêu cầu đặt lại mật khẩu. Nhấn nút bên dưới để tạo mật khẩu mới:
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">
                ĐẶT LẠI MẬT KHẨU
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 16px 0 0 0;">
              Link có hiệu lực trong <strong>30 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            </p>
            <p style="color: #d1d5db; font-size: 11px; text-align: center; margin: 24px 0 0 0;">
              V-Affiliate Team · 2026
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return sendEmail({
    to,
    subject: "Đặt lại mật khẩu - V-Affiliate",
    html,
  });
}

export async function sendEmailVerification(
  to: string,
  username: string,
  verifyToken: string,
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://vaffiliate.vn";
  const verifyLink = `${baseUrl}/verify-email?token=${verifyToken}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 32px 24px; text-align: center;">
            <div style="display: inline-block; width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: 800; color: white; margin-bottom: 12px;">V</div>
            <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700;">V-Affiliate</h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 4px 0 0 0;">Thương mại liên kết</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 24px;">
            <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 8px 0;">Xác thực email</h2>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              Xin chào <strong>${username}</strong>, cảm ơn bạn đã đăng ký V-Affiliate. Vui lòng xác thực email để kích hoạt tài khoản:
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${verifyLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">
                XÁC THỰC EMAIL
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 16px 0 0 0;">
              Link có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email.
            </p>
            <p style="color: #d1d5db; font-size: 11px; text-align: center; margin: 24px 0 0 0;">
              V-Affiliate Team · 2026
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return sendEmail({
    to,
    subject: "Xác thực email - V-Affiliate",
    html,
  });
}

export async function sendNewDeviceAlertEmail(
  to: string,
  username: string,
  meta: { ip: string | null; userAgent: string | null; loginAt: Date },
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://vaffiliate.vn";
  const securityUrl = `${baseUrl}/dashboard/security`;
  const time = meta.loginAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 32px 24px; text-align: center;">
            <div style="display: inline-block; width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; line-height: 48px; font-size: 26px; font-weight: 800; color: white; margin-bottom: 12px;">⚠</div>
            <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700;">Phát hiện đăng nhập mới</h1>
            <p style="color: rgba(255,255,255,0.85); font-size: 12px; margin: 4px 0 0 0;">V-Affiliate Bảo Mật</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 24px;">
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              Xin chào <strong>${username}</strong>, tài khoản của bạn vừa đăng nhập từ <strong>thiết bị mới</strong>.
            </p>
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 6px 0; color: #9a3412; font-size: 13px;"><strong>Thời gian:</strong> ${time}</p>
              <p style="margin: 0 0 6px 0; color: #9a3412; font-size: 13px;"><strong>IP:</strong> ${meta.ip ?? "—"}</p>
              <p style="margin: 0; color: #9a3412; font-size: 13px;"><strong>Trình duyệt:</strong> ${(meta.userAgent ?? "—").slice(0, 80)}</p>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
              Nếu <strong>không phải bạn</strong>, hãy đổi mật khẩu ngay và đăng xuất tất cả thiết bị.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${securityUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 700;">
                QUẢN LÝ BẢO MẬT
              </a>
            </div>
            <p style="color: #d1d5db; font-size: 11px; text-align: center; margin: 16px 0 0 0;">
              V-Affiliate Team · 2026
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return sendEmail({
    to,
    from: SECURITY_FROM_EMAIL,
    subject: "[Bảo mật] Đăng nhập từ thiết bị mới — V-Affiliate",
    html,
  });
}


interface WeeklyStats {
  weekCashback: number;
  weekOrders: number;
  totalCashback: number;
  walletBalance: number;
  pendingOrders: number;
  newReferrals: number;
}

/**
 * Email digest tuần — gửi mỗi Chủ Nhật cho user active.
 * Nội dung: stats tuần qua + reminder + CTA quay lại app.
 */
export async function sendWeeklyDigestEmail(
  to: string,
  username: string,
  stats: WeeklyStats,
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://vaffiliate.vn";
  const dashLink = `${baseUrl}/dashboard`;

  const fmt = (n: number) => n.toLocaleString("vi-VN");

  return sendEmail({
    to,
    subject: `📊 V-Affiliate tuần qua của bạn — ${fmt(stats.weekCashback)}đ`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fff;">
        <div style="text-align: center; padding: 24px 0; border-bottom: 2px solid #fb923c;">
          <h1 style="color: #ea580c; font-size: 28px; margin: 0; font-weight: 900;">V-Affiliate</h1>
          <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0;">Báo cáo tuần qua</p>
        </div>

        <div style="padding: 24px 0;">
          <p style="color: #1f2937; font-size: 16px; margin: 0 0 12px;">Chào <strong>${username}</strong>,</p>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Đây là tóm tắt hoạt động V-Affiliate trong 7 ngày qua của bạn.
          </p>

          <!-- Big number: cashback this week -->
          <div style="background: linear-gradient(135deg, #fb923c, #f59e0b); border-radius: 16px; padding: 24px; text-align: center; color: white; margin-bottom: 20px;">
            <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.9; margin: 0; font-weight: 700;">
              Tiết kiệm tuần này
            </p>
            <p style="font-size: 42px; font-weight: 900; margin: 6px 0 0; line-height: 1;">
              ${fmt(stats.weekCashback)}đ
            </p>
            <p style="font-size: 13px; opacity: 0.9; margin: 8px 0 0;">
              Từ <strong>${stats.weekOrders}</strong> đơn hoàn tiền
            </p>
          </div>

          <!-- Stats grid -->
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 24px;">
            <tr>
              <td style="width: 50%; padding: 12px; vertical-align: top;">
                <div style="background: #ecfdf5; border-radius: 12px; padding: 14px;">
                  <p style="font-size: 10px; color: #047857; font-weight: 700; text-transform: uppercase; margin: 0; letter-spacing: 1px;">Số dư ví</p>
                  <p style="font-size: 22px; color: #059669; font-weight: 900; margin: 4px 0 0;">${fmt(stats.walletBalance)}đ</p>
                </div>
              </td>
              <td style="width: 50%; padding: 12px; vertical-align: top;">
                <div style="background: #fef3c7; border-radius: 12px; padding: 14px;">
                  <p style="font-size: 10px; color: #b45309; font-weight: 700; text-transform: uppercase; margin: 0; letter-spacing: 1px;">Đơn chờ duyệt</p>
                  <p style="font-size: 22px; color: #d97706; font-weight: 900; margin: 4px 0 0;">${stats.pendingOrders}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width: 50%; padding: 12px; vertical-align: top;">
                <div style="background: #fef3c7; border-radius: 12px; padding: 14px;">
                  <p style="font-size: 10px; color: #b45309; font-weight: 700; text-transform: uppercase; margin: 0; letter-spacing: 1px;">Lifetime cashback</p>
                  <p style="font-size: 22px; color: #d97706; font-weight: 900; margin: 4px 0 0;">${fmt(stats.totalCashback)}đ</p>
                </div>
              </td>
              <td style="width: 50%; padding: 12px; vertical-align: top;">
                <div style="background: #fce7f3; border-radius: 12px; padding: 14px;">
                  <p style="font-size: 10px; color: #be185d; font-weight: 700; text-transform: uppercase; margin: 0; letter-spacing: 1px;">Bạn mời tuần</p>
                  <p style="font-size: 22px; color: #db2777; font-weight: 900; margin: 4px 0 0;">${stats.newReferrals}</p>
                </div>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${dashLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">
              MỞ DASHBOARD
            </a>
          </div>

          <!-- Tips section -->
          <div style="background: #fff7ed; border-left: 4px solid #fb923c; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="color: #9a3412; font-size: 13px; margin: 0 0 6px; font-weight: 700;">💡 Mẹo tuần này</p>
            <p style="color: #7c2d12; font-size: 13px; margin: 0; line-height: 1.6;">
              Mời 1 bạn bè đăng ký + có đơn đầu tiên = +1 active referral. Đủ 25 → lên Silver (cashback 53% mỗi đơn vĩnh viễn).
            </p>
          </div>

          <p style="color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center; margin: 24px 0 0;">
            Bạn nhận email này vì đăng ký V-Affiliate. <a href="${baseUrl}/dashboard/security" style="color: #ea580c; text-decoration: underline;">Cài đặt thông báo</a>.
          </p>
        </div>
      </div>
    `,
  });
}
