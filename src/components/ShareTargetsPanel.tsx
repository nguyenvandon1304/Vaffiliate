"use client";

import { useEffect, useState } from "react";

/**
 * Panel "Đăng vào nhóm" — workaround cho FB anti-spam.
 *
 * Vấn đề: FB không auto-link domain mới (vaffiliate.vn) ở wall cá nhân nhưng
 * VẪN auto-link trong group → user share vào group sẽ ra link xanh bình thường.
 *
 * UX:
 *   1. User lưu sẵn URL group/page yêu thích (FB / Zalo / Telegram / TikTok...)
 *   2. Sau khi tạo affiliate link + bấm COPY, các shortcut hiện ra
 *   3. Click 1 shortcut → tab mới mở group/page → paste link đã copy
 */

interface ShareTarget {
  id: number;
  label: string;
  url: string;
  platform: string;
}

interface CommunityTarget {
  url: string;
  label: string;
  platform: string;
}

interface Props {
  hasCopied: boolean;
  onCopyAgain: () => void;
}

const PLATFORM_META: Record<string, { name: string; emoji: string; color: string }> = {
  facebook: { name: "Facebook", emoji: "📘", color: "from-blue-500 to-blue-600" },
  facebook_post: { name: "Bài viết FB", emoji: "📌", color: "from-blue-600 to-indigo-600" },
  zalo: { name: "Zalo", emoji: "💬", color: "from-sky-500 to-sky-600" },
  telegram: { name: "Telegram", emoji: "✈️", color: "from-cyan-500 to-cyan-600" },
  instagram: { name: "Instagram", emoji: "📷", color: "from-pink-500 to-rose-600" },
  instagram_post: { name: "Bài IG", emoji: "📌", color: "from-pink-600 to-rose-700" },
  tiktok: { name: "TikTok", emoji: "🎵", color: "from-gray-800 to-black" },
  twitter: { name: "X / Twitter", emoji: "𝕏", color: "from-gray-700 to-black" },
  threads: { name: "Threads", emoji: "@", color: "from-gray-700 to-black" },
  other: { name: "Khác", emoji: "🔗", color: "from-gray-500 to-gray-600" },
};

