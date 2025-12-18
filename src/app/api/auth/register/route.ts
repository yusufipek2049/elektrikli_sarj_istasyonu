import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createEmailVerificationToken, getBaseUrl } from "@/lib/emailVerification";
import { sendEmailVerification } from "@/lib/email";

const Body = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(5).max(15),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const email = body.email.toLowerCase();
  const phone = body.phone.trim();

  const now = new Date();
  const expired = await prisma.musteriEmailDogrulama.findMany({
    where: { ExpiresAt: { lt: now } },
    select: { MusteriID: true },
  });
  if (expired.length > 0) {
    await prisma.musteri.deleteMany({
      where: { ID: { in: expired.map((e) => e.MusteriID) } },
    });
  }

  let existing = await prisma.musteri.findUnique({
    where: { Email: email },
    select: { ID: true, Ad: true, Email: true },
  });

  const baseUrl = getBaseUrl(req);
  const makeVerificationUrl = (token: string) => {
    const url = new URL("/verify-email", baseUrl);
    url.searchParams.set("token", token);
    return url.toString();
  };

  try {
    if (existing) {
      const pending = await prisma.musteriEmailDogrulama.findUnique({
        where: { MusteriID: existing.ID },
        select: { MusteriID: true, ExpiresAt: true },
      });
      if (!pending) {
        return NextResponse.json({ error: "email_taken" }, { status: 409 });
      }

      if (pending.ExpiresAt.getTime() < Date.now()) {
        await prisma.musteri.delete({ where: { ID: existing.ID } });
        existing = null;
      } else {
        const { token, tokenHash, expiresAt } = createEmailVerificationToken();
        await prisma.musteriEmailDogrulama.update({
          where: { MusteriID: existing.ID },
          data: { TokenHash: tokenHash, ExpiresAt: expiresAt, CreatedAt: new Date() },
        });

        await sendEmailVerification({
          to: existing.Email,
          name: existing.Ad,
          verificationUrl: makeVerificationUrl(token),
        });

        return NextResponse.json({ ok: true, resent: true });
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const { token, tokenHash, expiresAt } = createEmailVerificationToken();

    const created = await prisma.$transaction(async (tx) => {
      const customer = await tx.musteri.create({
        data: {
          Ad: body.firstName,
          Soyad: body.lastName,
          Email: email,
          Telefon: phone,
          Sifre: passwordHash,
          KayitTarihi: null,
        },
        select: { ID: true, Email: true, Ad: true },
      });

      await tx.musteriEmailDogrulama.create({
        data: {
          MusteriID: customer.ID,
          TokenHash: tokenHash,
          ExpiresAt: expiresAt,
        },
        select: { MusteriID: true },
      });

      return customer;
    });

    await sendEmailVerification({
      to: created.Email,
      name: created.Ad,
      verificationUrl: makeVerificationUrl(token),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // SQL Server adapters sometimes return constraint names rather than column names.
      // Double-check which field is actually conflicting to return a stable error code.
      const [emailConflict, phoneConflict] = await Promise.all([
        prisma.musteri.findUnique({ where: { Email: email }, select: { ID: true } }),
        prisma.musteri.findUnique({ where: { Telefon: phone }, select: { ID: true } }),
      ]);
      if (emailConflict) return NextResponse.json({ error: "email_taken" }, { status: 409 });
      if (phoneConflict) return NextResponse.json({ error: "phone_taken" }, { status: 409 });
      return NextResponse.json({ error: "unique_constraint_violation" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
