const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3010;

/* -------------------------
   DATABASE
-------------------------- */
const db = new sqlite3.Database(
  path.join(__dirname, "claycraze_inventory.db"),
  (err) => {
    if (err) {
      console.error("Could not open database:", err.message);
      process.exit(1);
    }
    console.log("Connected to SQLite database.");
  }
);

/* -------------------------
   MIDDLEWARE
-------------------------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* Public website root */
app.use(express.static(path.join(__dirname, "public")));

/* Optional extra image mount if you still use a root-level images folder */
app.use("/images", express.static(path.join(__dirname, "images")));

/* -------------------------
   HELPERS
-------------------------- */
function normalizeImagePath(imagePath) {
  const raw = String(imagePath || "").trim();
  if (!raw) return "";

  let cleaned = raw.replace(/\\/g, "/").replace(/^"+|"+$/g, "");

  const marker = "/images/";
  const idx = cleaned.toLowerCase().indexOf(marker);

  if (idx !== -1) {
    cleaned = cleaned.substring(idx);
  } else {
    cleaned = cleaned.replace(/^\.?\/*/, "");
    cleaned = cleaned.replace(/^claycraze\//i, "");

    if (!cleaned.toLowerCase().startsWith("images/")) {
      cleaned = `images/${cleaned}`;
    }

    cleaned = `/${cleaned}`;
  }

  return cleaned;
}

function cleanShape(shape) {
  return String(shape || "").trim().toUpperCase();
}

function cleanStatus(status) {
  return String(status || "available").trim().toLowerCase();
}

function buildId(shape, pieceNumber, dateCode) {
  const paddedNumber = String(pieceNumber).padStart(4, "0");
  return `${cleanShape(shape)}-${paddedNumber}-${String(dateCode || "").trim()}`;
}

/* -------------------------
   HOME ROUTE
-------------------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* PAGE + PIECE PAGE
-------------------------- */

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Xadmin.html"));
});

app.get("/piece/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gallery", "piece.html"));
});
/* -------------------------
   GALLERY PAGE ROUTES
-------------------------- */
app.get("/gallery/bonsai", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gallery", "bonsai.html"));
});

app.get("/gallery/ovals", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gallery", "ovals.html"));
});

app.get("/gallery/rounds", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gallery", "rounds.html"));
});

app.get("/gallery/rectangles", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gallery", "rectangles.html"));
});

app.get("/gallery/facejugs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gallery", "facejugs.html"));
});

app.get("/gallery/freestyle", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gallery", "freestyle.html"));
});

app.get("/gallery/ikebana", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gallery", "ikebana.html"));
});

app.get("/gallery/sculpture", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gallery", "sculpture.html"));
});

/* -------------------------
   NEXT PIECE NUMBER
-------------------------- */
app.get("/next-piece-number", (req, res) => {
  db.get(
    `SELECT COALESCE(MAX(piece_number), 0) + 1 AS next_piece_number FROM inventory`,
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        next_piece_number: row?.next_piece_number || 1,
      });
    }
  );
});

