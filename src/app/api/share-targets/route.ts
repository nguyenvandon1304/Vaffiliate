import { NextRequest, NextResponse } from "next/server";
import { listShareTargets, addShareTarget, deleteShareTarget } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * /api/share-targets — quản lý "nơi đăng" của user.
 *
 * Use case: FB không auto-link domain mới ở trang cá nhân nhưng VẪN auto-link
 * trong group. User lưu sẵn link group/page yêu thích → sau khi tạo affiliate
 * link, app hiện shortcut "Mở [Group X] để đăng" → 1 click → tab mới mở
 * group/page → user paste link đã copy.
 */

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const targets = await listShareTargets(auth.user.id);
  return NextResponse.json({ success: true, targets });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  let body: { label?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Body không hợp lệ" }, { status: 400 });
  }

  const result = await addShareTarget(auth.user.id, {
    label: body.label || "",
    url: body.url || "",
  });
  if (!result.success) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const idStr = url.searchParams.get("id");
  const id = idStr ? Number(idStr) : NaN;
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ success: false, error: "ID không hợp lệ" }, { status: 400 });
  }

  const result = await deleteShareTarget(auth.user.id, id);
  if (!result.success) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
