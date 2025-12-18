import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const methods = await prisma.odemeYontemi.findMany({
    select: { ID: true, Yontem: true },
    orderBy: { ID: "asc" },
  });
  return NextResponse.json({ data: methods });
}
