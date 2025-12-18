"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type PaymentSlice = { label: string; value: number; total?: number };

export function PaymentMethodChart({ data }: { data: PaymentSlice[] }) {
  if (!data.length) {
    return <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500">Odeme grafigi icin veri yok</div>;
  }

  const labels = data.map((d) => d.label);
  const totals = data.map((d) => d.total ?? 0);
  const options: ApexOptions = {
    chart: { type: "donut", toolbar: { show: false }, fontFamily: "Inter, sans-serif" },
    labels,
    legend: { position: "bottom" },
    dataLabels: { enabled: false },
    tooltip: {
      y: {
        formatter(val: number, opts) {
          const total = totals[opts.dataPointIndex] ?? 0;
          const count = Number(val);
          return `Adet: ${count} | Tutar: TL ${total.toFixed(2)}`;
        },
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "60%",
          labels: { show: true, total: { show: true, label: "Toplam adet" } },
        },
      },
    },
    colors: ["#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#0ea5e9", "#ef4444"],
  };
  const series = data.map((d) => d.value);

  return (
    <div className="rounded-2xl border bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between pb-3">
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Odeme yontemi dagilimi</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Toplam islem adedi ve tutar</div>
        </div>
      </div>
      <ReactApexChart options={options} series={series} type="donut" height={320} />
    </div>
  );
}
