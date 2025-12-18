import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const Body = z.object({
  sarjIslemId: z.number().int(),
  harcananEnerjiKWh: z.number().positive(),
});

const BOS_SOKET = 1;
const TAMAMLANDI = 2;
const BOS_SARJ_UNITE = 1;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  if (me.role !== "customer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = Body.parse(await req.json());

  const si = await prisma.sarjIslem.findUnique({
    where: { ID: body.sarjIslemId },
    include: { Arac: true, Soket: true },
  });
  if (!si) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (String(si.Arac.MusteriID) !== me.sub) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const birim = Number(si.UygulananBirimFiyat ?? 0);
  const ucret = Number((body.harcananEnerjiKWh * birim).toFixed(2));

  await prisma.$transaction(async (tx) => {
    await tx.sarjIslem.update({
      where: { ID: si.ID },
      data: {
        BitisZamani: new Date(),
        HarcananEnerjiKWh: body.harcananEnerjiKWh,
        Ucret: ucret,
        SarjIslemDurumID: TAMAMLANDI,
      },
    });

    await tx.soket.update({ where: { ID: si.SoketID }, data: { SoketDurumID: BOS_SOKET } });

    const remainingBusy = await tx.soket.count({
      where: {
        SarjUniteID: si.Soket.SarjUniteID,
        SoketDurumID: { not: BOS_SOKET },
      },
    });

    if (remainingBusy === 0) {
      await tx.sarjUnite.update({
        where: { ID: si.Soket.SarjUniteID },
        data: { SarjUniteDurumID: BOS_SARJ_UNITE },
      });
    }
  });

  return NextResponse.json({ ok: true, ucret });
}
