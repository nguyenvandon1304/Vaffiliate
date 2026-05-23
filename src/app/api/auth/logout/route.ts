import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/db";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;

  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ success: true, message: "Đã đăng xuất" });
  response.cookies.delete("session_token");

  return response;
}
