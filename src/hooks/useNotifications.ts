"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  /** Load lại từ server. */
  reload: () => Promise<void>;
  /** Đánh dấu đã đọc 1 hoặc tất cả. */
  markRead: (id?: number) => Promise<void>;
  /** Xoá 1 notification. */
  remove: (id: number) => Promise<void>;
}

/**
 * Hook quản lý notification state với SSE (realtime) + polling (fallback).
 *
 * Flow:
 *   1. Mount → fetch initial state qua REST `/api/notifications`
 *   2. Mở SSE `/api/notifications/stream` → nhận event "notification" + "unread"
 *   3. Nếu SSE fail (timeout, proxy block) → fallback polling 60s
 *   4. Unmount → close SSE + clear interval
 *
 * Options:
 *   - onNew: callback khi có notification mới (toast, sound...)
 *   - sseEnabled: false → chỉ polling (cho dev không support SSE)
 */
export function useNotifications(options: {
  onNew?: (n: Notification) => void;
  sseEnabled?: boolean;
} = {}): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Refs để tránh stale closure trong setInterval / EventSource.
  const onNewRef = useRef(options.onNew);
  // Update ref qua effect, không phải trong render — tránh React strict warning.
  useEffect(() => { onNewRef.current = options.onNew; });
  const seenIdsRef = useRef<Set<number>>(new Set());

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
        // Track id đã thấy để SSE event không trigger toast lần 2.
        for (const n of data.notifications as Notification[]) seenIdsRef.current.add(n.id);
      }
    } catch { /* network error - giữ state cũ */ }
    finally { setLoading(false); }
  }, []);

  const markRead = useCallback(async (id?: number) => {
    const body = id !== undefined ? { id } : {};
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // Optimistic update — không đợi reload.
    setNotifications((prev) =>
      prev.map((n) => (id === undefined || n.id === id ? { ...n, is_read: 1 } : n)),
    );
    setUnreadCount((prev) => (id === undefined ? 0 : Math.max(0, prev - 1)));
  }, []);

  const remove = useCallback(async (id: number) => {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState sau await
    void reload();
  }, [reload]);

  // SSE + polling fallback
  useEffect(() => {
    const sseEnabled = options.sseEnabled !== false;
    let eventSource: EventSource | null = null;
    let pollId: NodeJS.Timeout | null = null;
    let sseFailed = false;

    function startPolling() {
      if (pollId) return;
      pollId = setInterval(() => void reload(), 60_000);
    }

    function handleNewNotification(n: Notification) {
      if (seenIdsRef.current.has(n.id)) return;
      seenIdsRef.current.add(n.id);
      // Prepend vào list, giữ tối đa 30.
      setNotifications((prev) => [n, ...prev].slice(0, 30));
      if (onNewRef.current) {
        try { onNewRef.current(n); } catch { /* ignore handler error */ }
      }
    }

    if (sseEnabled && typeof window !== "undefined" && "EventSource" in window) {
      try {
        eventSource = new EventSource("/api/notifications/stream");

        eventSource.addEventListener("init", (e) => {
          try {
            const data = JSON.parse((e as MessageEvent).data);
            setUnreadCount(data.unreadCount || 0);
          } catch { /* ignore */ }
        });

        eventSource.addEventListener("notification", (e) => {
          try {
            const n = JSON.parse((e as MessageEvent).data) as Notification;
            handleNewNotification(n);
          } catch { /* ignore */ }
        });

        eventSource.addEventListener("unread", (e) => {
          try {
            const data = JSON.parse((e as MessageEvent).data);
            setUnreadCount(data.count || 0);
          } catch { /* ignore */ }
        });

        // Server tự đóng sau 5 phút → reconnect.
        eventSource.addEventListener("reconnect", () => {
          eventSource?.close();
          // Browser tự reconnect, hoặc ta tạo lại sau 1s.
          setTimeout(() => {
            if (!sseFailed) {
              eventSource = new EventSource("/api/notifications/stream");
            }
          }, 1000);
        });

        eventSource.onerror = () => {
          // SSE fail → fallback polling.
          sseFailed = true;
          eventSource?.close();
          eventSource = null;
          startPolling();
        };
      } catch {
        sseFailed = true;
        startPolling();
      }
    } else {
      startPolling();
    }

    return () => {
      eventSource?.close();
      if (pollId) clearInterval(pollId);
    };
  }, [reload, options.sseEnabled]);

  return { notifications, unreadCount, loading, reload, markRead, remove };
}
