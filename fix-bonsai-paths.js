const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./claycraze_inventory.db");

const updates = [
  `
  UPDATE inventory
  SET image_path = REPLACE(image_path, '/images/thumbs/', '/images/bonsai/thumbs/')
  WHERE category = 'bonsai'
    AND image_path LIKE '/images/thumbs/%'
  `,
  `
  UPDATE inventory
  SET image_path_2 = REPLACE(image_path_2, '/images/full/', '/images/bonsai/full/')
  WHERE category = 'bonsai'
    AND image_path_2 LIKE '/images/full/%'
  `,
  `
  UPDATE inventory
  SET image_path_3 = REPLACE(image_path_3, '/images/full/', '/images/bonsai/full/')
  WHERE category = 'bonsai'
    AND image_path_3 LIKE '/images/full/%'
  `,
  `
  UPDATE inventory
  SET image_path_4 = REPLACE(image_path_4, '/images/full/', '/images/bonsai/full/')
  WHERE category = 'bonsai'
    AND image_path_4 LIKE '/images/full/%'
  `
];

db.serialize(() => {
  updates.forEach((sql) => {
    db.run(sql, function (err) {
      if (err) {
        console.error("Update error:", err.message);
      } else {
        console.log("Rows changed:", this.changes);
      }
    });
  });

  db.all(
    `
    SELECT id, category, image_path, image_path_2, image_path_3, image_path_4
    FROM inventory
    WHERE category = 'bonsai'
    ORDER BY id
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log("\nBonsai image paths after fix:");
        console.table(rows);
      }

      db.close();
    }
  );
});