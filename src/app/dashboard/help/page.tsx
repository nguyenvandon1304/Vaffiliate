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

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-gray-50 to-gray-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <DashboardHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8 space-y-8">
        {/* Banner dẫn dắt đến voucher Facebook */}
        <section className="bg-white rounded-2xl border-2 border-blue-200 shadow-sm overflow-hidden">
          {/* Header với icon + tiêu đề */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 pt-5 pb-4 border-b border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-2xl">🎁</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-green-600">Đang hoạt động</span>
                </div>
                <h2 className="text-lg font-bold text-gray-800">
                  Nhận Voucher Facebook Giảm Giá
                </h2>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Comment link mua hàng vào bài viết ghim trên Facebook để nhận mã giảm giá tự động — áp dụng ngay tại bước thanh toán Shopee.
                </p>
              </div>
            </div>
          </div>

          {/* 4 bước rõ ràng */}
          <div className="px-5 py-4 space-y-3">
            {[
              { step: 1, text: "Copy link đã chuyển đổi", highlight: "bằng nút \"Copy link\"" },
              { step: 2, text: "Bấm \"Mở Facebook\" đến bài viết ghim", highlight: "" },
              { step: 3, text: "Comment link vừa copy vào bài viết", highlight: "" },
              { step: 4, text: "Bấm vào chính link bạn vừa comment →", highlight: "voucher tự động hiện" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                  {item.step}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {item.text}
                  {item.highlight && (
                    <span className="font-semibold text-blue-600"> {item.highlight}</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* CTA + note */}
          <div className="px-5 pb-5">
            <a
              href="/dashboard/cashback"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-sm w-full"
            >
              <span className="text-lg">📘</span>
              Nhận Voucher Ngay
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <p className="text-center text-xs text-gray-400 mt-2">
              Dù có voucher hay không, hoàn tiền vẫn về ví đầy đủ
            </p>
          </div>
        </section>

        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-zinc-100">Hướng dẫn sử dụng</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">5 bước để bắt đầu nhận hoàn tiền với V-Affiliate.</p>
        </div>

        {/* Steps */}
        <section className="space-y-3">
          {STEPS.map((s) => (
            <div key={s.num} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5 flex gap-4 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
                {s.num}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-2">
                  <span className="text-2xl">{s.icon}</span>
                  <span>{s.title}</span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-100 mb-3">Câu hỏi thường gặp</h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
            {FAQS.map((f, i) => (
              <details
                key={i}
                open={openFAQ === i}
                onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) setOpenFAQ(i); }}
                className="group p-4 cursor-pointer"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-100 pr-4">{f.q}</h3>
                  <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl border border-orange-100 dark:border-orange-900/40 p-5 text-center">
          <h3 className="text-base font-bold text-gray-800 dark:text-zinc-100">Vẫn cần hỗ trợ?</h3>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">Liên hệ qua email hỗ trợ trong vòng 24h.</p>
          <button
            onClick={() => setShowContact(true)}
            className="inline-block mt-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            📨 Liên hệ hỗ trợ
          </button>
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
