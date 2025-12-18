"use client";

import { useEffect, useState } from "react";

type Profile = { ad: string; soyad: string; email: string; telefon: string };

export default function AdminProfilePage() {
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/me/profile", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "load_failed");
      setData(j.data);
    } catch (e: any) {
      setError(e?.message ?? "load_failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "save_failed");
      setData(j.data);
      setError("Kaydedildi");
    } catch (e: any) {
      const msg = e?.message === "unique_constraint_violation" ? "Email/telefon zaten kayitli" : e?.message;
      setError(msg ?? "save_failed");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPwMsg(null);
    if (!pwCurrent || !pwNew || pwNew !== pwConfirm) {
      setPwMsg("Yeni sifreler uyusmuyor veya eksik");
      return;
    }
    setPwSaving(true);
    try {
      const r = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "change_failed");
      setPwMsg("Sifre guncellendi");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch (e: any) {
      setPwMsg(e?.message === "invalid_current_password" ? "Mevcut sifre hatali" : e?.message ?? "change_failed");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-4 space-y-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">Profil Bilgileri</div>
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-300">Yukleniyor...</div>
        ) : data ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm space-y-1">
                <span className="text-gray-500 dark:text-gray-300">Ad</span>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={data.ad}
                  onChange={(e) => setData({ ...data, ad: e.target.value })}
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-gray-500 dark:text-gray-300">Soyad</span>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={data.soyad}
                  onChange={(e) => setData({ ...data, soyad: e.target.value })}
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-gray-500 dark:text-gray-300">Email</span>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-gray-500 dark:text-gray-300">Telefon</span>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  value={data.telefon}
                  onChange={(e) => setData({ ...data, telefon: e.target.value })}
                />
              </label>
            </div>
            <button className="rounded-xl border px-4 py-2 text-sm dark:border-gray-700 dark:text-gray-100" onClick={save} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
        ) : (
          <div className="text-sm text-red-600">Profil yuklenemedi.</div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">Sifre degistir</div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Mevcut sifre</span>
            <input
              type="password"
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Yeni sifre</span>
            <input
              type="password"
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Yeni sifre (tekrar)</span>
            <input
              type="password"
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
            />
          </label>
        </div>
        <button className="rounded-xl border px-4 py-2 text-sm dark:border-gray-700 dark:text-gray-100" onClick={changePassword} disabled={pwSaving}>
          {pwSaving ? "Guncelleniyor..." : "Sifreyi guncelle"}
        </button>
        {pwMsg && <div className="text-sm text-red-600">{pwMsg}</div>}
      </div>
    </div>
  );
}
