const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

const app = express();
const PORT = process.env.PORT || 10000;

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const ADMIN_DIR = path.join(ROOT, "admin");
const DATA_DIR = path.join(PUBLIC_DIR, "data");
const PUBLIC_IMAGES_DIR = path.join(PUBLIC_DIR, "images");
const FULL_DIR = path.join(PUBLIC_IMAGES_DIR, "full");
const THUMBS_DIR = path.join(PUBLIC_IMAGES_DIR, "thumbs");
const DB_PATH = path.join(ROOT, "claycraze_inventory.db");

for (const dir of [PUBLIC_DIR, ADMIN_DIR, DATA_DIR, PUBLIC_IMAGES_DIR, FULL_DIR, THUMBS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
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
      shape TEXT,
      piece_number INTEGER,
      date_code TEXT,
      title TEXT,
      category TEXT,
      description TEXT,
      clay_body TEXT,
      glaze TEXT,
      notes TEXT,
      width TEXT,
      depth TEXT,
      height TEXT,
      dimensions TEXT,
      firing TEXT,
      image_path TEXT,
      image_path_2 TEXT,
      image_path_3 TEXT,
      image_path_4 TEXT,
      status TEXT DEFAULT 'available',
      sale_date TEXT,
      price TEXT,
      patron TEXT,
      patron_location TEXT,
      patron_contact TEXT,
      context_of_sale TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

app.use(express.urlencoded({ extended: true, limit: "80mb" }));
app.use(express.json({ limit: "80mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.static(PUBLIC_DIR));
app.use("/admin", express.static(ADMIN_DIR));
app.use("/images", express.static(PUBLIC_IMAGES_DIR));

function cleanText(value) {
  return String(value || "").trim();
}

function cleanShape(shape) {
  return cleanText(shape).toUpperCase();
}

function normalizeStatus(status) {
  const raw = cleanText(status).toLowerCase();

  if (raw === "hold") return "held";
  if (raw === "not listed") return "archive";
  if (raw === "available") return "available";
  if (raw === "sold") return "sold";
  if (raw === "gifted") return "gifted";
  if (raw === "held") return "held";
  if (raw === "archive") return "archive";

  return raw || "available";
}

function parsePieceId(id) {
  const cleanId = cleanText(id).toUpperCase();
  const match = cleanId.match(/^([A-Z]{2})-(\d{4})-(\d{2,4})$/);

  if (!match) {
    throw new Error("Piece ID must look like OV-2604-01.");
  }

  return {
    id: cleanId,
    shape: match[1],
    date_code: match[2],
    piece_number: parseInt(match[3], 10),
  };
}

function imagePathFor(id, kind) {
  if (kind === "thumb") return `/images/thumbs/${id}_top.jpg`;
  if (kind === "top") return `/images/full/${id}_top.jpg`;
  if (kind === "bottom") return `/images/full/${id}_bottom.jpg`;
  return "";
}

function saveDataUrlImage(dataUrl, filepath) {
  if (!dataUrl) return false;

  const match = String(dataUrl).match(/^data:image\/jpe?g;base64,(.+)$/i);
  if (!match) {
    throw new Error("Images must be JPEG files.");
  }

  const buffer = Buffer.from(match[1], "base64");
  fs.writeFileSync(filepath, buffer);
  return true;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        return reject(error);
      }

      resolve({ stdout, stderr });
    });
  });
}

function getSgConfig() {
  const SG_HOST = process.env.SG_HOST;
  const SG_PORT = process.env.SG_PORT || "22";
  const SG_USER = process.env.SG_USER;
  const SG_CI_KEY = process.env.SG_CI_KEY;

  if (!SG_HOST || !SG_USER || !SG_CI_KEY) {
    throw new Error("Missing one or more SiteGround environment variables: SG_HOST, SG_USER, SG_CI_KEY.");
  }

  return { SG_HOST, SG_PORT, SG_USER, SG_CI_KEY };
}

function writeSshKey(keyText) {
  const keyPath = path.join(os.tmpdir(), "sg_ci_key");

  fs.writeFileSync(keyPath, String(keyText).replace(/\r/g, ""), {
    mode: 0o600,
  });

  fs.chmodSync(keyPath, 0o600);
  return keyPath;
}

