"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { useNotifications, type Notification } from "@/hooks/useNotifications";

/**
 * Bell icon với dropdown notification list.
 * Realtime qua SSE — toast khi có notification mới + sound nhẹ.
 *
 * UX: click vào item (không phải vào nút action) → mở modal hiển thị full
 * message + thời gian chi tiết. Đồng thời mark as read.
 */
export function NotificationBell({ className = "" }: { className?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const { notifications, unreadCount, markRead, remove } = useNotifications({
    onNew: (n) => {
      // Toast realtime — khác type khác màu cho dễ nhận biết.
      const tone = n.type === "withdrawal" || n.type === "achievement" || n.type === "spin"
        ? "success"
        : n.type === "security"
        ? "warn"
        : "info";
      if (tone === "success") toast.success(`${n.title}`);
      else if (tone === "warn") toast.warn(`${n.title}`);
      else toast.info(`${n.title}`);
    },
  });

  // Click ngoài dropdown → đóng. KHÔNG đóng nếu modal detail đang mở.
  useEffect(() => {
    if (!open || detail) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, detail]);

  const handleOpenDetail = (n: Notification) => {
    setDetail(n);
    if (n.is_read === 0) void markRead(n.id);
  };

  return (
    <>
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Thông báo"
          title="Thông báo"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-600 dark:text-zinc-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-100">
                Thông báo {unreadCount > 0 && <span className="text-orange-500">({unreadCount})</span>}
              </h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markRead()}
                  className="text-xs font-medium text-orange-500 hover:text-orange-600"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-4xl mb-2">🔔</div>
                  <p className="text-sm text-gray-400 dark:text-zinc-500">Chưa có thông báo nào</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {notifications.map((n) => (
                    <NotifItem
                      key={n.id}
                      notif={n}
                      onClick={() => handleOpenDetail(n)}
                      onMarkRead={() => void markRead(n.id)}
                      onRemove={() => void remove(n.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {detail && (
        <NotificationDetailModal
          notif={detail}
          onClose={() => setDetail(null)}
          onRemove={() => { void remove(detail.id); setDetail(null); }}
        />
      )}
    </>
  );
}

function NotifItem({
  notif,
  onClick,
  onMarkRead,
  onRemove,
}: {
  notif: Notification;
  onClick: () => void;
  onMarkRead: () => void;
  onRemove: () => void;
}) {
  const isUnread = notif.is_read === 0;
  const icon = iconForType(notif.type);
  const time = formatRelative(notif.created_at);

  return (
    <li
      className={`px-4 py-3 transition-colors group cursor-pointer ${
        isUnread ? "bg-orange-50/40 dark:bg-orange-500/5" : "hover:bg-gray-50 dark:hover:bg-zinc-800/40"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-base shadow-sm">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-zinc-100 leading-tight flex-1">
              {notif.title}
            </h4>
            {isUnread && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-1.5" />}
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed line-clamp-2">
            {notif.message}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-gray-400 dark:text-zinc-500">{time}</span>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {isUnread && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
                  className="text-[11px] font-medium text-orange-500 hover:text-orange-600"
                >
                  Đã đọc
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="text-[11px] font-medium text-gray-400 hover:text-red-500"
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Modal hiển thị full detail 1 notification — click vào item để mở.
 * UX: full message không bị truncate + thời gian chi tiết + nút Xoá / Đóng.
 */
function NotificationDetailModal({
  notif,
  onClose,
  onRemove,
}: {
  notif: Notification;
  onClose: () => void;
  onRemove: () => void;
}) {
  const icon = iconForType(notif.type);
  const fullDate = formatFullDate(notif.created_at);
  const relative = formatRelative(notif.created_at);

  // ESC để đóng.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    // Block body scroll khi modal mở.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header với icon to */}
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 px-5 pt-5 pb-4 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="Đóng"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl shrink-0 shadow-md">
              {icon}
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <p className="text-[10px] uppercase tracking-widest opacity-80 font-semibold mb-0.5">
                {labelForType(notif.type)}
              </p>
              <h2 className="text-lg font-bold leading-snug break-words">
                {notif.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Body — full message */}
        <div className="px-5 py-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-semibold mb-1.5">
              Nội dung
            </p>
            <p className="text-sm text-gray-700 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
              {notif.message}
            </p>
          </div>

          <div className="border-t border-gray-100 dark:border-zinc-800 pt-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-semibold mb-1.5">
              Thời gian
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-zinc-300 font-medium">{fullDate}</span>
              <span className="text-xs text-gray-400 dark:text-zinc-500">{relative}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-medium px-4 py-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            🗑 Xoá thông báo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function iconForType(type: string): string {
  switch (type) {
    case "achievement": return "🏅";
    case "spin": return "🎰";
    case "withdrawal": return "💸";
    case "withdraw": return "💸";
    case "wallet": return "💰";
    case "order": return "🛒";
    case "referral": return "🤝";
    case "security": return "🔒";
    case "welcome": return "🌱";
    case "link": return "🔗";
    case "system": return "📢";
    default: return "🔔";
  }
}

function labelForType(type: string): string {
  switch (type) {
    case "achievement": return "Huy hiệu";
    case "spin": return "Vòng quay";
    case "withdrawal": return "Rút tiền";
    case "withdraw": return "Rút tiền";
    case "wallet": return "Số dư";
    case "order": return "Đơn hàng";
    case "referral": return "Giới thiệu";
    case "security": return "Bảo mật";
    case "welcome": return "Chào mừng";
    case "link": return "Tạo link";
    case "system": return "Hệ thống";
    default: return "Thông báo";
  }
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "Vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

/**
 * Format full date kèm thời gian — dùng trong modal detail.
 * Vd: "12:34 ngày 28/05/2026"
 */
function formatFullDate(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm} ngày ${dd}/${month}/${d.getFullYear()}`;
}
