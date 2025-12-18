import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const Body = z.object({
  marka: z.string().min(1, "marka_required"),
  model: z.string().min(1, "model_required"),
  plaka: z.string().min(3, "plaka_required"),
  kapasite: z.number().nullable().optional(),
});

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  if (me.role !== "customer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const arac = await prisma.arac.findFirst({
    where: { MusteriID: Number(me.sub) },
    orderBy: { ID: "asc" },
    select: { ID: true, Marka: true, Model: true, Plaka: true, BataryaKapasitesi: true },
  });

  if (!arac) return NextResponse.json({ data: null });
  return NextResponse.json({
    data: {
      id: arac.ID,
      marka: arac.Marka ?? "",
      model: arac.Model ?? "",
      plaka: arac.Plaka,
      kapasite: arac.BataryaKapasitesi ? Number(arac.BataryaKapasitesi) : null,
    },
  });
}

export async function PUT(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  if (me.role !== "customer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = Body.parse(await req.json());
  const existing = await prisma.arac.findFirst({
    where: { MusteriID: Number(me.sub) },
    orderBy: { ID: "asc" },
  });

  try {
    const saved = existing
      ? await prisma.arac.update({
          where: { ID: existing.ID },
          data: {
            Marka: body.marka,
            Model: body.model,
            Plaka: body.plaka,
            BataryaKapasitesi: body.kapasite ?? null,
          },
        })
      : await prisma.arac.create({
          data: {
            MusteriID: Number(me.sub),
            Marka: body.marka,
            Model: body.model,
            Plaka: body.plaka,
            BataryaKapasitesi: body.kapasite ?? null,
          },
        });

    return NextResponse.json({
      data: {
        id: saved.ID,
        marka: saved.Marka ?? "",
        model: saved.Model ?? "",
        plaka: saved.Plaka,
        kapasite: saved.BataryaKapasitesi ? Number(saved.BataryaKapasitesi) : null,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "plaka_zaten_kayitli" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