async function deployToSiteGround(filesToDeploy) {
  const { SG_HOST, SG_PORT, SG_USER, SG_CI_KEY } = getSgConfig();
  const keyPath = writeSshKey(SG_CI_KEY);

  const sshBase = [
    "-p",
    SG_PORT,
    "-i",
    keyPath,
    "-o",
    "StrictHostKeyChecking=no",
  ];

  const remote = `${SG_USER}@${SG_HOST}`;

  await runCommand("ssh", [
    ...sshBase,
    remote,
    "mkdir -p $HOME/public_html/images/full $HOME/public_html/images/thumbs $HOME/public_html/data",
  ]);

  for (const item of filesToDeploy) {
    if (!item.localPath || !item.remotePath) continue;
    if (!fs.existsSync(item.localPath)) continue;

    await runCommand("scp", [
      "-P",
      SG_PORT,
      "-i",
      keyPath,
      "-o",
      "StrictHostKeyChecking=no",
      item.localPath,
      `${remote}:${item.remotePath}`,
    ]);
  }

  return {
    ok: true,
    deployed_files: filesToDeploy
      .filter((item) => item.localPath && fs.existsSync(item.localPath))
      .map((item) => item.remotePath),
  };
}

const PUBLIC_FIELDS = `
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
  width,
  depth,
  height,
  dimensions,
  firing,
  image_path,
  image_path_2,
  image_path_3,
  image_path_4,
  status,
  price
`;

const PUBLIC_STATUSES = ["available", "sold", "held", "gifted"];

function publicStatusPlaceholders() {
  return PUBLIC_STATUSES.map(() => "?").join(", ");
}

function exportPiecesJson(callback) {
  const sql = `
    SELECT ${PUBLIC_FIELDS}
    FROM inventory
    WHERE TRIM(LOWER(status)) IN (${publicStatusPlaceholders()})
    ORDER BY shape ASC, piece_number DESC
  `;

  db.all(sql, PUBLIC_STATUSES, (err, rows) => {
    if (err) return callback(err);

    const outPath = path.join(DATA_DIR, "pieces.json");
    fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf8");

    callback(null, rows.length);
  });
}

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, "admin.html"));
});

app.get("/piece/:id", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "gallery", "piece.html"));
});

app.get("/gallery/bonsai", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "gallery", "bonsai.html"));
});

app.get("/gallery/ovals", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "gallery", "ovals.html"));
});

app.get("/gallery/rounds", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "gallery", "rounds.html"));
});

app.get("/gallery/rectangles", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "gallery", "rectangles.html"));
});

app.get("/next-piece-number", (req, res) => {
  db.get(
    `SELECT COALESCE(MAX(piece_number), 0) + 1 AS next_piece_number FROM inventory`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ next_piece_number: row?.next_piece_number || 1 });
    }
  );
});

