require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const app = express();
const port = Number(process.env.PORT) || 3000;
const studySpotQuery = fs.readFileSync(path.join(__dirname, '..', 'db', 'queries.sql'), 'utf8');
const allowedNoiseLevels = ['silent', 'quiet', 'lively'];

let poolPromise;
function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect({
      server: process.env.DB_SERVER,
      port: Number(process.env.DB_PORT || 1433),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      options: { encrypt: true, trustServerCertificate: true }
    }).catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

app.get('/api/study-spots', async (req, res) => {
  const { noise, outlets } = req.query;
  const selectedNoise = noise === '' ? undefined : noise;

  if (selectedNoise !== undefined
      && (typeof selectedNoise !== 'string' || !allowedNoiseLevels.includes(selectedNoise))) {
    return res.status(400).json({ error: 'Choose a valid noise level.' });
  }

  if (outlets !== undefined && outlets !== 'true' && outlets !== 'false') {
    return res.status(400).json({ error: 'The outlets filter must be true or false.' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('noise', sql.NVarChar(10), selectedNoise || null)
      .input('needsOutlets', sql.Bit, outlets === 'true')
      .query(studySpotQuery);
    res.json(result.recordset);
  } catch (error) {
    console.error('Could not query study spots:', error);
    res.status(500).json({ error: 'Study spots could not be loaded from the database.' });
  }
});

app.use(express.static(path.join(__dirname, '..', 'web')));

app.listen(port, () => {
  console.log(`Study Spotter is running at http://localhost:${port}`);
});
