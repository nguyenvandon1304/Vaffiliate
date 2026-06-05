"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useToast } from "@/components/Toast";

interface Step {
  num: number;
  title: string;
  body: string;
  icon: string;
}

interface FAQ { q: string; a: string; }

const STEPS: Step[] = [
  {
    num: 1,
    title: "Đăng ký tài khoản",
    icon: "📧",
    body: "Bấm Đăng ký → nhập tên đăng nhập, email và mật khẩu. Hoặc nhanh hơn: bấm \"Tiếp tục với Google\" để đăng nhập 1 chạm bằng Gmail. Nếu đăng ký bằng email, mở hộp thư bấm nút xác thực (kiểm tra cả mục Spam/Quảng cáo nếu chưa thấy sau 1-2 phút). Xong là dùng được ngay!",
  },
  {
    num: 2,
    title: "Tạo link hoàn tiền cho sản phẩm",
    icon: "🔗",
    body: "Thấy món đồ ưng ý trên Shopee? Ở app Shopee bấm Chia sẻ → Sao chép link (hoặc copy link trên web). Vào \"Tạo link\" của V-Affiliate → dán link → bấm Lấy Link. Trong vài giây bạn có ngay link hoàn tiền riêng + thấy luôn số tiền sẽ được hoàn về ví.",
  },
  {
    num: 3,
    title: "Mua & nhận voucher + hoàn tiền",
    icon: "🛍",
    body: "Có 2 cách mua:\n\n📘 CÁCH 1 — Nhận voucher Facebook (khuyến nghị): (1) Copy link đã chuyển đổi bằng nút \"Copy link\"; (2) Bấm \"Mở Facebook\" đến bài viết ghim; (3) Comment link vừa copy vào bài viết; (4) Bấm vào chính link bạn vừa comment → voucher Facebook tự động hiện ở bước thanh toán.\n\n⚡ CÁCH 2 — Direct: Bấm \"MUA NGAY\" → mở app Shopee → mua bình thường → hoàn tiền vẫn về ví đầy đủ.\n\n⚠️ Quan trọng: sau khi bấm link, đừng mở lại Shopee từ chỗ khác (Google, Messenger...) kẻo mất hoàn tiền.",
  },
  {
    num: 4,
    title: "Chờ đơn duyệt → tiền về ví",
    icon: "⏳",
    body: "Đơn vừa đặt sẽ hiện ở mục \"Đang chờ duyệt\" — đây là cashback đang chờ Shopee xác nhận, CHƯA rút được. Khi bạn nhận hàng và không trả lại (thường 7-15 ngày, tối đa 90 ngày tuỳ Shopee), đơn chuyển sang \"Đã hoàn tiền\" và tiền tự động cộng vào Ví — lúc này mới rút được.",
  },
  {
    num: 5,
    title: "Rút tiền về ngân hàng",
    icon: "💸",
    body: "Vào Tài chính → Thêm tài khoản ngân hàng (chỉ làm 1 lần) → đặt mật khẩu rút tiền 4-6 chữ số. Khi ví đủ số dư tối thiểu, bấm Rút tiền → nhập số tiền + mật khẩu rút → admin duyệt và chuyển khoản, tiền về tài khoản của bạn trong 1-2 ngày làm việc. Hoàn toàn miễn phí!",
  },
];

