import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const Body = z.object({
  tip: z.enum(["kredi", "banka"]),
  kartSahibi: z.string().min(2).max(100).optional().nullable(),
  kartNumarasi: z.string().min(12).max(25),
  sonKullanmaAy: z.string().min(1).max(2),
  sonKullanmaYil: z.string().min(2).max(4),
});

function maskCard(number: string) {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "";
  const last4 = digits.slice(-4);
  return `**** **** **** ${last4}`;
}

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OdemeBilgisi]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[OdemeBilgisi](
    [ID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MusteriID] INT NOT NULL,
    [Tip] NVARCHAR(20) NOT NULL,
    [KartSahibi] NVARCHAR(100) NULL,
    [KartNoMask] NVARCHAR(32) NOT NULL,
    [SonKullanma] NVARCHAR(10) NULL,
    [OlusturmaTarihi] DATETIME NOT NULL DEFAULT(GETDATE())
  );
END
`);
}

export async function GET() {
  const token = cookies().get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  if (me.role !== "customer") return NextResponse.json({ data: [] });

  await ensureTable();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT ID, Tip, KartSahibi, KartNoMask, SonKullanma, OlusturmaTarihi
    FROM [dbo].[OdemeBilgisi]
    WHERE MusteriID = ${Number(me.sub)}
    ORDER BY OlusturmaTarihi DESC
  `;

  const data = rows.map((r) => ({
    id: r.ID,
    tip: r.Tip,
    kartSahibi: r.KartSahibi,
    kartNoMask: r.KartNoMask,
    sonKullanma: r.SonKullanma,
    olusturmaTarihi: r.OlusturmaTarihi ? new Date(r.OlusturmaTarihi).toISOString() : null,
  }));

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const token = cookies().get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await verifyToken(token);
  if (me.role !== "customer") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = Body.parse(await req.json());
  const masked = maskCard(body.kartNumarasi);
  if (!masked) return NextResponse.json({ error: "invalid_card" }, { status: 400 });
  const sonKullanma = `${body.sonKullanmaAy.padStart(2, "0")}/${body.sonKullanmaYil.slice(-2)}`;

  await ensureTable();
  await prisma.$executeRaw`
    INSERT INTO [dbo].[OdemeBilgisi] (MusteriID, Tip, KartSahibi, KartNoMask, SonKullanma)
    VALUES (${Number(me.sub)}, ${body.tip}, ${body.kartSahibi ?? null}, ${masked}, ${sonKullanma})
  `;

  return NextResponse.json({ ok: true });
}
