"use client";

import Button from "@/components/ui/button/Button";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

type Status = "idle" | "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Dogrulama baglantisi eksik veya gecersiz.");
      return;
    }

    let cancelled = false;
    async function run() {
      setStatus("verifying");
      setMessage(null);
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({} as any));
        if (!res.ok) {
          const code = data?.error;
          const friendly =
            code === "token_expired"
              ? "Dogrulama baglantisinin suresi dolmus. Lutfen yeni bir dogrulama e-postasi iste."
              : "Dogrulama basarisiz. Baglanti gecersiz olabilir.";
          throw new Error(friendly);
        }

        if (cancelled) return;
        setStatus("success");
        setMessage("E-postan basariyla dogrulandi. Artik giris yapabilirsin.");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Dogrulama basarisiz.");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col justify-center flex-1 w-full">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            E-posta Dogrulama
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Hesabini aktif etmek icin e-postani dogruluyoruz.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg border px-4 py-2 text-sm ${
              status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : status === "error"
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-gray-200 bg-gray-50 text-gray-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Button
            className="w-full"
            size="sm"
            type="button"
            onClick={() => router.push("/signin")}
          >
            Giris Yap
          </Button>
          <Button
            className="w-full"
            size="sm"
            variant="outline"
            type="button"
            onClick={() => router.push("/signup")}
          >
            Kayit sayfasina don
          </Button>
        </div>
      </div>
    </div>
  );
}
