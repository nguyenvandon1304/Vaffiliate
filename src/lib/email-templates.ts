/**
 * Email templates cho admin gửi hàng loạt — V-Affiliate.
 *
 * Mỗi template có:
 * - subject: tiêu đề (≤ 60 ký tự để không bị cắt trên mobile)
 * - body: HTML đã format sẵn, tone ấm áp, gần gũi
 * - category: nhóm hiển thị trên UI
 * - icon: emoji preview
 * - description: mô tả ngắn cho admin biết khi nào nên dùng
 *
 * Nguyên tắc viết copy:
 * 1. Xưng "bạn" - "V-Affiliate" → tạo cảm giác như có người thật quan tâm
 * 2. Mở đầu bằng câu hỏi/chia sẻ thay vì sale ngay
 * 3. Có 1 câu chuyện ngắn / số liệu cụ thể → tăng credibility
 * 4. CTA rõ ràng (1-2 hành động max)
 * 5. Kết thúc bằng dấu cảm xúc (cảm ơn, chúc, mong gặp lại...)
 */

export interface EmailTemplate {
  id: string;
  category: TemplateCategory;
  icon: string;
  name: string;
  description: string;
  subject: string;
  body: string;
}

export type TemplateCategory =
  | "welcome"
  | "promo"
  | "engage"
  | "feature"
  | "tips"
  | "thanks"
  | "milestone"
  | "seasonal"
  | "apology"
  | "survey";

