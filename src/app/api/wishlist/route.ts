import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { addToWishlist, getUserWishlist, refreshStaleItems, removeFromWishlist } from "@/lib/wishlist";

/**
 * GET /api/wishlist?refresh=1
 *   Trả list wishlist của user. Nếu ?refresh=1 → check giá tất cả item stale
 *   trước khi trả về. Mặc định không refresh (UX nhanh, có nút Refresh manual).
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  let refreshSummary: { updated: number; dropped: number } | null = null;

  if (url.searchParams.get("refresh") === "1") {
    // Lazy check — fire here, đợi xong mới trả response để client thấy giá mới.
    refreshSummary = await refreshStaleItems(auth.user.id);
  }

  const items = await getUserWishlist(auth.user.id);
  return NextResponse.json({ success: true, items, refreshed: refreshSummary });
}

/**
 * POST /api/wishlist — body: { url: string }
 * Thêm sản phẩm Shopee vào wishlist.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const productUrl = typeof body?.url === "string" ? body.url : "";

  const result = await addToWishlist(auth.user.id, productUrl);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, item: result.item });
}

/**
 * DELETE /api/wishlist?id=123 — xoá 1 item.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ success: false, error: "Thiếu id" }, { status: 400 });

  const result = await removeFromWishlist(auth.user.id, id);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
