import { redirect } from "next/navigation";
import { resolveShortLink } from "@/lib/db";

interface Ctx { params: Promise<{ code: string }>; }

/**
 * Short link redirect: /s/<code> → URL Shopee đầy đủ với tracking.
 *
 * Mục đích: link Shopee gốc dài 200+ ký tự → Facebook KHÔNG auto-link
 * (link bị đen, không click). Short link `https://vaffiliate.vn/s/xxxxx`
 * gọn → FB nhận diện thành link xanh click được.
 *
 * Server-side redirect 302 để bot/preview cũng đi theo. Tăng click_count
 * cho mỗi lần truy cập → analytics.
 */
export default async function ShortLinkRedirect({ params }: Ctx) {
  const { code } = await params;
  const target = await resolveShortLink(code);
  if (!target) {
    // Không tìm thấy → về landing page với hint.
    redirect("/?msg=short_link_not_found");
  }
  redirect(target);
}

// Metadata SEO không cần cho page này — tránh search engine index trang redirect.
export const metadata = {
  robots: { index: false, follow: false },
};
