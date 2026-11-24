IF OBJECT_ID(N'dbo.Buildings', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Buildings (
    BuildingID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Buildings PRIMARY KEY,
    BuildingName NVARCHAR(100) NOT NULL CONSTRAINT UQ_Buildings_BuildingName UNIQUE,
    CampusArea NVARCHAR(50) NOT NULL
  );
END;

IF OBJECT_ID(N'dbo.StudySpots', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.StudySpots (
    StudySpotID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StudySpots PRIMARY KEY,
    BuildingID INT NOT NULL,
    SpotName NVARCHAR(100) NOT NULL,
    Floor NVARCHAR(30) NOT NULL,
    NoiseLevel NVARCHAR(10) NOT NULL,
    HasOutlets BIT NOT NULL,
    Hours NVARCHAR(100) NOT NULL,
    CONSTRAINT FK_StudySpots_Buildings FOREIGN KEY (BuildingID)
      REFERENCES dbo.Buildings (BuildingID),
    CONSTRAINT UQ_StudySpots_Building_SpotName UNIQUE (BuildingID, SpotName),
    CONSTRAINT CK_StudySpots_NoiseLevel
      CHECK (NoiseLevel IN (N'silent', N'quiet', N'lively'))
  );
END;
