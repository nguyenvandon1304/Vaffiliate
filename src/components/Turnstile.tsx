"use client";

import { useEffect, useId, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __turnstileLoadingPromise?: Promise<void>;
  }
}

interface TurnstileApi {
  render: (
    container: HTMLElement | string,
    params: TurnstileRenderParams,
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
}

interface TurnstileRenderParams {
  sitekey: string;
  action?: string;
  cData?: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: (errorCode?: string) => void;
  "timeout-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  language?: string;
  size?: "normal" | "flexible" | "compact";
  appearance?: "always" | "execute" | "interaction-only";
  retry?: "auto" | "never";
  "refresh-expired"?: "auto" | "manual" | "never";
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (window.__turnstileLoadingPromise) return window.__turnstileLoadingPromise;

  window.__turnstileLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile-load-failed")));
      return;
    }

    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile-load-failed"));
    document.head.appendChild(s);
  });

  return window.__turnstileLoadingPromise;
}

export interface TurnstileHandle {
  reset: () => void;
}

export interface TurnstileProps {
  siteKey: string;
  action?: string;
  theme?: "light" | "dark" | "auto";
  language?: string;
  size?: "normal" | "flexible" | "compact";
  className?: string;
  ref?: React.Ref<TurnstileHandle>;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (errorCode?: string) => void;
}

export function Turnstile({
  siteKey,
  action,
  theme = "auto",
  language = "vi",
  size = "flexible",
  className,
  ref,
  onVerify,
  onExpire,
  onError,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const id = useId();

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        const wid = widgetIdRef.current;
        if (wid && window.turnstile) {
          try {
            window.turnstile.reset(wid);
          } catch {
            // ignore
          }
        }
      },
    }),
    [],
  );

  // Giữ callback mới nhất để tránh re-render lại widget khi parent re-render.
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container || !siteKey) return;

    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        // Ngừa double-render khi React StrictMode mount lần 2.
        if (widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          action,
          theme,
          language,
          size,
          callback: (token) => onVerifyRef.current(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": (code) => onErrorRef.current?.(code),
        });
      })
      .catch(() => {
        onErrorRef.current?.("script-load-failed");
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, action, theme, language, size]);

  return <div ref={containerRef} id={`turnstile-${id}`} className={className} />;
}
