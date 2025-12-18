-- email verification for customer signups
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

