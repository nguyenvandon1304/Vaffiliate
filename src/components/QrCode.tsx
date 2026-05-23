"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

/**
 * QR code component render hoàn toàn client-side bằng `qrcode` lib.
 * Không phụ thuộc external API (api.qrserver.com…) — tránh CSP, CORP,
 * downtime, và privacy leak khi data nhạy cảm (TOTP secret) đi qua server bên thứ 3.
 *
 * Lib `qrcode` render ra DataURL (PNG inline base64) → set vào <img src>.
 * Kích thước cấu hình qua `size`, mặc định 180px.
 */
export function QrCode({
  data,
  size = 180,
  alt = "QR code",
  className = "",
}: {
  data: string;
  size?: number;
  alt?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string>("");
  const [error, setError] = useState<string>("");
  // Track latest call để tránh race khi data thay đổi nhanh.
  const reqId = useRef(0);

  useEffect(() => {
    if (!data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset khi data clear
      setSrc("");
      return;
    }
    const id = ++reqId.current;
    QRCode.toDataURL(data, {
      width: size,
      // Margin = 4 modules là chuẩn (quiet zone). Margin nhỏ làm nhiều scanner
      // không nhận diện được — đặc biệt iOS Camera.
      margin: 4,
      // Error correction L (7%) cho TOTP URL — URL ngắn (<200 ký tự), không
      // cần redundancy cao, level L tạo QR ít module hơn → dễ quét hơn nhiều
      // ở khoảng cách xa hoặc khi camera blur. Authenticator gốc cũng dùng L.
      errorCorrectionLevel: "L",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (id === reqId.current) { setSrc(url); setError(""); }
      })
      .catch((e: unknown) => {
        if (id === reqId.current) {
          setError(e instanceof Error ? e.message : "Lỗi tạo QR");
          setSrc("");
        }
      });
  }, [data, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 text-red-500 text-xs rounded ${className}`}
        style={{ width: size, height: size }}
      >
        {error}
      </div>
    );
  }
  if (!src) {
    return (
      <div
        className={`bg-gray-100 dark:bg-zinc-800 animate-pulse rounded ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- DataURL inline, không phù hợp next/image
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`block ${className}`}
    />
  );
}
