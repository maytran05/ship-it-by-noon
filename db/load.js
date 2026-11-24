require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const buildings = [
  ['Suzzallo Library', 'Central'],
  ['Odegaard Undergraduate Library', 'Central'],
  ['Allen Library', 'Central'],
  ['Mary Gates Hall', 'Central'],
  ['Husky Union Building', 'Central'],
  ['Paccar Hall', 'Central'],
  ['Gould Hall', 'Central'],
  ['Kane Hall', 'Central'],
  ['Savery Hall', 'Central'],
  ['Physics-Astronomy Building', 'Central'],
  ['Chemistry Building', 'Central'],
  ['Engineering Library', 'Central'],
  ['Paul G. Allen Center', 'Central'],
  ['Architecture Hall', 'Central'],
  ['Fishery Sciences Building', 'West'],
  ['Health Sciences Building', 'South'],
  ['Denny Hall', 'Central'],
  ['Miller Hall', 'North'],
  ['Smith Hall', 'Central'],
  ['Johnson Hall', 'Central']
].map(([name, area]) => ({ name, area }));

const studySpots = [
  ['Suzzallo Library', 'Quiet Reading Room', '3rd floor', 'silent', true, '8:00 AM - 10:00 PM'],
  ['Odegaard Undergraduate Library', 'Window Study Tables', '2nd floor', 'quiet', true, 'Open 24 hours'],
  ['Allen Library', 'North Reading Room', '1st floor', 'silent', true, '8:00 AM - 9:00 PM'],
  ['Mary Gates Hall', 'Commons Tables', '1st floor', 'lively', true, '7:00 AM - 10:00 PM'],
  ['Husky Union Building', 'Husky Grind Lounge', '1st floor', 'lively', false, '7:00 AM - 11:00 PM'],
  ['Paccar Hall', 'Atrium Study Nook', '2nd floor', 'quiet', true, '7:00 AM - 10:00 PM'],
  ['Gould Hall', 'Design Library Corner', '1st floor', 'quiet', true, '8:00 AM - 8:00 PM'],
  ['Kane Hall', 'Lower Level Lounge', '1st floor', 'lively', false, '7:30 AM - 9:00 PM'],
  ['Savery Hall', 'South Hallway Tables', '2nd floor', 'quiet', false, '7:00 AM - 8:00 PM'],
  ['Physics-Astronomy Building', 'Atrium Desks', '1st floor', 'quiet', true, '8:00 AM - 7:00 PM'],
  ['Chemistry Building', 'Student Commons', '2nd floor', 'lively', true, '8:00 AM - 8:00 PM'],
  ['Engineering Library', 'Group Study Zone', '2nd floor', 'lively', true, '8:00 AM - 9:00 PM'],
  ['Paul G. Allen Center', 'Collaborative Lounge', '3rd floor', 'lively', true, '7:00 AM - 10:00 PM'],
  ['Architecture Hall', 'Studio Reading Area', '2nd floor', 'quiet', false, '8:00 AM - 9:00 PM'],
  ['Fishery Sciences Building', 'Waterfront Commons', '1st floor', 'quiet', true, '8:00 AM - 6:00 PM'],
  ['Health Sciences Building', 'South Campus Study Area', '2nd floor', 'silent', true, '7:00 AM - 9:00 PM'],
  ['Denny Hall', 'East Wing Study Tables', '2nd floor', 'quiet', false, '8:00 AM - 8:00 PM'],
  ['Miller Hall', 'Education Commons', '1st floor', 'lively', true, '7:30 AM - 9:00 PM'],
  ['Smith Hall', 'Upper Floor Study Nook', '3rd floor', 'silent', false, '8:00 AM - 7:00 PM'],
  ['Johnson Hall', 'Garden Side Lounge', '1st floor', 'quiet', true, '8:00 AM - 8:00 PM']
].map(([building, name, floor, noise, outlets, hours]) => ({
  building,
  name,
  floor,
  noise,
  outlets,
  hours
}));

function getDatabaseConfig() {
  const required = ['DB_SERVER', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.join(', ')} in .env. Copy .env.example to .env and fill in the values.`);
  }
  if (!/^[A-Za-z][A-Za-z0-9_]*_myapp$/.test(process.env.DB_NAME)) {
    throw new Error('DB_NAME must be your own database name ending in _myapp.');
  }

  return {
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
  };
}

function makeValues(request, rows, columns) {
  return rows.map((row, rowIndex) => {
    const parameters = row.map((value, columnIndex) => {
      const { name, type } = columns[columnIndex];
      const parameterName = `${name}${rowIndex}`;
      request.input(parameterName, type, value);
      return `@${parameterName}`;
    });
    return `(${parameters.join(', ')})`;
  }).join(',\n');
}

async function load() {
  const pool = await sql.connect(getDatabaseConfig());
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.request().batch(schema);

    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const counts = await new sql.Request(transaction).query(`
        SELECT
          (SELECT COUNT(*) FROM dbo.Buildings) AS buildingCount,
          (SELECT COUNT(*) FROM dbo.StudySpots) AS spotCount;
      `);
      const { buildingCount, spotCount } = counts.recordset[0];

      if (buildingCount === 0 && spotCount === 0) {
        const buildingRequest = new sql.Request(transaction);
        const buildingValues = makeValues(buildingRequest, buildings.map((building) => [
          building.name, building.area
        ]), [
          { name: 'buildingName', type: sql.NVarChar(100) },
          { name: 'campusArea', type: sql.NVarChar(50) }
        ]);
        await buildingRequest.query(`
          INSERT INTO dbo.Buildings (BuildingName, CampusArea)
          VALUES ${buildingValues};
        `);

        const spotRequest = new sql.Request(transaction);
        const spotValues = makeValues(spotRequest, studySpots.map((spot) => [
          spot.building, spot.name, spot.floor, spot.noise, spot.outlets, spot.hours
        ]), [
          { name: 'buildingName', type: sql.NVarChar(100) },
          { name: 'spotName', type: sql.NVarChar(100) },
          { name: 'floor', type: sql.NVarChar(30) },
          { name: 'noise', type: sql.NVarChar(10) },
          { name: 'hasOutlets', type: sql.Bit },
          { name: 'hours', type: sql.NVarChar(100) }
        ]);
        await spotRequest.query(`
          INSERT INTO dbo.StudySpots
            (BuildingID, SpotName, Floor, NoiseLevel, HasOutlets, Hours)
          SELECT
            building.BuildingID,
            seed.SpotName,
            seed.Floor,
            seed.NoiseLevel,
            seed.HasOutlets,
            seed.Hours
          FROM (VALUES ${spotValues}) AS seed
            (BuildingName, SpotName, Floor, NoiseLevel, HasOutlets, Hours)
          INNER JOIN dbo.Buildings AS building
            ON building.BuildingName = seed.BuildingName;
        `);
        console.log(`Inserted ${buildings.length} buildings and ${studySpots.length} study spots.`);
      } else if (buildingCount === 0 || spotCount === 0) {
        throw new Error('Only one table has data. No sample rows were added; inspect the tables before loading again.');
      } else {
        console.log(`Tables already contain ${buildingCount} buildings and ${spotCount} study spots; existing rows were left unchanged.`);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    console.log(`OK: database ${process.env.DB_NAME} is ready.`);
  } finally {
    await pool.close();
  }
}

load().catch((error) => {
  console.error('FAILED to load study-spot data:', error.message);
  console.error('Check your database settings and UW network connection, then try again.');
  process.exitCode = 1;
});
