/**
 * Telegram Bot — gửi thông báo cho admin khi có event quan trọng.
 *
 * Setup:
 *   1. Mở Telegram → tìm @BotFather → /newbot → đặt tên → nhận TOKEN
 *   2. Mở Telegram → tìm @userinfobot → bấm Start → lấy CHAT_ID của bạn
 *   3. Gõ /start với bot mới của bạn để bot có thể nhắn cho bạn
 *   4. Set env:
 *        TELEGRAM_BOT_TOKEN=<token từ BotFather>
 *        TELEGRAM_ADMIN_CHAT_ID=<chat_id của bạn>
 *
 * Behavior:
 *   - Nếu env chưa set → noop, không lỗi (dev local OK)
 *   - Send fail → log warn, không throw (không break user flow)
 *   - Markdown V2 format → support **bold**, _italic_, `code`
 */

const TG_API = "https://api.telegram.org/bot";

interface SendOptions {
  /** Nếu false → silent notification (không vibrate điện thoại). */
  notify?: boolean;
  /** Reply markup cho inline button. Phải là object đúng spec Telegram. */
  buttons?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
}

/**
 * Escape ký tự đặc biệt cho MarkdownV2 — Telegram strict, fail nếu không escape.
 * Ký tự cần escape: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`);
}

/**
 * Gửi text message tới admin chat. Fire-and-forget — không await ở caller.
 *
 * @param markdown — text với MarkdownV2 syntax. Caller chịu trách nhiệm escape
 *   các giá trị động (username, số tiền) bằng `escapeMd()` nếu cần.
 */
export async function sendTelegramMessage(
  markdown: string,
  options: SendOptions = {},
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    // Chưa cấu hình → không lỗi, chỉ skip.
    return { success: false, error: "TELEGRAM env chưa set" };
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: markdown,
      parse_mode: "MarkdownV2",
      disable_notification: options.notify === false,
      link_preview_options: { is_disabled: true },
    };
    if (options.buttons) {
      body.reply_markup = { inline_keyboard: options.buttons };
    }

    const res = await fetch(`${TG_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Render free tier có thể chậm → 5s timeout đủ để không block request user
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[Telegram] send fail ${res.status}:`, errText.slice(0, 200));
      return { success: false, error: `${res.status}: ${errText.slice(0, 100)}` };
    }
    return { success: true };
  } catch (e) {
    console.warn("[Telegram] send error:", e instanceof Error ? e.message : e);
    return { success: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/* ─────────────── Pre-built notifications ─────────────── */

/** Format số tiền VN. */
function fmt(n: number): string {
  return n.toLocaleString("vi-VN");
}

/** User đăng ký mới — admin biết để check spam. */
export function notifyNewUser(opts: { username: string; email: string }): Promise<{ success: boolean }> {
  const text =
    `👤 *User mới đăng ký*\n\n` +
    `Username: \`${escapeMd(opts.username)}\`\n` +
    `Email: \`${escapeMd(opts.email)}\``;
  return sendTelegramMessage(text, { notify: false });
}

/** Yêu cầu rút tiền mới — admin cần duyệt. URL trỏ về /admin để 1-click action. */
export function notifyWithdrawRequest(opts: {
  username: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  baseUrl?: string;
}): Promise<{ success: boolean }> {
  const text =
    `💸 *Yêu cầu rút tiền mới*\n\n` +
    `User: \`${escapeMd(opts.username)}\`\n` +
    `Số tiền: *${escapeMd(fmt(opts.amount))}đ*\n` +
    `Ngân hàng: ${escapeMd(opts.bankName)}\n` +
    `STK: \`${escapeMd(opts.accountNumber)}\``;
  const buttons = opts.baseUrl
    ? [[{ text: "🔍 Mở Admin", url: `${opts.baseUrl}/admin?tab=withdrawals` }]]
    : undefined;
  return sendTelegramMessage(text, { notify: true, buttons });
}

/** Đơn lớn mới hoàn tiền — admin track doanh thu real-time. */
export function notifyLargeOrderCompleted(opts: {
  orderCode: string;
  username: string;
  amount: number;
  cashback: number;
}): Promise<{ success: boolean }> {
  const text =
    `🎉 *Đơn hoàn tiền mới*\n\n` +
    `Mã đơn: \`${escapeMd(opts.orderCode)}\`\n` +
    `User: \`${escapeMd(opts.username)}\`\n` +
    `Giá trị: *${escapeMd(fmt(opts.amount))}đ*\n` +
    `Cashback: *${escapeMd(fmt(opts.cashback))}đ*`;
  return sendTelegramMessage(text, { notify: false });
}

/** Admin login từ device lạ — security alert. */
export function notifyAdminLoginNewDevice(opts: {
  username: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<{ success: boolean }> {
  const text =
    `⚠️ *Admin login từ thiết bị lạ*\n\n` +
    `User: \`${escapeMd(opts.username)}\`\n` +
    `IP: \`${escapeMd(opts.ip ?? "unknown")}\`\n` +
    `Thiết bị: ${escapeMd((opts.userAgent ?? "unknown").slice(0, 100))}\n\n` +
    `_Nếu không phải bạn → đổi password ngay\\!_`;
  return sendTelegramMessage(text, { notify: true });
}

/** Generic alert — dùng khi cần log custom event. */
export function notifyCustom(title: string, body: string): Promise<{ success: boolean }> {
  const text = `🔔 *${escapeMd(title)}*\n\n${escapeMd(body)}`;
  return sendTelegramMessage(text, { notify: false });
}
