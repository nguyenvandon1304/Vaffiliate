import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const database = await getDb();
  const rows = database
    .prepare(
      "SELECT id, shop_id, item_id, product_name, product_price, commission, commission_rate, cashback, affiliate_link, created_at FROM affiliate_links WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    )
    .all(auth.user.id) as Record<string, unknown>[];

  return NextResponse.json({ success: true, links: rows });
}
