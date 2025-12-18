import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { closeExpiredReservations } from "@/lib/reservationStatus";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  if (me.role !== "customer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const status = searchParams.get("status") ?? undefined;

  const where = {
    MusteriID: Number(me.sub),
    RezervasyonDurum: status ? { Durum: { contains: status } } : undefined,
  };

  await closeExpiredReservations();

  const [data, total] = await Promise.all([
    prisma.rezervasyon.findMany({
      where,
      include: {
        RezervasyonDurum: true,
        SarjUnite: { include: { Istasyon: true } },
      },
      orderBy: { RezervasyonZamani: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.rezervasyon.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, pageSize });
}
