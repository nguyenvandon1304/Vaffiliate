"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useToast } from "@/components/Toast";

interface Step {
  num: number;
  title: string;
  body: string;
}

interface FAQ { q: string; a: string; }

const STEPS: Step[] = [
  {
    num: 1,
    title: "Đăng ký tài khoản",
    body: "Bấm Đăng ký → nhập tên đăng nhập, email và mật khẩu. Hoặc bấm \"Tiếp tục với Google\" để đăng nhập 1 chạm. Nếu đăng ký bằng email, mở hộp thư bấm nút xác thực (kiểm tra cả Spam/Quảng cáo).",
  },
  {
    num: 2,
    title: "Tạo link hoàn tiền",
    body: "Thấy món đồ ưng ý trên Shopee? Ở app Shopee bấm Chia sẻ → Sao chép link. Vào \"Tạo link\" của V-Affiliate → dán link → bấm Lấy Link. Trong vài giây có ngay link hoàn tiền riêng + thấy số tiền sẽ được hoàn về ví.",
  },
  {
    num: 3,
    title: "Mua & nhận voucher + hoàn tiền",
    body: "CÁCH 1 — Nhận voucher Facebook (khuyến nghị): Copy link đã chuyển đổi → Bấm \"Mở Facebook\" → Comment link vào bài viết ghim → Bấm vào chính link vừa comment → voucher tự động hiện ở bước thanh toán. CÁCH 2 — Direct: Bấm \"MUA NGAY\" → mua bình thường → hoàn tiền vẫn về đủ.",
  },
  {
    num: 4,
    title: "Chờ đơn duyệt → tiền về ví",
    body: "Đơn vừa đặt hiện ở mục \"Đang chờ duyệt\" — đang chờ Shopee xác nhận, CHƯA rút được. Khi nhận hàng (thường 7-15 ngày, tối đa 90 ngày), đơn chuyển sang \"Đã hoàn tiền\" và tiền tự động cộng vào Ví.",
  },
  {
    num: 5,
    title: "Rút tiền về ngân hàng",
    body: "Vào Tài chính → Thêm tài khoản ngân hàng (chỉ làm 1 lần) → đặt mật khẩu rút tiền 4-6 chữ số. Khi ví đủ số dư tối thiểu, bấm Rút tiền → nhập số tiền + mật khẩu → admin duyệt, tiền về trong 1-2 ngày làm việc.",
  },
];