/* -------------------------
   ADD PIECE
-------------------------- */
app.post("/add-piece", (req, res) => {
  const {
    shape,
    piece_number,
    date_code,
    description = "",
    clay_body = "",
    glaze = "",
    notes = "",
    width = "",
    depth = "",
    height = "",
    firing = "",
    image_path = "",
    image_path_2 = "",
    image_path_3 = "",
    image_path_4 = "",
    status = "available",
    sale_date = "",
    price = "",
    patron = "",
    patron_location = "",
    patron_contact = "",
    context_of_sale = "",
  } = req.body;

  if (!shape || !piece_number || !date_code) {
    return res.status(400).send("Shape, Piece Number, and Date are required.");
  }

  const pieceNum = parseInt(piece_number, 10);
  if (Number.isNaN(pieceNum)) {
    return res.status(400).send("Piece Number must be a valid number.");
  }

  const id = buildId(shape, pieceNum, date_code);

  const sql = `
    INSERT INTO inventory (
      id, shape, piece_number, date_code, description, clay_body, glaze, notes,
      width, depth, height, firing, image_path, image_path_2, image_path_3, image_path_4,
      status, sale_date, price, patron, patron_location, patron_contact, context_of_sale
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id,
    cleanShape(shape),
    pieceNum,
    String(date_code).trim(),
    description,
    clay_body,
    glaze,
    notes,
    width,
    depth,
    height,
    firing,
    normalizeImagePath(image_path),
    normalizeImagePath(image_path_2),
    normalizeImagePath(image_path_3),
    normalizeImagePath(image_path_4),
    cleanStatus(status),
    sale_date,
    price,
    patron,
    patron_location,
    patron_contact,
    context_of_sale,
  ];

  db.run(sql, values, function (err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(400).send(`Piece ${id} already exists.`);
      }
      return res.status(500).send("Database error: " + err.message);
    }
    res.send(`Piece ${id} added successfully.`);
  });
});

/* -------------------------
   UPDATE PIECE
-------------------------- */
app.post("/update-piece", (req, res) => {
  const {
    original_id,
    shape,
    piece_number,
    date_code,
    description = "",
    clay_body = "",
    glaze = "",
    notes = "",
    width = "",
    depth = "",
    height = "",
    firing = "",
    image_path = "",
    image_path_2 = "",
    image_path_3 = "",
    image_path_4 = "",
    status = "available",
    sale_date = "",
    price = "",
    patron = "",
    patron_location = "",
    patron_contact = "",
    context_of_sale = "",
  } = req.body;

  if (!original_id) {
    return res.status(400).send("Original ID is required for update.");
  }

  if (!shape || !piece_number || !date_code) {
    return res.status(400).send("Shape, Piece Number, and Date are required.");
  }

  const pieceNum = parseInt(piece_number, 10);
  if (Number.isNaN(pieceNum)) {
    return res.status(400).send("Piece Number must be a valid number.");
  }

  const newId = buildId(shape, pieceNum, date_code);

  const sql = `
    UPDATE inventory
    SET
      id = ?,
      shape = ?,
      piece_number = ?,
      date_code = ?,
      description = ?,
      clay_body = ?,
      glaze = ?,
      notes = ?,
      width = ?,
      depth = ?,
      height = ?,
      firing = ?,
      image_path = ?,
      image_path_2 = ?,
      image_path_3 = ?,
      image_path_4 = ?,
      status = ?,
      sale_date = ?,
      price = ?,
      patron = ?,
      patron_location = ?,
      patron_contact = ?,
      context_of_sale = ?
    WHERE id = ?
  `;

  const values = [
    newId,
    cleanShape(shape),
    pieceNum,
    String(date_code).trim(),
    description,
    clay_body,
    glaze,
    notes,
    width,
    depth,
    height,
    firing,
    normalizeImagePath(image_path),
    normalizeImagePath(image_path_2),
    normalizeImagePath(image_path_3),
    normalizeImagePath(image_path_4),
    cleanStatus(status),
    sale_date,
    price,
    patron,
    patron_location,
    patron_contact,
    context_of_sale,
    String(original_id).trim(),
  ];

  db.run(sql, values, function (err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(400).send(`Cannot update: piece ${newId} already exists.`);
      }
      return res.status(500).send("Database error: " + err.message);
    }

    if (this.changes === 0) {
      return res.status(404).send(`No record found for ${original_id}.`);
    }

    res.send(`Piece ${newId} updated successfully.`);
  });
});

/* -------------------------
   ARCHIVE PIECE
-------------------------- */
app.post("/archive-piece", (req, res) => {
  const { original_id } = req.body;

  if (!original_id) {
    return res.status(400).send("Original ID is required to archive a piece.");
  }

  db.run(
    `UPDATE inventory SET status = 'archive' WHERE id = ?`,
    [String(original_id).trim()],
    function (err) {
      if (err) {
        return res.status(500).send("Database error: " + err.message);
      }

      if (this.changes === 0) {
        return res.status(404).send(`No record found for ${original_id}.`);
      }

      res.send(`Piece ${original_id} archived successfully.`);
    }
  );
});

/* -------------------------
   DELETE PIECE
-------------------------- */
app.post("/delete-piece", (req, res) => {
  const { original_id } = req.body;

  if (!original_id) {
    return res.status(400).send("Original ID is required to delete a piece.");
  }

  db.run(
    `DELETE FROM inventory WHERE id = ?`,
    [String(original_id).trim()],
    function (err) {
      if (err) {
        return res.status(500).send("Database error: " + err.message);
      }

      if (this.changes === 0) {
        return res.status(404).send(`No record found for ${original_id}.`);
      }

      res.send(`Piece ${original_id} deleted successfully.`);
    }
  );
});

/* -------------------------
   ADMIN DATA
-------------------------- */
app.get("/pieces", (req, res) => {
  db.all(`SELECT * FROM inventory ORDER BY id DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

/* -------------------------
   PIECE DETAIL DATA
-------------------------- */
app.get("/piece-data/:id", (req, res) => {
  const pieceId = String(req.params.id || "").trim();

  db.get(
    `
    SELECT
      id,
      shape,
      piece_number,
      date_code,
      description,
      clay_body,
      glaze,
      width,
      depth,
      height,
      firing,
      image_path,
      image_path_2,
      image_path_3,
      image_path_4,
      status,
      price,
      notes
    FROM inventory
    WHERE id = ?
    `,
    [pieceId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!row) {
        return res.status(404).json({ error: "Piece not found." });
      }

      res.json(row);
    }
  );
});

/* -------------------------
   PUBLIC DATA
-------------------------- */
const PUBLIC_FIELDS = `
  id,
  shape,
  piece_number,
  date_code,
  description,
  clay_body,
  glaze,
  width,
  depth,
  height,
  firing,
  image_path,
  image_path_2,
  image_path_3,
  image_path_4,
  status,
  price,
  notes
`;

const PUBLIC_STATUSES = ["available", "sold", "held", "gifted"];

function getPublicPiecesByShape(shapeCode, res) {
  const sql = `
    SELECT ${PUBLIC_FIELDS}
    FROM inventory
    WHERE TRIM(UPPER(shape)) = ?
      AND TRIM(LOWER(status)) IN (${PUBLIC_STATUSES.map(() => "?").join(", ")})
    ORDER BY piece_number DESC
  `;

  const params = [
    cleanShape(shapeCode),
    ...PUBLIC_STATUSES.map((s) => s.toLowerCase()),
  ];

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
}

function getPublicPiecesByShapes(shapeCodes, res) {
  const sql = `
    SELECT ${PUBLIC_FIELDS}
    FROM inventory
    WHERE TRIM(UPPER(shape)) IN (${shapeCodes.map(() => "?").join(", ")})
      AND TRIM(LOWER(status)) IN (${PUBLIC_STATUSES.map(() => "?").join(", ")})
    ORDER BY shape ASC, piece_number DESC
  `;

  const params = [
    ...shapeCodes.map((code) => cleanShape(code)),
    ...PUBLIC_STATUSES.map((s) => s.toLowerCase()),
  ];

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
}

app.get("/gallery-data/all", (req, res) => {
  const sql = `
    SELECT ${PUBLIC_FIELDS}
    FROM inventory
    WHERE TRIM(LOWER(status)) IN (${PUBLIC_STATUSES.map(() => "?").join(", ")})
    ORDER BY shape ASC, piece_number DESC
  `;

  db.all(sql, PUBLIC_STATUSES.map((s) => s.toLowerCase()), (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get("/gallery-data/bonsai", (req, res) => {
  getPublicPiecesByShapes(["OV", "RD", "RC", "FS"], res);
});

app.get("/gallery-data/ovals", (req, res) => {
  getPublicPiecesByShape("OV", res);
});

app.get("/gallery-data/rounds", (req, res) => {
  getPublicPiecesByShape("RD", res);
});

app.get("/gallery-data/rectangles", (req, res) => {
  getPublicPiecesByShape("RC", res);
});

app.get("/gallery-data/facejugs", (req, res) => {
  getPublicPiecesByShape("FJ", res);
});

app.get("/gallery-data/freestyle", (req, res) => {
  getPublicPiecesByShape("FS", res);
});

app.get("/gallery-data/ikebana", (req, res) => {
  getPublicPiecesByShape("IKE", res);
});

app.get("/gallery-data/sculpture", (req, res) => {
  getPublicPiecesByShape("SCP", res);
});

/* -------------------------
   START SERVER
-------------------------- */
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Home: http://localhost:${PORT}/`);
  console.log(`Theory: http://localhost:${PORT}/theory.html`);
  console.log(`Practice: http://localhost:${PORT}/practice.html`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`Bonsai: http://localhost:${PORT}/gallery/bonsai`);
});