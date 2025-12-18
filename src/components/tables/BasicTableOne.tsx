import React from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";

export type ReservationRow = {
  id: number;
  musteri: string;
  istasyon: string;
  uniteNo: number | null;
  baslangic: string | null;
  bitis: string | null;
  durum: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function BasicTableOne({ rows }: { rows: ReservationRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[900px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Musteri
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Istasyon
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Unite
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Baslangic
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Bitis
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  Durum
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">
                    {r.musteri}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-300">
                    {r.istasyon}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-300">
                    #{r.uniteNo ?? "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-300">
                    {formatDate(r.baslangic)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-300">
                    {formatDate(r.bitis)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-theme-sm">
                    <Badge
                      size="sm"
                      color={
                        r.durum.toLowerCase().includes("onay")
                          ? "success"
                          : r.durum.toLowerCase().includes("bekle")
                          ? "warning"
                          : "gray"
                      }
                    >
                      {r.durum}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={6} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
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
