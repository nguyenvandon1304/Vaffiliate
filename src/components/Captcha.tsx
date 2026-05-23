"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;

function generateCode(length = CODE_LENGTH) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

export interface CaptchaHandle {
  reset: () => void;
}

export interface CaptchaProps {
  /**
   * Báo trạng thái đã xác minh (cho UI). Khi dùng Turnstile, token sẽ được
   * truyền qua `onToken` để form gửi lên server.
   */
  onVerify: (verified: boolean) => void;
  /** Token Turnstile (chỉ có khi dùng Turnstile). */
  onToken?: (token: string | null) => void;
  /** Action gửi kèm Turnstile (login / register / forgot…). */
  action?: string;
  /** Ref để cha gọi `reset()` sau mỗi lần submit (token chỉ dùng được một lần). */
  ref?: React.Ref<CaptchaHandle>;
  className?: string;
}

export function Captcha({ onVerify, onToken, action, ref, className }: CaptchaProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (siteKey) {
    return (
      <TurnstileCaptcha
        siteKey={siteKey}
        action={action}
        onVerify={onVerify}
        onToken={onToken}
        ref={ref}
        className={className}
      />
    );
  }
  return <FallbackCaptcha onVerify={onVerify} ref={ref} className={className} />;
}

/* ─────────────── Turnstile (production) ─────────────── */

function TurnstileCaptcha({
  siteKey,
  action,
  onVerify,
  onToken,
  ref,
  className,
}: {
  siteKey: string;
  action?: string;
  onVerify: (verified: boolean) => void;
  onToken?: (token: string | null) => void;
  ref?: React.Ref<CaptchaHandle>;
  className?: string;
}) {
  const turnstileRef = useRef<TurnstileHandle>(null);
  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        turnstileRef.current?.reset();
        onToken?.(null);
        onVerify(false);
      },
    }),
    [onVerify, onToken],
  );

  // Theo dõi class `dark` trên <html> để chọn theme widget.
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const update = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("w-full", className)}>
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        action={action}
        theme={theme}
        size="flexible"
        onVerify={(token) => {
          onToken?.(token);
          onVerify(true);
        }}
        onExpire={() => {
          onToken?.(null);
          onVerify(false);
        }}
        onError={() => {
          onToken?.(null);
          onVerify(false);
        }}
      />
    </div>
  );
}

/* ─────────────── Fallback captcha tự sinh ─────────────── */

function FallbackCaptcha({
  onVerify,
  ref,
  className,
}: {
  onVerify: (verified: boolean) => void;
  ref?: React.Ref<CaptchaHandle>;
  className?: string;
}) {
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");

  useEffect(() => {
    setCode(generateCode());
  }, []);

  function refresh() {
    setCode(generateCode());
    setInput("");
    onVerify(false);
  }

  const reset = useCallback(() => {
    setCode(generateCode());
    setInput("");
    onVerify(false);
  }, [onVerify]);

  useImperativeHandle(ref, () => ({ reset }), [reset]);

  const verified =
    code.length > 0 &&
    input.length === code.length &&
    input.toUpperCase() === code;

  function handleInput(value: string) {
    const next = value.replace(/\s/g, "").toUpperCase().slice(0, code.length || CODE_LENGTH);
    setInput(next);
    const ok =
      code.length > 0 && next.length === code.length && next === code;
    onVerify(ok);
  }

  const svg = useMemo(() => {
    if (!code) return null;
    const width = 130;
    const height = 44;
    const chars = code.split("");
    const stepX = width / (chars.length + 1);

    const lines = Array.from({ length: 4 }, (_, i) => {
      const y1 = (height * (i + 1)) / 5 + (Math.random() * 6 - 3);
      const y2 = y1 + (Math.random() * 10 - 5);
      const hue = Math.floor(Math.random() * 360);
      return (
        <line
          key={`l${i}`}
          x1={Math.random() * (width / 4)}
          y1={y1}
          x2={width - Math.random() * (width / 4)}
          y2={y2}
          stroke={`hsl(${hue}, 60%, 50%)`}
          strokeWidth={1}
          opacity={0.45}
        />
      );
    });

    const dots = Array.from({ length: 28 }, (_, i) => (
      <circle
        key={`d${i}`}
        cx={Math.random() * width}
        cy={Math.random() * height}
        r={Math.random() * 0.9 + 0.4}
        fill={`hsl(${Math.floor(Math.random() * 360)}, 55%, 55%)`}
        opacity={0.5}
      />
    ));

    const glyphs = chars.map((ch, i) => {
      const x = stepX * (i + 1);
      const y = height / 2 + 8;
      const rotate = (Math.random() - 0.5) * 36;
      const hue = Math.floor(Math.random() * 360);
      return (
        <text
          key={`c${i}`}
          x={x}
          y={y}
          textAnchor="middle"
          fontFamily="ui-monospace, 'Courier New', monospace"
          fontSize={22}
          fontWeight={800}
          fill={`hsl(${hue}, 65%, 35%)`}
          transform={`rotate(${rotate} ${x} ${y - 6})`}
        >
          {ch}
        </text>
      );
    });

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="block h-11 w-[130px] select-none"
        aria-hidden="true"
      >
        {lines}
        {dots}
        {glyphs}
      </svg>
    );
  }, [code]);

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg px-2.5 py-2",
        className,
      )}
    >
      <div className="shrink-0">
        {verified ? (
          <div
            className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
            aria-label="Đã xác minh"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ) : (
          <div
            className="w-6 h-6 rounded border-2 border-gray-300 dark:border-zinc-600"
            aria-label="Chưa xác minh"
          />
        )}
      </div>

      <div className="shrink-0 rounded-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 px-1.5 py-0.5">
        {svg ?? <div className="h-11 w-[130px]" />}
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="Nhập mã"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        maxLength={code.length || CODE_LENGTH}
        aria-label="Nhập mã captcha hiển thị bên cạnh"
        className="flex-1 min-w-0 bg-white dark:bg-zinc-950/40 border border-gray-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-gray-900 dark:text-zinc-100 tracking-widest font-mono uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20 outline-none transition-all"
      />

      <button
        type="button"
        onClick={refresh}
        className="shrink-0 text-gray-400 dark:text-zinc-500 hover:text-orange-500 transition-colors p-1"
        aria-label="Làm mới mã captcha"
        title="Làm mới mã"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      </button>
    </div>
  );
}
