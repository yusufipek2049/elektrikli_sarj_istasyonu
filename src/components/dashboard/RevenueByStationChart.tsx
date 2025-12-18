"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type RevenuePoint = { label: string; value: number };

export function RevenueByStationChart({ data }: { data: RevenuePoint[] }) {
  if (!data.length) {
    return <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500">Gelir grafigi icin veri yok</div>;
  }

  const labels = data.map((d) => d.label);
  const options: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "Inter, sans-serif" },
    plotOptions: { bar: { horizontal: true, borderRadius: 8 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: labels,
      labels: {
        formatter(value) {
          const num = Number(value);
          return Number.isFinite(num) ? `TL ${num.toFixed(0)}` : `${value}`;
        },
      },
    },
    colors: ["#0ea5e9"],
    tooltip: {
      y: {
        formatter(val: number) {
          return `TL ${val.toFixed(2)}`;
        },
      },
    },
    grid: { strokeDashArray: 4 },
  };
  const series = [{ name: "Toplam Odeme", data: data.map((d) => Number(d.value ?? 0)) }];

  return (
    <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between pb-3">
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Istasyon bazli gelir</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Odemelere gore ilk 8 istasyon</div>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[500px] xl:min-w-full">
          <ReactApexChart options={options} series={series} type="bar" height={320} />
        </div>
      </div>
    </div>
  );
}
