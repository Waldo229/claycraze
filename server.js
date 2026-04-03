const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

/* -------------------------
   SITE PAGES
-------------------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/practice", (req, res) => {
  res.sendFile(path.join(__dirname, "practice.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
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
   ADD PIECE (ADMIN)
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
    status = "available",
    sale_date = "",
    price = "",
    patron = "",
    patron_location = "",
    patron_contact = "",
    context_of_sale = ""
  } = req.body;

  if (!shape || !piece_number || !date_code) {
    return res.status(400).send("Shape, Piece Number, and Date are required.");
  }

  const pieceNum = parseInt(piece_number, 10);

  if (Number.isNaN(pieceNum)) {
    return res.status(400).send("Piece Number must be a valid number.");
  }

  const cleanShape = String(shape).trim().toUpperCase();
  const cleanDate = String(date_code).trim();
  const cleanStatus = String(status).trim().toLowerCase();

  const paddedNumber = String(pieceNum).padStart(4, "0");
  const id = `${cleanShape}-${paddedNumber}-${cleanDate}`;

  const sql = `
    INSERT INTO inventory (
      id,
      shape,
      piece_number,
      date_code,
      description,
      clay_body,
      glaze,
      notes,
      width,
      depth,
      height,
      firing,
      image_path,
      status,
      sale_date,
      price,
      patron,
      patron_location,
      patron_contact,
      context_of_sale
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id,
    cleanShape,
    pieceNum,
    cleanDate,
    description,
    clay_body,
    glaze,
    notes,
    width,
    depth,
    height,
    firing,
    image_path,
    cleanStatus,
    sale_date,
    price,
    patron,
    patron_location,
    patron_contact,
    context_of_sale
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
   ADMIN: FULL INTERNAL DATA
-------------------------- */
app.get("/pieces", (req, res) => {
  db.all("SELECT * FROM inventory ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

/* -------------------------
   PUBLIC DATA HELPERS
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
  status,
  price
`;

const PUBLIC_STATUSES = ["available", "sold", "held", "gifted", "archive"];

function getPublicPiecesByShape(shapeCode, res) {
  const sql = `
    SELECT ${PUBLIC_FIELDS}
    FROM inventory
    WHERE TRIM(UPPER(shape)) = ?
      AND TRIM(LOWER(status)) IN (${PUBLIC_STATUSES.map(() => "?").join(", ")})
    ORDER BY piece_number DESC
  `;

  const params = [
    String(shapeCode).trim().toUpperCase(),
    ...PUBLIC_STATUSES.map((s) => s.toLowerCase())
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
    ...shapeCodes.map((code) => String(code).trim().toUpperCase()),
    ...PUBLIC_STATUSES.map((s) => s.toLowerCase())
  ];

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
}

/* -------------------------
   PUBLIC GALLERY DATA ROUTES
-------------------------- */
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
   DEBUG
-------------------------- */
app.get("/debug/rectangles", (req, res) => {
  db.all(
    `
    SELECT id, shape, status, description
    FROM inventory
    WHERE TRIM(UPPER(shape)) = 'RC'
       OR description LIKE '%RECT%'
    ORDER BY id DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

/* -------------------------
   START SERVER
-------------------------- */
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Home: http://localhost:${PORT}/`);
  console.log(`Practice: http://localhost:${PORT}/practice`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`Bonsai: http://localhost:${PORT}/gallery/bonsai`);
  console.log(`Ovals: http://localhost:${PORT}/gallery/ovals`);
  console.log(`Rounds: http://localhost:${PORT}/gallery/rounds`);
  console.log(`Rectangles: http://localhost:${PORT}/gallery/rectangles`);
  console.log(`Facejugs: http://localhost:${PORT}/gallery/facejugs`);
  console.log(`Freestyle: http://localhost:${PORT}/gallery/freestyle`);
  console.log(`Ikebana: http://localhost:${PORT}/gallery/ikebana`);
  console.log(`Sculpture: http://localhost:${PORT}/gallery/sculpture`);
});