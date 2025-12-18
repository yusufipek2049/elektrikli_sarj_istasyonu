import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BasicTableOne, { ReservationRow } from "@/components/tables/BasicTableOne";
import { Metadata } from "next";
import { getAdminDashboardData } from "@/lib/adminDashboardData";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Tablolar",
  description: "Gercek verilerle rezervasyon ve sarj listesi",
};

type ChargingRow = {
  id: number;
  istasyon: string;
  tip: string;
  baslangic: string | null;
  bitis: string | null;
  enerji: number | null;
  ucret: number | null;
  durum: string;
  musteri: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function ChargingTable({ rows }: { rows: ChargingRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[900px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Istasyon
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Tip
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Baslangic
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Bitis
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  kWh
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Ucret
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Durum
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Musteri
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">{r.istasyon}</TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-300">{r.tip}</TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-300">{formatDate(r.baslangic)}</TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-300">{formatDate(r.bitis)}</TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-300">
                    {r.enerji !== null ? r.enerji : "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-300">{r.ucret ?? "-"}</TableCell>
                  <TableCell className="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">{r.durum}</TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-300">{r.musteri}</TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={8} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Kayit bulunamadi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default async function BasicTables() {
  const data = await getAdminDashboardData().catch(() => null);
  const rows: ReservationRow[] =
    data?.reservations.map((r) => ({
      id: r.id,
      musteri: r.musteri,
      istasyon: r.istasyon,
      uniteNo: r.uniteNo,
      baslangic: r.baslangic,
      bitis: r.bitis,
      durum: r.durum,
    })) ?? [];
  const chargingRows: ChargingRow[] =
    data?.charging.map((c) => ({
      id: c.id,
      istasyon: c.istasyon,
      tip: c.soketTip,
      baslangic: c.baslangic,
      bitis: c.bitis,
      enerji: c.enerjiKWh,
      ucret: c.ucret,
      durum: c.durum,
      musteri: c.musteri,
    })) ?? [];

  return (
    <div>
      <PageBreadcrumb pageTitle="Tablolar" />
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <ComponentCard title="Son Rezervasyonlar">
            <BasicTableOne rows={rows} />
          </ComponentCard>
          <ComponentCard title="Sarj Islemleri">
            <ChargingTable rows={chargingRows} />
          </ComponentCard>
        </div>
        {!data && (
          <div className="text-sm text-red-600">
            Veriler alinamadi. Oturum veya veritabani baglantisini kontrol edin.
            <form className="mt-2" action="">
              <button className="rounded-lg border px-3 py-2 text-sm">Tekrar dene</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
