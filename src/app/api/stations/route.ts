import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const BOS_SOKET = 1; // seed: boş=1

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const stations = await prisma.istasyon.findMany({
    where: q ? { OR: [{ Ad: { contains: q } }, { Konum: { contains: q } }] } : undefined,
    include: {
      IstasyonDurum: true,
      FiyatTarife: { include: { SoketTip: true } },
      SarjUnite: { include: { Soket: { include: { SoketTip: true } } } },
    },
    take: 100,
  });

  const data = stations.map((s) => {
    const sockets = s.SarjUnite.flatMap((u) => u.Soket);
    const available = sockets.filter((x) => x.SoketDurumID === BOS_SOKET);
    return {
      id: s.ID,
      ad: s.Ad,
      konum: s.Konum,
      lat: s.Lat ? Number(s.Lat) : null,
      lng: s.Lng ? Number(s.Lng) : null,
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
  });

  return NextResponse.json({ data });
}
