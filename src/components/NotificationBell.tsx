"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { useNotifications, type Notification } from "@/hooks/useNotifications";

/**
 * Bell icon với dropdown notification list.
 * Realtime qua SSE — toast khi có notification mới + sound nhẹ.
 */
export function NotificationBell({ className = "" }: { className?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
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

  // Click ngoài dropdown → đóng.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
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
  );
}

function NotifItem({
  notif,
  onMarkRead,
  onRemove,
}: {
  notif: Notification;
  onMarkRead: () => void;
  onRemove: () => void;
}) {
  const isUnread = notif.is_read === 0;
  const icon = iconForType(notif.type);
  const time = formatRelative(notif.created_at);

  return (
    <li
      className={`px-4 py-3 transition-colors group ${
        isUnread ? "bg-orange-50/40 dark:bg-orange-500/5" : "hover:bg-gray-50 dark:hover:bg-zinc-800/40"
      }`}
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
                  onClick={onMarkRead}
                  className="text-[11px] font-medium text-orange-500 hover:text-orange-600"
                >
                  Đã đọc
                </button>
              )}
              <button
                type="button"
                onClick={onRemove}
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

function iconForType(type: string): string {
  switch (type) {
    case "achievement": return "🏅";
    case "spin": return "🎰";
    case "withdrawal": return "💸";
    case "withdraw": return "💸";
    case "order": return "🛒";
    case "referral": return "🤝";
    case "security": return "🔒";
    case "welcome": return "🌱";
    case "link": return "🔗";
    case "system": return "📢";
    default: return "🔔";
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
