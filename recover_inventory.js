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
  for (const id of pieces) {
    const p = parseId(id);

    db.run(
      `
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
      `,
      [
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
        `/images/thumbs/${p.id}_top_thumb.jpg`,
        `/images/full/${p.id}_top.jpg`,
        `/images/full/${p.id}_bottom.jpg`,
        "",
        "available",
        "",
      ]
    );
  }
});

db.close(() => {
  console.log("Recovery complete.");
});