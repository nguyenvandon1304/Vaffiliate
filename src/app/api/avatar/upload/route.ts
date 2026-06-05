import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { updateUserProfile } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const UPLOAD_DIR = path.join(process.cwd(), "public", "avatars");

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  try {
    const body = await request.json();
    const { data, filename } = body as { data: string; filename: string };

    if (!data || typeof data !== "string") {
      return NextResponse.json({ success: false, error: "Dữ liệu ảnh không hợp lệ" }, { status: 400 });
    }

    // Parse base64 data URI: data:image/png;base64,<base64>
    const matches = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ success: false, error: "Định dạng ảnh không hợp lệ" }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json({ success: false, error: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF" }, { status: 400 });
    }

    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ success: false, error: "Ảnh vượt quá 2MB" }, { status: 400 });
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const ext = mimeType.split("/")[1].replace("jpeg", "jpg");
    const safeName = `u${auth.user.id}_${Date.now()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);

    await writeFile(filePath, buffer);

    // Save avatar URL in DB — relative path so it works on any domain
    const avatarUrl = `/avatars/${safeName}`;
    await updateUserProfile(auth.user.id, { avatar: avatarUrl });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (err) {
    console.error("[avatar/upload]", err);
    return NextResponse.json({ success: false, error: "Lỗi khi tải ảnh lên" }, { status: 500 });
  }
}
