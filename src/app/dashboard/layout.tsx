import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByToken } from "@/lib/db";
import { DashboardShell } from "@/components/DashboardShell";

/**
 * Layout server-side cho `/dashboard/*`.
 *
 *   - Không có session → redirect "/"
 *   - Admin login → redirect "/admin" (admin có panel riêng)
 *   - User thường → render bình thường
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  return <DashboardShell>{children}</DashboardShell>;
}
