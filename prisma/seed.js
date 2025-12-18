/* eslint-disable no-console */

const { PrismaClient, Prisma } = require("@prisma/client");
const { PrismaMssql } = require("@prisma/adapter-mssql");

try {
  // Optional: Prisma CLI loads .env automatically, but running seed via `node` may not.
  require("dotenv").config();
} catch {}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example -> .env and fill DATABASE_URL.");
}

const prisma = new PrismaClient({
  adapter: new PrismaMssql(connectionString),
});

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error(`${name} must be a non-negative integer (got: ${raw})`);
  }
  return n;
}

function envFloat(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`${name} must be a number (got: ${raw})`);
  }
  return n;
}

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function dec(value) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(String(value));
}

async function assertDatabaseEmpty() {
  const [stations, customers, admins] = await Promise.all([
    prisma.istasyon.count(),
    prisma.musteri.count(),
    prisma.yonetici.count(),
  ]);

  if (stations > 0 || customers > 0 || admins > 0) {
    throw new Error(
      "Database is not empty. Create a fresh DB (recommended) before running seed to keep status IDs stable."
    );
  }
}

async function main() {
  const seedCount = envInt("SEED_COUNT", 10000);
  const stationsCount = envInt("SEED_STATIONS", 200);
  const unitsPerStation = Math.max(1, envInt("SEED_UNITS_PER_STATION", 2));
  const socketsPerUnit = Math.max(1, envInt("SEED_SOCKETS_PER_UNIT", 2));
  const customersCount = Math.max(1, envInt("SEED_CUSTOMERS", 200));
  const reservationsCount = envInt("SEED_RESERVATIONS", seedCount);
  const sessionsCount = envInt("SEED_SESSIONS", seedCount);
  const paymentsCount = envInt("SEED_PAYMENTS", Math.floor(sessionsCount * 0.6));
  const rngSeed = envInt("SEED_RANDOM_SEED", 20251218);
  const rng = makeRng(rngSeed);

  await assertDatabaseEmpty();

  // Lookup / status tables (IDs matter in app code: 1=Bos, 2=Dolu, etc.)
  await prisma.istasyonDurum.createMany({
    data: [{ Durum: "Aktif" }, { Durum: "Kapali" }],
  });
  await prisma.sarjUniteDurum.createMany({
    data: [{ Durum: "Bos" }, { Durum: "Dolu" }],
  });
  await prisma.soketDurum.createMany({
    data: [{ Durum: "Bos" }, { Durum: "Dolu" }],
  });
  await prisma.rezervasyonDurum.createMany({
    data: [{ Durum: "Beklemede" }, { Durum: "Onaylandi" }, { Durum: "Iptal" }, { Durum: "Tamamlandi" }],
  });
  await prisma.sarjIslemDurum.createMany({
    data: [{ Durum: "Devam" }, { Durum: "Tamamlandi" }],
  });
  await prisma.odemeYontemi.createMany({
    data: [{ Yontem: "Kredi Karti" }, { Yontem: "Nakit" }, { Yontem: "Havale/EFT" }],
  });
  await prisma.soketTip.createMany({
    data: [
      { Tip: "Type2", MaksAkimA: dec("32"), MaksGerilimV: dec("400") },
      { Tip: "CCS", MaksAkimA: dec("200"), MaksGerilimV: dec("800") },
    ],
  });

  // Demo admin (login: admin@demo.local / 123456)
  await prisma.yonetici.create({
    data: {
      Ad: "Admin",
      Soyad: "Demo",
      Email: "admin@demo.local",
      Sifre: "123456",
      Telefon: "5550000000",
    },
  });

  // Demo customer (login: musteri@demo.local / 123456)
  await prisma.musteri.create({
    data: {
      Ad: "Musteri",
      Soyad: "Demo",
      Email: "musteri@demo.local",
      Telefon: "5550000001",
      Sifre: "123456",
      KayitTarihi: null,
    },
  });

  // Other customers
  const otherCustomers = [];
  for (let i = 0; i < Math.max(0, customersCount - 1); i += 1) {
    const n = i + 1;
    otherCustomers.push({
      Ad: `Musteri${n}`,
      Soyad: "Test",
      Email: `musteri${String(n).padStart(4, "0")}@demo.local`,
      Telefon: `555${String(n + 1).padStart(7, "0")}`,
      Sifre: "123456",
      KayitTarihi: null,
    });
  }
  if (otherCustomers.length) {
    await prisma.musteri.createMany({ data: otherCustomers });
  }

  const customers = await prisma.musteri.findMany({ select: { ID: true }, orderBy: { ID: "asc" } });

  // Vehicles (1 per customer)
  const vehiclesData = customers.map((c, idx) => ({
    MusteriID: c.ID,
    Marka: idx % 3 === 0 ? "Tesla" : idx % 3 === 1 ? "Togg" : "Renault",
    Model: idx % 3 === 0 ? "Model 3" : idx % 3 === 1 ? "T10X" : "Zoe",
    Plaka: `TEST${String(idx + 1).padStart(6, "0")}`,
    BataryaKapasitesi: dec(String(50 + (idx % 5) * 10)),
  }));
  await prisma.arac.createMany({ data: vehiclesData });
  const vehicles = await prisma.arac.findMany({ select: { ID: true }, orderBy: { ID: "asc" } });

  // Stations
  const stationsData = [];
  const baseLat = envFloat("SEED_BASE_LAT", 39.0);
  const baseLng = envFloat("SEED_BASE_LNG", 35.0);
  const spreadLat = envFloat("SEED_SPREAD_LAT", 4.0);
  const spreadLng = envFloat("SEED_SPREAD_LNG", 6.0);

  for (let i = 0; i < stationsCount; i += 1) {
    const lat = baseLat + (rng() - 0.5) * spreadLat;
    const lng = baseLng + (rng() - 0.5) * spreadLng;
    stationsData.push({
      Ad: `Istasyon ${i + 1}`,
      Konum: `Sehir ${((i % 81) + 1).toString().padStart(2, "0")}`,
      IstasyonDurumID: 1, // Aktif
      Lat: dec(lat.toFixed(6)),
      Lng: dec(lng.toFixed(6)),
    });
  }
  await prisma.istasyon.createMany({ data: stationsData });
  const stations = await prisma.istasyon.findMany({ select: { ID: true }, orderBy: { ID: "asc" } });

  // Units
  const unitsData = [];
  for (const s of stations) {
    for (let u = 1; u <= unitsPerStation; u += 1) {
      unitsData.push({
        IstasyonID: s.ID,
        UniteNo: u,
        SarjUniteDurumID: 1, // Bos
      });
    }
  }
  await prisma.sarjUnite.createMany({ data: unitsData });
  const units = await prisma.sarjUnite.findMany({
    select: { ID: true, IstasyonID: true },
    orderBy: { ID: "asc" },
  });

  // Socket types
  const socketTypes = await prisma.soketTip.findMany({
    select: { ID: true },
    orderBy: { ID: "asc" },
  });
  if (!socketTypes.length) throw new Error("SoketTip seed failed");

  // Sockets
  const socketsData = [];
  for (const u of units) {
    for (let k = 0; k < socketsPerUnit; k += 1) {
      const tip = socketTypes[k % socketTypes.length];
      socketsData.push({
        SarjUniteID: u.ID,
        SoketTipID: tip.ID,
        SoketDurumID: 1, // Bos
      });
    }
  }
  await prisma.soket.createMany({ data: socketsData });
  const sockets = await prisma.soket.findMany({
    select: { ID: true, SarjUniteID: true, SoketTipID: true },
    orderBy: { ID: "asc" },
  });

  // Tariffs (per station & socket type)
  const tariffsData = [];
  for (const s of stations) {
    for (let i = 0; i < socketTypes.length; i += 1) {
      const tip = socketTypes[i];
      const basePrice = i === 0 ? 6.5 : 8.75;
      const variation = (rng() - 0.5) * 1.5;
      tariffsData.push({
        IstasyonID: s.ID,
        SoketTipID: tip.ID,
        BirimFiyat: dec(Math.max(1, basePrice + variation).toFixed(2)),
        GuncellemeTarihi: null,
      });
    }
  }
  await prisma.fiyatTarife.createMany({ data: tariffsData });
  const tariffs = await prisma.fiyatTarife.findMany({
    select: { ID: true, IstasyonID: true, SoketTipID: true, BirimFiyat: true },
  });
  const tariffByStationAndTip = new Map(
    tariffs.map((t) => [`${t.IstasyonID}-${t.SoketTipID}`, { id: t.ID, price: t.BirimFiyat }])
  );

  const unitToStation = new Map(units.map((u) => [u.ID, u.IstasyonID]));

  // Sessions (SarjIslem)
  const sessions = [];
  const now = Date.now();
  const windowDays = 30;
  const baseStart = now - windowDays * 24 * 60 * 60 * 1000;
  const durations = [15, 30, 60];

  for (let i = 0; i < sessionsCount; i += 1) {
    const socket = sockets[i % sockets.length];
    const vehicle = vehicles[i % vehicles.length];
    const stationId = unitToStation.get(socket.SarjUniteID);
    if (!stationId) throw new Error("SarjUnite -> Istasyon mapping missing");
    const tariff = tariffByStationAndTip.get(`${stationId}-${socket.SoketTipID}`);
    if (!tariff) throw new Error("FiyatTarife mapping missing");

    const durationMin = durations[i % durations.length];
    const offsetMinutes = (i * 17) % (windowDays * 24 * 60);
    const start = new Date(baseStart + offsetMinutes * 60 * 1000);

    const completed = rng() < 0.82;
    const end = completed ? new Date(start.getTime() + durationMin * 60 * 1000) : null;

    let energy = null;
    let cost = null;
    if (completed) {
      const price = Number(tariff.price.toString());
      const avgKw = 11 + rng() * 44; // 11kW..55kW (demo)
      const kwh = (durationMin / 60) * avgKw;
      const roundedKwh = Math.max(0.5, Number(kwh.toFixed(2)));
      const roundedCost = Math.max(0.5, Number((roundedKwh * price).toFixed(2)));
      energy = dec(roundedKwh.toFixed(2));
      cost = dec(roundedCost.toFixed(2));
    }

    sessions.push({
      AracID: vehicle.ID,
      SoketID: socket.ID,
      FiyatTarifeID: tariff.id,
      UygulananBirimFiyat: tariff.price,
      BaslangicZamani: start,
      BitisZamani: end,
      HarcananEnerjiKWh: energy,
      Ucret: cost,
      SarjIslemDurumID: completed ? 2 : 1,
    });
  }
  if (sessions.length) {
    await prisma.sarjIslem.createMany({ data: sessions });
  }

  // Reservations (Rezervasyon) — ensure unique per (SarjUniteID, RezervasyonZamani)
  const reservations = [];
  const baseResStart = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h ago (some past, some future)

  for (let i = 0; i < reservationsCount; i += 1) {
    const unit = units[i % units.length];
    const customer = customers[i % customers.length];
    const slotIndex = Math.floor(i / units.length);
    const start = new Date(baseResStart.getTime() + slotIndex * 15 * 60 * 1000);
    const durationMin = durations[i % durations.length];
    const end = new Date(start.getTime() + durationMin * 60 * 1000);

    let statusId;
    if (i % 10 === 0) statusId = 3; // Iptal
    else if (end.getTime() < Date.now()) statusId = 4; // Tamamlandi
    else statusId = i % 2 === 0 ? 1 : 2; // Beklemede / Onaylandi

    reservations.push({
      MusteriID: customer.ID,
      SarjUniteID: unit.ID,
      RezervasyonZamani: start,
      BitisZamani: end,
      RezervasyonDurumID: statusId,
    });
  }
  if (reservations.length) {
    await prisma.rezervasyon.createMany({ data: reservations });
  }

  // Payments (Odeme) for a subset of completed sessions
  if (paymentsCount > 0) {
    const methods = await prisma.odemeYontemi.findMany({
      select: { ID: true },
      orderBy: { ID: "asc" },
    });

    const payable = await prisma.sarjIslem.findMany({
      where: { SarjIslemDurumID: 2, Ucret: { not: null } },
      select: { ID: true, Ucret: true, BitisZamani: true },
      orderBy: { ID: "asc" },
      take: paymentsCount,
    });

    const payments = payable.map((s, idx) => ({
      SarjIslemID: s.ID,
      OdemeTarihi: s.BitisZamani ?? new Date(),
      OdemeTutari: s.Ucret,
      OdemeYontemiID: methods[idx % methods.length].ID,
    }));
    if (payments.length) {
      await prisma.odeme.createMany({ data: payments });
    }
  }

  const [finalStations, finalCustomers, finalReservations, finalSessions, finalPayments] = await Promise.all([
    prisma.istasyon.count(),
    prisma.musteri.count(),
    prisma.rezervasyon.count(),
    prisma.sarjIslem.count(),
    prisma.odeme.count(),
  ]);

  console.log("Seed complete:", {
    stations: finalStations,
    customers: finalCustomers,
    reservations: finalReservations,
    sessions: finalSessions,
    payments: finalPayments,
    logins: {
      admin: "admin@demo.local / 123456",
      customer: "musteri@demo.local / 123456",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
