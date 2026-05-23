import { NextRequest, NextResponse } from "next/server";
import { updateUserProfile } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isEmail, pickString } from "@/lib/validate";

export async function PUT(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));

  const display_name = pickString(body?.display_name, 80);
  const email = pickString(body?.email, 200);
  const phone = pickString(body?.phone, 30);

  if (email !== undefined && !isEmail(email)) {
    return NextResponse.json({ success: false, error: "Email không hợp lệ" }, { status: 400 });
  }

  const result = await updateUserProfile(auth.user.id, { display_name, email, phone });

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: "Cập nhật thành công" });
}
