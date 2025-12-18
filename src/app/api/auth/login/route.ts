import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { verifyAndMaybeUpgrade } from "@/lib/password";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["customer", "admin"]),
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const email = body.email.toLowerCase();

  if (body.role === "customer") {
    const u = await prisma.musteri.findUnique({ where: { Email: email } });
    if (!u) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

    const v = await verifyAndMaybeUpgrade(u.Sifre, body.password);
    if (!v.ok) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    if (v.upgradedHash) {
      await prisma.musteri.update({ where: { ID: u.ID }, data: { Sifre: v.upgradedHash } });
    }

    const pendingVerification = await prisma.musteriEmailDogrulama.findUnique({
      where: { MusteriID: u.ID },
      select: { MusteriID: true, ExpiresAt: true },
    });
    if (pendingVerification) {
      if (pendingVerification.ExpiresAt.getTime() < Date.now()) {
        await prisma.musteri.delete({ where: { ID: u.ID } });
        return NextResponse.json({ error: "verification_expired" }, { status: 403 });
      }
      return NextResponse.json({ error: "email_not_verified" }, { status: 403 });
    }

    const token = await signToken({ sub: String(u.ID), role: "customer", email: u.Email });
    const res = NextResponse.json({ ok: true });
    res.cookies.set("auth_token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return res;
  }

  const a = await prisma.yonetici.findUnique({ where: { Email: email } });
  if (!a) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

  const v = await verifyAndMaybeUpgrade(a.Sifre, body.password);
  if (!v.ok) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  if (v.upgradedHash) {
    await prisma.yonetici.update({ where: { YoneticiID: a.YoneticiID }, data: { Sifre: v.upgradedHash } });
  }

  const token = await signToken({ sub: String(a.YoneticiID), role: "admin", email: a.Email });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth_token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return res;
}
