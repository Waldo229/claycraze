@'
const sqlite3 = require("sqlite3").verbose();

const dbPath = "./claycraze_inventory.db";
const db = new sqlite3.Database(dbPath);

console.log("Inspecting:", dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
  if (err) {
    console.error("Table query error:", err.message);
    db.close();
    return;
  }

  console.log("\nTABLES:");
  console.table(tables);

  db.all("PRAGMA table_info(inventory)", [], (err, columns) => {
    if (err) {
      console.error("Column query error:", err.message);
      db.close();
      return;
    }

    console.log("\nINVENTORY COLUMNS:");
    console.table(columns);

    db.all("SELECT * FROM inventory ORDER BY id", [], (err, rows) => {
      if (err) {
        console.error("Inventory query error:", err.message);
      } else {
        console.log("\nINVENTORY ROWS:");
        console.table(rows);
      }

      db.close();
    });
  });
});
'@ | Set-Content -Encoding utf8 inspect-db.js