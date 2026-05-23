import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-amber-50 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <div className="text-center max-w-md">
        <p className="text-7xl sm:text-8xl font-black bg-gradient-to-br from-orange-400 to-orange-600 bg-clip-text text-transparent mb-3">
          404
        </p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-zinc-100 mb-2">
          Không tìm thấy trang
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed">
          Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển. Hãy thử quay về
          trang chủ.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
