const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("claycraze_inventory.db", (err) => {
  if (err) {
    console.error("Could not open database:", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite database.");
});

const columnsToAdd = [
  { name: "width", type: "TEXT" },
  { name: "depth", type: "TEXT" },
  { name: "height", type: "TEXT" },
  { name: "firing", type: "TEXT" },
  { name: "image_path", type: "TEXT" },
  { name: "status", type: "TEXT DEFAULT 'available'" },
  { name: "sale_date", type: "TEXT" },
  { name: "price", type: "TEXT" },
  { name: "patron", type: "TEXT" },
  { name: "patron_location", type: "TEXT" },
  { name: "patron_contact", type: "TEXT" },
  { name: "context_of_sale", type: "TEXT" }
];

db.serialize(() => {
  db.all("PRAGMA table_info(inventory)", [], (err, rows) => {
    if (err) {
      console.error("Error reading table schema:", err.message);
      process.exit(1);
    }

    const existingColumns = rows.map((row) => row.name);

    let pending = 0;
    let hadError = false;

    function finishIfDone() {
      if (pending === 0 && !hadError) {
        console.log("Database upgrade complete.");
        db.close((closeErr) => {
          if (closeErr) {
            console.error("Error closing database:", closeErr.message);
            process.exit(1);
          }
          console.log("Database connection closed.");
        });
      }
    }

    columnsToAdd.forEach((col) => {
      if (!existingColumns.includes(col.name)) {
        pending++;
        const sql = `ALTER TABLE inventory ADD COLUMN ${col.name} ${col.type}`;
        db.run(sql, (alterErr) => {
          if (alterErr) {
            hadError = true;
            console.error(`Error adding column ${col.name}:`, alterErr.message);
            process.exit(1);
          } else {
            console.log(`Added column: ${col.name}`);
            pending--;
            finishIfDone();
          }
        });
      }
    });

    if (pending === 0) {
      console.log("No upgrade needed. All columns already exist.");
      db.close((closeErr) => {
        if (closeErr) {
          console.error("Error closing database:", closeErr.message);
          process.exit(1);
        }
        console.log("Database connection closed.");
      });
    }
  });
});