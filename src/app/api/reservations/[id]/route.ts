import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { getActiveReservationStatusIds, getCancelledStatusId } from "@/lib/reservationStatus";

const FALLBACK_ACTIVE = [1, 2];
const FALLBACK_CANCEL = 3;

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  if (me.role !== "customer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const reservationId = Number(params.id);
  if (!Number.isInteger(reservationId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const resv = await prisma.rezervasyon.findUnique({
    where: { ID: reservationId },
    select: { ID: true, MusteriID: true, RezervasyonDurumID: true },
  });
  if (!resv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const activeStatuses = await getActiveReservationStatusIds();
  const activeSet = activeStatuses.length ? activeStatuses : FALLBACK_ACTIVE;
  const cancelledStatus = (await getCancelledStatusId()) ?? FALLBACK_CANCEL;

  if (String(resv.MusteriID) !== me.sub) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!activeSet.includes(resv.RezervasyonDurumID)) {
    return NextResponse.json({ error: "not_cancellable" }, { status: 409 });
  }

  await prisma.rezervasyon.update({
    where: { ID: reservationId },
    data: { RezervasyonDurumID: cancelledStatus },
  });

  return NextResponse.json({ ok: true });
}
