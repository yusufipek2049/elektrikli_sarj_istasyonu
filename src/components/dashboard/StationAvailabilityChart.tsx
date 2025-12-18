"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type StationAvailabilityPoint = {
  name: string;
  availableSockets: number;
  totalSockets: number;
};

type Props = {
  data: StationAvailabilityPoint[];
  pageSize?: number;
};

export function StationAvailabilityChart({ data, pageSize = 10 }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paged = useMemo(() => data.slice((page - 1) * pageSize, page * pageSize), [data, page, pageSize]);

  if (!data.length) {
    return <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500">Grafik icin veri yok</div>;
  }

  const categories = paged.map((d) => d.name);
  const options: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "Inter, sans-serif" },
    colors: ["#22c55e", "#6366f1"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 8,
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    xaxis: { categories, labels: { show: true, rotate: 0 } },
    yaxis: { labels: { formatter: (v) => `${v}` } },
    fill: { opacity: 0.9 },
    tooltip: {
      y: {
        formatter(val: number) {
          return `${val} soket`;
        },
      },
    },
  };

  const series = [
    { name: "Bos soket", data: paged.map((d) => d.availableSockets) },
    { name: "Toplam soket", data: paged.map((d) => d.totalSockets) },
  ];

  return (
    <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-2 pb-3">
        <div>
          <div className="text-lg font-semibold text-gray-800 dark:text-white/90">Istasyon kapasite</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Alfabetik sira, tum istasyonlar</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>
            Sayfa {page} / {totalPages}
          </span>
          <button
            className="rounded-lg border px-2 py-1 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Onceki
          </button>
          <button
            className="rounded-lg border px-2 py-1 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Sonraki
          </button>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[800px] xl:min-w-full">
          <ReactApexChart options={options} series={series} type="bar" height={320} />
        </div>
      </div>
    </div>
  );
}
