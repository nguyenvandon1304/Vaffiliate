import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByToken } from "@/lib/db";

/**
 * Layout server-side cho `/admin/*`.
 *
 * Pre-check session ở server trước khi render bất kỳ child page nào.
 *   - Không có session → redirect "/"
 *   - Session hợp lệ nhưng không phải admin → redirect "/dashboard"
 *   - Admin → render bình thường
 *
 * Lợi ích so với client check (vốn có sẵn trong /admin/page.tsx):
 *   - Không có flash UI admin với non-admin user
 *   - Không tải bundle JS admin về cho user thường (Next.js chỉ stream HTML)
 *   - Đồng bộ với pre-check ở các route handler API
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) redirect("/");

  const headersList = await headers();
  const ip =
    headersList.get("cf-connecting-ip") ||
    headersList.get("x-real-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    undefined;
  const userAgent = headersList.get("user-agent") ?? undefined;

  const user = await getUserByToken(token, { ip, userAgent });
  if (!user) redirect("/");
  if (user.role !== "admin") redirect("/dashboard");

  return <>{children}</>;
}
