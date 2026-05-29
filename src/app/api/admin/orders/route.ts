import { NextRequest, NextResponse } from "next/server";
import {
  adminCreateOrder,
  adminDeleteOrder,
  adminUpdateOrder,
  getAllOrdersPaged,
  logAudit,
  type OrderListFilter,
} from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

/** GET — phân trang + filter (search/status/store/from/to). */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const filter: OrderListFilter = {
    search: url.searchParams.get("search") ?? undefined,
    status: (url.searchParams.get("status") as OrderListFilter["status"]) ?? undefined,
    store: url.searchParams.get("store") ?? undefined,
    fromDate: url.searchParams.get("from") ?? undefined,
    toDate: url.searchParams.get("to") ?? undefined,
    page: Number(url.searchParams.get("page")) || 1,
    pageSize: Number(url.searchParams.get("pageSize")) || 20,
  };

  const result = await getAllOrdersPaged(filter);
  return NextResponse.json({
    success: true,
    orders: result.rows,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
}

/** POST — tạo đơn hàng thủ công. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const { userId, orderCode, store, amount, cashback, status } = await request.json();
  if (!userId || !orderCode || !amount) {
    return NextResponse.json({ success: false, error: "Thiếu thông tin" }, { status: 400 });
  }
  // Validate số tiền dương + status hợp lệ.
  const VALID_STATUS = ["Đã hoàn tiền", "Đang xử lý", "Chờ xác nhận", "Đã hủy"];
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ success: false, error: "Giá trị đơn phải là số dương" }, { status: 400 });
  }
  if (cashback !== undefined && (!Number.isFinite(Number(cashback)) || Number(cashback) < 0)) {
    return NextResponse.json({ success: false, error: "Cashback phải là số không âm" }, { status: 400 });
  }
  if (status && !VALID_STATUS.includes(status)) {
    return NextResponse.json({ success: false, error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  const result = await adminCreateOrder(userId, orderCode, store || "Shopee", amount, cashback || 0, status || "Chờ xác nhận");
  if (result.success) {
    await logAudit("admin.order.create", {
      userId: auth.user.id,
      target: `order=${orderCode}`,
      ip: getClientIp(request.headers),
      userAgent: request.headers.get("user-agent"),
      detail: `user_id=${userId}, amount=${amount}, status=${status}`,
    });
  }
  return NextResponse.json(result);
}

/** PATCH — sửa đơn (đồng bộ ví theo chuyển trạng thái). */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

  const result = await adminUpdateOrder(id, {
    amount: body?.amount,
    cashback: body?.cashback,
    status: body?.status,
    store: body?.store,
  });
  if (!result.success) return NextResponse.json(result, { status: 400 });

  await logAudit("admin.order.update", {
    userId: auth.user.id,
    target: `order_id=${id}`,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    detail: JSON.stringify(body),
  });
  return NextResponse.json(result);
}

/** DELETE — xoá đơn (thu hồi cashback nếu đã hoàn). */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

  const result = await adminDeleteOrder(id);
  if (!result.success) return NextResponse.json(result, { status: 400 });

  await logAudit("admin.order.delete", {
    userId: auth.user.id,
    target: `order_id=${id}`,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json(result);
}
