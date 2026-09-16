const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./claycraze_inventory.db");

db.serialize(() => {
  db.run(
    `
    UPDATE inventory
    SET image_path = REPLACE(image_path, '/images/full/', '/images/bonsai/full/')
    WHERE category = 'bonsai'
      AND image_path LIKE '/images/full/%'
    `,
    function (err) {
      if (err) {
        console.error("Update error:", err.message);
      } else {
        console.log("Rows changed:", this.changes);
      }
    }
  );

  db.all(
    `
    SELECT id, category, image_path, image_path_2, image_path_3
    FROM inventory
    WHERE category = 'bonsai'
    ORDER BY id
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log("\nBonsai image paths after primary fix:");
        console.table(rows);
      }

      db.close();
    }
  );
});