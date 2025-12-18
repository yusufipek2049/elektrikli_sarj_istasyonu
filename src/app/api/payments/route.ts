import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const Body = z.object({
  sarjIslemId: z.number().int(),
  odemeYontemiId: z.number().int(),
});

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  if (me.role !== "customer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = Body.parse(await req.json());

  const si = await prisma.sarjIslem.findUnique({ where: { ID: body.sarjIslemId }, include: { Arac: true } });
  if (!si) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (String(si.Arac.MusteriID) !== me.sub) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!si.Ucret) return NextResponse.json({ error: "charge_not_finalized" }, { status: 409 });

  const odeme = await prisma.odeme.create({
    data: {
      SarjIslemID: si.ID,
      OdemeTutari: si.Ucret,
      OdemeYontemiID: body.odemeYontemiId,
    },
  });

  return NextResponse.json({ data: odeme });
}
