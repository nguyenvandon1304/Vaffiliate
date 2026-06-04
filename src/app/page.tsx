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
      {/* Layered background gradient for depth */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-orange-50 via-amber-50/30 to-white dark:from-zinc-950 dark:via-zinc-900 dark:to-black" />
      <div className="fixed inset-0 -z-10">
        {/* Top right large blob */}
        <div className="absolute top-[-15%] right-[-5%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-orange-200/40 via-amber-200/30 to-transparent blur-3xl dark:from-orange-900/15 dark:via-amber-900/10" />
        {/* Bottom left medium blob */}
        <div className="absolute bottom-[-15%] left-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-amber-200/40 via-orange-100/30 to-transparent blur-3xl dark:from-amber-900/10 dark:via-orange-900/10" />
        {/* Top center small accent */}
        <div className="absolute top-[10%] left-[30%] w-[300px] h-[300px] rounded-full bg-orange-100/30 blur-3xl dark:bg-orange-900/10" />
        {/* Bottom right accent */}
        <div className="absolute bottom-[20%] right-[20%] w-[250px] h-[250px] rounded-full bg-amber-100/30 blur-2xl dark:bg-amber-900/10" />
      </div>

      {/* Main content — 2 column on desktop, single column on mobile */}
      {/* pb-* phải đủ chừa chỗ cho InstallPrompt fixed dưới đáy + Footer
          Banner cao ~84px + container padding ~16px + footer ~56px = ~160px */}
      <div className="w-full flex-1 flex items-center justify-center px-4 py-8 sm:py-12 pb-40 sm:pb-44 lg:pb-32">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left: Hero illustration + social proof + testimonials (desktop only) */}
          <LoginHero />

          {/* Right: Login form */}
          <div className="w-full max-w-md mx-auto lg:max-w-none">
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
