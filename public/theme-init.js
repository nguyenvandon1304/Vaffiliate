// Áp class `dark` trên <html> trước khi React hydrate.
// Tránh chớp sáng (FOUC) khi user đang ở chế độ dark.
//
// Đặt ngoài React tree (file static) để không gây hydration mismatch
// — nếu inline qua `dangerouslySetInnerHTML` thì React 19 sẽ cảnh báo.
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
    if (theme === "dark") document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = theme;
  } catch {
    /* localStorage có thể bị chặn — bỏ qua, mặc định light. */
  }

  // iOS Safari zoom reset khi mở app PWA standalone.
  // Bug: nếu user đã pinch-zoom trước khi cài app, hoặc Safari giữ zoom level
  // từ session trước → mở PWA hiện sai tỷ lệ.
  // Fix: ép viewport scale = 1 sau khi load. Chỉ áp dụng cho iOS standalone.
  try {
    var isStandalone = window.navigator.standalone === true ||
                       window.matchMedia("(display-mode: standalone)").matches;
    var isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
    if (isStandalone && isIOS) {
      var meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        var original = meta.getAttribute("content");
        // Tạm thời lock zoom = 1
        meta.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover");
        // Sau 500ms restore lại để user vẫn pinch-zoom được khi cần
        setTimeout(function () {
          if (original) meta.setAttribute("content", original);
        }, 500);
      }
    }
  } catch {
    /* ignore */
  }
})();
