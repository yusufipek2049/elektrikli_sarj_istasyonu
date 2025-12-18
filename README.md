# elektrikli_sarj_istasyonu (EV Charge)

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

## SQL Sorgulari

Not: Bu sorgular SQL Server (T-SQL) icindir.

### db/001_add_lat_lng_to_istasyon.sql

```sql
IF COL_LENGTH('dbo.Istasyon', 'Lat') IS NULL
  ALTER TABLE dbo.Istasyon ADD Lat DECIMAL(9,6) NULL;

IF COL_LENGTH('dbo.Istasyon', 'Lng') IS NULL
  ALTER TABLE dbo.Istasyon ADD Lng DECIMAL(9,6) NULL;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_Istasyon_Lat_Lng'
    AND object_id = OBJECT_ID('dbo.Istasyon')
)
BEGIN
  CREATE INDEX IX_Istasyon_Lat_Lng ON dbo.Istasyon(Lat, Lng);
END
```

### db/002_add_reservation_overlap_index.sql

```sql
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_Rezervasyon_Unite_Start_End'
    AND object_id = OBJECT_ID('dbo.Rezervasyon')
)
BEGIN
  CREATE INDEX IX_Rezervasyon_Unite_Start_End
    ON dbo.Rezervasyon(SarjUniteID, RezervasyonZamani, BitisZamani);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = 'CK_Rezervasyon_EndAfterStart'
    AND parent_object_id = OBJECT_ID('dbo.Rezervasyon')
)
BEGIN
  ALTER TABLE dbo.Rezervasyon WITH NOCHECK
    ADD CONSTRAINT CK_Rezervasyon_EndAfterStart CHECK (BitisZamani IS NULL OR BitisZamani > RezervasyonZamani);
END
```

### db/003_add_email_verification.sql

```sql
IF OBJECT_ID(N'dbo.MusteriEmailDogrulama', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.MusteriEmailDogrulama (
    MusteriID INT NOT NULL,
    TokenHash NVARCHAR(64) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    CreatedAt DATETIME NOT NULL CONSTRAINT DF_MusteriEmailDogrulama_CreatedAt DEFAULT (GETDATE()),
    CONSTRAINT PK_MusteriEmailDogrulama PRIMARY KEY (MusteriID),
    CONSTRAINT UQ_MusteriEmailDogrulama_TokenHash UNIQUE (TokenHash),
    CONSTRAINT FK_MusteriEmailDogrulama_Musteri FOREIGN KEY (MusteriID)
      REFERENCES dbo.Musteri(ID)
      ON DELETE CASCADE
  );
END
```

### src/app/api/payment-profiles/route.ts

Tablo olusturma (ensureTable):

```sql
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OdemeBilgisi]') AND type in (N'U'))
BEGIN
  CREATE TABLE [dbo].[OdemeBilgisi](
    [ID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MusteriID] INT NOT NULL,
    [Tip] NVARCHAR(20) NOT NULL,
    [KartSahibi] NVARCHAR(100) NULL,
    [KartNoMask] NVARCHAR(32) NOT NULL,
    [SonKullanma] NVARCHAR(10) NULL,
    [OlusturmaTarihi] DATETIME NOT NULL DEFAULT(GETDATE())
  );
END
```

Listeleme (GET):

```sql
SELECT ID, Tip, KartSahibi, KartNoMask, SonKullanma, OlusturmaTarihi
FROM [dbo].[OdemeBilgisi]
WHERE MusteriID = @MusteriID
ORDER BY OlusturmaTarihi DESC;
```

Ekleme (POST):

```sql
INSERT INTO [dbo].[OdemeBilgisi] (MusteriID, Tip, KartSahibi, KartNoMask, SonKullanma)
VALUES (@MusteriID, @Tip, @KartSahibi, @KartNoMask, @SonKullanma);
```

## E-posta Dogrulama (Signup)

Akis:

1) Kullanici `/signup` ile kayit olur.
2) Sistem `Musteri` kaydini olusturur, dogrulama tokeni uretir ve e-posta gonderir.
3) Kullanici maildeki linke tiklar (`/verify-email?token=...`).
4) Dogrulama basarili olunca kullanicinin kaydi aktif olur (login serbest).

Onemli detaylar:

- Dogrulama token suresi **30 dakika**.
- 30 dakika icinde dogrulanmazsa kayit, bir sonraki `register/login/resend/verify` isteginde otomatik temizlenir (background cron yok).
- SMTP ayarlari yoksa **development** ortaminda dogrulama linki server console'da loglanir.

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
