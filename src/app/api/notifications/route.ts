import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const rows = await prisma.bildirim.findMany({
      orderBy: { Tarih: "desc" },
      take: 50,
      include: { Musteri: true },
    });

    const items = rows.map((n) => ({
      id: n.ID,
      title: n.Baslik ?? "Bildirim",
      message: n.Mesaj ?? "",
      date: n.Tarih ? n.Tarih.toISOString() : null,
      read: n.Okundu ?? null,
      musteri: n.Musteri ? `${n.Musteri.Ad} ${n.Musteri.Soyad}`.trim() : null,
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error("Bildirimler alinamadi", error);
    return NextResponse.json({ error: "Bildirimler alinamadi" }, { status: 500 });
  }
}
