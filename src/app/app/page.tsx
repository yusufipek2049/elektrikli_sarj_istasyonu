import { redirect } from "next/navigation";

export default function AppHome() {
  // Müşteri ana sayfasını istasyon listesine yönlendiriyoruz
  redirect("/app/stations");
}
