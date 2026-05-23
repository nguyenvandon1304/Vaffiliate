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
})();
