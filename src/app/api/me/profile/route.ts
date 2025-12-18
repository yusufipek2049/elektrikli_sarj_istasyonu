import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const Body = z.object({
  ad: z.string().min(1),
  soyad: z.string().min(1),
  email: z.string().email(),
  telefon: z.string().min(5),
});

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);

  if (me.role === "customer") {
    const u = await prisma.musteri.findUnique({
      where: { ID: Number(me.sub) },
      select: { Ad: true, Soyad: true, Email: true, Telefon: true },
    });
    if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ data: { ad: u.Ad, soyad: u.Soyad, email: u.Email, telefon: u.Telefon } });
  }

  const admin = await prisma.yonetici.findUnique({
    where: { YoneticiID: Number(me.sub) },
    select: { Ad: true, Soyad: true, Email: true, Telefon: true },
  });
  if (!admin) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    data: { ad: admin.Ad, soyad: admin.Soyad, email: admin.Email, telefon: admin.Telefon },
  });
}

export async function PUT(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  const body = Body.parse(await req.json());

  try {
    if (me.role === "customer") {
      const updated = await prisma.musteri.update({
        where: { ID: Number(me.sub) },
        data: {
          Ad: body.ad,
          Soyad: body.soyad,
          Email: body.email,
          Telefon: body.telefon,
        },
        select: { Ad: true, Soyad: true, Email: true, Telefon: true },
      });
      return NextResponse.json({
        data: { ad: updated.Ad, soyad: updated.Soyad, email: updated.Email, telefon: updated.Telefon },
      });
    }

    const updated = await prisma.yonetici.update({
      where: { YoneticiID: Number(me.sub) },
      data: {
        Ad: body.ad,
        Soyad: body.soyad,
        Email: body.email,
        Telefon: body.telefon,
      },
      select: { Ad: true, Soyad: true, Email: true, Telefon: true },
    });
    return NextResponse.json({
      data: { ad: updated.Ad, soyad: updated.Soyad, email: updated.Email, telefon: updated.Telefon },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "unique_constraint_violation" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
