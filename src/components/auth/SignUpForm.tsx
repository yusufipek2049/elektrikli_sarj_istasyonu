"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
      setError("Lutfen tum alanlari doldurun.");
      return;
    }
    if (password.length < 6) {
      setError("Sifre en az 6 karakter olmali.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Sifreler eslesmiyor.");
      return;
    }
    if (!isChecked) {
      setError("Devam etmek icin Kullanim Kosullari ve Gizlilik Politikasi'ni kabul etmelisin.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
        }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const code = data?.error;
        const friendly =
          code === "email_taken"
            ? "Bu e-posta zaten kullaniliyor."
            : code === "phone_taken"
            ? "Bu telefon numarasi zaten kullaniliyor."
            : code === "unique_constraint_violation"
            ? "Bu bilgilerle zaten kayit var."
            : "Kayit islemi basarisiz. Lutfen tekrar deneyin.";
        throw new Error(friendly);
      }

      setInfo(
        data?.resent
          ? "Bu e-posta icin zaten bir kayit var. Dogrulama e-postasini tekrar gonderdik."
          : "Dogrulama e-postasi gonderildi. Kayit islemi e-postani dogruladiginda tamamlanacak."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayit islemi basarisiz.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Once e-posta adresini gir.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const code = data?.error;
        const friendly =
          code === "already_verified"
            ? "Bu e-posta zaten dogrulanmis. Giris yapabilirsin."
            : code === "verification_expired"
            ? "Dogrulama suresi dolmus. Lutfen yeniden kayit ol."
            : code === "not_found"
            ? "Bu e-posta ile kayit bulunamadi."
            : "E-posta tekrar gonderilemedi.";
        throw new Error(friendly);
      }
      setInfo("Dogrulama e-postasi tekrar gonderildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "E-posta tekrar gonderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col justify-center flex-1 w-full">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Kayit Ol
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Yeni hesabinizi olusturmak icin bilgilerinizi doldurun.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 w-full">
            <button className="w-full inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z" fill="#4285F4" />
                <path d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z" fill="#34A853" />
                <path d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z" fill="#FBBC05" />
                <path d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z" fill="#EB4335" />
              </svg>
              Google ile kayit ol
            </button>
            <button className="w-full inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
              <svg width="21" className="fill-current" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.6705 1.875H18.4272L12.4047 8.75833L19.4897 18.125H13.9422L9.59717 12.4442L4.62554 18.125H1.86721L8.30887 10.7625L1.51221 1.875H7.20054L11.128 7.0675L15.6705 1.875ZM14.703 16.475H16.2305L6.37054 3.43833H4.73137L14.703 16.475Z" />
              </svg>
              X ile kayit ol
            </button>
          </div>

          <div className="relative py-3 sm:py-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2">
                veya
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <Label>
                  Ad<span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Adinizi girin"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-1">
                <Label>
                  Soyad<span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Soyadinizi girin"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>
                E-posta<span className="text-error-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="E-posta adresiniz"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Label>
                Telefon<span className="text-error-500">*</span>
              </Label>
              <Input
                type="tel"
                placeholder="Telefon numaraniz"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <Label>
                Sifre<span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Sifrenizi girin"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                >
                  {showPassword ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                  )}
                </span>
              </div>
            </div>

            <div>
              <Label>
                Sifreyi Dogrula<span className="text-error-500">*</span>
              </Label>
              <Input
                type="password"
                placeholder="Sifrenizi tekrar girin"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox className="w-5 h-5" checked={isChecked} onChange={setIsChecked} />
              <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                Hesap olusturarak{" "}
                <span className="text-gray-800 dark:text-white/90">Kullanim Kosullari</span>{" "}
                ve{" "}
                <span className="text-gray-800 dark:text-white">Gizlilik Politikasi</span>ni
                kabul ederim.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                {info}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button className="w-full" size="sm" type="submit" disabled={loading}>
                {loading ? "Kaydediliyor..." : "Kayit Ol"}
              </Button>
              <Button
                className="w-full"
                size="sm"
                variant="outline"
                type="button"
                onClick={handleResend}
                disabled={loading}
              >
                Dogrulama e-postasini tekrar gonder
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-5">
          <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
            Zaten hesabin var mi?
            <Link href="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
              {" "}
              Giris Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
