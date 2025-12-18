import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

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
    Arac: { MusteriID: Number(me.sub) },
    SarjIslemDurum: status ? { Durum: { contains: status } } : undefined,
  };

  const [data, total] = await Promise.all([
    prisma.sarjIslem.findMany({
      where,
      include: {
        SarjIslemDurum: true,
        Soket: { include: { SoketTip: true, SarjUnite: { include: { Istasyon: true } } } },
        Odeme: { include: { OdemeYontemi: true } },
      },
      orderBy: { BaslangicZamani: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sarjIslem.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, pageSize });
}