const FAQS: FAQ[] = [
  {
    q: "Tôi được hoàn lại bao nhiêu tiền?",
    a: "Bạn nhận lại phần lớn hoa hồng mà Shopee trả cho mỗi đơn — bắt đầu từ 50% (hạng Bronze). Càng mua nhiều hoặc mời nhiều bạn, hạng càng cao và cashback càng tăng: Silver 53% · Gold 55% · VIP 58%, áp dụng vĩnh viễn cho MỌI đơn về sau. Hoa hồng tuỳ shop & sản phẩm (thường 1-15% giá trị đơn).",
  },
  {
    q: "Bao lâu tiền mới về ví?",
    a: "Thường 7-15 ngày sau khi bạn nhận hàng và Shopee xác nhận đơn. Một số đơn có thể lâu hơn (đến 90 ngày) nếu có đổi/trả. Trong lúc chờ, cashback hiện ở mục \"Đang chờ duyệt\" trên Dashboard — khi Shopee duyệt xong, tiền tự động chuyển vào Ví và bạn rút được ngay.",
  },
  {
    q: "Tôi đã mua hàng rồi mà không thấy đơn nào trên V-Affiliate?",
    a: "Đơn KHÔNG xuất hiện ngay sau khi mua — V-Affiliate cần đối soát dữ liệu từ Shopee (thường 1-3 ngày) rồi đơn mới hiện ở mục \"Đang chờ duyệt\". Nếu sau đó vẫn không thấy, có thể do: (1) Sau khi bấm link V-Affiliate bạn lại mở Shopee từ chỗ khác (Google, Messenger...) → mất tracking; (2) Trình duyệt chặn cookie; (3) Đơn bị huỷ/trả hàng; (4) Shop không tham gia affiliate.",
  },
  {
    q: "Mua qua link có được voucher giảm giá không?",
    a: "Có! Luồng nhận voucher Facebook: (1) Copy link đã chuyển đổi bằng nút \"Copy link\"; (2) Bấm \"Mở Facebook\" để đến bài viết ghim; (3) Comment link vừa copy vào bài viết; (4) Bấm vào chính link bạn vừa comment → voucher tự động hiện ở bước thanh toán. Dù có voucher hay không, bạn LUÔN nhận hoàn tiền về ví.",
  },
  {
    q: "Tại sao tôi không rút được tiền?",
    a: "Cần đủ 4 điều kiện: (1) Đã thêm tài khoản ngân hàng trong Tài chính; (2) Đã đặt mật khẩu rút tiền 4-6 chữ số; (3) Có ít nhất 1 đơn đã hoàn tiền để mở khoá rút — tiền thưởng chào mừng, streak, vòng quay vẫn được giữ nguyên; (4) Số dư ví đủ mức tối thiểu (mặc định 50.000đ). Lưu ý: tiền ở mục \"Đang chờ duyệt\" CHƯA rút được.",
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
    a: "Vào \"Giới thiệu bạn bè\" → copy link cá nhân → gửi qua Zalo/Facebook/SMS. Mỗi người bạn mời đăng ký và có đơn đầu tiên sẽ giúp bạn tiến gần hơn tới hạng cao: đủ 25 bạn active → Silver (53%), 50 bạn → Gold (55%), 100 bạn → VIP (58%). Cashback tăng áp dụng vĩnh viễn cho mọi đơn — mời càng nhiều, lời càng lớn!",
  },
  {
    q: "Tôi có cần làm gì sau khi đặt đơn không?",
    a: "Không cần làm gì cả! V-Affiliate tự đối soát với Shopee và cập nhật đơn cho bạn. Bạn chỉ cần thỉnh thoảng ghé tab Đơn hàng để theo dõi. Khi đơn được duyệt, tiền tự cộng vào ví và bạn nhận được thông báo ngay. Ngồi chờ tiền về thôi!",
  },
];

