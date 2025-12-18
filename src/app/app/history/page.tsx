"use client";

import { useEffect, useState } from "react";

type Session = any;
type PaymentMethod = { ID: number; Yontem: string };
type PaymentProfile = { id: number; tip: string; kartNoMask: string };

export default function HistoryPage() {
  const [data, setData] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [savedPayments, setSavedPayments] = useState<PaymentProfile[]>([]);
  const [paying, setPaying] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Record<number, string>>({});

  async function load(nextPage = page) {
    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("pageSize", String(pageSize));
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`/api/me/charging-sessions?${params.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "load_failed");
      setData(j.data ?? []);
      setTotal(j.total ?? 0);
      setPage(nextPage);
    } catch (e: any) {
      setError(e?.message ?? "load_failed");
    }
  }

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pageSize]);

  useEffect(() => {
    fetch("/api/payment-methods")
      .then((r) => r.json())
      .then((j) => setPaymentMethods(j.data ?? []))
      .catch(() => {});
    fetch("/api/payment-profiles")
      .then((r) => r.json())
      .then((j) => setSavedPayments(j.data ?? []))
      .catch(() => {});
  }, []);

  function resolveMethodId(selection: string | undefined) {
    if (!selection) return null;
    if (selection.startsWith("saved-")) {
      const card = savedPayments.find((p) => `saved-${p.id}` === selection);
      if (!card) return null;
      const cardMethod =
        paymentMethods.find((m) => m.Yontem.toLowerCase().includes("kredi")) ||
        paymentMethods.find((m) => m.Yontem.toLowerCase().includes("kart")) ||
        paymentMethods[0];
      return cardMethod?.ID ?? null;
    }
    const parsed = Number(selection);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function pay(sessionId: number) {
    const methodId = resolveMethodId(selectedPayment[sessionId]);
    if (!methodId) {
      setError("Odeme yontemi secin");
      return;
    }
    setPaying(sessionId);
    try {
      const r = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sarjIslemId: sessionId, odemeYontemiId: methodId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "payment_failed");
      await load(page);
    } catch (e: any) {
      setError(e?.message ?? "payment_failed");
    } finally {
      setPaying(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-gray-900 dark:text-white">Sarj gecmisi</div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-600 dark:text-gray-300">Durum</label>
          <input
            className="rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            placeholder="(tamam, devam...)"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left opacity-70 dark:text-gray-300">
            <tr>
              <th className="py-2">Istasyon</th>
              <th>Tip</th>
              <th>Baslangic</th>
              <th>Bitis</th>
              <th>kWh</th>
              <th>Ucret</th>
              <th>Durum</th>
              <th>Odeme</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-800">
            {data.map((x) => (
              <tr key={x.ID} className="align-top">
                <td className="py-2">
                  {x.Soket?.SarjUnite?.Istasyon?.Ad}
                  <div className="text-xs opacity-60">{x.Soket?.SarjUnite?.Istasyon?.Konum}</div>
                </td>
                <td>{x.Soket?.SoketTip?.Tip}</td>
                <td>{x.BaslangicZamani ? new Date(x.BaslangicZamani).toLocaleString() : "-"}</td>
                <td>{x.BitisZamani ? new Date(x.BitisZamani).toLocaleString() : "-"}</td>
                <td>{x.HarcananEnerjiKWh ?? "-"}</td>
                <td>{x.Ucret ?? "-"}</td>
                <td>{x.SarjIslemDurum?.Durum}</td>
                <td>
                  {x.Odeme && x.Odeme.length ? (
                    <span className="text-xs text-green-600">Odendi</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <select
                        className="rounded-lg border px-2 py-1 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        value={selectedPayment[x.ID] ?? ""}
                        onChange={(e) => setSelectedPayment((prev) => ({ ...prev, [x.ID]: e.target.value }))}
                      >
                        <option value="">yontem</option>
                        {paymentMethods.map((m) => (
                          <option key={m.ID} value={m.ID}>
                            {m.Yontem}
                          </option>
                        ))}
                        {savedPayments.map((p) => (
                          <option key={p.id} value={`saved-${p.id}`}>
                            {p.tip} - {p.kartNoMask}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-lg border px-2 py-1 dark:border-gray-700" disabled={paying === x.ID} onClick={() => pay(x.ID)}>
                        {paying === x.ID ? "Odeniyor..." : "Ode"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td className="py-6 text-sm opacity-60" colSpan={8}>
                  kayit yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
        <span>
          Sayfa {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <div className="space-x-2">
          <button className="rounded-lg border px-3 py-1 dark:border-gray-700" disabled={page <= 1} onClick={() => load(page - 1)}>
            Onceki
          </button>
          <button
            className="rounded-lg border px-3 py-1 dark:border-gray-700"
            disabled={page * pageSize >= total}
            onClick={() => load(page + 1)}
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}
