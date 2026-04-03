const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("claycraze_inventory.db", (err) => {
  if (err) {
    console.error("Could not open database:", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite database.");
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      shape TEXT NOT NULL,
      piece_number INTEGER NOT NULL,
      date_code TEXT NOT NULL,
      description TEXT,
      clay_body TEXT,
      glaze TEXT,
      notes TEXT
    )
  `, (err) => {
    if (err) {
      console.error("Error creating table:", err.message);
      process.exit(1);
    }
    console.log("Inventory table is ready.");
  });
});

db.close((err) => {
  if (err) {
    console.error("Error closing database:", err.message);
    process.exit(1);
  }
  console.log("Database connection closed.");
});