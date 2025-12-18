import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createEmailVerificationToken, getBaseUrl } from "@/lib/emailVerification";
import { sendEmailVerification } from "@/lib/email";

const Body = z.object({
  email: z.string().trim().email(),
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const email = body.email.toLowerCase();

  const customer = await prisma.musteri.findUnique({
    where: { Email: email },
    select: { ID: true, Ad: true, Email: true },
  });
  if (!customer) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const pending = await prisma.musteriEmailDogrulama.findUnique({
    where: { MusteriID: customer.ID },
    select: { MusteriID: true, ExpiresAt: true },
  });
  if (!pending) return NextResponse.json({ error: "already_verified" }, { status: 400 });

  if (pending.ExpiresAt.getTime() < Date.now()) {
    await prisma.musteri.delete({ where: { ID: customer.ID } });
    return NextResponse.json({ error: "verification_expired" }, { status: 400 });
  }

  const baseUrl = getBaseUrl(req);
  const { token, tokenHash, expiresAt } = createEmailVerificationToken();
  await prisma.musteriEmailDogrulama.update({
    where: { MusteriID: customer.ID },
    data: { TokenHash: tokenHash, ExpiresAt: expiresAt, CreatedAt: new Date() },
  });

  const url = new URL("/verify-email", baseUrl);
  url.searchParams.set("token", token);

  await sendEmailVerification({
    to: customer.Email,
    name: customer.Ad,
    verificationUrl: url.toString(),
  });

  return NextResponse.json({ ok: true });
}
