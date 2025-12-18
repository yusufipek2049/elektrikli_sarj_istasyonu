<<<<<<< HEAD
# elektrikli_sarj_istasyonu
Şarj istasyonu yönetimi, işletimi ve müşteri hizmetleri uygulaması.
=======
# EV Charge (Next.js + MSSQL)

Bu proje Next.js (App Router) + Prisma (SQL Server adapter) ile yazilmis bir EV sarj uygulamasidir. Auth akisi; kayit, e-posta dogrulama ve giris islemlerini icerir.

## Gereksinimler

- Node.js (LTS onerilir)
- Microsoft SQL Server (lokal, uzak sunucu ya da Docker ile)

## Kurulum

1) Paketleri yukle:

```bash
npm install
```

2) Ortam degiskenlerini ayarla:

- `.env.example` dosyasini `.env` olarak kopyala ve duzenle.

En onemli degiskenler:

- `DATABASE_URL`: SQL Server baglanti cumlesi
- `JWT_SECRET`: auth token imzalama anahtari (prod'da guclu/uzun olmali)
- `NEXT_PUBLIC_BASE_URL`: dogrulama linklerinde kullanilan base URL (lokalde `http://localhost:3000`)
- `SMTP_*` ve `EMAIL_FROM`: e-posta gonderimi icin SMTP ayarlari

3) Prisma client uret:

```bash
npx prisma generate
```

## Veritabani Notlari

Bu repo Prisma Migration yerine SQL patch dosyalariyla ilerler:

- `db/001_add_lat_lng_to_istasyon.sql`
- `db/002_add_reservation_overlap_index.sql`
- `db/003_add_email_verification.sql` (signup e-posta dogrulama icin)

Bu dosyalari SSMS/Azure Data Studio ile ya da `sqlcmd` ile calistirabilirsin.

Ornek (`sqlcmd`):

```bash
sqlcmd -S localhost,1433 -U evapp -P 12345 -d ElektrikliAracSarjDB -C -i db/003_add_email_verification.sql
```

## E-posta Dogrulama (Signup)

Akis:

1) Kullanici `/signup` ile kayit olur.
2) Sistem `Musteri` kaydini olusturur, dogrulama token’i uretir ve e-posta gonderir.
3) Kullanici maildeki linke tiklar (`/verify-email?token=...`).
4) Dogrulama basarili olunca kullanicinin kaydi aktif olur (login serbest).

Onemli detaylar:

- Dogrulama token suresi **30 dakika**.
- 30 dakika icinde dogrulanmazsa kayit, bir sonraki `register/login/resend/verify` isteginde otomatik temizlenir (background cron yok).
- SMTP ayarlari yoksa **development** ortaminda dogrulama linki server console’a loglanir.

## Calistirma

Gelistirme:

```bash
npm run dev
```

Uretim:

```bash
npm run build
npm run start
```

## Sayfalar

- `/signin`: giris
- `/signup`: kayit (e-posta dogrulama gonderir)
- `/verify-email`: e-posta dogrulama sonucu
- `/app`: musteri uygulamasi (auth gerekli)
- `/dashboard`: yonetici paneli (auth gerekli)

>>>>>>> 18392a1 (ev-sarj-alpha-0.01)
