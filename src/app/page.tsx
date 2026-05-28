import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginCard } from "@/components/LoginCard";
import { LoginHero } from "@/components/LoginHero";
import { InstallPrompt } from "@/components/InstallPrompt";
import Footer from "@/components/Footer";
import { getUserByToken } from "@/lib/db";

export default async function Home() {
  // Nếu đã đăng nhập rồi → đẩy thẳng đến panel tương ứng theo role.
  // User mở lại "/" sẽ không thấy form login một cách thừa.
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (token) {
    const headersList = await headers();
    const ip =
      headersList.get("cf-connecting-ip") ||
      headersList.get("x-real-ip") ||
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      undefined;
    const userAgent = headersList.get("user-agent") ?? undefined;
    const user = await getUserByToken(token, { ip, userAgent });
    if (user) {
      if (user.role === "admin") redirect("/admin");
      else redirect("/dashboard");
    }
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-orange-50 via-amber-50/50 to-white dark:from-zinc-950 dark:via-zinc-900 dark:to-black" />
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-orange-100/40 blur-3xl dark:bg-orange-900/20" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-100/30 blur-3xl dark:bg-amber-900/15" />
      </div>

      {/* Main content — 2 column on desktop, single column on mobile */}
      <div className="w-full flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Hero illustration + social proof + testimonials (desktop only) */}
          <LoginHero />

          {/* Right: Login form */}
          <div className="w-full">
            <LoginCard />
          </div>
        </div>
      </div>

      {/* Install Prompt */}
      <InstallPrompt />

      <Footer />
    </main>
  );
}
