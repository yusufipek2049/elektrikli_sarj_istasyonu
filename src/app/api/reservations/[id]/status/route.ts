import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getActiveReservationStatusIds, getCompletedStatusId } from "@/lib/reservationStatus";

const FALLBACK_ACTIVE = [1, 2];
const FALLBACK_COMPLETED = 4; // varsayim: tamamlandi

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  if (me.role !== "customer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const resv = await prisma.rezervasyon.findUnique({
    where: { ID: id },
    select: { ID: true, MusteriID: true, RezervasyonDurumID: true, BitisZamani: true },
  });
  if (!resv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (String(resv.MusteriID) !== me.sub) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!resv.BitisZamani || resv.BitisZamani.getTime() > Date.now()) {
    return NextResponse.json({ error: "not_finished_yet" }, { status: 409 });
  }

  const activeStatuses = await getActiveReservationStatusIds();
  const completedStatus = (await getCompletedStatusId()) ?? FALLBACK_COMPLETED;
  const activeSet = activeStatuses.length ? activeStatuses : FALLBACK_ACTIVE;

  if (!activeSet.includes(resv.RezervasyonDurumID)) {
    return NextResponse.json({ error: "already_closed" }, { status: 409 });
  }

  await prisma.rezervasyon.update({
    where: { ID: id },
    data: { RezervasyonDurumID: completedStatus },
  });

  return NextResponse.json({ ok: true });
}