export default function HelpPage() {
  const toast = useToast();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
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

  const STEP_ICONS = [
    <svg key="user" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    <svg key="link" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
    <svg key="cart" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>,
    <svg key="clock" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    <svg key="bank" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>,
  ];

  const STEP_COLORS = [
    { base: "from-orange-400 to-amber-500", icon: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
    { base: "from-blue-400 to-indigo-500", icon: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { base: "from-orange-400 to-amber-500", icon: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
    { base: "from-amber-400 to-orange-500", icon: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { base: "from-emerald-400 to-teal-500", icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  ];

  return (
    <div className="min-h-screen bg-[#09090b]">
      <DashboardHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8 space-y-4">

        {/* ── PAGE HEADER — Bento: title left, badge right ── */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Title block — spans 8 cols */}
          <div className="sm:col-span-8 bg-[#18181b] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-orange-400 to-amber-500" />
              <span className="text-[10px] font-bold text-orange-400/70 uppercase tracking-widest">Getting Started</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight mb-2">
              Hướng dẫn sử dụng
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
              Từ đăng ký đến rút tiền — 5 bước đơn giản. Bắt đầu nhận hoàn tiền ngay hôm nay.
            </p>
          </div>

          {/* Quick stats — spans 4 cols, 2 small tiles stacked */}
          <div className="sm:col-span-4 flex flex-col gap-3">
            <div className="flex-1 bg-[#18181b] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              </div>
              <div>
                <p className="text-lg font-black text-white leading-none">50%+</p>
                <p className="text-[10px] text-zinc-500 font-medium">Cashback tối thiểu</p>
              </div>
            </div>
            <div className="flex-1 bg-[#18181b] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <div>
                <p className="text-lg font-black text-white leading-none">+Voucher</p>
                <p className="text-[10px] text-zinc-500 font-medium">Giảm giá Shopee</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 5-STEP BENTO GRID ── */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Process</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {STEPS.map((s, i) => {
              const col = [0, 1].includes(i) ? "sm:col-span-6" : "sm:col-span-4";
              return (
                <div key={s.num} className={`${col} group`}>
                  <div className="bg-[#18181b] border border-white/5 hover:border-white/10 rounded-2xl p-5 h-full transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.04)]">
                    {/* Header row */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${STEP_COLORS[i].base} flex items-center justify-center ${STEP_COLORS[i].icon} shadow-lg shrink-0`}>
                        {STEP_ICONS[i]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white leading-tight truncate">{s.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-zinc-600">0{s.num}</span>
                          <div className="flex-1 h-px bg-white/5" />
                        </div>
                      </div>
                    </div>
                    {/* Body */}
                    <p className="text-xs text-zinc-400 leading-relaxed">{s.body}</p>
                    {/* Bottom accent line */}
                    <div className={`mt-4 h-0.5 rounded-full bg-gradient-to-r ${STEP_COLORS[i].base} opacity-30 group-hover:opacity-60 transition-opacity`} />
                  </div>
                </div>
              );
            })}

            {/* CTA tile — spans 4 cols on row 3 */}
            <div className="sm:col-span-4">
              <a
                href="/dashboard/cashback"
                className="group flex flex-col justify-between bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 hover:border-orange-500/40 rounded-2xl p-5 h-full transition-all duration-200 hover:shadow-[0_0_30px_rgba(251,146,60,0.1)]"
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <span className="text-xs font-bold text-orange-400/70 uppercase tracking-widest">Bắt đầu</span>
                  </div>
                  <h3 className="text-base font-black text-white leading-tight mb-2">Tạo link hoàn tiền đầu tiên</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">Chuyển đổi link Shopee thành link có hoàn tiền trong vài giây.</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-orange-400 text-xs font-bold">
                  <span>Đến trang tạo link</span>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* ── VOUCHER BANNER — full width bento card ── */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/90 via-amber-500/90 to-yellow-500/90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(255,255,255,0.08)_0%,transparent_60%)]" />
          <div className="absolute inset-0 backdrop-blur-[1px]" />
          <div className="relative px-6 py-5 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-white/15 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">+Voucher</span>
                    <span className="bg-white/10 text-white/70 text-[9px] font-medium px-2 py-0.5 rounded-full">Khuyến nghị</span>
                  </div>
                  <h3 className="text-base font-black text-white leading-tight">Nhận voucher Facebook giảm giá Shopee</h3>
                  <p className="text-white/60 text-xs mt-0.5">Comment link mua hàng vào bài ghim → voucher tự động hiện khi thanh toán</p>
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <a
                  href="/dashboard/cashback"
                  className="inline-flex items-center gap-2 bg-white text-blue-600 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg hover:bg-zinc-100 transition-colors"
                >
                  Nhận voucher
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
                <p className="text-white/40 text-[10px] text-center sm:text-right">Dù không có voucher, cashback vẫn về đủ</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── FAQ — tight density, Linear-style ── */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-4 rounded-full bg-zinc-600" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">FAQ</span>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => { setFaqSearch(e.target.value); setOpenFAQ(null); }}
              placeholder="Tìm câu hỏi..."
              className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-white/5 rounded-xl text-sm text-zinc-300 placeholder-zinc-600 focus:border-white/15 focus:ring-0 outline-none transition-all"
            />
          </div>

          {faqSearch.length >= 2 && (
            <p className="text-[11px] text-zinc-600 mb-3 px-1">
              {filteredFAQ.length} kết quả cho &ldquo;{faqSearch}&rdquo;
            </p>
          )}

          <div className="bg-[#18181b] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {filteredFAQ.length === 0 ? (
              <div className="p-10 text-center">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-zinc-700 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <p className="text-sm text-zinc-600">Không tìm thấy câu hỏi phù hợp</p>
              </div>
            ) : (
              filteredFAQ.map((f, i) => {
                const globalIdx = FAQS.indexOf(f);
                const isOpen = openFAQ === globalIdx;
                return (
                  <div key={i}>
                    <button
                      onClick={() => setOpenFAQ(isOpen ? null : globalIdx)}
                      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <h3 className="text-sm font-medium text-zinc-200 flex-1 leading-snug pr-2">{f.q}</h3>
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                        isOpen ? "bg-orange-500 text-white rotate-90" : "bg-white/5 text-zinc-500"
                      }`}>
                        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                      </div>
                    </button>
                    <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                      <div className="px-5 pb-4">
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                          <p className="text-xs text-zinc-400 leading-relaxed">{f.a}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── SUPPORT CTA — dark glass card ── */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[#18181b]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,146,60,0.06)_0%,transparent_60%)]" />
          <div className="absolute inset-0 border border-white/5 rounded-2xl" />
          <div className="relative px-6 py-6 sm:px-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-black text-white mb-1">Cần hỗ trợ thêm?</h3>
            <p className="text-zinc-500 text-xs mb-5">Liên hệ qua email, thường phản hồi trong vòng 24 giờ.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto">
              <button
                onClick={() => setShowContact(true)}
                className="inline-flex items-center justify-center gap-2 bg-white text-zinc-900 text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                Liên hệ hỗ trợ
              </button>
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium px-5 py-2.5 rounded-xl transition-colors border border-white/5"
              >
                Quay lại Dashboard
              </a>
            </div>
          </div>
        </div>

      </main>

      {/* ── CONTACT MODAL ── */}
      <Modal open={showContact} onClose={() => setShowContact(false)} title="Liên hệ hỗ trợ" size="md">
        <div className="space-y-4">
          <div className="bg-[#18181b] border border-white/5 rounded-xl p-4">
            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest mb-1">Email admin</p>
            <p className="text-sm font-mono font-semibold text-zinc-200 break-all">{ADMIN_EMAIL}</p>
          </div>

          <p className="text-xs text-zinc-500">Chọn cách liên hệ phù hợp:</p>

          <div className="grid grid-cols-3 gap-2">
            <a
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(ADMIN_EMAIL)}&su=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-400" fill="currentColor"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
              <p className="text-xs font-semibold text-zinc-300">Gmail</p>
              <p className="text-[9px] text-zinc-600 text-center">Web</p>
            </a>
            <a
              href={`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(ADMIN_EMAIL)}&subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400" fill="currentColor"><path d="M24 7.387v10.478c0 .23-.08.424-.24.584-.16.16-.354.24-.584.24H.76c-.23 0-.424-.08-.584-.24C.02 18.29 0 18.09 0 17.865V7.387c0 .23.08.424.24.584.16.16.354.24.584.24h22.48c.23 0 .424-.08.584-.24.16-.16.24-.354.24-.584zM1.74 8.77l9.72 6.03V8.77H1.74zm10.52 6.03l9.72-6.03v10.74l-9.72 6.181z"/></svg>
              <p className="text-xs font-semibold text-zinc-300">Outlook</p>
              <p className="text-[9px] text-zinc-600 text-center">Web</p>
            </a>
            <a
              href={`mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              <p className="text-xs font-semibold text-zinc-300">App email</p>
              <p className="text-[9px] text-zinc-600 text-center">Mặc định</p>
            </a>
          </div>

          <button
            onClick={copyEmail}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium py-2.5 rounded-xl transition-colors border border-white/5"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            Sao chép email
          </button>
        </div>
      </Modal>
    </div>
  );
}
