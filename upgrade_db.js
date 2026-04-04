const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "claycraze_inventory.db"), (err) => {
  if (err) {
    console.error("Could not open database:", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite database.");
});

const columnsToAdd = [
  { name: "image_path_2", type: "TEXT" },
  { name: "image_path_3", type: "TEXT" },
  { name: "image_path_4", type: "TEXT" }
];

function addColumnIfMissing(column) {
  return new Promise((resolve) => {
    db.run(`ALTER TABLE inventory ADD COLUMN ${column.name} ${column.type}`, (err) => {
      if (err) {
        if (String(err.message).includes("duplicate column name")) {
          console.log(`Column already exists: ${column.name}`);
        } else {
          console.error(`Could not add column ${column.name}:`, err.message);
        }
      } else {
        console.log(`Added column: ${column.name}`);
      }
      resolve();
    });
  });
}

async function upgrade() {
  for (const column of columnsToAdd) {
    await addColumnIfMissing(column);
  }

  console.log("Database upgrade complete.");
  db.close();
}

upgrade();