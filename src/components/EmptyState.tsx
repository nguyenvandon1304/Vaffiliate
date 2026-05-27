"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  /** Custom illustration (SVG / emoji wrapper). Nếu không có, default theo `icon`. */
  illustration?: ReactNode;
  /** Emoji fallback nếu không truyền illustration. */
  icon?: string;
  title: string;
  description?: string;
  /** Action chính — usually CTA button. */
  cta?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /** Action thứ 2 — secondary text link. */
  secondaryCta?: {
    label: string;
    onClick: () => void;
  };
  /** Tip card mini — màu vàng/cam, hiện dưới CTA. */
  tip?: string;
  /** Compact mode — dùng trong dropdown / sidebar nhỏ. */
  compact?: boolean;
  className?: string;
}

/**
 * IllustrationCart — SVG cart trống xoay nhẹ. Dùng cho empty orders.
 */
export function IllustrationCart() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 96 96" className="w-full h-full" aria-hidden>
        {/* Background circle với gradient cam pastel */}
        <defs>
          <radialGradient id="cart-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(254 215 170)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="rgb(254 215 170)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="48" r="46" fill="url(#cart-bg)" />
        {/* Cart icon */}
        <g
          className="origin-center"
          style={{ transformOrigin: "48px 48px", animation: "tier-float 3.5s ease-in-out infinite" }}
        >
          <path
            d="M 28 32 L 36 32 L 42 56 L 70 56 L 76 38 L 38 38"
            stroke="rgb(249 115 22)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="44" cy="68" r="4" fill="rgb(249 115 22)" />
          <circle cx="66" cy="68" r="4" fill="rgb(249 115 22)" />
          {/* Sparkle decorations */}
          <text x="20" y="20" fontSize="10" fill="rgb(251 191 36)">✦</text>
          <text x="72" y="22" fontSize="8" fill="rgb(251 191 36)">★</text>
          <text x="78" y="80" fontSize="8" fill="rgb(251 191 36)">✦</text>
        </g>
      </svg>
    </div>
  );
}

/** IllustrationLink — link 2 vòng bị disconnect. */
export function IllustrationLink() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 96 96" className="w-full h-full" aria-hidden>
        <defs>
          <radialGradient id="link-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(191 219 254)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="rgb(191 219 254)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="48" r="46" fill="url(#link-bg)" />
        <g style={{ transformOrigin: "48px 48px", animation: "tier-float 3.5s ease-in-out infinite" }}>
          <path
            d="M 32 56 a 10 10 0 0 1 0 -16 l 6 -6"
            stroke="rgb(59 130 246)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 64 40 a 10 10 0 0 1 0 16 l -6 6"
            stroke="rgb(59 130 246)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 40 48 L 56 48"
            stroke="rgb(59 130 246)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="2 4"
          />
          <text x="22" y="26" fontSize="10" fill="rgb(251 191 36)">✦</text>
          <text x="74" y="80" fontSize="8" fill="rgb(251 191 36)">✦</text>
        </g>
      </svg>
    </div>
  );
}

/** IllustrationWallet — ví trống. */
export function IllustrationWallet() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 96 96" className="w-full h-full" aria-hidden>
        <defs>
          <radialGradient id="wallet-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(187 247 208)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="rgb(187 247 208)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="48" r="46" fill="url(#wallet-bg)" />
        <g style={{ transformOrigin: "48px 48px", animation: "tier-float 3.5s ease-in-out infinite" }}>
          <rect x="24" y="34" width="48" height="32" rx="5" stroke="rgb(34 197 94)" strokeWidth="3" fill="none" />
          <circle cx="60" cy="50" r="3.5" fill="rgb(34 197 94)" />
          <text x="22" y="22" fontSize="10" fill="rgb(251 191 36)">✦</text>
          <text x="76" y="78" fontSize="8" fill="rgb(251 191 36)">★</text>
        </g>
      </svg>
    </div>
  );
}

