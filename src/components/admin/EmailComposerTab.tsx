"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import {
  EMAIL_TEMPLATES,
  CATEGORY_LABELS,
  type EmailTemplate,
  type TemplateCategory,
} from "@/lib/email-templates";

/**
 * EmailComposerTab — admin compose & send mass email qua Resend API.
 *
 * Có thư viện 20+ template được viết sẵn (chào mừng, khuyến mãi, re-engage,
 * tri ân, theo mùa...) — admin chọn 1 cái, có thể chỉnh sửa rồi gửi.
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

  // Template library state
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredTemplates = useMemo(() => {
    let list = EMAIL_TEMPLATES;
    if (activeCategory !== "all") {
      list = list.filter((t) => t.category === activeCategory);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeCategory, searchTerm]);

  const applyTemplate = (tpl: EmailTemplate) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
    setShowTemplates(false);
    toast.success(`Đã áp dụng template "${tpl.name}"`);
  };

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

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">📧 Gửi Email Hàng Loạt</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-sm shadow-orange-500/30 transition flex items-center gap-2"
          >
            📚 Thư viện template ({EMAIL_TEMPLATES.length})
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-1.5">
            ⚠️ Resend free: 100/ngày · paid: 50k/tháng
          </div>
        </div>
      </div>

      {/* Template Library Panel */}
      {showTemplates && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-orange-300 dark:border-orange-500/40 shadow-lg shadow-orange-500/10 mb-4 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-500/10 dark:to-red-500/10 border-b border-orange-200 dark:border-orange-500/30 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">📚 Thư viện template viết sẵn</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Chọn 1 mẫu → tự động điền subject + nội dung. Có thể chỉnh sửa trước khi gửi.</p>
            </div>
            <button
              onClick={() => setShowTemplates(false)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕ Đóng
            </button>
          </div>

          {/* Search + category tabs */}
          <div className="px-5 pt-4 pb-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔎 Tìm theo tên, subject, mô tả..."
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 mb-3"
            />

            <div className="flex flex-wrap gap-1.5">
              <CategoryChip
                active={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
                icon="📋"
                label="Tất cả"
                count={EMAIL_TEMPLATES.length}
              />
              {(Object.keys(CATEGORY_LABELS) as TemplateCategory[]).map((cat) => {
                const meta = CATEGORY_LABELS[cat];
                const count = EMAIL_TEMPLATES.filter((t) => t.category === cat).length;
                return (
                  <CategoryChip
                    key={cat}
                    active={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                    icon={meta.icon}
                    label={meta.label}
                    count={count}
                  />
                );
              })}
            </div>
          </div>

          {/* Template grid */}
          <div className="px-5 pb-5 pt-2 max-h-[480px] overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Không tìm thấy template nào</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTemplates.map((tpl) => (
                  <TemplateCard key={tpl.id} template={tpl} onApply={() => applyTemplate(tpl)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* MAIN - Compose */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
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
                rows={12}
                maxLength={10000}
                placeholder="<p>Xin chào, V-Affiliate có ưu đãi mới...</p>"
                className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/10000</p>
            </div>

            {/* Preview */}
            {body.trim() && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">👁️ Xem trước email</p>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50">
                  <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 text-center">
                    <div className="inline-flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg text-white font-extrabold text-lg">V</div>
                    <p className="text-white text-sm font-bold mt-2">V-Affiliate</p>
                    <p className="text-white/80 text-[11px]">Thương mại liên kết</p>
                  </div>
                  <div className="p-4 bg-white text-gray-900 text-sm">
                    <p className="mb-3">Chào <strong>username</strong>,</p>
                    <div className="email-preview text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: body }} />
                    <div className="text-center mt-4">
                      <span className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2.5 rounded-lg text-xs font-bold">
                        MỞ V-AFFILIATE
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 text-center border-t border-gray-200">
                    <p className="text-[10px] text-gray-400">Bạn nhận email này vì đang là thành viên V-Affiliate · vaffiliate.vn</p>
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

      <style jsx global>{`
        .email-preview p { margin: 0 0 12px 0; }
        .email-preview ul, .email-preview ol { margin: 0 0 12px 0; padding-left: 20px; }
        .email-preview li { margin-bottom: 4px; }
        .email-preview strong { color: #111827; font-weight: 600; }
      `}</style>
    </>
  );
}

function CategoryChip({
  active, onClick, icon, label, count,
}: { active: boolean; onClick: () => void; icon: string; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-medium px-3 py-1.5 rounded-full transition flex items-center gap-1.5 ${
        active
          ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-500/20"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-gray-200 dark:bg-gray-600"}`}>
        {count}
      </span>
    </button>
  );
}

function TemplateCard({ template, onApply }: { template: EmailTemplate; onApply: () => void }) {
  const [hovered, setHovered] = useState(false);
  const meta = CATEGORY_LABELS[template.category];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-orange-400 dark:hover:border-orange-500/60 hover:shadow-md transition cursor-pointer flex flex-col"
      onClick={onApply}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-2xl shrink-0">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{template.name}</p>
          <p className="text-[10px] uppercase tracking-wide text-orange-600 dark:text-orange-400 font-semibold mt-0.5">
            {meta.icon} {meta.label}
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{template.description}</p>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 mb-2 flex-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Subject</p>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-200 line-clamp-2">{template.subject}</p>
      </div>
      <button
        type="button"
        className={`w-full text-xs font-semibold py-1.5 rounded-lg transition ${
          hovered
            ? "bg-orange-500 text-white"
            : "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300"
        }`}
      >
        ✨ Dùng template này
      </button>
    </div>
  );
}