export function ShareTargetsPanel({ hasCopied, onCopyAgain }: Props) {
  const [targets, setTargets] = useState<ShareTarget[]>([]);
  const [community, setCommunity] = useState<CommunityTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [openedKey, setOpenedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Fetch song song: user targets + community preset.
    Promise.all([
      fetch("/api/share-targets", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch("/api/share-targets/community", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    ]).then(([userData, communityData]) => {
      if (cancelled) return;
      if (userData?.success) setTargets(userData.targets || []);
      if (communityData?.success && communityData.target) setCommunity(communityData.target);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleAdd = async () => {
    setError("");
    if (!newLabel.trim() || !newUrl.trim()) {
      setError("Vui lòng nhập đủ tên gợi nhớ và URL");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/share-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim(), url: newUrl.trim() }),
      });
      const data = await res.json();
      if (data.success && data.target) {
        setTargets((prev) => [...prev, data.target]);
        setNewLabel("");
        setNewUrl("");
        setShowAddForm(false);
      } else {
        setError(data.error || "Lưu thất bại");
      }
    } catch {
      setError("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá nơi đăng này?")) return;
    try {
      const res = await fetch(`/api/share-targets?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTargets((prev) => prev.filter((t) => t.id !== id));
      }
    } catch { /* silent */ }
  };

  const handleOpen = (target: { id?: number; label: string; url: string }) => {
    // Copy link 1 lần nữa cho chắc — phòng clipboard bị clear bởi user lúc browse.
    onCopyAgain();
    window.open(target.url, "_blank", "noopener,noreferrer");
    const key = target.id ? `user-${target.id}` : "community";
    setOpenedKey(key);
    setTimeout(() => setOpenedKey(null), 2000);
  };

  return (
    <div className="border border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-blue-500 text-lg leading-none">📘</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-blue-800">
            Đăng nhanh vào Facebook / Zalo
          </h3>
          <p className="text-[11px] text-blue-600/80 leading-relaxed">
            Lưu link <span className="font-semibold">bài viết ghim</span> hoặc <span className="font-semibold">group</span>. 1 click mở thẳng tab mới → paste link đã copy → đăng. Trong group / bài viết, FB auto-link xanh dù domain mới.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
          <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
          Đang tải danh sách nơi đăng...
        </div>
      ) : (
        <>
          {/* Community share preset — bài viết ghim do admin V-Affiliate cấu hình.
              Hiện riêng ra khỏi list user targets — highlight đặc biệt với gradient
              orange + badge "GỢI Ý" để dụ user click vào đăng cộng đồng. */}
          {community && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => handleOpen(community)}
                disabled={!hasCopied}
                title={hasCopied ? `Mở: ${community.label}` : "Bấm COPY LINK trước rồi quay lại đây"}
                className={`relative w-full text-left rounded-xl p-3.5 transition-all border-2 ${
                  hasCopied
                    ? "bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white border-transparent shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-[1.01] cursor-pointer"
                    : "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                }`}
              >
                <span className={`absolute -top-2 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  hasCopied ? "bg-white text-orange-600 shadow" : "bg-gray-200 text-gray-500"
                }`}>
                  ⭐ Khuyên dùng
                </span>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
                    hasCopied ? "bg-white/20" : "bg-gray-100"
                  }`}>
                    📌
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${
                      hasCopied ? "text-white/80" : "text-gray-400"
                    }`}>
                      Cộng đồng V-Affiliate
                    </p>
                    <p className={`text-sm font-bold truncate ${hasCopied ? "text-white" : "text-gray-500"}`}>
                      {openedKey === "community" ? "✓ Đã mở — paste link Shopee vào comment!" : community.label}
                    </p>
                  </div>
                  <svg viewBox="0 0 24 24" className={`w-5 h-5 shrink-0 ${hasCopied ? "text-white/80" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17l9.2-9.2M17 17V7H7" />
                  </svg>
                </div>
              </button>
              {hasCopied && (
                <p className="text-[11px] text-gray-500 mt-1.5 px-1 leading-relaxed">
                  💡 <span className="font-semibold text-orange-600">Mẹo:</span> Đăng vào group V-Affiliate giúp link xanh chắc chắn + cộng đồng lớn dần, ai cũng được lợi.
                </p>
              )}
            </div>
          )}

          {targets.length === 0 && !showAddForm && (
            <div className="bg-white/60 border border-dashed border-blue-200 rounded-lg p-3 text-center mb-2">
              <p className="text-xs text-gray-500 mb-2">
                {community
                  ? "Bạn cũng có thể thêm group / bài ghim của riêng mình."
                  : "Bạn chưa lưu nơi đăng nào."}
              </p>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                + Thêm bài viết ghim / group {community ? "khác" : "đầu tiên"}
              </button>
            </div>
          )}

          {targets.length > 0 && (
            <>
              {community && (
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5 mt-1">
                  Nơi đăng của bạn
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                {targets.map((t) => {
                  const meta = PLATFORM_META[t.platform] || PLATFORM_META.other;
                  const justOpened = openedKey === `user-${t.id}`;
                  return (
                    <div key={t.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => handleOpen(t)}
                        disabled={!hasCopied}
                        title={hasCopied ? `Mở ${t.label}` : "Bấm COPY LINK trước rồi quay lại đây"}
                        className={`w-full text-left rounded-lg p-2.5 transition-all border ${
                          hasCopied
                            ? `bg-gradient-to-br ${meta.color} text-white border-transparent shadow-sm hover:shadow-md hover:scale-[1.02] cursor-pointer`
                            : "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-base leading-none">{meta.emoji}</span>
                          <span className={`text-[9px] uppercase tracking-wider font-bold ${hasCopied ? "text-white/80" : "text-gray-400"}`}>
                            {meta.name}
                          </span>
                        </div>
                        <p className={`text-xs font-semibold truncate ${hasCopied ? "text-white" : "text-gray-500"}`}>
                          {justOpened ? "✓ Đã mở — paste link!" : t.label}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-gray-400 hover:text-red-500 rounded-full shadow border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center justify-center"
                        title="Xoá"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!showAddForm ? (
            targets.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 py-1.5"
              >
                + Thêm nơi đăng khác
              </button>
            )
          ) : (
            <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Tên gợi nhớ (vd. Bài ghim FB cá nhân)"
                maxLength={80}
                className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-blue-400"
              />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Dán URL bài viết ghim / group / page..."
                className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 outline-none focus:border-blue-400 font-mono"
              />
              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={adding}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-md transition"
                >
                  {adding ? "Đang lưu..." : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setError(""); setNewLabel(""); setNewUrl(""); }}
                  className="px-3 text-xs text-gray-500 hover:text-gray-700"
                >
                  Huỷ
                </button>
              </div>
              <details className="text-[10px] text-gray-500 leading-relaxed">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold">
                  ❓ Cách lấy URL bài viết ghim
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="font-semibold text-gray-700">📌 Bài ghim trong group:</p>
                    <ol className="list-decimal pl-4 mt-0.5 space-y-0.5">
                      <li>Vào group → tìm bài đã ghim ở đầu group.</li>
                      <li>
                        Trên máy tính: bấm <span className="font-semibold">thời gian đăng</span> (vd. &quot;2 giờ trước&quot;) → copy URL trên thanh địa chỉ.<br />
                        Trên điện thoại: bấm <span className="font-semibold">3 chấm (…)</span> góc trên bài → <span className="font-semibold">Sao chép liên kết</span>.
                      </li>
                      <li>URL có dạng: <span className="font-mono text-blue-700">facebook.com/groups/.../permalink/...</span></li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">📌 Bài ghim trên trang cá nhân / page:</p>
                    <ol className="list-decimal pl-4 mt-0.5 space-y-0.5">
                      <li>Vào trang Facebook cá nhân → tìm bài đã ghim.</li>
                      <li>Bấm <span className="font-semibold">thời gian đăng</span> → bài mở rộng full → copy URL.</li>
                      <li>URL có dạng: <span className="font-mono text-blue-700">facebook.com/yourname/posts/...</span></li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">💬 Group / page chung (không phải bài cụ thể):</p>
                    <p className="pl-4">Copy URL group / page là được. Khi click sẽ vào trang chính, kéo xuống box đăng bài.</p>
                  </div>
                </div>
                <p className="mt-2 text-gray-400">Hỗ trợ: facebook.com, fb.com, zalo.me, t.me, instagram.com, tiktok.com, x.com, threads.net.</p>
              </details>
            </div>
          )}
        </>
      )}

      {!hasCopied && (community || targets.length > 0) && (
        <p className="text-[11px] text-blue-500/80 mt-2 text-center font-medium">
          ↑ Bấm <span className="font-bold">COPY LINK</span> trước, rồi chọn nơi đăng để mở.
        </p>
      )}
    </div>
  );
}
