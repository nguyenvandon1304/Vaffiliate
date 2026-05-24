"use client";

import { useEffect, useState } from "react";

interface Entry {
  id: number;
  ip: string | null;
  country: string | null;
  user_agent: string | null;
  is_new_device: boolean;
  is_new_country: boolean;
  created_at: string;
}

const COUNTRY_NAMES: Record<string, string> = {
  VN: "Việt Nam",
  US: "Mỹ",
  CN: "Trung Quốc",
  JP: "Nhật Bản",
  KR: "Hàn Quốc",
  TH: "Thái Lan",
  SG: "Singapore",
  MY: "Malaysia",
  ID: "Indonesia",
  PH: "Philippines",
  IN: "Ấn Độ",
  GB: "Anh",
  DE: "Đức",
  FR: "Pháp",
  RU: "Nga",
  AU: "Úc",
  CA: "Canada",
  HK: "Hong Kong",
  TW: "Đài Loan",
  KH: "Campuchia",
  LA: "Lào",
};

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  const codePoints = code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function countryName(code: string | null): string {
  if (!code) return "Không xác định";
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString("vi-VN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function shortUA(ua: string | null): string {
  if (!ua) return "—";
  const browser = ua.match(/(Chrome|Firefox|Safari|Edg|Opera)\/([\d.]+)/);
  const os = ua.match(/(Windows|Macintosh|Linux|Android|iPhone|iPad)/);
  return `${os?.[0] ?? "?"} · ${browser?.[1] ?? "?"}`;
}

export function LoginHistorySection() {
  const [history, setHistory] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/login-history")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setHistory(d.history);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = showAll ? history : history.slice(0, 10);

  // Tính danh sách country đã từng login (cho map view)
  const uniqueCountries = Array.from(new Set(history.map((h) => h.country).filter(Boolean))) as string[];

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-2">
            <span>🌍</span> Lịch sử đăng nhập
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
            Theo dõi các IP và quốc gia đã đăng nhập tài khoản.
          </p>
        </div>
        {uniqueCountries.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-zinc-500">Quốc gia đã login</p>
            <div className="flex gap-1 mt-1 flex-wrap justify-end">
              {uniqueCountries.map((c) => (
                <span
                  key={c}
                  className="text-base"
                  title={countryName(c)}
                >
                  {countryFlag(c)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400 dark:text-zinc-500">Đang tải...</p>}

      {!loading && history.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-zinc-500">Chưa có lịch sử đăng nhập.</p>
      )}

      {!loading && history.length > 0 && (
        <>
          <ul className="space-y-2">
            {visible.map((h) => (
              <li
                key={h.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  h.is_new_country
                    ? "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5"
                    : h.is_new_device
                      ? "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/5"
                      : "border-gray-100 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-800/50"
                }`}
              >
                <div className="text-2xl shrink-0" title={countryName(h.country)}>
                  {countryFlag(h.country)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">
                      {countryName(h.country)}
                    </p>
                    {h.is_new_country && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white px-1.5 py-0.5 rounded">
                        🌍 Quốc gia mới
                      </span>
                    )}
                    {h.is_new_device && !h.is_new_country && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500 text-white px-1.5 py-0.5 rounded">
                        📱 Thiết bị mới
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    IP: <span className="font-mono">{h.ip ?? "—"}</span> · {shortUA(h.user_agent)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                    {formatDate(h.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {history.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
            >
              {showAll ? "Ẩn bớt ↑" : `Xem thêm ${history.length - 10} lần đăng nhập →`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
