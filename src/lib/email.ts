import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, username: string, resetToken: string): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
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

  try {
    await transporter.sendMail({
      from: `"V-Affiliate" <${process.env.SMTP_USER}>`,
      to,
      subject: "Đặt lại mật khẩu - V-Affiliate",
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("[Email] Failed to send:", err);
    return { success: false, error: "Không thể gửi email. Vui lòng thử lại sau." };
  }
}

export async function sendEmailVerification(
  to: string,
  username: string,
  verifyToken: string,
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
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

  try {
    await transporter.sendMail({
      from: `"V-Affiliate" <${process.env.SMTP_USER}>`,
      to,
      subject: "Xác thực email - V-Affiliate",
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("[Email] Failed to send verification:", err);
    return { success: false, error: "Không thể gửi email xác thực. Vui lòng thử lại sau." };
  }
}


/**
 * Email cảnh báo khi user login từ thiết bị / IP lạ. Gửi async, không block
 * login flow — fire-and-forget.
 */
export async function sendNewDeviceAlertEmail(
  to: string,
  username: string,
  meta: { ip: string | null; userAgent: string | null; loginAt: Date },
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const securityUrl = `${baseUrl}/dashboard/security`;
  const time = meta.loginAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const ip = meta.ip || "không rõ";
  const ua = (meta.userAgent || "không rõ").slice(0, 200);

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #f0f0f0;">
      <div style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 28px 24px; text-align: center;">
        <div style="display: inline-block; width: 44px; height: 44px; background: rgba(255,255,255,0.2); border-radius: 50%; line-height: 44px; font-size: 20px; color: white; margin-bottom: 8px;">🔐</div>
        <h1 style="color: white; font-size: 18px; margin: 0; font-weight: 700;">Phát hiện đăng nhập mới</h1>
      </div>
      <div style="padding: 28px 24px;">
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Xin chào <strong>${username}</strong>,<br/>
          Tài khoản V-Affiliate của bạn vừa được đăng nhập từ một thiết bị mới:
        </p>
        <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;"><b>Thời gian:</b> ${time}</p>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;"><b>IP:</b> <code style="font-family: monospace;">${ip}</code></p>
          <p style="margin: 0; font-size: 12px; color: #6b7280;"><b>Thiết bị:</b> ${ua}</p>
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 16px 0;">
          ✅ Nếu là bạn → có thể bỏ qua email này.<br/>
          ⚠️ Nếu KHÔNG phải bạn → đổi mật khẩu ngay và đăng xuất các thiết bị khác:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${securityUrl}" style="display: inline-block; background: #ef4444; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 700;">
            BẢO MẬT TÀI KHOẢN
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
        <p style="color: #d1d5db; font-size: 11px; text-align: center; margin: 0;">
          &copy; 2026 V-Affiliate. Email tự động, vui lòng không trả lời.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"V-Affiliate Bảo mật" <${process.env.SMTP_USER}>`,
      to,
      subject: "[Bảo mật] Đăng nhập từ thiết bị mới — V-Affiliate",
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("[Email] Failed to send new device alert:", err);
    return { success: false, error: "Không thể gửi email cảnh báo." };
  }
}
