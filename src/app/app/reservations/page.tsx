"use client";

import { useEffect, useMemo, useState } from "react";

type Reservation = any;

function toISO(local: string) {
  if (!local) return null;
  const d = new Date(local);
  const timestamp = d.getTime();
  if (Number.isNaN(timestamp)) return null;
  return d.toISOString();
}

const MAX_WINDOW_MS = 6 * 60 * 60 * 1000;
const ALLOWED_DURATIONS = [15, 30, 60];

export default function ReservationsPage() {
  const [data, setData] = useState<Reservation[]>([]);
  const [sarjUniteId, setSarjUniteId] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState("30");
  const [msg, setMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [cancelling, setCancelling] = useState<number | null>(null);

  const minStartValue = useMemo(() => new Date().toISOString().slice(0, 16), []);
  const maxStartValue = useMemo(() => {
    const durationMinutes = Number(duration);
    const buffer = ALLOWED_DURATIONS.includes(durationMinutes) ? durationMinutes * 60000 : 0;
    const max = new Date(Date.now() + MAX_WINDOW_MS - buffer);
    return max.toISOString().slice(0, 16);
  }, [duration]);

  const endPreview = useMemo(() => {
    const startIso = toISO(start);
    const durationMinutes = Number(duration);
    if (!startIso || !ALLOWED_DURATIONS.includes(durationMinutes)) return null;
    const startDate = new Date(startIso);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    if (endDate.getTime() - Date.now() > MAX_WINDOW_MS + 500) return null;
    return endDate;
  }, [duration, start]);

  const setStartWithOffset = (offsetMinutes: number) => {
    const now = new Date();
    const candidate = new Date(now.getTime() + offsetMinutes * 60000);
    const rounded = new Date(Math.ceil(candidate.getTime() / (15 * 60000)) * 15 * 60000);
    const durationMinutes = Number(duration);
    const latestAllowed = new Date(now.getTime() + MAX_WINDOW_MS - durationMinutes * 60000);
    const safeDate = rounded > latestAllowed ? latestAllowed : rounded;
    setStart(safeDate.toISOString().slice(0, 16));
  };

  async function load(nextPage = page) {
    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("pageSize", String(pageSize));
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`/api/me/reservations?${params.toString()}`);
      const j = await r.json();
      setData(j.data ?? []);
      setTotal(j.total ?? 0);
      setPage(nextPage);
    } catch {
      setMsg("Veri yuklenemedi");
    }
  }

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pageSize]);

  useEffect(() => {
    setStartWithOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const startIso = toISO(start);
    if (!startIso) return;
    const durationMinutes = Number(duration);
    if (!ALLOWED_DURATIONS.includes(durationMinutes)) return;
    const latestAllowed = new Date(Date.now() + MAX_WINDOW_MS - durationMinutes * 60000);
    const currentStart = new Date(startIso);
    if (currentStart > latestAllowed) {
      setStart(latestAllowed.toISOString().slice(0, 16));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  async function create() {
    setMsg(null);
    const parsedId = Number(sarjUniteId);
    const startIso = toISO(start);
    const durationMinutes = Number(duration);
    if (!Number.isInteger(parsedId) || parsedId <= 0 || !startIso || !ALLOWED_DURATIONS.includes(durationMinutes)) {
      setMsg("Lutfen unite, baslangic ve sureyi secin");
      return;
    }
    const endDate = new Date(new Date(startIso).getTime() + durationMinutes * 60000);
    if (endDate.getTime() - Date.now() > MAX_WINDOW_MS) {
      setMsg("Sadece onumuzdeki 6 saat icin randevu alinabilir");
      return;
    }
    const endIso = endDate.toISOString();
    try {
      const r = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sarjUniteId: parsedId,
          start: startIso,
          end: endIso,
        }),
      });
      if (r.ok) {
        setMsg("Rezervasyon olusturuldu");
        setDuration("30");
        setSarjUniteId("");
        await load();
        return;
      }
      const j = await r.json().catch(() => ({}));
      setMsg(j.error ?? "Olusturma basarisiz");
    } catch {
      setMsg("Olusturma basarisiz");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="font-medium text-gray-900 dark:text-white">Rezervasyon olustur</div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input
            className="rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            placeholder="sarjUniteId"
            value={sarjUniteId}
            onChange={(e) => setSarjUniteId(e.target.value)}
          />
          <input
            className="rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            min={minStartValue}
            max={maxStartValue}
          />
          <select
            className="rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            <option value="15">15 dk</option>
            <option value="30">30 dk</option>
            <option value="60">60 dk</option>
          </select>
          <button className="rounded-xl border px-4 py-2 dark:border-gray-700" onClick={create}>
            Olustur
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
          <span>Hizli secim:</span>
          {[0, 30, 60, 120, 180, 240, 300].map((off) => (
            <button
              key={off}
              className="rounded-lg border px-2 py-1 dark:border-gray-700"
              type="button"
              onClick={() => setStartWithOffset(off)}
            >
              {off === 0 ? "Simdi" : `+${off} dk`}
            </button>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Yalnizca onumuzdeki 6 saat icin rezervasyon yapabilirsiniz. Secili bitis:{" "}
          {endPreview ? endPreview.toLocaleString() : "-"}
        </div>
        {msg && <div className="mt-2 text-sm text-red-600">{msg}</div>}
      </div>

      <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-medium text-gray-900 dark:text-white">Rezervasyonlarim</div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-600 dark:text-gray-300">Durum</label>
            <input
              className="rounded-xl border px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              placeholder="(onay, bekle...)"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left opacity-70 dark:text-gray-300">
              <tr>
                <th className="py-2">Istasyon</th>
                <th>Unite</th>
                <th>Baslangic</th>
                <th>Bitis</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {data.map((x) => (
                <tr key={x.ID} className="align-top">
                  <td className="py-2">{x.SarjUnite?.Istasyon?.Ad}</td>
                  <td>#{x.SarjUnite?.UniteNo}</td>
                  <td>{x.RezervasyonZamani ? new Date(x.RezervasyonZamani).toLocaleString() : "-"}</td>
                  <td>{x.BitisZamani ? new Date(x.BitisZamani).toLocaleString() : "-"}</td>
                  <td>{x.RezervasyonDurum?.Durum}</td>
                  <td>
                    {[1, 2].includes(x.RezervasyonDurumID) && (
                      <button
                        className="rounded-lg border px-3 py-1 text-xs dark:border-gray-700"
                        disabled={cancelling === x.ID}
                        onClick={async () => {
                          setCancelling(x.ID);
                          try {
                            const r = await fetch(`/api/reservations/${x.ID}`, { method: "DELETE" });
                            const j = await r.json().catch(() => ({}));
                            if (!r.ok) throw new Error(j.error ?? "cancel_failed");
                            await load(page);
                          } catch (e: any) {
                            setMsg(e?.message ?? "cancel_failed");
                          } finally {
                            setCancelling(null);
                          }
                        }}
                      >
                        {cancelling === x.ID ? "Iptal ediliyor..." : "Iptal et"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!data.length && (
                <tr>
                  <td className="py-6 text-sm opacity-60" colSpan={6}>
                    Kayit yok
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
    </div>
  );
}
