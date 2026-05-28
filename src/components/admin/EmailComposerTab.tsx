"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

/**
 * EmailComposerTab — admin compose & send mass email qua Resend API.
 *
 * Khác BroadcastTab (in-app notification) ở chỗ:
 * - Gửi email thật ra ngoài → reach user không online
 * - Filter chi tiết hơn (verified / active / role)
 * - Preview số lượng trước khi gửi
 * - Throttle 100ms/email phía server để không hit Resend rate limit
 */
export function EmailComposerTab() {
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targetRole, setTargetRole] = useState<"all" | "user" | "admin">("user");
  const [onlyVerified, setOnlyVerified] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);
  const [limit, setLimit] = useState("500");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number; errors?: string[] } | null>(null);

  // Auto re-preview khi đổi filter
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        const params = new URLSearchParams({
          targetRole,
          onlyVerified: onlyVerified ? "1" : "0",
          onlyActive: onlyActive ? "1" : "0",
        });
        const r = await fetch(`/api/admin/email-broadcast?${params}`);
        const d = await r.json();
        if (!cancelled && d.success) setPreviewCount(d.count);
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [targetRole, onlyVerified, onlyActive]);

  const send = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Nhập đủ subject và nội dung");
      return;
    }
    const cap = Math.min(Math.max(1, Number(limit) || 500), 1000);
    const willSend = previewCount !== null ? Math.min(previewCount, cap) : cap;
    if (!confirm(
      `Sẽ gửi email tới ${willSend} user.\n\n` +
      `• Subject: ${subject.slice(0, 60)}${subject.length > 60 ? "..." : ""}\n` +
      `• Filter: ${targetRole}${onlyVerified ? " | verified" : ""}${onlyActive ? " | active" : ""}\n` +
      `• Tốc độ: ~10 email/giây (sẽ mất ~${Math.ceil(willSend / 10)}s)\n\n` +
      `Tiếp tục?`
    )) return;

    setSending(true);
    setResult(null);
    try {
      const r = await fetch("/api/admin/email-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          bodyHtml: body.trim(),
          targetRole,
          onlyVerified,
          onlyActive,
          limit: cap,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setResult({ sent: d.sent, failed: d.failed, total: d.total, errors: d.errors });
        toast.success(`✓ Đã gửi ${d.sent}/${d.total} email`);
      } else {
        toast.error(d.error || "Lỗi");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi mạng");
    } finally {
      setSending(false);
    }
  };

  const insertTemplate = (key: "promo" | "remind" | "feature" | "thanks") => {
    const templates = {
      promo: {
        subject: "🎉 Khuyến mãi đặc biệt — Cashback x2 cuối tuần",
        body: "<p>Chỉ trong <strong>48 giờ tới</strong>, mọi đơn hàng Shopee qua V-Affiliate sẽ được nhân đôi cashback!</p>\n<p>Đừng bỏ lỡ cơ hội tiết kiệm tới <strong>20%</strong> cho đơn hàng yêu thích.</p>",
      },
      remind: {
        subject: "💰 Bạn đang bỏ lỡ cashback hàng ngày trên V-Affiliate",
        body: "<p>Đã lâu rồi bạn chưa quay lại V-Affiliate. Hàng ngàn user khác đang nhận cashback đều đặn mỗi ngày.</p>\n<p>Quay lại ngay để không bỏ lỡ những đơn cashback hấp dẫn từ Shopee, Lazada, Tiki...</p>",
      },
      feature: {
        subject: "✨ Tính năng mới — Vòng quay may mắn",
        body: "<p>V-Affiliate vừa ra mắt <strong>Vòng quay may mắn</strong> — quay miễn phí mỗi ngày để nhận thêm tiền vào ví!</p>\n<p>Phần thưởng từ <strong>1.000đ tới 100.000đ</strong>, càng quay càng có cơ hội trúng lớn.</p>",
      },
      thanks: {
        subject: "🙏 Cảm ơn bạn đã đồng hành cùng V-Affiliate",
        body: "<p>Cảm ơn bạn đã tin tưởng V-Affiliate trong suốt thời gian qua.</p>\n<p>Chúng tôi cam kết tiếp tục mang đến những trải nghiệm cashback tốt nhất, an toàn và minh bạch.</p>",
      },
    };
    const t = templates[key];
    setSubject(t.subject);
    setBody(t.body);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">📧 Gửi Email Hàng Loạt</h2>
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-1.5">
          ⚠️ Resend free: 100 email/ngày · paid: 50k/tháng
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* MAIN - Compose */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          {/* Templates */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">📝 Template gợi ý</p>
            <div className="flex flex-wrap gap-2">
              <TemplateButton onClick={() => insertTemplate("promo")} icon="🎉" label="Khuyến mãi" />
              <TemplateButton onClick={() => insertTemplate("remind")} icon="💰" label="Re-engage" />
              <TemplateButton onClick={() => insertTemplate("feature")} icon="✨" label="Feature mới" />
              <TemplateButton onClick={() => insertTemplate("thanks")} icon="🙏" label="Cảm ơn" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder="VD: 🎉 Khuyến mãi tháng 6 - Cashback x2"
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{subject.length}/200</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nội dung HTML <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Hỗ trợ HTML tags: <code className="text-orange-600">&lt;p&gt;</code> <code className="text-orange-600">&lt;strong&gt;</code> <code className="text-orange-600">&lt;a&gt;</code> <code className="text-orange-600">&lt;br/&gt;</code> <code className="text-orange-600">&lt;ul&gt;&lt;li&gt;</code>
              </p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                maxLength={10000}
                placeholder="<p>Xin chào, V-Affiliate có ưu đãi mới...</p>"
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/10000</p>
            </div>

            {/* Preview */}
            {body.trim() && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">👁️ Xem trước</p>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50">
                  <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 text-center">
                    <div className="inline-block w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white font-extrabold text-lg leading-none">V</div>
                    <p className="text-white text-sm font-bold mt-2">V-Affiliate</p>
                  </div>
                  <div className="p-4 bg-white text-gray-900 text-sm">
                    <p className="mb-3">Chào <strong>username</strong>,</p>
                    <div className="prose-sm" dangerouslySetInnerHTML={{ __html: body }} />
                    <div className="text-center mt-4">
                      <span className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-lg text-xs font-bold">
                        MỞ V-AFFILIATE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIDE - Filter + Send */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">🎯 Đối tượng nhận</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as typeof targetRole)}
                  className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">Tất cả</option>
                  <option value="user">User thường</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} className="accent-orange-500" />
                <span className="text-gray-700 dark:text-gray-300">Chỉ user đã verify email</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="accent-orange-500" />
                <span className="text-gray-700 dark:text-gray-300">Chỉ user đang active</span>
              </label>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Giới hạn (max 1000)</label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  min={1}
                  max={1000}
                  className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Preview count */}
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-lg text-center">
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wide">
                Sẽ gửi tới
              </p>
              <p className="text-3xl font-extrabold text-orange-700 dark:text-orange-300 mt-1">
                {previewing ? "..." : previewCount !== null ? previewCount.toLocaleString("vi-VN") : "—"}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">user</p>
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={send}
            disabled={sending || !subject.trim() || !body.trim()}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-orange-500/30 transition"
          >
            {sending ? "⏳ Đang gửi..." : "📨 Gửi email ngay"}
          </button>

          {/* Result */}
          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm">
              <p className="font-bold text-gray-900 dark:text-white mb-2">📊 Kết quả gửi</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Tổng:</span><span className="font-semibold">{result.total}</span></div>
                <div className="flex justify-between"><span className="text-green-600">Thành công:</span><span className="font-semibold text-green-600">{result.sent}</span></div>
                <div className="flex justify-between"><span className="text-red-600">Thất bại:</span><span className="font-semibold text-red-600">{result.failed}</span></div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded text-xs text-red-700 dark:text-red-300">
                  <p className="font-semibold mb-1">Lỗi mẫu:</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    {result.errors.map((e, i) => <li key={i} className="truncate">{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TemplateButton({ onClick, icon, label }: { onClick: () => void; icon: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-400 transition"
    >
      {icon} {label}
    </button>
  );
}
