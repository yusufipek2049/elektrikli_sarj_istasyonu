-- performance helper for overlap checks
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

-- optional: ensure end is after start (won't fix existing bad rows)
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
