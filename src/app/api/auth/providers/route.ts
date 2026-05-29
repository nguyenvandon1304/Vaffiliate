import { NextResponse } from "next/server";
import { isGoogleConfigured } from "@/lib/oauth-google";

/**
 * GET /api/auth/providers — frontend dùng để biết nút Google có hiển thị không.
 * Public (không cần auth). Cache 5 phút vì env hiếm khi đổi.
 */
export async function GET() {
  return NextResponse.json(
    {
      google: isGoogleConfigured(),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}