app.post("/api/pieces", (req, res) => {
  try {
    const {
      id,
      title = "",
      category = "",
      clay = "",
      finish = "",
      dimensions = "",
      status = "Available",
      description = "",
      has_bottom_image = true,
      is_published = true,
      thumb_image,
      full_top_image,
      full_bottom_image,
    } = req.body;

    const parsed = parsePieceId(id);

    if (!title) return res.status(400).json({ ok: false, error: "Title is required." });
    if (!category) return res.status(400).json({ ok: false, error: "Category is required." });
    if (!thumb_image) return res.status(400).json({ ok: false, error: "Thumbnail image is required." });
    if (!full_top_image) return res.status(400).json({ ok: false, error: "Full top image is required." });

    const thumbPath = path.join(THUMBS_DIR, `${parsed.id}_top.jpg`);
    const topPath = path.join(FULL_DIR, `${parsed.id}_top.jpg`);
    const bottomPath = path.join(FULL_DIR, `${parsed.id}_bottom.jpg`);

    saveDataUrlImage(thumb_image, thumbPath);
    saveDataUrlImage(full_top_image, topPath);

    const bottomSaved = has_bottom_image && full_bottom_image
      ? saveDataUrlImage(full_bottom_image, bottomPath)
      : false;

    const finalStatus = is_published ? normalizeStatus(status) : "archive";

    const sql = `
      INSERT INTO inventory (
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
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const values = [
      parsed.id,
      parsed.shape,
      parsed.piece_number,
      parsed.date_code,
      cleanText(title),
      cleanText(category),
      cleanText(description),
      cleanText(clay),
      cleanText(finish),
      "",
      cleanText(dimensions),
      imagePathFor(parsed.id, "thumb"),
      imagePathFor(parsed.id, "top"),
      bottomSaved ? imagePathFor(parsed.id, "bottom") : "",
      "",
      finalStatus,
    ];

    db.run(sql, values, function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({
            ok: false,
            error: `Piece ${parsed.id} already exists.`,
          });
        }

        return res.status(500).json({
          ok: false,
          error: err.message,
        });
      }

      exportPiecesJson(async (exportErr, exportedCount) => {
        if (exportErr) {
          return res.status(500).json({
            ok: false,
            error: exportErr.message,
          });
        }

        const piecesJsonPath = path.join(DATA_DIR, "pieces.json");

        const filesToDeploy = [
          {
            localPath: topPath,
            remotePath: `$HOME/public_html/images/full/${parsed.id}_top.jpg`,
          },
          {
            localPath: thumbPath,
            remotePath: `$HOME/public_html/images/thumbs/${parsed.id}_top.jpg`,
          },
          {
            localPath: piecesJsonPath,
            remotePath: "$HOME/public_html/data/pieces.json",
          },
        ];

        if (bottomSaved) {
          filesToDeploy.push({
            localPath: bottomPath,
            remotePath: `$HOME/public_html/images/full/${parsed.id}_bottom.jpg`,
          });
        }

        try {
          const deployResult = await deployToSiteGround(filesToDeploy);

          res.json({
            ok: true,
            piece_id: parsed.id,
            exported_count: exportedCount,
            deployed_to_siteground: true,
            deploy_result: deployResult,
          });
        } catch (deployErr) {
          console.error("SiteGround deploy failed:", deployErr.message);
          console.error("STDOUT:", deployErr.stdout || "");
          console.error("STDERR:", deployErr.stderr || "");

          res.status(500).json({
            ok: false,
            piece_id: parsed.id,
            exported_count: exportedCount,
            local_save_completed: true,
            deployed_to_siteground: false,
            error: `Local save succeeded, but SiteGround deploy failed: ${deployErr.message}`,
            stderr: deployErr.stderr || "",
          });
        }
      });
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/pieces", (req, res) => {
  db.all(`SELECT * FROM inventory ORDER BY piece_number DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/piece-data/:id", (req, res) => {
  const pieceId = cleanText(req.params.id).toUpperCase();

  db.get(
    `SELECT ${PUBLIC_FIELDS} FROM inventory WHERE id = ?`,
    [pieceId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Piece not found." });
      res.json(row);
    }
  );
});

function getPublicPiecesByShape(shapeCode, res) {
  const sql = `
    SELECT ${PUBLIC_FIELDS}
    FROM inventory
    WHERE TRIM(UPPER(shape)) = ?
      AND TRIM(LOWER(status)) IN (${publicStatusPlaceholders()})
    ORDER BY piece_number DESC
  `;

  db.all(sql, [cleanShape(shapeCode), ...PUBLIC_STATUSES], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
}

function getPublicPiecesByShapes(shapeCodes, res) {
  const sql = `
    SELECT ${PUBLIC_FIELDS}
    FROM inventory
    WHERE TRIM(UPPER(shape)) IN (${shapeCodes.map(() => "?").join(", ")})
      AND TRIM(LOWER(status)) IN (${publicStatusPlaceholders()})
    ORDER BY shape ASC, piece_number DESC
  `;

  db.all(sql, [...shapeCodes.map(cleanShape), ...PUBLIC_STATUSES], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
}

app.get("/gallery-data/all", (req, res) => {
  const sql = `
    SELECT ${PUBLIC_FIELDS}
    FROM inventory
    WHERE TRIM(LOWER(status)) IN (${publicStatusPlaceholders()})
    ORDER BY shape ASC, piece_number DESC
  `;

  db.all(sql, PUBLIC_STATUSES, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/gallery-data/bonsai", (req, res) => {
  getPublicPiecesByShapes(["OV", "RD", "RC", "CS", "SL"], res);
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

app.get("/gallery-data/cascade", (req, res) => {
  getPublicPiecesByShape("CS", res);
});

app.get("/gallery-data/slabs", (req, res) => {
  getPublicPiecesByShape("SL", res);
});

app.get("/deploy-health", (req, res) => {
  const hasHost = Boolean(process.env.SG_HOST);
  const hasUser = Boolean(process.env.SG_USER);
  const hasKey = Boolean(process.env.SG_CI_KEY);
  const hasPort = Boolean(process.env.SG_PORT);

  res.json({
    ok: hasHost && hasUser && hasKey,
    SG_HOST: hasHost,
    SG_USER: hasUser,
    SG_PORT: hasPort,
    SG_CI_KEY: hasKey,
    target: "$HOME/public_html/",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Home: http://localhost:${PORT}/`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`Gallery data: http://localhost:${PORT}/gallery-data/all`);
  console.log(`Deploy health: http://localhost:${PORT}/deploy-health`);
});