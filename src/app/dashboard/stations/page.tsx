import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StationSearchParams = { page?: string; q?: string };

export default async function AdminStationsPage({ searchParams }: { searchParams: Promise<StationSearchParams> }) {
  const params = await searchParams;
  const pageParam = params && typeof params.page === "string" ? params.page : "1";
  const parsedPage = Number(pageParam);
  const page = Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1);
  const pageSize = 6;
  const searchTerm = typeof params?.q === "string" ? params.q.trim() : "";
  const where =
    searchTerm.length > 0
      ? {
          OR: [
            { Ad: { contains: searchTerm, mode: "insensitive" } },
            { Konum: { contains: searchTerm, mode: "insensitive" } },
          ],
        }
      : undefined;
  const pageHref = (p: number) =>
    `/dashboard/stations?page=${p}${searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ""}`;

  const [data, total] = await Promise.all([
    prisma.istasyon.findMany({
      where,
      include: {
        IstasyonDurum: true,
        SarjUnite: {
          include: {
            SarjUniteDurum: true,
            Soket: { include: { SoketDurum: true, SoketTip: true } },
          },
        },
        FiyatTarife: { include: { SoketTip: true } },
      },
      orderBy: { Ad: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.istasyon.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prevHref = pageHref(Math.max(1, page - 1));
  const nextHref = pageHref(Math.min(totalPages, page + 1));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="font-medium text-gray-900 dark:text-white">Istasyon Izleme</div>
        <div className="text-sm text-gray-500 dark:text-gray-300">Unite, soket, tarife ve konum detaylarini goruntuleyin.</div>
      </div>

      <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between pb-3 text-sm text-gray-600 dark:text-gray-200">
          <span>
            Sayfa {page} / {totalPages} - {total} kayit
          </span>
          <div className="space-x-2">
            <Link
              className={`rounded-lg border px-3 py-1 text-sm ${page <= 1 ? "pointer-events-none opacity-40" : ""} dark:border-gray-700 dark:text-gray-100`}
              href={prevHref}
            >
              Onceki
            </Link>
            <Link
              className={`rounded-lg border px-3 py-1 text-sm ${page >= totalPages ? "pointer-events-none opacity-40" : ""} dark:border-gray-700 dark:text-gray-100`}
              href={nextHref}
            >
              Sonraki
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {data.map((station) => (
            <div key={station.ID} className="rounded-2xl border p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{station.Ad}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{station.Konum}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Enlem/Boylam: {station.Lat ? Number(station.Lat).toFixed(6) : "-"}, {station.Lng ? Number(station.Lng).toFixed(6) : "-"}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="rounded-full border px-2 py-1 text-gray-700 dark:border-gray-700 dark:text-gray-200">
                    Durum: {station.IstasyonDurum?.Durum ?? "-"}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
                Tarifeler:{" "}
                {station.FiyatTarife?.length ? (
                  station.FiyatTarife.map((tarife) => (
                    <span key={tarife.ID} className="mr-2 rounded-full border px-2 py-1 dark:border-gray-700">
                      {tarife.SoketTip?.Tip}: {Number(tarife.BirimFiyat).toFixed(2)} TL
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Tanimli tarife yok</span>
                )}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {station.SarjUnite?.map((unit) => (
                  <div key={unit.ID} className="rounded-2xl border p-3 dark:border-gray-700 dark:bg-gray-900/60">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-800 dark:text-gray-100">Unite #{unit.UniteNo}</span>
                      <span className="text-gray-600 dark:text-gray-300">{unit.SarjUniteDurum?.Durum ?? "-"}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700 dark:text-gray-200">
                      {unit.Soket?.map((socket) => (
                        <span key={socket.ID} className="rounded-full border px-2 py-1 dark:border-gray-700">
                          {socket.SoketTip?.Tip ?? "-"} / {socket.SoketDurum?.Durum ?? "-"}
                        </span>
                      ))}
                      {!unit.Soket?.length && <span className="text-gray-500 dark:text-gray-400">Soket bilgisi yok</span>}
                    </div>
                  </div>
                ))}
                {!station.SarjUnite?.length && (
                  <div className="rounded-xl border p-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-300">
                    Unite bulunamadi
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
