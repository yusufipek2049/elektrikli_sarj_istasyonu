import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import {
  closeExpiredReservations,
  getActiveReservationStatusIds,
  getDefaultReservationStatusId,
} from "@/lib/reservationStatus";

const Body = z.object({
  sarjUniteId: z.number().int().positive(),
  start: z.string().datetime(),
  end: z.string().datetime(),
});

const FALLBACK_ACTIVE_STATUSES = [1, 2]; // 1:beklemede, 2:onaylandi
const FALLBACK_DEFAULT_STATUS = 1;
const MAX_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 saat
const ALLOWED_DURATIONS_MINUTES = new Set([15, 30, 60]);

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  if (me.role !== "customer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = Body.parse(await req.json());
  const start = new Date(body.start);
  const end = new Date(body.end);
  if (!(end.getTime() > start.getTime())) {
    return NextResponse.json({ error: "end_must_be_after_start" }, { status: 400 });
  }
  const now = Date.now();
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (!ALLOWED_DURATIONS_MINUTES.has(durationMinutes)) {
    return NextResponse.json({ error: "invalid_duration_minutes" }, { status: 400 });
  }
  if (start.getTime() < now) {
    return NextResponse.json({ error: "start_must_be_in_future" }, { status: 400 });
  }
  if (start.getTime() > now + MAX_WINDOW_MS || end.getTime() > now + MAX_WINDOW_MS) {
    return NextResponse.json({ error: "start_must_be_within_6h" }, { status: 400 });
  }

  try {
    // Zamanı gecen rezervasyonlari otomatik tamamla
    await closeExpiredReservations();

    const activeStatuses = (await getActiveReservationStatusIds()).concat();
    const overlapStatuses = activeStatuses.length ? activeStatuses : FALLBACK_ACTIVE_STATUSES;
    const defaultStatusId = (await getDefaultReservationStatusId()) ?? FALLBACK_DEFAULT_STATUS;

    const created = await prisma.$transaction(
      async (tx) => {
        const overlap = await tx.rezervasyon.findFirst({
          where: {
            SarjUniteID: body.sarjUniteId,
            RezervasyonDurumID: { in: overlapStatuses },
            RezervasyonZamani: { lt: end },
            AND: [{ OR: [{ BitisZamani: null }, { BitisZamani: { gt: start } }] }],
          },
          select: { ID: true },
        });

        if (overlap) {
          // serializable ensures we don't lose a race to a concurrent insert
          throw Object.assign(new Error("reservation_overlap"), { code: "reservation_overlap" });
        }

        return tx.rezervasyon.create({
          data: {
            MusteriID: Number(me.sub),
            SarjUniteID: body.sarjUniteId,
            RezervasyonZamani: start,
            BitisZamani: end,
            RezervasyonDurumID: defaultStatusId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({ data: created });
  } catch (e: any) {
    if (e?.code === "reservation_overlap" || e?.message === "reservation_overlap") {
      return NextResponse.json({ error: "reservation_overlap" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
