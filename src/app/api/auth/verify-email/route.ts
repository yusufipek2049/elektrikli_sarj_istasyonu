import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashEmailVerificationToken } from "@/lib/emailVerification";

const Body = z.object({
  token: z.string().min(10),
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const tokenHash = hashEmailVerificationToken(body.token);

  const record = await prisma.musteriEmailDogrulama.findUnique({
    where: { TokenHash: tokenHash },
    select: { MusteriID: true, ExpiresAt: true },
  });

  if (!record) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  if (record.ExpiresAt.getTime() < Date.now()) {
    await prisma.musteri.delete({ where: { ID: record.MusteriID } });
    return NextResponse.json({ error: "token_expired" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.musteriEmailDogrulama.delete({ where: { MusteriID: record.MusteriID } });
    await tx.musteri.update({
      where: { ID: record.MusteriID },
      data: { KayitTarihi: new Date() },
    });
  });

  return NextResponse.json({ ok: true });
}
