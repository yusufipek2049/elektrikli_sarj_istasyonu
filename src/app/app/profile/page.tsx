"use client";

import { useEffect, useState } from "react";

type Profile = { ad: string; soyad: string; email: string; telefon: string };
type PaymentProfile = {
  id: number;
  tip: string;
  kartSahibi: string | null;
  kartNoMask: string;
  sonKullanma: string | null;
  olusturmaTarihi: string | null;
};
type Vehicle = { id: number; marka: string; model: string; plaka: string; kapasite: number | null };

const emptyVehicle: Vehicle = { id: 0, marka: "", model: "", plaka: "", kapasite: null };

export default function ProfilePage() {
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const [paymentList, setPaymentList] = useState<PaymentProfile[]>([]);
  const [cardForm, setCardForm] = useState({
    tip: "kredi",
    kartSahibi: "",
    kartNo: "",
    ay: "",
    yil: "",
  });
  const [cardMsg, setCardMsg] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle>(emptyVehicle);
  const [vehicleMsg, setVehicleMsg] = useState<string | null>(null);

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

  async function loadPayments() {
    try {
      const r = await fetch("/api/payment-profiles", { cache: "no-store" });
      const j = await r.json();
      if (r.ok) {
        setPaymentList(j.data ?? []);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void load();
    void loadPayments();
    void loadVehicle();
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

  async function addPayment() {
    setCardMsg(null);
    if (!cardForm.kartNo || cardForm.kartNo.replace(/\D/g, "").length < 12) {
      setCardMsg("Gecerli bir kart numarasi girin");
      return;
    }
    if (!cardForm.ay || !cardForm.yil) {
      setCardMsg("Son kullanma tarihi girin");
      return;
    }
    try {
      const r = await fetch("/api/payment-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tip: cardForm.tip,
          kartSahibi: cardForm.kartSahibi,
          kartNumarasi: cardForm.kartNo,
          sonKullanmaAy: cardForm.ay,
          sonKullanmaYil: cardForm.yil,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "payment_save_failed");
      setCardMsg("Odeme bilgisi kaydedildi");
      setCardForm({ tip: "kredi", kartSahibi: "", kartNo: "", ay: "", yil: "" });
      await loadPayments();
    } catch (e: any) {
      setCardMsg(e?.message ?? "payment_save_failed");
    }
  }

  async function loadVehicle() {
    try {
      const r = await fetch("/api/me/vehicle", { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j.data) {
        setVehicle({
          id: j.data.id ?? 0,
          marka: j.data.marka ?? "",
          model: j.data.model ?? "",
          plaka: j.data.plaka ?? "",
          kapasite: j.data.kapasite ?? null,
        });
      } else {
        setVehicle(emptyVehicle);
      }
    } catch {
      setVehicle(emptyVehicle);
    }
  }

  async function saveVehicle() {
    setVehicleMsg(null);
    const body = {
      marka: vehicle.marka ?? "",
      model: vehicle.model ?? "",
      plaka: vehicle.plaka ?? "",
      kapasite: vehicle.kapasite ?? null,
    };
    try {
      const r = await fetch("/api/me/vehicle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "vehicle_save_failed");
      setVehicle(j.data);
      setVehicleMsg("Arac bilgileri kaydedildi");
    } catch (e: any) {
      setVehicleMsg(e?.message ?? "vehicle_save_failed");
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
                  className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  value={data.ad}
                  onChange={(e) => setData({ ...data, ad: e.target.value })}
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-gray-500 dark:text-gray-300">Soyad</span>
                <input
                  className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  value={data.soyad}
                  onChange={(e) => setData({ ...data, soyad: e.target.value })}
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-gray-500 dark:text-gray-300">Email</span>
                <input
                  className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-gray-500 dark:text-gray-300">Telefon</span>
                <input
                  className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  value={data.telefon}
                  onChange={(e) => setData({ ...data, telefon: e.target.value })}
                />
              </label>
            </div>
            <button className="rounded-xl border px-4 py-2 text-sm dark:border-gray-700" onClick={save} disabled={saving}>
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
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Yeni sifre</span>
            <input
              type="password"
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Yeni sifre (tekrar)</span>
            <input
              type="password"
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
            />
          </label>
        </div>
        <button className="rounded-xl border px-4 py-2 text-sm dark:border-gray-700" onClick={changePassword} disabled={pwSaving}>
          {pwSaving ? "Guncelleniyor..." : "Sifreyi guncelle"}
        </button>
        {pwMsg && <div className="text-sm text-red-600">{pwMsg}</div>}
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">Odeme bilgileri</div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Tip</span>
            <select
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              value={cardForm.tip}
              onChange={(e) => setCardForm({ ...cardForm, tip: e.target.value })}
            >
              <option value="kredi">Kredi karti</option>
              <option value="banka">Banka karti</option>
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Kart sahibi</span>
            <input
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              value={cardForm.kartSahibi}
              onChange={(e) => setCardForm({ ...cardForm, kartSahibi: e.target.value })}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Kart numarasi</span>
            <input
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              value={cardForm.kartNo}
              onChange={(e) => setCardForm({ ...cardForm, kartNo: e.target.value })}
              placeholder="**** **** **** 1234"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-gray-500 dark:text-gray-300">Ay</span>
              <input
                className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                value={cardForm.ay}
                onChange={(e) => setCardForm({ ...cardForm, ay: e.target.value })}
                placeholder="MM"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-gray-500 dark:text-gray-300">Yil</span>
              <input
                className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                value={cardForm.yil}
                onChange={(e) => setCardForm({ ...cardForm, yil: e.target.value })}
                placeholder="YY"
              />
            </label>
          </div>
        </div>
        <button className="rounded-xl border px-4 py-2 text-sm dark:border-gray-700" onClick={addPayment}>
          Kaydet
        </button>
        {cardMsg && <div className="text-sm text-red-600">{cardMsg}</div>}

        <div className="mt-3 space-y-2 text-sm">
          {paymentList.map((p) => (
            <div key={p.id} className="rounded-xl border p-3 dark:border-gray-700 dark:bg-gray-900/60">
              <div className="font-medium text-gray-900 dark:text-white">{p.tip}</div>
              <div className="text-gray-800 dark:text-gray-200">{p.kartNoMask}</div>
              {p.kartSahibi && <div className="text-gray-600 dark:text-gray-300">Sahip: {p.kartSahibi}</div>}
              {p.sonKullanma && <div className="text-gray-600 dark:text-gray-300">SKT: {p.sonKullanma}</div>}
            </div>
          ))}
          {!paymentList.length && <div className="text-gray-500 dark:text-gray-300">Kayitli odeme bilgisi yok</div>}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">Arac bilgileri</div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Marka</span>
            <input
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              value={vehicle?.marka ?? ""}
              onChange={(e) => setVehicle({ ...(vehicle ?? { id: 0, marka: "", model: "", plaka: "", kapasite: null }), marka: e.target.value })}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Model</span>
            <input
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              value={vehicle?.model ?? ""}
              onChange={(e) => setVehicle({ ...(vehicle ?? { id: 0, marka: "", model: "", plaka: "", kapasite: null }), model: e.target.value })}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Plaka</span>
            <input
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              value={vehicle?.plaka ?? ""}
              onChange={(e) => setVehicle({ ...(vehicle ?? { id: 0, marka: "", model: "", plaka: "", kapasite: null }), plaka: e.target.value })}
              placeholder="34 ABC 123"
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500 dark:text-gray-300">Batarya kapasitesi (kWh)</span>
            <input
              className="w-full rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              type="number"
              step="0.1"
              value={vehicle?.kapasite ?? ""}
              onChange={(e) =>
                setVehicle({
                  ...(vehicle ?? { id: 0, marka: "", model: "", plaka: "", kapasite: null }),
                  kapasite: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="50"
            />
          </label>
        </div>
        <button className="rounded-xl border px-4 py-2 text-sm dark:border-gray-700" onClick={saveVehicle}>
          Kaydet
        </button>
        {vehicleMsg && <div className="text-sm text-red-600">{vehicleMsg}</div>}
      </div>
    </div>
  );
}
