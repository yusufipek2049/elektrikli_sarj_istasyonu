"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type MonthlyRevenuePoint = { month: string; total: number };

export function MonthlyRevenueChart({ data }: { data: MonthlyRevenuePoint[] }) {
  if (!data.length) {
    return <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03]">Aylik gelir icin veri yok</div>;
  }

  const series = [{ name: "Toplam Gelir", data: data.map((d) => Number(d.total ?? 0)) }];
  const options: ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, fontFamily: "Inter, sans-serif" },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 3 },
    xaxis: { categories: data.map((d) => d.month), labels: { rotate: -45 } },
    yaxis: { labels: { formatter: (val) => `TL ${val.toFixed(0)}` } },
    tooltip: { y: { formatter: (val) => `TL ${val.toFixed(2)}` } },
    fill: { gradient: { type: "vertical", opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 80, 100] } },
    colors: ["#16a34a"],
    grid: { strokeDashArray: 4 },
  };

  return (
    <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between pb-3">
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Aylik toplam gelir</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Odeme tarihine gore sirali</div>
        </div>
      </div>
      <ReactApexChart options={options} series={series} type="area" height={320} />
    </div>
  );
}
