import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { verifyAndMaybeUpgrade } from "@/lib/password";

const Body = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  const body = Body.parse(await req.json());

  if (me.role === "customer") {
    const user = await prisma.musteri.findUnique({ where: { ID: Number(me.sub) } });
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const verified = await verifyAndMaybeUpgrade(user.Sifre, body.currentPassword);
    if (!verified.ok) return NextResponse.json({ error: "invalid_current_password" }, { status: 401 });

    const newHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.musteri.update({
      where: { ID: user.ID },
      data: { Sifre: newHash },
    });
    return NextResponse.json({ ok: true });
  }

  const admin = await prisma.yonetici.findUnique({ where: { YoneticiID: Number(me.sub) } });
  if (!admin) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const verified = await verifyAndMaybeUpgrade(admin.Sifre, body.currentPassword);
  if (!verified.ok) return NextResponse.json({ error: "invalid_current_password" }, { status: 401 });

  const newHash = await bcrypt.hash(body.newPassword, 12);
  await prisma.yonetici.update({
    where: { YoneticiID: admin.YoneticiID },
    data: { Sifre: newHash },
  });
  return NextResponse.json({ ok: true });
}
