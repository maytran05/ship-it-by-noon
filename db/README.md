# Study Spotter database

`schema.sql` creates two related tables in the database named by `DB_NAME`:

- `Buildings` stores each campus building and area.
- `StudySpots` stores the floor, noise level, outlet availability, and hours for each location. Its `BuildingID` foreign key connects each spot to a building.

From the project folder, run `node db/load.js` to create the tables and insert 20 made-up buildings and 20 made-up study spots. The loader leaves existing rows unchanged when both tables already contain data.

`queries.sql` is the parameterized query used by `/api/study-spots`. The page sends its filters to the Express server; the server supplies `@noise` and `@needsOutlets` as SQL parameters.