/** IllustrationHeart — wishlist. */
export function IllustrationHeart() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 96 96" className="w-full h-full" aria-hidden>
        <defs>
          <radialGradient id="heart-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(252 165 165)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(252 165 165)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="48" r="46" fill="url(#heart-bg)" />
        <g style={{ transformOrigin: "48px 48px", animation: "tier-float 3.5s ease-in-out infinite" }}>
          <path
            d="M 48 70 C 30 56 22 44 22 36 C 22 28 28 22 36 22 C 42 22 46 26 48 30 C 50 26 54 22 60 22 C 68 22 74 28 74 36 C 74 44 66 56 48 70 Z"
            stroke="rgb(244 63 94)"
            strokeWidth="3"
            fill="rgb(254 226 226)"
            strokeLinejoin="round"
          />
          <text x="20" y="22" fontSize="10" fill="rgb(251 191 36)">✦</text>
          <text x="76" y="80" fontSize="8" fill="rgb(251 191 36)">✦</text>
        </g>
      </svg>
    </div>
  );
}

/** IllustrationBox — đơn hàng trống. */
export function IllustrationBox() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 96 96" className="w-full h-full" aria-hidden>
        <defs>
          <radialGradient id="box-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(254 215 170)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(254 215 170)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="48" r="46" fill="url(#box-bg)" />
        <g style={{ transformOrigin: "48px 48px", animation: "tier-float 3.5s ease-in-out infinite" }}>
          <path d="M 24 34 L 48 26 L 72 34 L 72 64 L 48 72 L 24 64 Z" stroke="rgb(249 115 22)" strokeWidth="3" fill="rgb(255 247 237)" strokeLinejoin="round" />
          <path d="M 24 34 L 48 42 L 72 34" stroke="rgb(249 115 22)" strokeWidth="3" fill="none" strokeLinejoin="round" />
          <path d="M 48 42 L 48 72" stroke="rgb(249 115 22)" strokeWidth="3" fill="none" />
          <text x="22" y="22" fontSize="10" fill="rgb(251 191 36)">✦</text>
          <text x="76" y="80" fontSize="8" fill="rgb(251 191 36)">★</text>
        </g>
      </svg>
    </div>
  );
}

/** IllustrationBell — empty notifications. */
export function IllustrationBell() {
  return (
    <div className="relative w-20 h-20 mx-auto">
      <svg viewBox="0 0 96 96" className="w-full h-full" aria-hidden>
        <defs>
          <radialGradient id="bell-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(254 240 138)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(254 240 138)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="48" r="46" fill="url(#bell-bg)" />
        <g style={{ transformOrigin: "48px 48px", animation: "tier-float 3.5s ease-in-out infinite" }}>
          <path
            d="M 32 60 L 64 60 C 64 60 60 50 60 42 C 60 34 54 28 48 28 C 42 28 36 34 36 42 C 36 50 32 60 32 60 Z"
            stroke="rgb(245 158 11)"
            strokeWidth="3"
            fill="rgb(254 252 232)"
            strokeLinejoin="round"
          />
          <path d="M 44 64 a 4 4 0 0 0 8 0" stroke="rgb(245 158 11)" strokeWidth="3" fill="none" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Empty state component dùng chung cho các list trống.
 * Hỗ trợ illustration custom + CTA + tip.
 */
export function EmptyState({
  illustration,
  icon = "📭",
  title,
  description,
  cta,
  secondaryCta,
  tip,
  compact = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-4 ${
        compact ? "py-6" : "py-10 sm:py-12"
      } ${className}`}
    >
      {illustration ?? (
        <div className="text-5xl mb-3 select-none animate-tier-float">{icon}</div>
      )}
      <h3 className={`font-bold text-gray-800 dark:text-zinc-100 mb-1 ${compact ? "text-sm" : "text-base sm:text-lg"}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-gray-500 dark:text-zinc-400 max-w-sm leading-relaxed ${compact ? "text-xs" : "text-sm"}`}>
          {description}
        </p>
      )}

      {(cta || secondaryCta) && (
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
          {cta && (
            <button
              type="button"
              onClick={cta.onClick}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-md shadow-orange-500/30 transition-all hover:scale-105"
            >
              {cta.icon}
              {cta.label}
            </button>
          )}
          {secondaryCta && (
            <button
              type="button"
              onClick={secondaryCta.onClick}
              className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-orange-500 dark:text-zinc-400 dark:hover:text-orange-400 transition-colors"
            >
              {secondaryCta.label}
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}
        </div>
      )}

      {tip && (
        <div className="mt-4 max-w-sm flex items-start gap-2 rounded-xl border border-amber-200/70 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/[0.08] px-3 py-2 backdrop-blur-sm">
          <span className="text-base leading-none mt-0.5 shrink-0">💡</span>
          <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed text-left">
            {tip}
          </p>
        </div>
      )}
    </div>
  );
}
