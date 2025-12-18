import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const BOS_SOKET = 1;

function toRad(v: number) {
  return (v * Math.PI) / 180;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radiusKm = Number(searchParams.get("radiusKm") ?? "5");
  const onlyAvailable = searchParams.get("onlyAvailable") === "1";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
  }

  // approximate degrees-per-km
  const latDelta = radiusKm / 110.574;
  const cosLat = Math.max(0.15, Math.cos(toRad(lat))); // avoid exploding near poles
  const lngDelta = radiusKm / (111.32 * cosLat);

  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;

  const stations = await prisma.istasyon.findMany({
    where: {
      Lat: { not: null, gte: minLat, lte: maxLat },
      Lng: { not: null, gte: minLng, lte: maxLng },
    },
    include: {
      IstasyonDurum: true,
      FiyatTarife: { include: { SoketTip: true } },
      SarjUnite: { include: { Soket: { include: { SoketTip: true } } } },
    },
    take: 200,
  });

  const data = stations
    .map((s) => {
      const sLat = Number(s.Lat);
      const sLng = Number(s.Lng);
      const dKm = haversineKm(lat, lng, sLat, sLng);

      const sockets = s.SarjUnite.flatMap((u) => u.Soket);
      const available = sockets.filter((x) => x.SoketDurumID === BOS_SOKET);

      return {
        id: s.ID,
        ad: s.Ad,
        konum: s.Konum,
        lat: sLat,
        lng: sLng,
        distanceKm: Number(dKm.toFixed(3)),
        durum: s.IstasyonDurum.Durum,
        toplamSoket: sockets.length,
        bosSoket: available.length,
        bosByTip: Object.values(
          available.reduce<Record<string, { tip: string; adet: number }>>((acc, x) => {
            const tip = x.SoketTip.Tip;
            acc[tip] ??= { tip, adet: 0 };
            acc[tip].adet += 1;
            return acc;
          }, {})
        ),
        sarjUnite: s.SarjUnite.map((u) => ({
          id: u.ID,
          uniteNo: u.UniteNo,
          soketler: u.Soket.map((k) => ({
            id: k.ID,
            tip: k.SoketTip.Tip,
            durumId: k.SoketDurumID,
          })),
        })),
        tarifeler: s.FiyatTarife.map((t) => ({
          id: t.ID,
          soketTip: t.SoketTip.Tip,
          birimFiyat: Number(t.BirimFiyat),
        })),
      };
    })
    .filter((x) => (onlyAvailable ? x.bosSoket > 0 : true))
    .filter((x) => x.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json({ data, bounds: { minLat, maxLat, minLng, maxLng } });
}
