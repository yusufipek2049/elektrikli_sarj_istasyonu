import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const Body = z.object({
  aracId: z.number().int(),
  soketId: z.number().int(),
});

const BOS_SOKET = 1;
const DOLU_SOKET = 2;
const DEVAM = 1;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  if (me.role !== "customer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = Body.parse(await req.json());

  const arac = await prisma.arac.findUnique({ where: { ID: body.aracId } });
  if (!arac || String(arac.MusteriID) !== me.sub) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const soket = await prisma.soket.findUnique({
    where: { ID: body.soketId },
    include: { SarjUnite: true, SoketTip: true },
  });
  if (!soket) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (soket.SoketDurumID !== BOS_SOKET) return NextResponse.json({ error: "socket_not_available" }, { status: 409 });

  const tarife = await prisma.fiyatTarife.findUnique({
    where: { UQ_Istasyon_SoketTipi: { IstasyonID: soket.SarjUnite.IstasyonID, SoketTipID: soket.SoketTipID } },
  });
  if (!tarife) return NextResponse.json({ error: "tariff_missing" }, { status: 409 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.soket.findUnique({ where: { ID: soket.ID } });
      if (!fresh || fresh.SoketDurumID !== BOS_SOKET) throw new Error("socket_not_available");

      await tx.soket.update({ where: { ID: soket.ID }, data: { SoketDurumID: DOLU_SOKET } });
      await tx.sarjUnite.update({ where: { ID: soket.SarjUniteID }, data: { SarjUniteDurumID: 2 } });

      const si = await tx.sarjIslem.create({
        data: {
          AracID: arac.ID,
          SoketID: soket.ID,
          FiyatTarifeID: tarife.ID,
          UygulananBirimFiyat: tarife.BirimFiyat,
          SarjIslemDurumID: DEVAM,
          BaslangicZamani: new Date(),
        },
      });
      return si;
    });

    return NextResponse.json({ data: { sarjIslemId: result.ID } });
  } catch (e: any) {
    if (String(e?.message) === "socket_not_available") {
      return NextResponse.json({ error: "socket_not_available" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
