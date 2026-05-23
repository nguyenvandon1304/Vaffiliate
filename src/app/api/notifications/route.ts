import { NextRequest, NextResponse } from "next/server";
import {
  deleteNotification,
  getUnreadCount,
  getUserNotifications,
  markNotificationsRead,
  markOneNotificationRead,
} from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(auth.user.id),
    getUnreadCount(auth.user.id),
  ]);

  return NextResponse.json({ success: true, notifications, unreadCount });
}

/** PATCH: body { id } → mark đã đọc 1 thông báo; không có body → mark all. */
export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id: number | undefined = typeof body?.id === "number" ? body.id : undefined;

  if (id !== undefined) {
    await markOneNotificationRead(auth.user.id, id);
  } else {
    await markNotificationsRead(auth.user.id);
  }
  return NextResponse.json({ success: true });
}

/** DELETE: body { id } để xoá 1 thông báo. */
export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = body?.id;
  if (typeof id !== "number") {
    return NextResponse.json({ success: false, error: "Thiếu id" }, { status: 400 });
  }

  const result = await deleteNotification(auth.user.id, id);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
