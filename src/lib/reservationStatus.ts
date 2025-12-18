import { prisma } from "./db";

type ReservationStatusIds = {
  waiting: number | null;
  approved: number | null;
  cancelled: number | null;
  completed: number | null;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache:
  | {
      value: ReservationStatusIds;
      expiresAt: number;
    }
  | null = null;

function normalize(text: string | null | undefined) {
  return (text ?? "").toLowerCase();
}

async function loadStatuses(): Promise<ReservationStatusIds> {
  const rows = await prisma.rezervasyonDurum.findMany({ select: { ID: true, Durum: true } });
  const findBy = (keywords: string[]) =>
    rows.find((r) => keywords.some((k) => normalize(r.Durum).includes(k)))?.ID ?? null;

  return {
    waiting: findBy(["bekle"]),
    approved: findBy(["onay"]),
    cancelled: findBy(["iptal", "cancel"]),
    completed: findBy(["tamam", "bitti", "son"]),
  };
}

export async function getReservationStatusIds(): Promise<ReservationStatusIds> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }
  const value = await loadStatuses();
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function getActiveReservationStatusIds(): Promise<number[]> {
  const { waiting, approved } = await getReservationStatusIds();
  return [waiting, approved].filter((v): v is number => Number.isInteger(v));
}

export async function getDefaultReservationStatusId(): Promise<number> {
  const { waiting, approved, completed } = await getReservationStatusIds();
  return waiting ?? approved ?? completed ?? 1;
}

export async function getCancelledStatusId(): Promise<number | null> {
  const { cancelled } = await getReservationStatusIds();
  return cancelled;
}

export async function getCompletedStatusId(): Promise<number | null> {
  const { completed } = await getReservationStatusIds();
  return completed;
}

export async function closeExpiredReservations(): Promise<void> {
  const [activeStatuses, completedStatus] = await Promise.all([
    getActiveReservationStatusIds(),
    getCompletedStatusId(),
  ]);
  if (!completedStatus || !activeStatuses.length) return;

  await prisma.rezervasyon.updateMany({
    where: {
      RezervasyonDurumID: { in: activeStatuses },
      BitisZamani: { lte: new Date() },
    },
    data: { RezervasyonDurumID: completedStatus },
  });
}
