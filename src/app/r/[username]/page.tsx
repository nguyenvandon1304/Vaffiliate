import { redirect } from "next/navigation";

interface Ctx { params: Promise<{ username: string }>; }

/**
 * Short link giới thiệu: /r/<username> → / với ?ref=<username>.
 * URL gọn hơn để chia sẻ. Server-side redirect để bot/preview cũng theo được.
 */
export default async function ReferralRedirect({ params }: Ctx) {
  const { username } = await params;
  // sanitize: chỉ cho phép chữ, số, gạch dưới (khớp regex username).
  const clean = (username || "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
  redirect(`/?ref=${encodeURIComponent(clean)}`);
}
