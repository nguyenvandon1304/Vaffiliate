import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUnreadCount, getUserNotifications } from "@/lib/db";

/**
 * SSE (Server-Sent Events) endpoint cho realtime notification.
 *
 * Flow:
 *   - Client `EventSource("/api/notifications/stream")` mở connection
 *   - Server poll DB mỗi 5s, so sánh với snapshot lần trước
 *   - Khi có notification mới → push event qua SSE
 *   - Auto-reconnect built-in của EventSource
 *
 * Trade-off với native pub/sub (Postgres LISTEN/NOTIFY):
 *   - Pub/sub realtime hơn (~50ms vs 5s polling)
 *   - Nhưng cần keep-alive connection riêng → tốn 1 conn pool slot
 *   - Render free tier 0.5 vCPU → polling 5s đủ nhanh, ít resource
 *   - Khi scale lớn (>1000 user concurrent) sẽ migrate sang Redis pub/sub
 *
 * Render free tier note:
 *   - Service sleep sau 15 phút idle → SSE disconnect
 *   - Browser EventSource auto-reconnect khi service wake up
 *   - User mở lại tab → new connection được tạo
 */

const POLL_INTERVAL_MS = 5000;       // 5s — đủ realtime, không quá tốn DB
const KEEPALIVE_INTERVAL_MS = 25000; // 25s — gửi comment để giữ connection (nginx mặc định timeout 30s)
const MAX_DURATION_MS = 5 * 60 * 1000; // 5 phút — tự đóng để tránh leak conn nếu client crash
const MAX_CONNECTIONS_PER_USER = 5;  // chống 1 user mở quá nhiều tab/script làm cạn tài nguyên

// Đếm số kết nối SSE đang mở theo user (in-process; Render free chạy 1 instance).
// Dùng globalThis để không bị reset khi Hot Reload trong dev.
const globalForSse = globalThis as unknown as { __sse_conns?: Map<number, number> };
const sseConns = globalForSse.__sse_conns ?? new Map<number, number>();
globalForSse.__sse_conns = sseConns;

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;
  const userId = auth.user.id;

  // Giới hạn số kết nối đồng thời / user → chống cạn kiệt connection pool / CPU.
  const current = sseConns.get(userId) ?? 0;
  if (current >= MAX_CONNECTIONS_PER_USER) {
    return new Response(
      JSON.stringify({ success: false, error: "Quá nhiều kết nối realtime. Đóng bớt tab rồi thử lại." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "30" } },
    );
  }
  sseConns.set(userId, current + 1);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let lastUnreadCount = -1;
      let lastNotifId = 0;
      let closed = false;

      // Helper gửi 1 event SSE đúng spec.
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      // Initial sync — gửi state hiện tại ngay khi connect.
      const initialNotifs = await getUserNotifications(userId, 1);
      const initialUnread = await getUnreadCount(userId);
      lastUnreadCount = initialUnread;
      lastNotifId = initialNotifs[0]?.id ?? 0;
      send("init", { unreadCount: initialUnread });

      // Poll loop — check DB mỗi 5s.
      const pollId = setInterval(async () => {
        if (closed) return;
        try {
          const [notifs, unread] = await Promise.all([
            getUserNotifications(userId, 5),
            getUnreadCount(userId),
          ]);

          // Phát hiện notification MỚI (id lớn hơn lần poll trước).
          const newOnes = notifs.filter((n) => n.id > lastNotifId);
          if (newOnes.length > 0) {
            // newOnes sắp xếp DESC theo created_at → emit từ cũ → mới để client xử lý đúng order.
            for (const n of newOnes.slice().reverse()) {
              send("notification", n);
            }
            lastNotifId = Math.max(...notifs.map((n) => n.id));
          }

          // Phát hiện unreadCount đổi — emit cho UI cập nhật badge.
          if (unread !== lastUnreadCount) {
            send("unread", { count: unread });
            lastUnreadCount = unread;
          }
        } catch (e) {
          // Lỗi DB tạm — không close stream, lần poll sau retry.
          console.warn("[SSE notif] poll error:", e);
        }
      }, POLL_INTERVAL_MS);

      // Keepalive — comment frame để proxy/nginx không timeout.
      const keepId = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          closed = true;
        }
      }, KEEPALIVE_INTERVAL_MS);

      // Auto-close sau MAX_DURATION để tránh leak. Browser sẽ tự reconnect.
      const closeId = setTimeout(() => {
        if (closed) return;
        send("reconnect", { reason: "max_duration" });
        cleanup();
      }, MAX_DURATION_MS);

      // Detect khi client đóng (tab close, navigate away).
      request.signal.addEventListener("abort", () => {
        if (Date.now() - startTime < 100) return; // ignore false abort
        cleanup();
      });

      function cleanup() {
        if (closed) return;
        closed = true;
        // Giảm bộ đếm kết nối của user (không âm).
        const c = sseConns.get(userId) ?? 1;
        if (c <= 1) sseConns.delete(userId);
        else sseConns.set(userId, c - 1);
        clearInterval(pollId);
        clearInterval(keepId);
        clearTimeout(closeId);
        try {
          controller.close();
        } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      // Render proxy có thể buffer SSE. Header này hint không buffer.
      "X-Accel-Buffering": "no",
    },
  });
}
