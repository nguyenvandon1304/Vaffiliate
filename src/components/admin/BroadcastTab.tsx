"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

export function BroadcastTab() {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "user" | "admin">("all");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Vui lòng nhập tiêu đề và nội dung");
      return;
    }
    if (!confirm(`Gửi thông báo này tới ${target === "all" ? "tất cả người dùng" : target === "user" ? "user thường" : "các admin"}?`)) return;
    setSending(true);
    const r = await fetch("/api/admin/broadcast", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), message: message.trim(), targetRole: target }),
    });
    const d = await r.json();
    if (d.success) { toast.success(`Đã gửi tới ${d.count} người dùng`); setTitle(""); setMessage(""); }
    else toast.error(d.error || "Lỗi");
    setSending(false);
  };

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Gửi Thông Báo Hệ Thống</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 max-w-2xl">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Thông báo sẽ xuất hiện trong icon chuông của user. Phù hợp cho cập nhật quan trọng,
          khuyến mãi, thông báo bảo trì.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tiêu đề</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="VD: Khuyến mãi tháng 6"
              className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/200</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nội dung</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Nội dung chi tiết..."
              className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/2000</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Đối tượng</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as typeof target)}
              className="mt-1 w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
            >
              <option value="all">Tất cả người dùng (đang active)</option>
              <option value="user">Chỉ user thường</option>
              <option value="admin">Chỉ admin</option>
            </select>
          </div>

          <button
            onClick={send}
            disabled={sending}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg"
          >
            {sending ? "Đang gửi..." : "📨 Gửi thông báo"}
          </button>
        </div>
      </div>
    </>
  );
}
