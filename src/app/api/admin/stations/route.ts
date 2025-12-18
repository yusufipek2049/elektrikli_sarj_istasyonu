import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const claims = await verifyToken(token);
    if (claims.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(25, Math.max(1, Number(searchParams.get("pageSize") ?? "6")));

  const [data, total] = await Promise.all([
    prisma.istasyon.findMany({
      include: {
        IstasyonDurum: true,
        SarjUnite: {
          include: {
            SarjUniteDurum: true,
            Soket: { include: { SoketDurum: true, SoketTip: true } },
          },
        },
        FiyatTarife: { include: { SoketTip: true } },
      },
      orderBy: { ID: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.istasyon.count(),
  ]);

  return NextResponse.json({ data, total, page, pageSize });
}
