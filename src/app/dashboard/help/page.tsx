"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";
import { Modal } from "@/components/Modal";
import { ThemeToggleButton } from "@/components/ThemeToggle";
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
    body: "Bấm Đăng ký → nhập tên đăng nhập, email và mật khẩu. Sau đó mở email vừa nhập để bấm vào nút xác thực (link gửi đến hộp thư). Nếu không thấy mail trong 1-2 phút, kiểm tra hộp Spam/Quảng cáo. Xác thực xong là đăng nhập được ngay.",
  },
  {
    num: 2,
    title: "Lấy link hoàn tiền cho sản phẩm",
    icon: "🔗",
    body: "Bạn thấy món đồ thích trên Shopee? Copy đường link sản phẩm đó (ở app Shopee bấm Chia sẻ → Sao chép link, hoặc trên web copy thanh địa chỉ). Vào Công cụ hoàn tiền của V-Affiliate → dán link → bấm Lấy Link. Bạn sẽ có 1 link mới riêng của mình — mua qua link này sẽ được hoàn tiền.",
  },
  {
    num: 3,
    title: "Mua hàng qua link mới",
    icon: "🛍",
    body: "Bấm nút Mua Ngay (hoặc copy link mới rồi dán vào bài viết từ Facebook rồi nhấn vào mua sẽ được nhận voucher từ 20% đến 25% từ mạng xã hội). Mua hàng và thanh toán bình thường như mọi khi. Lưu ý quan trọng: SAU khi bấm link của V-Affiliate, đừng mở thêm Shopee từ chỗ khác (Google, Messenger, app...) vì sẽ mất quyền hoàn tiền của đơn đó.",
  },
  {
    num: 4,
    title: "Chờ đơn được duyệt + nhận tiền",
    icon: "⏳",
    body: "Đơn vừa đặt sẽ ở trạng thái 'Đang xử lý'. Khi bạn nhận hàng và không trả lại, sau khoảng 1-90 ngày (tuỳ chính sách Shopee), đơn chuyển sang 'Đã hoàn tiền' và 50% hoa hồng tự động cộng vào Ví của bạn trên V-Affiliate.",
  },
  {
    num: 5,
    title: "Rút tiền về tài khoản ngân hàng",
    icon: "💸",
    body: "Vào Tài chính → Thêm tài khoản ngân hàng (chỉ làm 1 lần đầu) → đặt mật khẩu rút tiền 4-6 chữ số. Khi ví đủ số dư tối thiểu, bấm Rút tiền → nhập số tiền + mật khẩu rút → đợi 1-2 ngày làm việc → tiền chuyển về tài khoản ngân hàng của bạn.",
  },
];

const FAQS: FAQ[] = [
  {
    q: "Tôi được hoàn lại bao nhiêu tiền?",
    a: "Mỗi đơn hàng bạn được nhận 50% số hoa hồng mà Shopee trả. Số hoa hồng tuỳ shop và sản phẩm (thường 1-15% giá trị đơn). Khi bạn mời được 50 người bạn cùng mua hàng qua link, tỷ lệ hoàn tiền của bạn tự động tăng lên 55%.",
  },
  {
    q: "Bao lâu tiền mới về ví?",
    a: "Thường 7-15 ngày sau khi bạn nhận hàng và xác nhận trên Shopee. Một số đơn có thể lâu hơn (đến 90 ngày) nếu bạn yêu cầu đổi/trả hàng. Bạn có thể xem trạng thái đơn trong tab Đơn hàng.",
  },
  {
    q: "Tôi đã mua hàng rồi mà không thấy đơn nào trên V-Affiliate?",
    a: "Có 4 lý do phổ biến: (1) Sau khi bấm link của V-Affiliate, bạn lại mở Shopee từ chỗ khác (Google search, Messenger...) → bị mất quyền hoàn tiền; (2) Trình duyệt chặn cookie; (3) Đơn bị huỷ hoặc trả hàng; (4) Shop đó không tham gia chương trình affiliate. Hãy thử mua đơn khác và làm đúng theo hướng dẫn.",
  },
  {
    q: "Tại sao tôi không rút được tiền?",
    a: "Cần làm đủ 3 bước: (1) Thêm tài khoản ngân hàng trong Tài chính; (2) Đặt mật khẩu rút tiền 4-6 chữ số; (3) Số tiền trong ví phải đủ tối thiểu (50.000đ mặc định). Mật khẩu rút tiền khác mật khẩu đăng nhập — nếu nhập sai 5 lần sẽ bị khoá 15 phút.",
  },
  {
    q: "Lỡ quên mật khẩu / nhập sai nhiều lần thì sao?",
    a: "Quên mật khẩu: bấm Quên mật khẩu ở trang đăng nhập → nhập email → mở email để đặt mật khẩu mới. Nhập sai 10 lần liên tiếp: tài khoản tự khoá 15 phút để chống bị hack — đợi 15 phút rồi thử lại.",
  },
  {
    q: "Bảo vệ tài khoản tốt nhất bằng cách nào?",
    a: "Bật Xác thực 2 lớp (2FA). Vào Bảo mật → Bật 2FA → cài app Google Authenticator → quét mã QR. Sau khi bật, mỗi lần đăng nhập sẽ cần thêm 6 chữ số từ app — kẻ gian biết mật khẩu cũng không vào được. Khuyên dùng nếu ví có nhiều tiền.",
  },
  {
    q: "Mời bạn bè được lợi gì?",
    a: "Vào Giới thiệu bạn bè → copy link cá nhân → gửi cho bạn bè qua Zalo/Facebook/SMS. Khi đủ 50 người bạn đăng ký qua link và mỗi người có ít nhất 1 đơn hoàn tiền, tỷ lệ cashback của bạn tự động tăng từ 50% lên 55% — áp dụng vĩnh viễn cho mọi đơn về sau.",
  },
  {
    q: "Tôi có cần phải làm gì sau khi đặt đơn không?",
    a: "Không cần làm gì cả. V-Affiliate sẽ tự nhận thông báo từ Shopee và cập nhật đơn hàng cho bạn. Bạn chỉ cần kiểm tra tab Đơn hàng để theo dõi tiến độ. Khi đơn được duyệt, tiền tự cộng vào ví.",
  },
];

export default function HelpPage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-gray-50 to-gray-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-zinc-800 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="cursor-pointer" title="Về trang chủ">
            <CaffiliateLogo />
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 dark:text-zinc-400 font-medium transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8 space-y-8">
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
