import { prisma } from "./db";
import { closeExpiredReservations } from "./reservationStatus";

const BOS_SOKET = 1;
const ACTIVE_RES_STATUSES = [1, 2];
const DEVAM_EDIYOR = 1;

function toNumber(v: any) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export type AdminDashboardData = {
  metrics: {
    stationsCount: number;
    unitsCount: number;
    socketsCount: number;
    availableSocketsCount: number;
    customersCount: number;
    activeReservationsCount: number;
    activeChargingCount: number;
  };
  stationAvailability: {
    id: number;
    name: string;
    konum: string;
    availableSockets: number;
    totalSockets: number;
  }[];
  reservations: {
    id: number;
    istasyon: string;
    uniteNo: number | null;
    baslangic: string | null;
    bitis: string | null;
    durum: string;
    musteri: string;
  }[];
  charging: {
    id: number;
    istasyon: string;
    soketTip: string;
    baslangic: string | null;
    bitis: string | null;
    enerjiKWh: number | null;
    ucret: number | null;
    durum: string;
    musteri: string;
  }[];
  revenueByStation: { istasyon: string; toplam: number }[];
  paymentByMethod: { yontem: string; adet: number; tutar: number }[];
  reservationStatus: { durum: string; adet: number }[];
  monthlyRevenue: { month: string; total: number }[];
};

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await closeExpiredReservations();
  const [
    stationsCount,
    unitsCount,
    socketsCount,
    availableSocketsCount,
    customersCount,
    activeReservationsCount,
    activeChargingCount,
    reservations,
    chargingSessions,
    stations,
    payments,
    reservationStatusRows,
    reservationStatusNames,
  ] = await Promise.all([
    prisma.istasyon.count(),
    prisma.sarjUnite.count(),
    prisma.soket.count(),
    prisma.soket.count({ where: { SoketDurumID: BOS_SOKET } }),
    prisma.musteri.count(),
    prisma.rezervasyon.count({ where: { RezervasyonDurumID: { in: ACTIVE_RES_STATUSES } } }),
    prisma.sarjIslem.count({ where: { SarjIslemDurumID: DEVAM_EDIYOR } }),
    prisma.rezervasyon.findMany({
      orderBy: { RezervasyonZamani: "desc" },
      take: 50,
      include: {
        RezervasyonDurum: true,
        SarjUnite: { include: { Istasyon: true } },
        Musteri: true,
      },
    }),
    prisma.sarjIslem.findMany({
      orderBy: { BaslangicZamani: "desc" },
      take: 50,
      include: {
        SarjIslemDurum: true,
        Soket: { include: { SarjUnite: { include: { Istasyon: true } }, SoketTip: true } },
        Arac: { include: { Musteri: true } },
      },
    }),
    prisma.istasyon.findMany({
      include: {
        IstasyonDurum: true,
        SarjUnite: { include: { Soket: true } },
      },
      take: 200,
    }),
    prisma.odeme.findMany({
      include: {
        OdemeYontemi: true,
        SarjIslem: {
          include: {
            Soket: { include: { SarjUnite: { include: { Istasyon: true } } } },
          },
        },
      },
    }),
    prisma.rezervasyon.groupBy({
      by: ["RezervasyonDurumID"],
      _count: { _all: true },
    }),
    prisma.rezervasyonDurum.findMany({ select: { ID: true, Durum: true } }),
  ]);

  const stationAvailability = stations
    .map((s) => {
      const sockets = s.SarjUnite.flatMap((u) => u.Soket);
      const available = sockets.filter((k) => k.SoketDurumID === BOS_SOKET).length;
      return {
        id: s.ID,
        name: s.Ad,
        konum: s.Konum,
        availableSockets: available,
        totalSockets: sockets.length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const reservationRows = reservations.map((r) => ({
    id: r.ID,
    istasyon: r.SarjUnite?.Istasyon?.Ad ?? "-",
    uniteNo: r.SarjUnite?.UniteNo ?? null,
    baslangic: r.RezervasyonZamani ? r.RezervasyonZamani.toISOString() : null,
    bitis: r.BitisZamani ? r.BitisZamani.toISOString() : null,
    durum: r.RezervasyonDurum?.Durum ?? "-",
    musteri: r.Musteri ? `${r.Musteri.Ad} ${r.Musteri.Soyad}`.trim() : "-",
  }));

  const chargingRows = chargingSessions.map((c) => ({
    id: c.ID,
    istasyon: c.Soket?.SarjUnite?.Istasyon?.Ad ?? "-",
    soketTip: c.Soket?.SoketTip?.Tip ?? "-",
    baslangic: c.BaslangicZamani ? c.BaslangicZamani.toISOString() : null,
    bitis: c.BitisZamani ? c.BitisZamani.toISOString() : null,
    enerjiKWh: toNumber(c.HarcananEnerjiKWh),
    ucret: toNumber(c.Ucret),
    durum: c.SarjIslemDurum?.Durum ?? "-",
    musteri:
      c.Arac?.Musteri?.Ad || c.Arac?.Musteri?.Soyad
        ? `${c.Arac?.Musteri?.Ad ?? ""} ${c.Arac?.Musteri?.Soyad ?? ""}`.trim()
        : "-",
  }));

  const revenueByStation = Object.values(
    payments.reduce<Record<string, { istasyon: string; toplam: number }>>((acc, odeme) => {
      const istasyon = odeme.SarjIslem?.Soket?.SarjUnite?.Istasyon?.Ad ?? "Bilinmiyor";
      const key = istasyon.toLowerCase();
      if (!acc[key]) {
        acc[key] = { istasyon, toplam: 0 };
      }
      acc[key].toplam += Number(odeme.OdemeTutari ?? 0);
      return acc;
    }, {})
  )
    .sort((a, b) => b.toplam - a.toplam)
    .slice(0, 8);

  const paymentByMethod = Object.values(
    payments.reduce<Record<string, { yontem: string; adet: number; tutar: number }>>((acc, odeme) => {
      const yontem = odeme.OdemeYontemi?.Yontem ?? "Bilinmiyor";
      const key = yontem.toLowerCase();
      if (!acc[key]) {
        acc[key] = { yontem, adet: 0, tutar: 0 };
      }
      acc[key].adet += 1;
      acc[key].tutar += Number(odeme.OdemeTutari ?? 0);
      return acc;
    }, {})
  ).sort((a, b) => b.tutar - a.tutar);

  const statusNameMap = new Map(reservationStatusNames.map((r) => [r.ID, r.Durum]));
  const reservationStatus = reservationStatusRows
    .map((r) => ({
      durum: statusNameMap.get(r.RezervasyonDurumID) ?? `Durum ${r.RezervasyonDurumID}`,
      adet: r._count._all,
    }))
    .sort((a, b) => b.adet - a.adet);

  const monthlyRevenue = Object.values(
    payments.reduce<Record<string, { month: string; total: number }>>((acc, odeme) => {
      const tarih = odeme.OdemeTarihi ? new Date(odeme.OdemeTarihi) : null;
      if (!tarih || Number.isNaN(tarih.getTime())) return acc;
      const key = `${tarih.getFullYear()}-${String(tarih.getMonth() + 1).padStart(2, "0")}`;
      if (!acc[key]) {
        acc[key] = { month: key, total: 0 };
      }
      acc[key].total += Number(odeme.OdemeTutari ?? 0);
      return acc;
    }, {})
  ).sort((a, b) => a.month.localeCompare(b.month));

  return {
    metrics: {
      stationsCount,
      unitsCount,
      socketsCount,
      availableSocketsCount,
      customersCount,
      activeReservationsCount,
      activeChargingCount,
    },
    stationAvailability,
    reservations: reservationRows,
    charging: chargingRows,
    revenueByStation,
    paymentByMethod,
    reservationStatus,
    monthlyRevenue,
  };
}
