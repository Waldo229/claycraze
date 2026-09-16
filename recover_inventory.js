const sqlite3 = require("sqlite3").verbose();

const DB_PATH = "./claycraze_inventory.db";

const pieces = [
  "OV-2605-001",
  "OV-2605-002",
  "OV-2605-003",
  "OV-2605-004",
];

const db = new sqlite3.Database(DB_PATH);

function parseId(id) {
  const match = id.match(/^([A-Z]+)-(\d{4})-(\d{3})$/);
  if (!match) throw new Error(`Bad ID: ${id}`);

  return {
    id,
    shape: match[1],
    date_code: match[2],
    piece_number: Number(match[3]),
  };
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      shape TEXT,
      piece_number INTEGER,
      date_code TEXT,
      title TEXT,
      category TEXT,
      description TEXT,
      clay_body TEXT,
      glaze TEXT,
      notes TEXT,
      dimensions TEXT,
      image_path TEXT,
      image_path_2 TEXT,
      image_path_3 TEXT,
      image_path_4 TEXT,
      status TEXT DEFAULT 'available',
      price TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const insertSql = `
    INSERT OR IGNORE INTO inventory (
      id,
      shape,
      piece_number,
      date_code,
      title,
      category,
      description,
      clay_body,
      glaze,
      notes,
      dimensions,
      image_path,
      image_path_2,
      image_path_3,
      image_path_4,
      status,
      price,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  for (const id of pieces) {
    const p = parseId(id);

    db.run(insertSql, [
      p.id,
      p.shape,
      p.piece_number,
      p.date_code,
      "Oval Bonsai Container",
      "bonsai",
      "",
      "Stoneware - Cone 10",
      "",
      "",
      "",
      `/images/full/${p.id}_top.jpg`,
      `/images/full/${p.id}_top.jpg`,
      `/images/full/${p.id}_bottom.jpg`,
      "",
      "available",
      "",
    ]);
  }

  db.all(
    "SELECT id, shape, piece_number, status FROM inventory ORDER BY id",
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log("Recovery complete.");
      console.log(rows);
    }
  );
});

db.close();