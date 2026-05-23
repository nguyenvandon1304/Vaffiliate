"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        if (!cancelled) {
          setStatus("error");
          setMessage("Thiếu token trong liên kết.");
        }
        return;
      }
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setStatus("success");
          setMessage(data.message || "Xác thực email thành công.");
        } else {
          setStatus("error");
          setMessage(data.error || "Không thể xác thực email.");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Lỗi kết nối. Vui lòng thử lại.");
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-gray-50 to-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <CaffiliateLogo />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
            <h1 className="text-white text-lg font-bold">Xác thực email</h1>
            <p className="text-white/80 text-xs mt-1">Hoàn tất đăng ký bằng cách xác thực địa chỉ email</p>
          </div>

          <div className="p-6 text-center">
            {status === "loading" && (
              <div className="py-8">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">Đang xác thực...</p>
              </div>
            )}

            {status === "success" && (
              <div className="py-6">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </div>
                <h2 className="text-sm font-semibold text-gray-800 mb-1">Thành công!</h2>
                <p className="text-xs text-gray-400 mb-4">{message}</p>
                <button
                  onClick={() => router.push("/")}
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  Đến trang đăng nhập
                </button>
              </div>
            )}

            {status === "error" && (
              <div className="py-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                </div>
                <h2 className="text-sm font-semibold text-gray-800 mb-1">Không thể xác thực</h2>
                <p className="text-xs text-gray-400 mb-4">{message}</p>
                <button
                  onClick={() => router.push("/")}
                  className="text-sm text-orange-500 hover:text-orange-600 font-medium"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
