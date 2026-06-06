"use client";

import { CaffiliateLogo } from "@/components/icons";

export default function Footer() {
  return (
    <footer className="mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6 space-y-3">

        {/* ── Community Section ── */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-transparent dark:from-orange-500/10 dark:via-amber-500/5 dark:to-transparent" />
          <div className="relative bg-white/80 dark:bg-[#18181b] backdrop-blur-sm border border-black/5 dark:border-white/10 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/25">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h3 className="font-black text-base text-gray-900 dark:text-zinc-100 leading-tight">Cộng đồng V-Affiliate</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">Kết nối, chia sẻ và cùng nhau phát triển</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/groups/1277321027865135"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 bg-gray-50/80 dark:bg-white/5 hover:bg-blue-50/80 dark:hover:bg-blue-500/10 border border-black/5 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/30 rounded-xl p-3.5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-zinc-100">Nhóm Facebook</p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500">Hỗ trợ &amp; kinh nghiệm</p>
                </div>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-300 dark:text-zinc-600 shrink-0 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </a>

              {/* Zalo */}
              <a
                href="https://zalo.me/g/fvb2ibqot4eeankjntn7"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 bg-gray-50/80 dark:bg-white/5 hover:bg-blue-50/80 dark:hover:bg-blue-500/10 border border-black/5 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/30 rounded-xl p-3.5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-[#0068FF] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <span className="text-white font-black text-sm">Z</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-zinc-100">Nhóm Zalo</p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500">Hỗ trợ nhanh</p>
                </div>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-300 dark:text-zinc-600 shrink-0 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </a>

              {/* Fanpage */}
              <a
                href="https://www.facebook.com/profile.php?id=61590342930888"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 bg-gray-50/80 dark:bg-white/5 hover:bg-orange-50/80 dark:hover:bg-orange-500/10 border border-black/5 dark:border-white/10 hover:border-orange-200 dark:hover:border-orange-500/30 rounded-xl p-3.5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-zinc-100">Fanpage</p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500">Tin tức &amp; khuyến mãi</p>
                </div>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-300 dark:text-zinc-600 shrink-0 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </a>
            </div>
          </div>
        </div>

        {/* ── App Store Section ── */}
        <div className="flex items-center justify-between bg-white/80 dark:bg-[#18181b] backdrop-blur-sm border border-black/5 dark:border-white/10 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500 dark:text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-zinc-100">Tải Ứng Dụng</p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-500">Trải nghiệm tốt nhất trên app di động</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="#" className="block group">
              <div className="flex items-center gap-1.5 bg-black dark:bg-white/10 text-white rounded-xl px-3 py-2 group-hover:bg-gray-800 dark:group-hover:bg-white/15 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.862l2.244 1.298a1 1 0 0 1 0 1.714l-2.244 1.299-2.537-2.537 2.537-2.774zM5.864 2.658L16.8 8.991l-2.302 2.302L5.864 2.658z" /></svg>
                <div className="leading-none">
                  <p className="text-[7px] uppercase opacity-70">Coming soon</p>
                  <p className="text-[10px] font-semibold">Google Play</p>
                </div>
              </div>
            </a>
            <a href="#" className="block group">
              <div className="flex items-center gap-1.5 bg-black dark:bg-white/10 text-white rounded-xl px-3 py-2 group-hover:bg-gray-800 dark:group-hover:bg-white/15 transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
                <div className="leading-none">
                  <p className="text-[7px] uppercase opacity-70">Coming soon</p>
                  <p className="text-[10px] font-semibold">App Store</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Footer ── */}
      <div className="border-t border-black/5 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-8">
            {/* Logo + desc + social */}
            <div className="sm:col-span-4">
              <CaffiliateLogo />
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-3 leading-relaxed max-w-xs">
                Trợ lý mua sắm thông minh — hoàn tiền tự động khi mua hàng qua các sàn thương mại điện tử.
              </p>
              <div className="flex items-center gap-2.5 mt-4">
                {[
                  { href: "https://www.facebook.com/profile.php?id=61590342930888", label: "Facebook", icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> },
                  { href: "#", label: "YouTube", icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg> },
                  { href: "#", label: "Instagram", icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg> },
                ].map(({ href, label, icon }) => (
                  <a key={label} href={href} aria-label={label} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 bg-gray-100 dark:bg-white/5 hover:bg-orange-100 dark:hover:bg-orange-500/15 rounded-full flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:text-orange-500 transition-all hover:scale-110">
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {/* V-Affiliate links */}
            <div className="sm:col-span-3 sm:col-start-6">
              <h4 className="font-black text-xs text-gray-900 dark:text-zinc-100 uppercase tracking-widest mb-4">V-Affiliate</h4>
              <ul className="space-y-2.5">
                {[
                  { href: "/dashboard/cashback", icon: <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>, label: "Công cụ hoàn tiền" },
                  { href: "/dashboard?tab=orders", icon: <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" x2="21" y1="6" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>, label: "Đơn hàng" },
                  { href: "/dashboard?tab=wallet", icon: <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>, label: "Tài chính" },
                  { href: "/dashboard/help", icon: <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>, label: "Hướng dẫn sử dụng" },
                  { href: "/dashboard/referral", icon: <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>, label: "Giới thiệu bạn bè" },
                ].map(({ href, icon, label }) => (
                  <li key={href}>
                    <a href={href} className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-500 hover:text-orange-500 transition-colors group">
                      <span className="text-gray-300 dark:text-zinc-700 group-hover:text-orange-400 transition-colors">{icon}</span>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="sm:col-span-3 sm:col-start-9">
              <h4 className="font-black text-xs text-gray-900 dark:text-zinc-100 uppercase tracking-widest mb-4">Liên hệ</h4>
              <ul className="space-y-3">
                {[
                  { icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>, title: "nguyenvandon1304@gmail.com", sub: "Email liên hệ" },
                  { icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, title: "08:00 - 22:00 hàng ngày", sub: "Giờ hỗ trợ" },
                  { icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>, title: "Rút tiền", suffix: "60 phút", sub: "Cam kết xử lý" },
                ].map(({ icon, title, suffix, sub }) => (
                  <li key={sub} className="flex items-start gap-2.5">
                    <span className="text-orange-400 mt-0.5 shrink-0">{icon}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-800 dark:text-zinc-200">{title} &lt; {suffix}</p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-600">{sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-black/5 dark:border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-gray-400 dark:text-zinc-600">
              &copy; 2026 V-Affiliate. Bản quyền thuộc về V-Affiliate Team.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-[11px] text-gray-400 dark:text-zinc-600 hover:text-orange-500 transition-colors">Privacy Policy</a>
              <a href="#" className="text-[11px] text-gray-400 dark:text-zinc-600 hover:text-orange-500 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