export const CATEGORY_LABELS: Record<TemplateCategory, { label: string; icon: string; description: string }> = {
  welcome: { label: "Chào mừng", icon: "👋", description: "Onboarding user mới" },
  promo: { label: "Khuyến mãi", icon: "🎉", description: "Tăng cashback, sale event" },
  engage: { label: "Re-engage", icon: "💌", description: "Kéo user lâu không vào lại" },
  feature: { label: "Tính năng", icon: "✨", description: "Giới thiệu feature mới" },
  tips: { label: "Mẹo hay", icon: "💡", description: "Hướng dẫn user tận dụng app" },
  thanks: { label: "Tri ân", icon: "🙏", description: "Cảm ơn user trung thành" },
  milestone: { label: "Cột mốc", icon: "🏆", description: "Chúc mừng user đạt thành tích" },
  seasonal: { label: "Theo mùa", icon: "🎊", description: "Tết, sinh nhật, dịp lễ" },
  apology: { label: "Xin lỗi", icon: "🙇", description: "Sự cố, bảo trì, downtime" },
  survey: { label: "Khảo sát", icon: "📋", description: "Hỏi ý kiến user" },
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // ============ WELCOME ============
  {
    id: "welcome-newbie",
    category: "welcome",
    icon: "👋",
    name: "Chào mừng user mới",
    description: "Gửi sau khi user verify email — hướng dẫn 3 bước đầu",
    subject: "Chào mừng bạn đến với V-Affiliate 💛",
    body: `<p>Rất vui được đón bạn tham gia cộng đồng V-Affiliate. Chúng mình tin rằng <strong>mỗi đồng tiết kiệm là một niềm vui nhỏ trong cuộc sống</strong> — và đó là điều V-Affiliate muốn mang đến cho bạn mỗi ngày.</p>

<p>Để bắt đầu nhận cashback, bạn chỉ cần 3 bước siêu đơn giản:</p>
<ul>
  <li><strong>Bước 1:</strong> Tìm sản phẩm muốn mua trên Shopee như bình thường.</li>
  <li><strong>Bước 2:</strong> Dán link sản phẩm vào V-Affiliate để tạo link hoàn tiền.</li>
  <li><strong>Bước 3:</strong> Bấm "Mua ngay" để mua qua link đó — sau khi đơn được duyệt, cashback tự động vào ví và rút về ngân hàng được.</li>
</ul>

<p>Nếu có bất kỳ câu hỏi nào, bạn cứ trả lời email này nhé — đội ngũ V-Affiliate luôn sẵn sàng hỗ trợ trong vòng 24 giờ.</p>

<p>Chúc bạn có những đơn mua sắm thật vui và nhiều cashback! 🌟</p>`,
  },
  {
    id: "welcome-first-order",
    category: "welcome",
    icon: "🎁",
    name: "Khuyến khích đơn đầu tiên",
    description: "Gửi cho user đã đăng ký nhưng chưa có đơn nào",
    subject: "🎁 Tạo đơn cashback đầu tiên — nhận ngay 1 lượt quay",
    body: `<p>Chúng mình thấy bạn đã tham gia V-Affiliate được vài ngày rồi — cảm ơn bạn đã tin tưởng!</p>

<p>Để khuyến khích bạn bắt đầu, V-Affiliate có <strong>vòng quay may mắn</strong>: cứ mỗi 10 đơn cashback hoặc mời 5 bạn là bạn nhận thêm 1 lượt quay, phần thưởng tới <strong>50.000đ</strong> vào thẳng ví.</p>

<p>Bạn chỉ cần mua sắm như bình thường trên Shopee, nhưng đi qua link V-Affiliate. Cashback thường về ví trong <strong>7-15 ngày</strong> sau khi Shopee xác nhận đơn (sau thời gian đổi trả).</p>

<p>Bắt đầu ngay hôm nay nhé — mỗi đơn mua qua link là một khoản tiết kiệm về ví bạn! 💪</p>`,
  },

  // ============ PROMO ============
  {
    id: "promo-double-cashback",
    category: "promo",
    icon: "🔥",
    name: "Cashback x2 cuối tuần",
    description: "Chạy event nhân đôi cashback 48h",
    subject: "🔥 48 GIỜ DUY NHẤT — Cashback x2 cho mọi đơn",
    body: `<p>Chỉ trong <strong>48 giờ tới</strong>, V-Affiliate dành tặng bạn ưu đãi cực hot:</p>

<p style="font-size: 18px; text-align: center; background: #fff7ed; padding: 16px; border-radius: 12px; margin: 16px 0;">
  <strong>🔥 NHÂN ĐÔI CASHBACK</strong><br/>
  <span style="font-size: 14px; color: #9a3412;">Áp dụng cho mọi đơn Shopee mua qua V-Affiliate</span>
</p>

<p>Đây là cơ hội tốt nhất trong tháng để bạn:</p>
<ul>
  <li>Mua món hàng đã thêm vào giỏ từ lâu mà chưa bấm thanh toán</li>
  <li>Stock đồ thiết yếu cho gia đình với giá tiết kiệm hơn</li>
  <li>Chốt đơn quà tặng người thân với cashback gấp đôi</li>
</ul>

<p>Sự kiện kết thúc vào <strong>23:59 Chủ Nhật</strong>. Vào V-Affiliate ngay để không bỏ lỡ!</p>`,
  },
  {
    id: "promo-shopee-mega",
    category: "promo",
    icon: "🛍️",
    name: "Sale Shopee 6.6 / 9.9 / 11.11",
    description: "Ăn theo sale lớn của Shopee",
    subject: "🛍️ Săn sale Shopee — V-Affiliate hoàn tiền tới 20%",
    body: `<p>Bạn ơi, sàn đang có <strong>siêu sale</strong> với hàng triệu deal giảm sâu — nhưng nhiều người không biết rằng <strong>vẫn có thể nhận thêm cashback từ V-Affiliate</strong> trên những đơn này!</p>

<p>Cách dùng cực đơn giản:</p>
<ol>
  <li>Tìm món hàng giảm giá trên Shopee như bình thường.</li>
  <li>Copy link sản phẩm, dán vào V-Affiliate.</li>
  <li>Mua qua link đó → vừa được giảm giá sàn, <strong>vừa được hoàn tiền thêm</strong>.</li>
</ol>

<p style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 8px;">
  💚 <strong>Mẹo nhỏ:</strong> Đợi đúng khung giờ flash sale + dùng V-Affiliate, bạn có thể tiết kiệm tới <strong>30% giá gốc</strong>!
</p>

<p>Chúc bạn săn sale vui và "về tay" được những món thật đáng giá nhé! 🎯</p>`,
  },
  {
    id: "promo-tier-upgrade",
    category: "promo",
    icon: "⭐",
    name: "Khuyến khích lên Silver",
    description: "Gửi cho user gần đủ điều kiện lên rank",
    subject: "⭐ Bạn sắp lên Silver — cashback +3% mỗi đơn",
    body: `<p>Tin vui nè bạn — bạn chỉ còn <strong>vài bước nữa</strong> là chính thức lên rank <strong>Silver</strong> trên V-Affiliate!</p>

<p>Khi đạt Silver, bạn sẽ nhận được:</p>
<ul>
  <li><strong>+3% cashback</strong> trên mọi đơn (53% thay vì 50% mặc định) — vĩnh viễn</li>
  <li><strong>Huy hiệu Silver</strong> hiện trên profile và bảng xếp hạng</li>
  <li>Mỗi đơn & mỗi bạn mời tiếp tục tích lũy để lên Gold (55%) và VIP (58%)</li>
</ul>

<p>Cách lên Silver — đạt 1 trong 2 điều kiện:</p>
<ul>
  <li>Có <strong>50 đơn đã hoàn tiền</strong>, hoặc</li>
  <li>Mời được <strong>25 bạn</strong> có đơn cashback đầu tiên</li>
</ul>

<p>Ráng chốt thêm vài đơn hoặc mời thêm bạn là bạn lên hạng rồi đó. Mình tin bạn làm được! 🚀</p>`,
  },

  // ============ RE-ENGAGE ============
  {
    id: "engage-7days",
    category: "engage",
    icon: "💌",
    name: "Nhớ user 7 ngày không vào",
    description: "User lâu không tương tác, nhẹ nhàng kéo về",
    subject: "Bạn ổn không? V-Affiliate nhớ bạn ❤️",
    body: `<p>Đã <strong>1 tuần rồi</strong> bạn chưa ghé V-Affiliate. Mình hơi lo — không biết có phải app mình đang thiếu sót gì không, hay đơn giản là bạn đang bận?</p>

<p>Trong lúc bạn vắng mặt, V-Affiliate vẫn đều đặn hoàn tiền cho cộng đồng mỗi ngày. Một vài điều bạn có thể quan tâm:</p>
<ul>
  <li>🎰 Vòng quay may mắn — mua hàng & mời bạn để nhận lượt quay, trúng tiền vào ví</li>
  <li>💰 Mỗi đơn Shopee mua qua link là một khoản hoàn tiền về ví bạn</li>
  <li>🏆 Bảng xếp hạng tuần đang chờ bạn — biết đâu bạn lọt top?</li>
</ul>

<p>Nếu có vấn đề gì với tài khoản, hoặc bạn cần hỗ trợ, hãy <strong>trả lời thẳng email này</strong> — mình sẽ hỗ trợ ngay nhé.</p>

<p>Mong sớm gặp lại bạn! 💛</p>`,
  },
  {
    id: "engage-30days",
    category: "engage",
    icon: "🤔",
    name: "Lâu không gặp 30 ngày",
    description: "Win-back user đã 1 tháng không vào",
    subject: "🤔 V-Affiliate có làm gì không vừa ý bạn không?",
    body: `<p>Đã <strong>cả tháng rồi</strong> bạn chưa quay lại V-Affiliate. Thật lòng mình muốn hỏi thẳng:</p>

<p style="font-size: 16px; text-align: center; padding: 16px; background: #fff7ed; border-radius: 12px; margin: 16px 0;">
  <strong>V-Affiliate có điều gì làm bạn chưa hài lòng không?</strong>
</p>

<p>Nếu là vấn đề về cashback chậm, lỗi tạo link, hay thao tác phức tạp — mình rất muốn nghe từ bạn để cải thiện. Bạn chỉ cần <strong>trả lời email này 1-2 dòng</strong>, mình đọc và phản hồi từng email một.</p>

<p>Còn nếu bạn vẫn muốn tiếp tục đồng hành, V-Affiliate dành tặng bạn <strong>1 lượt quay miễn phí</strong> khi quay lại trong 7 ngày tới. Coi như lời mời quay về của tụi mình. 🌷</p>

<p>Cảm ơn bạn đã từng tin tưởng V-Affiliate. Hẹn sớm gặp lại nhé!</p>`,
  },
  {
    id: "engage-cart-reminder",
    category: "engage",
    icon: "🛒",
    name: "Wishlist có giảm giá",
    description: "Sản phẩm trong wishlist đang giảm",
    subject: "🛒 Sản phẩm bạn theo dõi đang giảm sâu!",
    body: `<p>Tin tốt nè! Một số sản phẩm trong <strong>wishlist</strong> của bạn vừa giảm giá đáng kể trên Shopee.</p>

<p>Đây là cơ hội mà bạn đang chờ đó. Nhân tiện, nếu mua qua V-Affiliate, bạn còn được <strong>cashback thêm</strong> trên giá đã giảm — nghĩa là <em>tiết kiệm kép</em>!</p>

<p style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px;">
  ⏰ <strong>Lưu ý:</strong> Giá flash sale thường chỉ kéo dài vài giờ. Vào V-Affiliate kiểm tra ngay để không bỏ lỡ!
</p>

<p>Chúc bạn chốt được giá tốt và "về tay" món hàng yêu thích nhé! 🎁</p>`,
  },

  // ============ FEATURE ============
  {
    id: "feature-spin",
    category: "feature",
    icon: "🎰",
    name: "Vòng quay may mắn",
    description: "Giới thiệu tính năng spin",
    subject: "🎰 Vòng quay may mắn — mua hàng & mời bạn để nhận lượt quay!",
    body: `<p>V-Affiliate có <strong>Vòng Quay May Mắn</strong> — cách vui để nhận thêm tiền vào ví khi bạn dùng app!</p>

<p>Cách nhận lượt quay:</p>
<ul>
  <li>🛍️ Cứ mỗi <strong>10 đơn đã hoàn tiền</strong> → +1 lượt quay</li>
  <li>👥 Cứ mỗi <strong>5 bạn mời</strong> có đơn đầu tiên → +1 lượt quay</li>
</ul>

<p>Phần thưởng mỗi lượt quay vào thẳng ví:</p>
<ul>
  <li>💰 Tiền mặt từ <strong>1.000đ đến 50.000đ</strong></li>
  <li>🎁 Cơ hội trúng jackpot 50.000đ (xác suất 5%)</li>
</ul>

<p>Càng mua sắm và mời bạn nhiều, bạn càng có nhiều lượt quay. Vào V-Affiliate kiểm tra số lượt quay của bạn ngay nhé! 🍀</p>`,
  },
  {
    id: "feature-referral",
    category: "feature",
    icon: "👥",
    name: "Mời bạn bè kiếm cashback",
    description: "Push referral feature",
    subject: "👥 Mời bạn bè — cùng lên hạng, cashback cao hơn vĩnh viễn",
    body: `<p>Bạn có biết V-Affiliate có chương trình <strong>"Mời bạn bè"</strong> giúp bạn tăng tỷ lệ hoàn tiền không?</p>

<p>Cách hoạt động:</p>
<ul>
  <li>Mời bạn bè đăng ký V-Affiliate qua link giới thiệu cá nhân của bạn</li>
  <li>Khi bạn đó có <strong>đơn cashback đầu tiên</strong>, được tính là 1 lượt mời thành công</li>
  <li>Đủ <strong>25 bạn</strong> → lên 🥈 Silver (53%) · <strong>50 bạn</strong> → 🥇 Gold (55%) · <strong>100 bạn</strong> → 💎 VIP (58%)</li>
  <li>Tỷ lệ cashback tăng <strong>áp dụng vĩnh viễn cho MỌI đơn</strong> về sau</li>
</ul>

<p>Link giới thiệu cá nhân nằm trong <strong>Dashboard → Giới thiệu bạn bè</strong>. Chia sẻ qua Zalo, Messenger, Facebook đều được.</p>

<p style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 8px;">
  💡 <strong>Mẹo:</strong> Chia sẻ trong group sinh viên, mom & baby, văn phòng — nhóm hay mua sắm online → dễ có đơn đầu tiên hơn.
</p>

<p>Càng nhiều bạn cùng dùng, hạng của bạn càng cao và cashback càng nhiều. Cùng tiết kiệm nào! 🤝</p>`,
  },
  {
    id: "feature-leaderboard",
    category: "feature",
    icon: "🏆",
    name: "Bảng xếp hạng tuần",
    description: "Push gamification leaderboard",
    subject: "🏆 Top 10 user kiếm cashback nhiều nhất tuần này",
    body: `<p>V-Affiliate vừa cập nhật <strong>Bảng Xếp Hạng Tuần</strong> — và bạn có thể tham gia ngay không cần đăng ký gì thêm!</p>

<p>Top 10 user kiếm cashback nhiều nhất mỗi tuần sẽ được:</p>
<ul>
  <li>🥇 <strong>Vinh danh công khai</strong> trên bảng xếp hạng cho cả cộng đồng thấy</li>
  <li>🏅 <strong>Huy hiệu thành tích</strong> hiển thị trên hồ sơ của bạn</li>
  <li>⭐ Vị trí top thường đi kèm nhiều đơn → nhanh lên hạng cao hơn (cashback tăng)</li>
</ul>

<p>Bảng xếp hạng cập nhật liên tục. Càng nhiều đơn, vị trí của bạn càng cao.</p>

<p>Vào xem vị trí của bạn ngay nhé — bạn có thể đang ở top 50 mà không biết đấy! 📊</p>`,
  },

  // ============ TIPS ============
  {
    id: "tips-maximize-cashback",
    category: "tips",
    icon: "💡",
    name: "5 mẹo tối ưu cashback",
    description: "Hướng dẫn user tận dụng tối đa app",
    subject: "💡 5 mẹo nhỏ giúp bạn nhận cashback tối đa",
    body: `<p>Sau khi quan sát hàng nghìn user, V-Affiliate phát hiện ra <strong>5 thói quen chung</strong> của những bạn nhận cashback nhiều nhất:</p>

<ol>
  <li><strong>Luôn tạo link qua V-Affiliate trước khi mua.</strong> Đừng quên bước này — dù chỉ mua 1 hộp khẩu trang 30k cũng có cashback.</li>
  <li><strong>Mua nhiều món cùng 1 đơn.</strong> Phí ship chia đều ra → tỷ lệ tiết kiệm tổng thể cao hơn.</li>
  <li><strong>Săn flash sale đúng khung giờ vàng (12h, 21h).</strong> Đây là lúc Shopee tung deal mạnh nhất.</li>
  <li><strong>Thêm vào wishlist + bật notification.</strong> V-Affiliate sẽ báo bạn khi sản phẩm giảm giá.</li>
  <li><strong>Đăng nhập mỗi ngày.</strong> Giữ chuỗi streak để nhận thưởng tiền mỗi mốc 7/14/30/60/90 ngày.</li>
</ol>

<p style="background: #fff7ed; border-left: 4px solid #fb923c; padding: 12px 16px; border-radius: 8px;">
  📊 <strong>Lưu ý:</strong> Cashback mỗi đơn = phần trăm hoa hồng shop trả (tuỳ sản phẩm). Mua đơn giá trị cao hoặc gom nhiều món sẽ hoàn về nhiều hơn.
</p>

<p>Hy vọng những mẹo này hữu ích cho bạn. Chúc bạn có một tháng tiết kiệm thật đỉnh! 💪</p>`,
  },
  {
    id: "tips-streak",
    category: "tips",
    icon: "🔥",
    name: "Giải thích chuỗi streak",
    description: "Hướng dẫn streak login mỗi ngày",
    subject: "🔥 Đăng nhập 7 ngày liên tiếp = nhận 5.000đ miễn phí",
    body: `<p>Bạn có biết V-Affiliate thưởng tiền cho user <strong>chỉ vì… đăng nhập</strong> không?</p>

<p>Cơ chế <strong>chuỗi streak</strong> hoạt động như sau:</p>
<ul>
  <li>🔥 <strong>7 ngày:</strong> +5.000đ vào ví</li>
  <li>🔥🔥 <strong>14 ngày:</strong> +10.000đ vào ví</li>
  <li>🔥🔥🔥 <strong>30 ngày:</strong> +25.000đ vào ví + huy hiệu "Người Bền Bỉ"</li>
  <li>🔥🔥🔥🔥 <strong>60 ngày:</strong> +50.000đ vào ví</li>
  <li>👑 <strong>90 ngày:</strong> +100.000đ vào ví + đặc quyền VIP</li>
</ul>

<p>Bạn không cần phải mua gì — chỉ cần mở app/web mỗi ngày là chuỗi tự tăng. Tiền tự cộng vào ví khi đạt mốc.</p>

<p style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px;">
  ⚠️ <strong>Quan trọng:</strong> Bỏ 1 ngày là chuỗi bị reset về 0. Bạn nên bookmark V-Affiliate trên trình duyệt để không quên nhé!
</p>

<p>Bắt đầu chuỗi của bạn ngay hôm nay — đến cuối tháng đã có 25.000đ ngon lành rồi đó! 💎</p>`,
  },

  // ============ THANKS ============
  {
    id: "thanks-loyal",
    category: "thanks",
    icon: "🙏",
    name: "Cảm ơn user trung thành",
    description: "Tri ân user có nhiều đơn / lâu năm",
    subject: "🙏 Cảm ơn bạn vì đã tin tưởng V-Affiliate",
    body: `<p>Hôm nay mình muốn dành riêng email này để <strong>cảm ơn bạn</strong> — một thành viên đã đồng hành cùng V-Affiliate từ những ngày đầu.</p>

<p>Có thể bạn không nhận ra, nhưng mỗi đơn hàng bạn tạo qua V-Affiliate đều giúp chúng mình:</p>
<ul>
  <li>🌱 Có thêm động lực phát triển sản phẩm tốt hơn cho cộng đồng</li>
  <li>🛠️ Đầu tư vào hạ tầng để tốc độ luôn nhanh, ổn định</li>
  <li>💛 Mở rộng đội ngũ chăm sóc khách hàng phản hồi 24/7</li>
</ul>

<p>V-Affiliate sẽ không là gì nếu thiếu những người dùng tin tưởng như bạn. Cảm ơn bạn từ đáy lòng. 🌷</p>

<p>Nếu có bất kỳ điều gì chúng mình có thể làm tốt hơn, bạn cứ trả lời email này nhé. Mọi góp ý đều được đọc và trân trọng.</p>

<p>Chúc bạn một ngày thật vui và nhiều niềm hạnh phúc nhỏ! ☀️</p>`,
  },
  {
    id: "thanks-firstmonth",
    category: "thanks",
    icon: "🎂",
    name: "Cảm ơn 1 tháng đồng hành",
    description: "User vừa đủ 30 ngày từ đăng ký",
    subject: "🎂 Cùng V-Affiliate 1 tháng rồi — cảm ơn bạn nhé!",
    body: `<p>Chúc mừng — <strong>hôm nay đã tròn 1 tháng</strong> bạn đồng hành cùng V-Affiliate!</p>

<p>Mình rất biết ơn vì trong rất nhiều app cashback ngoài kia, bạn đã chọn dành thời gian cho V-Affiliate. Đó là điều mình không bao giờ coi là hiển nhiên.</p>

<p>Hy vọng tháng vừa qua đã mang đến cho bạn những giây phút vui khi nhận thông báo "💰 Cashback đã về ví". Đó là khoảnh khắc V-Affiliate được sinh ra để tạo nên.</p>

<p style="text-align: center; padding: 16px; background: #fff7ed; border-radius: 12px; margin: 16px 0;">
  🎁 <strong>Quà nhỏ tri ân:</strong><br/>
  V-Affiliate gửi tặng bạn <strong>1 lượt quay vàng</strong><br/>
  <span style="font-size: 12px; color: #9a3412;">(phần thưởng x3 so với quay thường)</span>
</p>

<p>Hẹn gặp bạn ở cột mốc 6 tháng và 1 năm tới nhé. Mình sẽ cố gắng hơn nữa để xứng đáng với sự tin tưởng của bạn. 💛</p>`,
  },

  // ============ MILESTONE ============
  {
    id: "milestone-1m",
    category: "milestone",
    icon: "💎",
    name: "Chúc mừng đạt 1 triệu cashback",
    description: "User vừa đạt 1tr cashback tích luỹ",
    subject: "💎 Chúc mừng! Bạn vừa chạm mốc 1 triệu cashback",
    body: `<p>Tin vui rất lớn — bạn vừa chính thức cán mốc <strong>1.000.000đ cashback tích luỹ</strong> trên V-Affiliate!</p>

<p>Đây là số tiền:</p>
<ul>
  <li>Mà bạn lẽ ra đã <strong>chi cho cùng những đơn hàng</strong> đó nếu không qua V-Affiliate</li>
  <li>Đủ để bạn ăn 30 bữa cơm văn phòng tử tế</li>
  <li>Bằng 1 chiếc tai nghe true wireless tầm trung</li>
  <li>Hoặc 1 cuốn sách đỉnh cao + 1 cây bút máy đẹp 📚</li>
</ul>

<p>Mình thật sự vui vì V-Affiliate đã giúp được bạn tiết kiệm <em>chính xác</em> số tiền này. Cảm ơn bạn đã kiên trì sử dụng.</p>

<p>Vào dashboard xem huy hiệu mới <strong>"Triệu phú Cashback"</strong> đã được trao cho bạn nhé. Chia sẻ thành tích lên Facebook để bạn bè cùng tham gia, và bạn còn nhận thêm <strong>10.000đ</strong> nữa! 🎊</p>`,
  },
  {
    id: "milestone-tier-up",
    category: "milestone",
    icon: "👑",
    name: "Lên rank thành công",
    description: "User vừa được nâng rank",
    subject: "👑 Chúc mừng! Bạn đã chính thức lên hạng",
    body: `<p>Tin tuyệt vời nhất ngày hôm nay đến với bạn — bạn đã <strong>chính thức lên rank cao hơn</strong> trên V-Affiliate!</p>

<p>Từ hôm nay trở đi, mỗi đơn hàng của bạn sẽ:</p>
<ul>
  <li>Nhận <strong>cashback cao hơn</strong> so với rank trước</li>
  <li>Được <strong>ưu tiên duyệt rút tiền</strong> nhanh hơn</li>
  <li>Hiện <strong>huy hiệu rank mới</strong> trên profile và bảng xếp hạng</li>
  <li>Mở khoá vòng quay đặc biệt với phần thưởng cao hơn</li>
</ul>

<p>Đây là kết quả của sự kiên trì và những lựa chọn mua sắm thông minh của bạn. Mình thật sự cảm phục.</p>

<p>Tiếp tục giữ phong độ này nhé — rank tiếp theo đang chờ bạn! 🚀</p>`,
  },

  // ============ SEASONAL ============
  {
    id: "seasonal-tet",
    category: "seasonal",
    icon: "🧧",
    name: "Chúc mừng Tết Nguyên Đán",
    description: "Gửi dịp Tết âm lịch",
    subject: "🧧 V-Affiliate kính chúc bạn một năm mới an khang!",
    body: `<p>Tết đến rồi — V-Affiliate xin gửi đến bạn lời chúc chân thành nhất:</p>

<p style="font-size: 16px; text-align: center; padding: 20px; background: linear-gradient(135deg, #fef3c7, #fed7aa); border-radius: 12px; margin: 16px 0; color: #9a3412;">
  <strong>An khang · Thịnh vượng · Bình an · Hạnh phúc</strong><br/>
  <span style="font-size: 13px;">Một năm mới đầy ắp tiếng cười và những đơn hàng vui!</span>
</p>

<p>Cảm ơn bạn đã đồng hành cùng V-Affiliate trong năm vừa qua. Nhờ có sự tin tưởng của bạn, chúng mình mới có thể duy trì và phát triển — mang đến nhiều giá trị hơn cho cộng đồng.</p>

<p>Năm mới, V-Affiliate cam kết:</p>
<ul>
  <li>🎁 Nhiều ưu đãi hơn — cashback cao hơn vào dịp lễ Tết</li>
  <li>⚡ Tốc độ duyệt nhanh hơn, hỗ trợ tận tâm hơn</li>
  <li>✨ Thêm nhiều tính năng thú vị giúp bạn tiết kiệm tốt hơn</li>
</ul>

<p>Một lần nữa, kính chúc bạn và gia đình một <strong>Tết đoàn viên ấm áp</strong>, một năm mới <strong>vạn sự như ý</strong>! 🌸</p>`,
  },
  {
    id: "seasonal-blackfriday",
    category: "seasonal",
    icon: "🛍️",
    name: "Black Friday / 11.11",
    description: "Sale toàn cầu cuối năm",
    subject: "🛍️ Black Friday — săn deal khủng + cashback x2",
    body: `<p>Bạn ơi, mùa <strong>Black Friday</strong> đã chính thức bắt đầu — và đây là dịp <strong>tiết kiệm lớn nhất trong năm</strong>!</p>

<p>Đây là thời điểm <strong>tiết kiệm lớn nhất trong năm</strong> — mua qua link V-Affiliate để vừa hưởng giá sale, vừa được hoàn tiền về ví:</p>
<ul>
  <li>🔥 Hoàn tiền trên <strong>mọi đơn Shopee</strong> mua qua link</li>
  <li>🎁 Nhiều sản phẩm còn kèm <strong>voucher Shopee giảm thêm tới 22%</strong> ở bước thanh toán</li>
  <li>🎰 Càng nhiều đơn, càng nhiều lượt quay may mắn</li>
</ul>

<p>Đây là thời điểm vàng để mua những món bạn đã thèm muốn cả năm:</p>
<ul>
  <li>📱 Điện tử: TV, laptop, điện thoại giảm tới 50%</li>
  <li>👗 Thời trang: hàng hiệu authentic giảm sâu</li>
  <li>🏠 Gia dụng: máy lọc, robot hút bụi, máy giặt</li>
  <li>🎁 Quà cuối năm cho người thân, đồng nghiệp</li>
</ul>

<p>Lịch flash sale chính trong tuần: <strong>0h, 9h, 12h, 21h</strong> mỗi ngày. Setup alarm để không bỏ lỡ nhé!</p>

<p>Chúc bạn săn được deal thật đỉnh và tiết kiệm thật nhiều! 🎯</p>`,
  },

  // ============ APOLOGY ============
  {
    id: "apology-downtime",
    category: "apology",
    icon: "🙇",
    name: "Xin lỗi sự cố downtime",
    description: "Sau khi web bị lỗi/chậm",
    subject: "🙇 V-Affiliate xin lỗi vì sự cố vừa qua",
    body: `<p>Trong khoảng thời gian từ <strong>[GIỜ - GIỜ]</strong> hôm nay, V-Affiliate đã gặp sự cố kỹ thuật khiến một số bạn không thể truy cập hoặc thao tác bị chậm.</p>

<p>Mình thật sự xin lỗi vì đã làm phiền đến trải nghiệm của bạn.</p>

<p><strong>Nguyên nhân:</strong> [Mô tả ngắn gọn — VD: tăng tải đột biến, lỗi database, lỗi nhà cung cấp...]</p>
<p><strong>Đã khắc phục:</strong> Hệ thống đã hoạt động bình thường trở lại từ <strong>[GIỜ]</strong>. Đội ngũ kỹ thuật đã thực hiện các biện pháp để sự cố tương tự không tái diễn.</p>

<p style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 8px;">
  💚 <strong>Quan trọng:</strong> Mọi đơn cashback và yêu cầu rút tiền của bạn vẫn được xử lý đầy đủ — không có dữ liệu nào bị mất.
</p>

<p>Để bù đắp cho sự bất tiện, V-Affiliate gửi tặng tất cả user <strong>1 lượt quay miễn phí</strong> vào tài khoản của bạn (đã có sẵn trong dashboard).</p>

<p>Một lần nữa, mình thành thật xin lỗi. Cảm ơn bạn đã thông cảm và tiếp tục đồng hành cùng V-Affiliate. 🙇</p>`,
  },
  {
    id: "apology-maintenance",
    category: "apology",
    icon: "🔧",
    name: "Thông báo bảo trì",
    description: "Gửi trước khi maintain hệ thống",
    subject: "🔧 V-Affiliate sẽ bảo trì vào [NGÀY GIỜ]",
    body: `<p>Để nâng cấp hệ thống và mang đến trải nghiệm tốt hơn cho bạn, V-Affiliate sẽ tiến hành <strong>bảo trì</strong> trong khung giờ:</p>

<p style="font-size: 16px; text-align: center; padding: 16px; background: #fff7ed; border-radius: 12px; margin: 16px 0;">
  📅 <strong>[NGÀY] · [GIỜ BẮT ĐẦU] - [GIỜ KẾT THÚC]</strong><br/>
  <span style="font-size: 12px; color: #9a3412;">Dự kiến downtime: [X] phút</span>
</p>

<p>Trong thời gian này:</p>
<ul>
  <li>Bạn có thể không truy cập được V-Affiliate hoặc thao tác bị chậm</li>
  <li>Các đơn cashback đang chờ duyệt sẽ được xử lý sau khi bảo trì xong</li>
  <li>Yêu cầu rút tiền không bị ảnh hưởng (chỉ chậm một chút)</li>
</ul>

<p>Sau khi bảo trì xong, bạn sẽ thấy:</p>
<ul>
  <li>⚡ Tốc độ tải trang nhanh hơn rõ rệt</li>
  <li>🔒 Bảo mật được nâng cấp lên chuẩn mới nhất</li>
  <li>✨ Một vài tính năng nhỏ cải thiện trải nghiệm</li>
</ul>

<p>Mình rất cảm ơn sự kiên nhẫn của bạn. Chúc bạn một ngày vui và hẹn gặp lại sau bảo trì nhé! 🛠️</p>`,
  },

  // ============ SURVEY ============
  {
    id: "survey-nps",
    category: "survey",
    icon: "📋",
    name: "Hỏi đánh giá NPS",
    description: "Khảo sát mức độ hài lòng",
    subject: "📋 Bạn sẽ giới thiệu V-Affiliate cho bạn bè không?",
    body: `<p>Mình muốn xin bạn <strong>30 giây</strong> để trả lời 1 câu hỏi quan trọng:</p>

<p style="font-size: 16px; text-align: center; padding: 20px; background: #fff7ed; border-radius: 12px; margin: 16px 0;">
  <strong>Trên thang điểm 0-10, bạn sẽ giới thiệu V-Affiliate cho bạn bè/người thân với mức độ nào?</strong>
</p>

<p>Bạn chỉ cần <strong>trả lời email này với 1 con số</strong> (kèm 1-2 dòng lý do nếu có thời gian) — mình sẽ đọc từng phản hồi một.</p>

<ul>
  <li><strong>9-10:</strong> Tuyệt vời, mình có thể chia sẻ V-Affiliate ngay</li>
  <li><strong>7-8:</strong> Tốt, nhưng vẫn có vài điểm cần cải thiện</li>
  <li><strong>0-6:</strong> Có vấn đề mà mình không hài lòng</li>
</ul>

<p>Phản hồi của bạn rất quý giá — đây là cách trực tiếp nhất để V-Affiliate biết mình đang làm tốt hay đang thiếu sót ở đâu.</p>

<p>Cảm ơn bạn rất nhiều vì đã dành thời gian. 💛</p>`,
  },
  {
    id: "survey-feature-request",
    category: "survey",
    icon: "💡",
    name: "Hỏi feature muốn thêm",
    description: "Thu thập ý tưởng từ user",
    subject: "💡 Bạn muốn V-Affiliate thêm tính năng gì?",
    body: `<p>V-Affiliate đang lên kế hoạch phát triển trong quý tới — và mình muốn <strong>bạn cùng tham gia quyết định</strong> nên thêm gì.</p>

<p>Một số ý tưởng đang được cân nhắc:</p>
<ul>
  <li>🛍️ <strong>Mở rộng nhiều sàn hơn:</strong> Sendo, FPT Shop, CellphoneS...</li>
  <li>📱 <strong>Mobile app riêng</strong> (hiện đang là web) — nhanh và mượt hơn</li>
  <li>🤖 <strong>Bot Telegram</strong> báo deal hot tự động</li>
  <li>💳 <strong>Thẻ quà tặng</strong> đổi cashback thành voucher Shopee/Tiki</li>
  <li>📊 <strong>Báo cáo chi tiêu cá nhân</strong> giúp bạn quản lý tài chính</li>
  <li>🎁 <strong>Đổi cashback thành điểm thưởng</strong> tích luỹ đổi quà giá trị cao</li>
</ul>

<p>Bạn quan tâm tính năng nào nhất? Hoặc có ý tưởng khác mà bạn muốn V-Affiliate có?</p>

<p><strong>Chỉ cần trả lời email này với 1-2 dòng</strong> — đội phát triển sẽ đọc và ưu tiên xây dựng những gì user mong muốn nhất.</p>

<p>Cảm ơn bạn đã giúp V-Affiliate ngày càng tốt hơn! 🚀</p>`,
  },
];