const FAQS: FAQ[] = [
  {
    q: "Tôi được hoàn lại bao nhiêu tiền?",
    a: "Bạn nhận lại phần lớn hoa hồng mà Shopee trả cho mỗi đơn — bắt đầu từ 50% (hạng Bronze). Càng mua nhiều hoặc mời nhiều bạn, hạng càng cao và cashback càng tăng: 🥈 Silver 53% · 🥇 Gold 55% · 💎 VIP 58%, áp dụng vĩnh viễn cho MỌI đơn về sau. Hoa hồng tuỳ shop & sản phẩm (thường 1-15% giá trị đơn). Thỉnh thoảng Shopee còn có thêm voucher giảm giá ở bước thanh toán, nhưng cái này tuỳ thời điểm — không phải đơn nào cũng có.",
  },
  {
    q: "Bao lâu tiền mới về ví?",
    a: "Thường 7-15 ngày sau khi bạn nhận hàng và Shopee xác nhận đơn. Một số đơn có thể lâu hơn (đến 90 ngày) nếu có đổi/trả. Trong lúc chờ, cashback hiện ở mục \"Đang chờ duyệt\" trên Dashboard — khi Shopee duyệt xong, tiền tự động chuyển vào Ví và bạn rút được ngay.",
  },
  {
    q: "Tôi đã mua hàng rồi mà không thấy đơn nào trên V-Affiliate?",
    a: "Đơn KHÔNG xuất hiện ngay sau khi mua — V-Affiliate cần đối soát dữ liệu từ Shopee (thường 1-3 ngày) rồi đơn mới hiện ở mục \"Đang chờ duyệt\". Nếu sau đó vẫn không thấy, có thể do: (1) Sau khi bấm link V-Affiliate bạn lại mở Shopee từ chỗ khác (Google, Messenger...) → mất tracking; (2) Trình duyệt chặn cookie; (3) Đơn bị huỷ/trả hàng; (4) Shop không tham gia affiliate. Hãy thử đơn mới và làm đúng hướng dẫn nhé.",
  },
  {
    q: "Mua qua link có được voucher giảm giá không?",
    a: "Có! Luồng nhận voucher Facebook: (1) Copy link đã chuyển đổi bằng nút \"Copy link\"; (2) Bấm \"Mở Facebook\" để đến bài viết ghim; (3) Comment link vừa copy vào bài viết; (4) Bấm vào chính link bạn vừa comment → voucher Facebook tự động hiện ở bước thanh toán. Dù có voucher hay không, bạn LUÔN nhận hoàn tiền về ví — đó mới là giá trị chính của V-Affiliate.",
  },
  {
    q: "Tại sao tôi không rút được tiền?",
    a: "Cần đủ 4 điều kiện: (1) Đã thêm tài khoản ngân hàng trong Tài chính; (2) Đã đặt mật khẩu rút tiền 4-6 chữ số; (3) Có ít nhất 1 đơn đã hoàn tiền (mua sắm thật qua link V-Affiliate) để mở khoá rút — tiền thưởng chào mừng, streak, vòng quay vẫn được giữ nguyên trong ví; (4) Số dư ví đủ mức tối thiểu (mặc định 50.000đ). Lưu ý: tiền ở mục \"Đang chờ duyệt\" CHƯA rút được — chỉ rút được phần đã vào Ví. Mật khẩu rút tiền khác mật khẩu đăng nhập, nhập sai 5 lần sẽ khoá 15 phút để bảo vệ bạn.",
  },
  {
    q: "Lỡ quên mật khẩu / nhập sai nhiều lần thì sao?",
    a: "Quên mật khẩu: bấm \"Quên mật khẩu\" ở trang đăng nhập → nhập email → mở hộp thư đặt mật khẩu mới. Nhập sai 10 lần liên tiếp: tài khoản tự khoá 15 phút chống hack — cứ đợi 15 phút rồi thử lại. Đăng nhập bằng Google thì không lo quên mật khẩu nhé!",
  },
  {
    q: "Bảo vệ tài khoản tốt nhất bằng cách nào?",
    a: "Bật Xác thực 2 lớp (2FA): vào Bảo mật → Bật 2FA → cài app Google Authenticator → quét mã QR. Sau khi bật, mỗi lần đăng nhập cần thêm 6 chữ số từ app — kẻ gian biết mật khẩu cũng không vào được. Rất nên bật khi ví có nhiều tiền.",
  },
  {
    q: "Mời bạn bè được lợi gì?",
    a: "Vào \"Giới thiệu bạn bè\" → copy link cá nhân → gửi qua Zalo/Facebook/SMS. Mỗi người bạn mời đăng ký và có đơn đầu tiên sẽ giúp bạn tiến gần hơn tới hạng cao: đủ 25 bạn active → lên 🥈 Silver (53%), 50 bạn → 🥇 Gold (55%), 100 bạn → 💎 VIP (58%). Cashback tăng áp dụng vĩnh viễn cho mọi đơn — mời càng nhiều, lời càng lớn!",
  },
  {
    q: "Tôi có cần làm gì sau khi đặt đơn không?",
    a: "Không cần làm gì cả! V-Affiliate tự đối soát với Shopee và cập nhật đơn cho bạn. Bạn chỉ cần thỉnh thoảng ghé tab Đơn hàng để theo dõi. Khi đơn được duyệt, tiền tự cộng vào ví và bạn nhận được thông báo ngay. Ngồi chờ tiền về thôi! 💰",
  },
];

