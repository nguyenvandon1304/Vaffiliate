"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { UserDetailModal } from "@/components/admin/UserDetailModal";
import { ExportButton } from "@/components/admin/ExportButton";

interface UserRow {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  role: string;
  is_active: number;
  email_verified: number;
  created_at: string;
  last_login: string | null;
}

function formatDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const PAGE_SIZE = 20;

export function UsersTab() {
  const toast = useToast();
  const params = useSearchParams();
  const initialStatus = params.get("status");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | "admin" | "user">("all");
  const [status, setStatus] = useState<"all" | "active" | "blocked" | "unverified">(
    initialStatus === "active" || initialStatus === "blocked" || initialStatus === "unverified"
      ? initialStatus
      : "all",
  );
  const [loading, setLoading] = useState(false);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  // Bulk selection state — per-id checkbox.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), pageSize: String(PAGE_SIZE),
    });
    if (search.trim()) params.set("search", search.trim());
    if (role !== "all") params.set("role", role);
    if (status !== "all") params.set("status", status);
    try {
      const res = await fetch(`/api/admin/users?${params}`);
      const d = await res.json();
      if (d.success) { setUsers(d.users); setTotal(d.total); }
      else toast.error(d.error || "Không tải được danh sách user");
    } catch {
      toast.error("Lỗi kết nối khi tải user. Thử lại.");
    } finally {
      setLoading(false);
    }
  }, [page, search, role, status, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch theo filter
    reload();
  }, [reload]);

  // Khi filter đổi → reset về page 1.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, role, status]);

  const handleToggle = async (userId: number, isActive: number, username: string) => {
    const action = isActive ? "khoá" : "mở khoá";
    if (!confirm(`Xác nhận ${action} tài khoản "${username}"?`)) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const d = await res.json();
    if (d.success) { toast.success("Đã cập nhật trạng thái"); reload(); }
    else toast.error(d.error || "Lỗi");
  };

  const handleSetRole = async (userId: number, newRole: "admin" | "user", username: string) => {
    const verb = newRole === "admin" ? "cấp quyền admin cho" : "thu hồi quyền admin của";
    if (!confirm(`Xác nhận ${verb} ${username}?`)) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    const d = await res.json();
    if (d.success) { toast.success("Đã đổi role"); reload(); }
    else toast.error(d.error || "Lỗi");
  };

  // Bulk action handlers
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };
  const handleBulk = async (action: "block" | "unblock" | "verify_email" | "delete") => {
    if (selectedIds.size === 0) return;
    const labels: Record<string, string> = {
      block: `khoá ${selectedIds.size} user`,
      unblock: `mở khoá ${selectedIds.size} user`,
      verify_email: `đánh dấu verified email cho ${selectedIds.size} user`,
      delete: `xoá (soft) ${selectedIds.size} user`,
    };
    if (!confirm(`Xác nhận ${labels[action]}? Không thể undo.`)) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedIds), action }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`Đã áp dụng cho ${d.affected} user (skip ${d.skipped ?? 0})`);
        setSelectedIds(new Set());
        reload();
      } else {
        toast.error(d.error || "Lỗi");
      }
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Quản Lý Người Dùng ({total.toLocaleString("vi-VN")})
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton
            endpoint="/api/admin/export/users"
            filename="users.csv"
            label="Xuất CSV"
          />
        </div>
      </div>

      {/* Bulk action bar — chỉ hiện khi có selection */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl px-4 py-3">
          <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
            Đã chọn {selectedIds.size} user
          </span>
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            <button
              type="button"
              onClick={() => handleBulk("verify_email")}
              disabled={bulkBusy}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 disabled:opacity-50"
            >
              ✅ Verify email
            </button>
            <button
              type="button"
              onClick={() => handleBulk("block")}
              disabled={bulkBusy}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 disabled:opacity-50"
            >
              🔒 Khoá
            </button>
            <button
              type="button"
              onClick={() => handleBulk("unblock")}
              disabled={bulkBusy}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 disabled:opacity-50"
            >
              🔓 Mở khoá
            </button>
            <button
              type="button"
              onClick={() => handleBulk("delete")}
              disabled={bulkBusy}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 disabled:opacity-50"
            >
              🗑 Xoá
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 mb-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔎 Tìm theo username, email, tên..."
          className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-orange-500"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
        >
          <option value="all">Tất cả role</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-orange-500"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
          <option value="unverified">Chờ xác minh</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-center px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedIds.size === users.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer accent-orange-500"
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">ID</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Username</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Tên</th>
                <th className="text-center px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Role</th>
                <th className="text-center px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Trạng thái</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Ngày tạo</th>
                <th className="text-center px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Đang tải…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Không có kết quả</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className={`border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                  selectedIds.has(u.id)
                    ? "bg-orange-50/40 dark:bg-orange-500/[0.05]"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                }`}>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      className="w-4 h-4 cursor-pointer accent-orange-500"
                      aria-label={`Chọn ${u.username}`}
                      disabled={u.role === "admin"}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{u.id}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                    <button
                      type="button"
                      onClick={() => setDetailUserId(u.id)}
                      className="hover:text-orange-500 dark:hover:text-orange-400 hover:underline transition-colors text-left cursor-pointer"
                      title="Xem chi tiết"
                    >
                      {u.username}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.display_name || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-red-500/20 text-red-600 dark:text-red-400" : "bg-blue-500/20 text-blue-600 dark:text-blue-400"}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!u.email_verified ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400">Chờ xác minh</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/20 text-red-600 dark:text-red-400"}`}>
                        {u.is_active ? "Active" : "Blocked"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <button
                        onClick={() => setDetailUserId(u.id)}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Xem chi tiết"
                      >
                        Chi tiết
                      </button>
                      {u.role !== "admin" ? (
                        <>
                          <button
                            onClick={() => handleToggle(u.id, u.is_active, u.username)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                              u.is_active
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                                : "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                            }`}
                          >
                            {u.is_active ? "Block" : "Unblock"}
                          </button>
                          <button
                            onClick={() => handleSetRole(u.id, "admin", u.username)}
                            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
                          >
                            ↑ Admin
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleSetRole(u.id, "user", u.username)}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                        >
                          ↓ User
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {detailUserId !== null && (
        <UserDetailModal
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onChanged={reload}
        />
      )}
    </>
  );
}
