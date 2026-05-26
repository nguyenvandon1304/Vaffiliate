"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CaffiliateLogo,
  HeadsetIcon,
  GiftIcon,
  ShieldIcon,
  StarIcon,
  UserIcon,
  LockIcon,
  ArrowLeftIcon,
  LogInIcon,
  EyeIcon,
  EyeOffIcon,
  UsersIcon,
  MicIcon,
  MailIcon,
  CircleInfoIcon,
} from "@/components/icons";
import { Captcha, type CaptchaHandle } from "@/components/Captcha";

const inputClass =
  "w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-950/40 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-zinc-100 placeholder:text-gray-300 dark:placeholder:text-zinc-600 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20 outline-none transition-all";

const inputClassWithRightIcon = inputClass.replace("pr-4", "pr-10");

export function LoginCard() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [forgotMsg, setForgotMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [needVerifyEmail, setNeedVerifyEmail] = useState<string | null>(null);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [changeEmailUsername, setChangeEmailUsername] = useState("");
  const [changeEmailPassword, setChangeEmailPassword] = useState("");
  const [changeEmailNew, setChangeEmailNew] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);
  // Khi server trả needTotp=true → chuyển sang bước nhập TOTP với cùng username/password.
  // Lưu credentials trong memory để không cần user nhập lại (chỉ trong RAM, không
  // ghi ra storage). totpRequired=true → form hiện ô 6 chữ số.
  const [totpRequired, setTotpRequired] = useState(false);
  const [pendingCreds, setPendingCreds] = useState<{ username: string; password: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const resetCaptcha = () => {
    captchaRef.current?.reset();
    setCaptchaVerified(false);
    setCaptchaToken(null);
  };

  const handleResendVerify = async () => {
    if (!needVerifyEmail) return;
    setResending(true);
    setInfo("");
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: needVerifyEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setInfo(data.message || "Đã gửi lại link xác thực. Vui lòng kiểm tra email.");
      } else {
        setError(data.error || "Không gửi được email xác thực.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!changeEmailUsername || !changeEmailPassword || !changeEmailNew) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setChangingEmail(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: changeEmailUsername,
          password: changeEmailPassword,
          newEmail: changeEmailNew,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInfo(data.message || "Đã đổi email thành công.");
        setNeedVerifyEmail(data.email ?? changeEmailNew);
        setShowChangeEmail(false);
        setChangeEmailUsername("");
        setChangeEmailPassword("");
        setChangeEmailNew("");
      } else {
        setError(data.error || "Không đổi được email.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setChangingEmail(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    // Step 2 — đã có TOTP step và submit lại không cần captcha vì đã verify
    if (totpRequired && pendingCreds) {
      const cleaned = totpCode.toUpperCase().replace(/\s/g, "");
      // Accept TOTP 6 chữ số HOẶC backup code XXXX-XXXX (8 ký tự + dấu -).
      const isValidFormat = /^\d{6}$/.test(cleaned) || /^[A-Z2-9]{4}-?[A-Z2-9]{4}$/.test(cleaned);
      if (!isValidFormat) {
        setError("Nhập mã 6 chữ số (TOTP) hoặc backup code (XXXX-XXXX)");
        return;
      }
      setError("");
      setLoading(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // captchaToken vẫn gửi nếu còn → server-side cũng cho phép skip rate-limit-check khi đã có
          body: JSON.stringify({
            username: pendingCreds.username,
            password: pendingCreds.password,
            captchaToken,
            totpCode,
          }),
        });
        const data = await res.json();
        if (data.success) {
          if (data.user?.role === "admin") router.push("/admin");
          else router.push("/dashboard");
        } else {
          setError(data.error || "Đăng nhập thất bại");
          if (!data.needTotp) {
            setTotpRequired(false);
            setPendingCreds(null);
            setTotpCode("");
            resetCaptcha();
          }
        }
      } catch {
        setError("Lỗi kết nối. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!captchaVerified) {
      setError("Vui lòng hoàn tất xác minh captcha");
      return;
    }
    setError("");
    setInfo("");
    setNeedVerifyEmail(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, captchaToken }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.user?.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(data.error || "Đăng nhập thất bại");
        if (data.needEmailVerify && data.email) {
          setNeedVerifyEmail(data.email);
        }
        if (data.needTotp) {
          // Bật bước 2 — lưu creds tạm thời để submit lại khi user nhập code.
          setTotpRequired(true);
          setPendingCreds({ username, password });
          setError(""); // không phải lỗi thực, chỉ là yêu cầu thêm bước
          setInfo("Tài khoản đã bật 2FA. Nhập mã 6 chữ số từ app xác thực để tiếp tục.");
        } else {
          resetCaptcha();
        }
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    if (!captchaVerified) {
      setError("Vui lòng hoàn tất xác minh captcha");
      return;
    }
    setError("");
    setInfo("");
    setNeedVerifyEmail(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pull `ref=<username>` từ URL — duy trì khi user truy cập từ link giới thiệu.
        body: JSON.stringify({
          username, email, password, captchaToken,
          ref: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.needEmailVerify) {
          setMode("login");
          setInfo(data.message || "Đăng ký thành công. Vui lòng kiểm tra email để xác thực.");
          setNeedVerifyEmail(data.email ?? email);
        } else {
          setMode("login");
          setInfo("Đăng ký thành công! Vui lòng đăng nhập.");
        }
      } else {
        setError(data.error || "Đăng ký thất bại");
        resetCaptcha();
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const navTabs = [
    { icon: HeadsetIcon, label: "Hỗ trợ" },
    { icon: GiftIcon, label: "Mời bạn nhận thưởng" },
    { icon: ShieldIcon, label: "Bảo mật tuyệt đối" },
    { icon: StarIcon, label: "Đánh giá" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header: Logo + Heading */}
      <div className="text-center mb-6">
        <CaffiliateLogo className="flex justify-center mb-5" />
        <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent leading-tight mb-2">
          Mua hàng, Hoàn Tiền Thật
        </h1>
        <p className="text-sm text-gray-400 dark:text-zinc-500">
          Tiết kiệm thông minh với mỗi đơn hàng online
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
        {navTabs.map((tab) => (
          <button
            key={tab.label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 hover:border-orange-300 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200"
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Auth Card */}
      <div className="max-w-lg mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-lg shadow-gray-200/60 dark:shadow-black/40 border border-gray-100 dark:border-zinc-800 overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setForgotMsg(""); }}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setForgotMsg(""); }}
            className="flex items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            {mode === "forgot" ? "Đăng nhập" : mode === "login" ? "Đăng ký bằng V-Affiliate" : "Đăng nhập"}
          </button>
        </div>

        {/* Form */}
        <div className="px-6 pb-5 pt-2">
          {error && mode !== "forgot" && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}
          {info && mode !== "forgot" && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg text-sm text-green-700 dark:text-green-400 font-medium">
              {info}
            </div>
          )}
          {needVerifyEmail && mode !== "forgot" && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-sm">
              <p className="text-amber-700 dark:text-amber-300 font-medium mb-2">
                Email <strong>{needVerifyEmail}</strong> chưa được xác thực.
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  onClick={handleResendVerify}
                  disabled={resending}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 underline disabled:opacity-50"
                >
                  {resending ? "Đang gửi..." : "Gửi lại link xác thực"}
                </button>
                <span className="text-amber-400">·</span>
                <button
                  type="button"
                  onClick={() => { setShowChangeEmail(!showChangeEmail); setError(""); setInfo(""); }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  {showChangeEmail ? "Hủy đổi email" : "Đổi sang email khác"}
                </button>
              </div>

              {showChangeEmail && (
                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/50 space-y-2">
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/90">
                    Nhập username + password tài khoản và email mới. Link xác thực sẽ gửi tới email mới.
                  </p>
                  <input
                    type="text"
                    value={changeEmailUsername}
                    onChange={(e) => setChangeEmailUsername(e.target.value)}
                    placeholder="Tên đăng nhập"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 rounded outline-none focus:border-orange-500"
                  />
                  <input
                    type="password"
                    value={changeEmailPassword}
                    onChange={(e) => setChangeEmailPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 rounded outline-none focus:border-orange-500"
                  />
                  <input
                    type="email"
                    value={changeEmailNew}
                    onChange={(e) => setChangeEmailNew(e.target.value)}
                    placeholder="Email mới"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 rounded outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    disabled={changingEmail}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold py-2 rounded transition-colors"
                  >
                    {changingEmail ? "Đang xử lý..." : "Cập nhật email"}
                  </button>
                </div>
              )}
            </div>
          )}
          {mode === "login" && totpRequired ? (
            <TotpStepForm
              code={totpCode}
              setCode={setTotpCode}
              loading={loading}
              error={error}
              info={info}
              onSubmit={() => {
                if (pendingCreds) handleLogin(pendingCreds.username, pendingCreds.password);
              }}
              onCancel={() => {
                setTotpRequired(false);
                setPendingCreds(null);
                setTotpCode("");
                setError("");
                setInfo("");
                resetCaptcha();
              }}
            />
          ) : mode === "login" ? (
            <LoginForm
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              setCaptchaVerified={setCaptchaVerified}
              setCaptchaToken={setCaptchaToken}
              captchaRef={captchaRef}
              onSubmit={handleLogin}
              loading={loading}
              onForgot={() => { setMode("forgot"); setError(""); setForgotMsg(""); }}
            />
          ) : mode === "forgot" ? (
            <ForgotPasswordForm
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              message={forgotMsg}
              setMessage={setForgotMsg}
            />
          ) : (
            <RegisterForm
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              setCaptchaVerified={setCaptchaVerified}
              setCaptchaToken={setCaptchaToken}
              captchaRef={captchaRef}
              onSubmit={handleRegister}
              loading={loading}
            />
          )}

          {/* Terms */}
          <p className="text-xs text-center text-gray-400 dark:text-zinc-500 mt-5">
            Bằng việc tiếp tục, bạn đồng ý với{" "}
            <a
              href="https://caffiliate.vn/policies.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 underline underline-offset-2 font-medium transition-colors"
            >
              Điều khoản &amp; Chính sách
            </a>{" "}
            của chúng tôi.
          </p>
        </div>

        {/* Social Links */}
        <div className="border-t border-gray-100 dark:border-zinc-800 px-6 py-4">
          <p className="text-xs text-gray-400 dark:text-zinc-500 text-center mb-3">
            Kết nối với chúng tôi
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://www.facebook.com/groups/1277321027865135"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 dark:text-zinc-500 hover:text-orange-500 transition-colors"
              aria-label="Cộng đồng Facebook"
              title="Nhóm Facebook V-Affiliate"
            >
              <UsersIcon className="w-5 h-5" />
            </a>
            <a
              href="https://zalo.me/g/kw4grzxrzqzgrbwyys6f"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 dark:text-zinc-500 hover:text-orange-500 transition-colors"
              aria-label="Nhóm Zalo"
              title="Nhóm Zalo V-Affiliate"
            >
              <MicIcon className="w-5 h-5" />
            </a>
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=nguyenvandon1304@gmail.com&su=H%E1%BB%97%20tr%E1%BB%A3%20V-Affiliate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 dark:text-zinc-500 hover:text-orange-500 transition-colors"
              aria-label="Email liên hệ"
              title="Gửi email cho nguyenvandon1304@gmail.com"
            >
              <MailIcon className="w-5 h-5" />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61590342930888"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 dark:text-zinc-500 hover:text-orange-500 transition-colors"
              aria-label="Fanpage chính thức"
              title="Fanpage Facebook V-Affiliate"
            >
              <CircleInfoIcon className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* App Download — Coming soon, chưa publish app store */}
        <div className="border-t border-gray-100 dark:border-zinc-800 px-6 py-4">
          <p className="text-xs text-gray-400 dark:text-zinc-500 text-center mb-3">
            Tải ứng dụng
          </p>
          <div className="flex items-center justify-center gap-3">
            <div
              aria-disabled="true"
              title="Sắp ra mắt"
              className="relative inline-flex items-center gap-2 bg-gray-300 dark:bg-zinc-800 text-white/80 text-xs font-medium pl-3 pr-4 py-2 rounded-lg opacity-70 cursor-not-allowed select-none"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302L15.5 12l2.198-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z" />
              </svg>
              <div className="flex flex-col leading-tight">
                <span className="text-[8px] uppercase tracking-wider opacity-80">Coming soon</span>
                <span className="text-xs font-semibold">Google Play</span>
              </div>
            </div>
            <div
              aria-disabled="true"
              title="Sắp ra mắt"
              className="relative inline-flex items-center gap-2 bg-gray-300 dark:bg-zinc-800 text-white/80 text-xs font-medium pl-3 pr-4 py-2 rounded-lg opacity-70 cursor-not-allowed select-none"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="flex flex-col leading-tight">
                <span className="text-[8px] uppercase tracking-wider opacity-80">Coming soon</span>
                <span className="text-xs font-semibold">App Store</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({
  showPassword,
  setShowPassword,
  setCaptchaVerified,
  setCaptchaToken,
  captchaRef,
  onSubmit,
  loading,
  onForgot,
}: {
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  setCaptchaVerified: (v: boolean) => void;
  setCaptchaToken: (token: string | null) => void;
  captchaRef: React.Ref<CaptchaHandle>;
  onSubmit: (username: string, password: string) => void;
  loading: boolean;
  onForgot: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-4">
      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-zinc-300 mb-1.5">
          Tên đăng nhập
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
            <UserIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập tên đăng nhập"
            className={inputClass}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-zinc-300 mb-1.5">
          Mật khẩu
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
            <LockIcon className="w-4 h-4" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            className={inputClassWithRightIcon}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          >
            {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Captcha */}
      <Captcha
        ref={captchaRef}
        action="login"
        onVerify={setCaptchaVerified}
        onToken={setCaptchaToken}
      />

      {/* Login Button */}
      <button
        onClick={() => onSubmit(username, password)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogInIcon className="w-4 h-4" />
        <span>{loading ? "Đang xử lý..." : "Đăng nhập"}</span>
      </button>

      {/* Forgot password */}
      <div className="text-center mt-3">
        <button
          type="button"
          onClick={onForgot}
          className="text-xs text-gray-400 dark:text-zinc-500 hover:text-orange-500 transition-colors"
        >
          Quên mật khẩu?
        </button>
      </div>
    </div>
  );
}

function ForgotPasswordForm({
  loading,
  setLoading,
  error,
  setError,
  message,
  setMessage,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  const handleSubmit = async () => {
    if (!email.trim()) { setError("Vui lòng nhập email"); return; }
    if (!verified) { setError("Vui lòng hoàn tất xác minh captcha"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken: token }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
      } else {
        setError(data.error || "Có lỗi xảy ra");
        captchaRef.current?.reset();
        setVerified(false);
        setToken(null);
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
      captchaRef.current?.reset();
      setVerified(false);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  if (message) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center mx-auto mb-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100 mb-1">Đã gửi!</p>
        <p className="text-xs text-gray-400 dark:text-zinc-500">{message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center mx-auto mb-3">
          <MailIcon className="w-6 h-6 text-orange-500" />
        </div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-100">Quên mật khẩu?</h3>
        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Nhập email đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-600 dark:text-red-400 font-medium">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-zinc-300 mb-1.5">Email</label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
            <MailIcon className="w-4 h-4" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập email đăng ký"
            className={inputClass}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>
      </div>

      <Captcha ref={captchaRef} action="forgot-password" onVerify={setVerified} onToken={setToken} />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <MailIcon className="w-4 h-4" />
        <span>{loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}</span>
      </button>
    </div>
  );
}

function RegisterForm({
  showPassword,
  setShowPassword,
  setCaptchaVerified,
  setCaptchaToken,
  captchaRef,
  onSubmit,
  loading,
}: {
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  setCaptchaVerified: (v: boolean) => void;
  setCaptchaToken: (token: string | null) => void;
  captchaRef: React.Ref<CaptchaHandle>;
  onSubmit: (username: string, email: string, password: string) => void;
  loading: boolean;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = () => {
    if (password !== confirmPassword) {
      setFormError("Mật khẩu xác nhận không khớp");
      return;
    }
    setFormError("");
    onSubmit(username, email, password);
  };

  return (
    <div className="space-y-4">
      {formError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-600 dark:text-red-400 font-medium">
          {formError}
        </div>
      )}

      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-zinc-300 mb-1.5">
          Tên đăng nhập
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
            <UserIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập tên đăng nhập"
            className={inputClass}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-zinc-300 mb-1.5">
          Email
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
            <MailIcon className="w-4 h-4" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập email"
            className={inputClass}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-zinc-300 mb-1.5">
          Mật khẩu
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
            <LockIcon className="w-4 h-4" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            className={inputClassWithRightIcon}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          >
            {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        </div>
        <PasswordStrengthMeter password={password} />
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-zinc-300 mb-1.5">
          Xác nhận mật khẩu
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500">
            <LockIcon className="w-4 h-4" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            className={inputClass}
          />
        </div>
      </div>

      {/* Captcha */}
      <Captcha
        ref={captchaRef}
        action="register"
        onVerify={setCaptchaVerified}
        onToken={setCaptchaToken}
      />

      {/* Register Button */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UserIcon className="w-4 h-4" />
        <span>{loading ? "Đang xử lý..." : "Đăng ký"}</span>
      </button>
    </div>
  );
}


/**
 * Bước 2 của login khi tài khoản đã bật 2FA. Tách thành component riêng để
 * giữ LoginForm gọn. Nhận code 6 chữ số → submit lại endpoint /api/auth/login.
 */
function TotpStepForm({
  code,
  setCode,
  loading,
  error,
  info,
  onSubmit,
  onCancel,
}: {
  code: string;
  setCode: (v: string) => void;
  loading: boolean;
  error: string;
  info: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  // Mode "totp" (6 số) hoặc "backup" (XXXX-XXXX)
  const [mode, setMode] = useState<"totp" | "backup">("totp");

  // Khi đổi mode → clear code để format input đúng.
  const switchMode = (m: "totp" | "backup") => { setMode(m); setCode(""); };

  // Validate trước khi cho submit
  const valid = mode === "totp"
    ? /^\d{6}$/.test(code)
    : /^[A-Z2-9]{4}-?[A-Z2-9]{4}$/.test(code.toUpperCase());

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(); }}
      className="space-y-3"
    >
      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-zinc-800 rounded-full text-xs">
        <button
          type="button"
          onClick={() => switchMode("totp")}
          className={`flex-1 px-3 py-1.5 rounded-full font-semibold transition-all ${mode === "totp" ? "bg-white dark:bg-zinc-700 text-orange-600 shadow-sm" : "text-gray-500 dark:text-zinc-400"}`}
        >
          📱 Mã từ app (6 số)
        </button>
        <button
          type="button"
          onClick={() => switchMode("backup")}
          className={`flex-1 px-3 py-1.5 rounded-full font-semibold transition-all ${mode === "backup" ? "bg-white dark:bg-zinc-700 text-orange-600 shadow-sm" : "text-gray-500 dark:text-zinc-400"}`}
        >
          🛡 Backup code
        </button>
      </div>

      <div>
        {mode === "totp" ? (
          <>
            <label className="block text-sm font-medium text-gray-600 dark:text-zinc-300 mb-1.5">
              Mã 2FA (6 chữ số)
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 bg-white dark:bg-zinc-950/40 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-2xl font-mono tracking-[0.5em] text-center text-gray-900 dark:text-zinc-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20 outline-none"
            />
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1.5">
              Mở Google Authenticator / Authy / 1Password để lấy mã hiện tại.
            </p>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium text-gray-600 dark:text-zinc-300 mb-1.5">
              Backup code (XXXX-XXXX)
            </label>
            <input
              type="text"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9-]/g, "").slice(0, 9))}
              placeholder="ABCD-1234"
              className="w-full px-4 py-3 bg-white dark:bg-zinc-950/40 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-xl font-mono tracking-widest text-center uppercase text-gray-900 dark:text-zinc-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20 outline-none"
            />
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1.5">
              Mã 1 lần dùng đã lưu khi enable 2FA. Sau khi dùng, mã đó sẽ vô hiệu.
            </p>
          </>
        )}
      </div>
      {info && <p className="text-sm text-blue-600 dark:text-blue-400">{info}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading || !valid}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold py-3 rounded-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Đang xác thực..." : "Tiếp tục"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-gray-600 dark:text-zinc-400 px-4 py-3 hover:text-gray-900 dark:hover:text-zinc-200"
        >
          Huỷ
        </button>
      </div>
    </form>
  );
}


/**
 * Hiển thị thanh đo độ mạnh mật khẩu — chỉ hiện khi user đã gõ ≥1 ký tự.
 * Dùng cùng logic `passwordStrength` ở `lib/security.ts` (port client-side).
 */
function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const strength = clientPasswordStrength(password);
  const colors = ["bg-red-400", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-green-500"];
  const textColors = ["text-red-500", "text-red-500", "text-amber-600", "text-yellow-600", "text-green-600"];

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${colors[strength.score]}`}
            style={{ width: `${(strength.score + 1) * 20}%` }}
          />
        </div>
        <span className={`text-xs font-semibold ${textColors[strength.score]}`}>
          {strength.label}
        </span>
      </div>
      {strength.hints.length > 0 && (
        <p className="text-[10px] text-gray-500 dark:text-zinc-500 leading-snug">
          {strength.hints.join(" · ")}
        </p>
      )}
    </div>
  );
}

/**
 * Client-side mirror của passwordStrength trong lib/security.ts. Tách riêng
 * để không phải bundle node:crypto vào client (chỉ cần regex check).
 */
function clientPasswordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string; hints: string[] } {
  const hints: string[] = [];
  if (!password) return { score: 0, label: "Quá yếu", hints: ["Nhập mật khẩu"] };

  const len = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const classes = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  const lower = password.toLowerCase();
  const COMMON_BAD = ["password", "123456", "qwerty", "abc123", "letmein", "111111", "matkhau", "12345678", "admin", "iloveyou", "welcome"];
  const isCommon = COMMON_BAD.some((p) => lower.includes(p));
  const isSequential = /(?:abcd|0123|1234|2345|3456|4567|5678|6789|qwer)/i.test(password);
  const isRepeating = /(.)\1{3,}/.test(password);

  let score = 0;
  if (len >= 6) score++;
  if (len >= 10) score++;
  if (len >= 14) score++;
  if (classes >= 3) score++;

  if (isCommon || isSequential || isRepeating) {
    score = Math.max(0, score - 2);
    if (isCommon) hints.push("Tránh từ phổ biến");
    if (isSequential) hints.push("Tránh chuỗi liên tiếp");
    if (isRepeating) hints.push("Tránh ký tự lặp");
  }

  if (len < 6) hints.push("≥ 6 ký tự");
  else if (len < 10) hints.push("Nên ≥ 10 ký tự");
  if (classes < 3) hints.push("Trộn chữ + số + ký tự đặc biệt");

  const finalScore = Math.min(4, Math.max(0, score)) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Quá yếu", "Yếu", "Trung bình", "Khá", "Mạnh"];
  return { score: finalScore, label: labels[finalScore], hints };
}