export default function HelpPage() {
  const toast = useToast();
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const [showContact, setShowContact] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");

  const ADMIN_EMAIL = "nguyenvandon1304@gmail.com";
  const SUBJECT = "Hỗ trợ V-Affiliate";
  const BODY = "Xin chào admin,\n\n";

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(ADMIN_EMAIL);
      toast.success(`Đã sao chép: ${ADMIN_EMAIL}`);
    } catch {
      toast.error("Không sao chép được. Hãy chọn và copy thủ công.");
    }
  };

  const filteredFAQ = FAQS.filter(
    (f) =>
      faqSearch.length < 2 ||
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-gray-50 to-gray-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <DashboardHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8 space-y-8">

        {/* ── Hero Banner ── */}
        <section className="relative rounded-3xl overflow-hidden shadow-xl shadow-orange-200/30 dark:shadow-orange-900/20">
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(255,255,255,0.12)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.08)_50%,transparent_70%)]" />
          {/* Floating orbs */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-amber-300/20 blur-xl" />
          <div className="absolute top-1/2 right-1/4 w-16 h-16 rounded-full bg-white/5 blur-lg" />

          <div className="relative px-6 py-8 sm:px-8 sm:py-10">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-white/90 text-[11px] font-bold uppercase tracking-widest">5 phút để hiểu</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
              Hướng dẫn sử dụng
            </h1>
            <p className="text-white/75 text-sm sm:text-base leading-relaxed mb-6 max-w-lg">
              Từ đăng ký đến rút tiền — tất cả trong 5 bước đơn giản. Bắt đầu nhận hoàn tiền ngay hôm nay.
            </p>

            {/* Quick stats row */}
            <div className="flex flex-wrap gap-3 mb-6">
              {[
                { icon: "→", label: "Tạo link" },
                { icon: "🛒", label: "Mua hàng" },
                { icon: "💰", label: "Nhận cashback" },
                { icon: "🏦", label: "Rút tiền" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <span className="text-sm">{icon}</span>
                  <span className="text-white text-[11px] font-semibold">{label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href="/dashboard/cashback"
              className="group relative inline-flex items-center gap-2.5 bg-white text-orange-600 font-black text-sm px-6 py-3 rounded-xl shadow-lg shadow-orange-900/25 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <svg viewBox="0 0 24 24" className="w-4 h-4 relative" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="relative">Bắt đầu ngay</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 relative transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </section>

        {/* ── 5-Step Journey ── */}
        <section>
          {/* Section header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-zinc-100 leading-tight">5 bước để nhận hoàn tiền</h2>
              <p className="text-xs text-gray-400 dark:text-zinc-500">Mỗi bước chỉ mất vài giây</p>
            </div>
          </div>

          <div className="relative space-y-4">
            {/* Vertical connector line */}
            <div className="absolute left-[29px] top-14 bottom-14 w-px bg-gradient-to-b from-orange-200 via-amber-200 to-orange-200 dark:from-orange-800 dark:via-amber-800 dark:to-orange-800 hidden sm:block" />

            {STEPS.map((s, idx) => (
              <div key={s.num} className="group relative flex gap-4 items-start">
                {/* Step indicator */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-orange-100 dark:border-zinc-800 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:shadow-orange-200/50 dark:group-hover:shadow-orange-900/30 group-hover:border-orange-300 dark:group-hover:border-orange-700 transition-all duration-300">
                    {/* Step number bubble */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-300 ${
                      idx === 0 ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-sm shadow-orange-200" :
                      idx === STEPS.length - 1 ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm shadow-emerald-200" :
                      "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                    }`}>
                      {idx === STEPS.length - 1 ? (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : s.num}
                    </div>
                  </div>
                </div>

                {/* Content card */}
                <div className="flex-1 min-w-0 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5 group-hover:border-orange-200 dark:group-hover:border-orange-800/50 group-hover:shadow-md group-hover:shadow-orange-100/40 dark:group-hover:shadow-orange-900/20 transition-all duration-300">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      idx === 0 ? "bg-orange-50 dark:bg-orange-900/40" :
                      idx === 1 ? "bg-blue-50 dark:bg-blue-900/40" :
                      idx === 2 ? "bg-indigo-50 dark:bg-indigo-900/40" :
                      idx === 3 ? "bg-amber-50 dark:bg-amber-900/40" :
                      "bg-emerald-50 dark:bg-emerald-900/40"
                    }`}>
                      {idx === 0 ? (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                      ) : idx === 1 ? (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      ) : idx === 2 ? (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                      ) : idx === 3 ? (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-gray-900 dark:text-zinc-100 leading-tight">{s.title}</h3>
                      <p className="text-[11px] font-semibold text-gray-400 dark:text-zinc-600 uppercase tracking-wide mt-0.5">
                        {idx === 0 ? "Đăng ký" : idx === 1 ? "Tạo link" : idx === 2 ? "Mua hàng" : idx === 3 ? "Chờ duyệt" : "Rút tiền"}
                      </p>
                    </div>
                    <div className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      idx === 0 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" :
                      idx === 1 ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" :
                      idx === 2 ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" :
                      idx === 3 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" :
                      "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                    }`}>
                      Bước {s.num}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed pl-[46px]">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Voucher Banner ── */}
        <section className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(255,255,255,0.1)_0%,transparent_60%)]" />
          <div className="absolute -top-10 right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
          <div className="relative px-6 py-6 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-white/15 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">+Voucher</span>
                    <span className="bg-white/10 text-white/70 text-[10px] font-medium px-2 py-0.5 rounded-full">Khuyến nghị</span>
                  </div>
                  <h3 className="text-base font-black text-white leading-tight mb-1">Nhận voucher Facebook giảm giá</h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Comment link mua hàng vào bài viết ghim → voucher tự động hiện khi thanh toán.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                <a
                  href="/dashboard/cashback"
                  className="group relative flex items-center justify-center gap-2 bg-white text-blue-600 font-black text-sm px-5 py-2.5 rounded-xl shadow-lg overflow-hidden"
                >
                  <span className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <svg viewBox="0 0 24 24" className="w-4 h-4 relative" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  <span className="relative">Nhận voucher</span>
                </a>
                <p className="text-white/50 text-[11px] text-center sm:text-right">Dù không có voucher, cashback vẫn về đủ</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          {/* Section header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-zinc-100 leading-tight">Câu hỏi thường gặp</h2>
              <p className="text-xs text-gray-400 dark:text-zinc-500">{FAQS.length} câu hỏi được trả lời</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => { setFaqSearch(e.target.value); setOpenFAQ(null); }}
              placeholder="Tìm câu hỏi..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-800 dark:text-zinc-100 placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none transition-all"
            />
          </div>

          {/* Results count */}
          {faqSearch.length >= 2 && (
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-3">
              {filteredFAQ.length} kết quả cho &ldquo;{faqSearch}&rdquo;
            </p>
          )}

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800 overflow-hidden">
            {filteredFAQ.length === 0 ? (
              <div className="p-8 text-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-gray-300 dark:text-zinc-700 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <p className="text-sm text-gray-400 dark:text-zinc-600">Không tìm thấy câu hỏi phù hợp</p>
              </div>
            ) : (
              filteredFAQ.map((f, i) => {
                const globalIdx = FAQS.indexOf(f);
                const isOpen = openFAQ === globalIdx;
                return (
                  <div key={i}>
                    <button
                      onClick={() => setOpenFAQ(isOpen ? null : globalIdx)}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-100 flex-1 leading-snug">{f.q}</h3>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isOpen ? "bg-orange-500 text-white rotate-90" : "bg-gray-100 dark:bg-zinc-800 text-gray-400"
                      }`}>
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                      </div>
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                      <div className="px-5 pb-4">
                        <div className="bg-gray-50 dark:bg-zinc-800/60 rounded-xl p-4">
                          <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">{f.a}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── Support CTA ── */}
        <section className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950 dark:from-black dark:to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(251,146,60,0.08)_0%,transparent_60%)]" />
          <div className="relative px-6 py-8 sm:px-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-white mb-1">Cần hỗ trợ thêm?</h3>
            <p className="text-zinc-400 text-sm mb-5">Liên hệ qua email, thường phản hồi trong vòng 24 giờ.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowContact(true)}
                className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-orange-500/25"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                Liên hệ hỗ trợ
              </button>
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors"
              >
                Quay lại Dashboard
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Contact modal — 3 cách liên hệ tuỳ thiết bị/trình duyệt user */}
      <Modal open={showContact} onClose={() => setShowContact(false)} title="Liên hệ hỗ trợ" size="md">
        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/40 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Email admin</p>
            <p className="text-sm font-mono font-semibold text-gray-800 dark:text-zinc-100 break-all">
              {ADMIN_EMAIL}
            </p>
          </div>

          <p className="text-sm text-gray-600 dark:text-zinc-300">Chọn cách liên hệ phù hợp:</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Gmail web — chắc chắn hoạt động cho mọi user có Gmail */}
            <a
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(ADMIN_EMAIL)}&su=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-gray-200 dark:border-zinc-700 hover:border-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors"
            >
              <span className="text-2xl">📧</span>
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">Gmail</p>
              <p className="text-[10px] text-gray-500 dark:text-zinc-500 text-center">Mở Gmail trên web</p>
            </a>

            {/* Outlook web */}
            <a
              href={`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(ADMIN_EMAIL)}&subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-gray-200 dark:border-zinc-700 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
            >
              <span className="text-2xl">📨</span>
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">Outlook</p>
              <p className="text-[10px] text-gray-500 dark:text-zinc-500 text-center">Mở Outlook web</p>
            </a>

            {/* App mặc định */}
            <a
              href={`mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-gray-200 dark:border-zinc-700 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors"
            >
              <span className="text-2xl">✉️</span>
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">App email</p>
              <p className="text-[10px] text-gray-500 dark:text-zinc-500 text-center">Email mặc định trên máy</p>
            </a>
          </div>

          <button
            onClick={copyEmail}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Sao chép email vào clipboard
          </button>

          <p className="text-xs text-gray-500 dark:text-zinc-500 text-center">
            Cách nào không tiện, hãy mở app email bạn đang dùng và gửi tới email phía trên.
          </p>
        </div>
      </Modal>
    </div>
  );
}
