import type { Metadata } from "next";
import { StationAvailabilityChart } from "@/components/dashboard/StationAvailabilityChart";
import { RevenueByStationChart } from "@/components/dashboard/RevenueByStationChart";
import { PaymentMethodChart } from "@/components/dashboard/PaymentMethodChart";
import { ReservationStatusChart } from "@/components/dashboard/ReservationStatusChart";
import { MonthlyRevenueChart } from "@/components/dashboard/MonthlyRevenueChart";
import { getAdminDashboardData, type AdminDashboardData } from "@/lib/adminDashboardData";

export const metadata: Metadata = {
  title: "EV Sarj Kontrol Paneli",
  description: "Canli verilerle istasyon ve oturum yonetimi",
};

export default async function AdminDashboardPage() {
  const data: AdminDashboardData | null = await getAdminDashboardData().catch(() => null);

  if (!data) {
    return (
      <div className="rounded-2xl border bg-white p-4 text-sm text-red-600">
        Dashboard verileri alinamadi. Lutfen oturumunuzu veya veritabani baglantisini kontrol edin.
        <form className="mt-3" action="">
          <button className="rounded-lg border px-3 py-2 text-sm">Tekrar dene</button>
        </form>
      </div>
    );
  }

  const metricItems = [
    { label: "Istasyon", value: data.metrics.stationsCount },
    { label: "Unite", value: data.metrics.unitsCount },
    { label: "Soket", value: data.metrics.socketsCount },
    { label: "Bos soket", value: data.metrics.availableSocketsCount },
    { label: "Musteri", value: data.metrics.customersCount },
    { label: "Aktif rezervasyon", value: data.metrics.activeReservationsCount },
    { label: "Aktif sarj", value: data.metrics.activeChargingCount },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metricItems.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="text-sm text-gray-500 dark:text-gray-400">{m.label}</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{m.value}</div>
          </div>
        ))}
      </div>

      <StationAvailabilityChart
        data={data.stationAvailability.map((s) => ({
          name: s.name,
          availableSockets: s.availableSockets,
          totalSockets: s.totalSockets,
        }))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueByStationChart
          data={data.revenueByStation.map((r) => ({
            label: r.istasyon,
            value: r.toplam,
          }))}
        />
        <PaymentMethodChart
          data={data.paymentByMethod.map((p) => ({
            label: p.yontem,
            value: p.adet,
            total: p.tutar,
          }))}
        />
      </div>

      <MonthlyRevenueChart data={data.monthlyRevenue} />

      <ReservationStatusChart
        data={data.reservationStatus.map((r) => ({
          label: r.durum,
          value: r.adet,
        }))}
      />
    </div>
  );
}
