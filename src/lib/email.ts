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
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #f0f0f0;">
      <div style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 32px 24px; text-align: center;">
        <div style="display: inline-block; width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: 800; color: white; margin-bottom: 12px;">V</div>
        <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700;">V-Affiliate</h1>
        <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 4px 0 0 0;">Thương mại liên kết</p>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 8px 0;">Đặt lại mật khẩu</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          Xin chào <strong>${username}</strong>,<br/>
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tạo mật khẩu mới:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">
            ĐẶT LẠI MẬT KHẨU
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0;">
          Link có hiệu lực trong <strong>30 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        </p>
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
        <p style="color: #d1d5db; font-size: 11px; text-align: center; margin: 0;">
          &copy; 2026 V-Affiliate Team. Email tự động, vui lòng không trả lời.
        </p>
      </div>
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
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #f0f0f0;">
      <div style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 32px 24px; text-align: center;">
        <div style="display: inline-block; width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: 800; color: white; margin-bottom: 12px;">V</div>
        <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700;">V-Affiliate</h1>
        <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 4px 0 0 0;">Thương mại liên kết</p>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 8px 0;">Xác thực email</h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          Xin chào <strong>${username}</strong>,<br/>
          Cảm ơn bạn đã đăng ký V-Affiliate. Vui lòng xác thực địa chỉ email để kích hoạt tài khoản:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">
            XÁC THỰC EMAIL
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0;">
          Link có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email.
        </p>
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
        <p style="color: #d1d5db; font-size: 11px; text-align: center; margin: 0;">
          &copy; 2026 V-Affiliate Team. Email tự động, vui lòng không trả lời.
        </p>
      </div>
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
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #f0f0f0;">
      <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 32px 24px; text-align: center;">
        <div style="display: inline-block; width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; line-height: 48px; font-size: 26px; font-weight: 800; color: white; margin-bottom: 12px;">⚠</div>
        <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700;">Phát hiện đăng nhập mới</h1>
        <p style="color: rgba(255,255,255,0.85); font-size: 12px; margin: 4px 0 0 0;">V-Affiliate Bảo Mật</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Xin chào <strong>${username}</strong>,<br/>
          Tài khoản của bạn vừa đăng nhập từ <strong>thiết bị mới</strong>.
        </p>
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 6px 0; color: #9a3412; font-size: 13px;"><strong>Thời gian:</strong> ${time}</p>
          <p style="margin: 0 0 6px 0; color: #9a3412; font-size: 13px;"><strong>IP:</strong> ${meta.ip ?? "—"}</p>
          <p style="margin: 0; color: #9a3412; font-size: 13px;"><strong>Trình duyệt:</strong> ${(meta.userAgent ?? "—").slice(0, 80)}</p>
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 16px 0 0 0;">
          Nếu <strong>không phải bạn</strong>, hãy đổi mật khẩu ngay và đăng xuất tất cả thiết bị.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${securityUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 700;">
            QUẢN LÝ BẢO MẬT
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
        <p style="color: #d1d5db; font-size: 11px; text-align: center; margin: 0;">
          &copy; 2026 V-Affiliate Team. Email tự động, vui lòng không trả lời.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    from: SECURITY_FROM_EMAIL,
    subject: "[Bảo mật] Đăng nhập từ thiết bị mới — V-Affiliate",
    html,
  });
}
