-- Find study spots matching the optional noise level and outlet requirement.
-- Supply @noise as NULL, 'silent', 'quiet', or 'lively'.
-- Supply @needsOutlets as 1 to require outlets, or 0 to allow either.
SELECT
  spot.StudySpotID AS id,
  spot.SpotName AS name,
  building.BuildingName AS building,
  spot.Floor AS floor,
  spot.NoiseLevel AS noise,
  spot.HasOutlets AS outlets,
  spot.Hours AS hours
FROM dbo.StudySpots AS spot
INNER JOIN dbo.Buildings AS building
  ON building.BuildingID = spot.BuildingID
WHERE (@noise IS NULL OR spot.NoiseLevel = @noise)
  AND (@needsOutlets = 0 OR spot.HasOutlets = 1)
ORDER BY building.BuildingName, spot.SpotName;
