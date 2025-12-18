-- adds geo columns for "yakınımda" queries
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
