"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type ReservationStatusSlice = { label: string; value: number };

export function ReservationStatusChart({ data }: { data: ReservationStatusSlice[] }) {
  if (!data.length) {
    return <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500">Rezervasyon grafigi icin veri yok</div>;
  }

  const labels = data.map((d) => d.label);
  const options: ApexOptions = {
    chart: { type: "pie", toolbar: { show: false }, fontFamily: "Inter, sans-serif" },
    labels,
    legend: { position: "bottom" },
    dataLabels: { enabled: false },
    colors: ["#22c55e", "#3b82f6", "#f97316", "#ef4444", "#8b5cf6"],
    tooltip: {
      y: {
        formatter(val: number) {
          return `${val} adet`;
        },
      },
    },
  };
  const series = data.map((d) => d.value);

  return (
    <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between pb-3">
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Rezervasyon durumlari</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Bekleyen, onaylanan ve tamamlanan dagilim</div>
        </div>
      </div>
      <ReactApexChart options={options} series={series} type="pie" height={320} />
    </div>
  );
}
