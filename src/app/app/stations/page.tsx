"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { MapProps } from "pigeon-maps";

type Station = {
  id: number;
  ad: string;
  konum: string;
  lat: number | null;
  lng: number | null;
  distanceKm?: number;
  durum: string;
  toplamSoket: number;
  bosSoket: number;
  bosByTip: { tip: string; adet: number }[];
  sarjUnite?: { id: number; uniteNo: number; soketler: { id: number; tip: string; durumId: number }[] }[];
  tarifeler?: { id: number; soketTip: string; birimFiyat: number }[];
};

const Map = dynamic(() => import("pigeon-maps").then((m) => m.Map), { ssr: false });
const Marker = dynamic(() => import("pigeon-maps").then((m) => m.Marker), { ssr: false });

const BOS_SOKET = 1;
const MAX_WINDOW_MS = 6 * 60 * 60 * 1000;
const ALLOWED_DURATIONS = [15, 30, 60];

function toISO(local: string) {
  if (!local) return null;
  const d = new Date(local);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  return d.toISOString();
}

export default function StationsPage() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sarjUniteId, setSarjUniteId] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState("30");
  const [msg, setMsg] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39, 35]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParams = useSearchParams();

  const minStartValue = useMemo(() => new Date().toISOString().slice(0, 16), []);
  const maxStartValue = useMemo(() => {
    const durationMinutes = Number(duration);
    const buffer = ALLOWED_DURATIONS.includes(durationMinutes) ? durationMinutes * 60000 : 0;
    const max = new Date(Date.now() + MAX_WINDOW_MS - buffer);
    return max.toISOString().slice(0, 16);
  }, [duration]);

  const selected = useMemo(() => data.find((s) => s.id === selectedId) ?? null, [data, selectedId]);

  const availableUnits = useMemo(() => {
    if (!selected?.sarjUnite) return [];
    return selected.sarjUnite.map((u) => {
      const availableSockets = u.soketler.filter((k) => k.durumId === BOS_SOKET).length;
      return { ...u, availableSockets };
    });
  }, [selected]);

  const endPreview = useMemo(() => {
    const startIso = toISO(start);
    const durationMinutes = Number(duration);
    if (!startIso || !ALLOWED_DURATIONS.includes(durationMinutes)) return null;
    const startDate = new Date(startIso);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    if (endDate.getTime() - Date.now() > MAX_WINDOW_MS + 500) return null;
    return endDate;
  }, [duration, start]);

  const estimatedCost = useMemo(() => {
    if (!selected || !selected.tarifeler || !selected.sarjUnite) return null;
    const durationMinutes = Number(duration);
    if (!ALLOWED_DURATIONS.includes(durationMinutes)) return null;
    const unit = selected.sarjUnite.find((u) => u.id === Number(sarjUniteId)) ?? selected.sarjUnite[0];
    if (!unit) return null;
    const socketTip = unit.soketler.find((k) => k.durumId === BOS_SOKET)?.tip ?? unit.soketler[0]?.tip;
    if (!socketTip) return null;
    const tariff = selected.tarifeler.find((t) => t.soketTip === socketTip);
    if (!tariff) return null;
    const cost = (durationMinutes / 60) * tariff.birimFiyat;
    return { cost, socketTip, birimFiyat: tariff.birimFiyat, durationMinutes };
  }, [selected, duration, sarjUniteId]);

  const setStartWithOffset = (offsetMinutes: number) => {
    const now = new Date();
    const candidate = new Date(now.getTime() + offsetMinutes * 60000);
    const rounded = new Date(Math.ceil(candidate.getTime() / (15 * 60000)) * 15 * 60000);
    const durationMinutes = Number(duration);
    const latestAllowed = new Date(now.getTime() + MAX_WINDOW_MS - durationMinutes * 60000);
    const safeDate = rounded > latestAllowed ? latestAllowed : rounded;
    setStart(safeDate.toISOString().slice(0, 16));
  };

  async function loadSearch(query?: string) {
    setError(null);
    setLoading(true);
    try {
      const term = (query ?? q).trim();
      const url = term ? `/api/stations?q=${encodeURIComponent(term)}` : "/api/stations";
      const r = await fetch(url);
      const j = await r.json();
      setData(j.data ?? []);
    } catch {
      setError("Veri alinamadi");
    } finally {
      setLoading(false);
    }
  }

  async function loadNear() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Konum destegi yok");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMapCenter([lat, lng]);
          const r = await fetch(`/api/stations/near?lat=${lat}&lng=${lng}&radiusKm=5&onlyAvailable=1`);
          const j = await r.json();
          setData(j.data ?? []);
        } catch {
          setError("Yakindaki istasyonlar getirilemedi");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Konum izni reddedildi");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => {
    const qp = searchParams.get("q") ?? "";
    setQ(qp);
  }, [searchParams]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void loadSearch(q);
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [q]);

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

  async function createReservation() {
    setMsg(null);
    const parsedId = Number(sarjUniteId);
    const startIso = toISO(start);
    const durationMinutes = Number(duration);
    if (!Number.isInteger(parsedId) || parsedId <= 0 || !startIso || !ALLOWED_DURATIONS.includes(durationMinutes)) {
      setMsg("Unite, baslangic ve sureyi secin");
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
        return;
      }
      const j = await r.json().catch(() => ({}));
      setMsg(j.error ?? "Hata olustu");
    } catch {
      setMsg("Hata olustu");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap gap-2">
          <input
            className="w-full flex-1 rounded-xl border px-3 py-2"
            placeholder="istasyon adi / konum ara"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void loadSearch(e.currentTarget.value);
              }
            }}
          />
          <button
            className="rounded-xl border px-4 py-2"
            onClick={() => {
              if (searchTimer.current) clearTimeout(searchTimer.current);
              void loadSearch(q);
            }}
          >
            {loading ? "Araniyor..." : "Ara"}
          </button>
          <button
            className="rounded-xl border px-4 py-2"
            onClick={() => {
              setQ("");
              if (searchTimer.current) clearTimeout(searchTimer.current);
              void loadSearch("");
            }}
          >
            Temizle
          </button>
          <button className="rounded-xl border px-4 py-2" onClick={loadNear}>
            {loading ? "..." : "Yakinimda"}
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Arama otomatik tetiklenir. Enter ile de calistirabilirsiniz.
        </div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm opacity-70">Sonuclar</div>
          <div className="mt-3 divide-y">
            {data.map((s) => (
              <button
                key={s.id}
                className={`w-full py-3 text-left ${selectedId === s.id ? "bg-gray-50 dark:bg-white/5" : ""}`}
                onClick={() => {
                  setSelectedId(s.id);
                  if (s.lat && s.lng) setMapCenter([s.lat, s.lng]);
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{s.ad}</div>
                    <div className="text-sm opacity-70">{s.konum}</div>
                  </div>
                  {typeof s.distanceKm === "number" && (
                    <div className="text-sm opacity-70">{s.distanceKm.toFixed(2)} km</div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full border px-2 py-1 dark:border-gray-700">Durum: {s.durum}</span>
                  <span className="rounded-full border px-2 py-1 dark:border-gray-700">
                    Bos: {s.bosSoket}/{s.toplamSoket}
                  </span>
                  {s.bosByTip.map((t) => (
                    <span key={t.tip} className="rounded-full border px-2 py-1 dark:border-gray-700">
                      {t.tip}: {t.adet}
                    </span>
                  ))}
                </div>
              </button>
            ))}
            {!data.length && <div className="py-6 text-sm opacity-60">Kayit yok</div>}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="h-[360px] overflow-hidden rounded-xl border dark:border-gray-700">
            <Map center={mapCenter} defaultZoom={13 as MapProps["defaultZoom"]} height={360}>
              {data
                .filter((s) => typeof s.lat === "number" && typeof s.lng === "number")
                .map((s) => (
                  <Marker
                    key={s.id}
                    width={40}
                    anchor={[s.lat as number, s.lng as number]}
                    onClick={() => {
                      setSelectedId(s.id);
                    }}
                  />
                ))}
            </Map>
          </div>

          {selected ? (
            <div className="space-y-3">
              <div>
                <div className="text-lg font-semibold">{selected.ad}</div>
                <div className="text-sm text-gray-600">{selected.konum}</div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border px-2 py-1 dark:border-gray-700">Durum: {selected.durum}</span>
                <span className="rounded-full border px-2 py-1 dark:border-gray-700">
                  Bos: {selected.bosSoket}/{selected.toplamSoket}
                </span>
              </div>

              {selected.tarifeler && selected.tarifeler.length > 0 && (
                <div className="rounded-xl border p-3 text-sm dark:border-gray-700 dark:bg-gray-900/60">
                  <div className="mb-2 font-medium">Tarifeler (Birim fiyat)</div>
                  <div className="flex flex-wrap gap-2">
                    {selected.tarifeler.map((t) => (
                      <span key={t.id} className="rounded-full border px-3 py-1 dark:border-gray-700">
                        {t.soketTip}: {t.birimFiyat.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 rounded-xl border p-3 dark:border-gray-700 dark:bg-gray-900/60">
                <div className="text-sm font-medium">Rezervasyon olustur</div>
                <div className="grid gap-2 md:grid-cols-3">
                  <select
                    className="rounded-xl border px-3 py-2"
                    value={sarjUniteId}
                    onChange={(e) => setSarjUniteId(e.target.value)}
                  >
                    <option value="">Unite sec</option>
                    {availableUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        Unite #{u.uniteNo} (bos soket: {u.availableSockets})
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-xl border px-3 py-2"
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    min={minStartValue}
                    max={maxStartValue}
                  />
                  <select
                    className="rounded-xl border px-3 py-2"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    <option value="15">15 dk</option>
                    <option value="30">30 dk</option>
                    <option value="60">60 dk</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                  <span>Hizli secim:</span>
                  {[0, 30, 60, 120, 180, 240, 300].map((off) => (
                    <button
                      key={off}
                      className="rounded-lg border px-2 py-1"
                      type="button"
                      onClick={() => setStartWithOffset(off)}
                    >
                      {off === 0 ? "Simdi" : `+${off} dk`}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-gray-600">
                  Bitis: {endPreview ? endPreview.toLocaleString() : "-"} (6 saat icinde olmalidir)
                </div>
                {estimatedCost && (
                  <div className="text-sm text-gray-700">
                    Tahmini tutar ({estimatedCost.socketTip}): {estimatedCost.cost.toFixed(2)} (Birim fiyat{" "}
                    {estimatedCost.birimFiyat.toFixed(2)}, sure {estimatedCost.durationMinutes} dk)
                  </div>
                )}
                <button className="rounded-xl border px-4 py-2 text-sm" onClick={createReservation}>
                  Rezervasyon olustur
                </button>
                {msg && <div className="text-sm text-red-600">{msg}</div>}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Haritadan veya listeden bir istasyon secin.</div>
          )}
        </div>
      </div>
    </div>
  );
}
