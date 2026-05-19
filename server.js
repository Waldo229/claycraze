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

for (const dir of [
  PUBLIC_DIR,
  ADMIN_DIR,
  DATA_DIR,
  PUBLIC_IMAGES_DIR,
  FULL_DIR,
  THUMBS_DIR,
]) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

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
});

app.use(express.urlencoded({ extended: true, limit: "80mb" }));
app.use(express.json({ limit: "80mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static(PUBLIC_DIR));
app.use("/admin", express.static(ADMIN_DIR));
app.use("/images", express.static(PUBLIC_IMAGES_DIR));

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeStatus(status) {
  const raw = cleanText(status).toLowerCase();

  if (raw === "hold") return "held";
  if (raw === "placed") return "acquired";
  if (raw === "sold") return "acquired";
  if (raw === "gifted") return "acquired";
  if (raw === "not listed") return "archive";
  if (raw === "hidden") return "archive";
  if (raw === "unpublished") return "archive";

  return raw || "available";
}

function isValidShapeCode(shape) {
  return ["OV", "RD", "RC", "FREE", "CS", "FJ", "IKE", "SCULP", "FF", "IK", "SC"].includes(
    String(shape || "").toUpperCase()
  );
}

function normalizeShapeCode(shape) {
  const raw = String(shape || "").toUpperCase();

  if (raw === "FF") return "FREE";
  if (raw === "IK") return "IKE";
  if (raw === "SC") return "SCULP";

  return raw;
}

function parsePieceId(id) {
  const cleanId = cleanText(id).toUpperCase();
  const match = cleanId.match(/^([A-Z]+)-(\d{4})-(\d{2,4})$/);

  if (!match) {
    throw new Error("Piece ID must look like OV-2605-001 or FREE-2605-001.");
  }

  const shape = normalizeShapeCode(match[1]);

  if (!isValidShapeCode(shape)) {
    throw new Error("Invalid shape code.");
  }

  return {
    id: cleanId,
    shape,
    date_code: match[2],
    piece_number: parseInt(match[3], 10),
  };
}

function buildPieceId(shape, yearMonth, number) {
  const finalShape = normalizeShapeCode(shape);
  return `${finalShape}-${yearMonth}-${String(number).padStart(3, "0")}`;
}

function imagePathFor(id, kind) {
  if (kind === "thumb") return `/images/thumbs/${id}_top_thumb.jpg`;
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

  fs.writeFileSync(filepath, Buffer.from(match[1], "base64"));
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
  const { SG_HOST, SG_USER, SG_CI_KEY } = process.env;
  const SG_PORT = process.env.SG_PORT || "22";
  const SG_PUBLIC_HTML = process.env.SG_PUBLIC_HTML || "~/public_html";

  if (!SG_HOST || !SG_USER || !SG_CI_KEY) {
    throw new Error("Missing SG_HOST, SG_USER, or SG_CI_KEY.");
  }

  return { SG_HOST, SG_PORT, SG_USER, SG_CI_KEY, SG_PUBLIC_HTML };
}

function writeSshKey(keyText) {
  const keyPath = path.join(os.tmpdir(), "sg_ci_key");
  fs.writeFileSync(keyPath, String(keyText).replace(/\r/g, ""), { mode: 0o600 });
  fs.chmodSync(keyPath, 0o600);
  return keyPath;
}

async function deployToSiteGround(filesToDeploy) {
  const { SG_HOST, SG_PORT, SG_USER, SG_CI_KEY, SG_PUBLIC_HTML } = getSgConfig();
  const keyPath = writeSshKey(SG_CI_KEY);
  const remote = `${SG_USER}@${SG_HOST}`;

  const sshArgs = [
    "-p",
    SG_PORT,
    "-i",
    keyPath,
    "-o",
    "StrictHostKeyChecking=no",
  ];

  await runCommand("ssh", [
    ...sshArgs,
    remote,
    `mkdir -p ${SG_PUBLIC_HTML}/images/full ${SG_PUBLIC_HTML}/images/thumbs ${SG_PUBLIC_HTML}/data`,
  ]);

  for (const item of filesToDeploy) {
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

  return true;
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
  dimensions,
  image_path,
  image_path_2,
  image_path_3,
  image_path_4,
  status,
  price
`;

const PUBLIC_STATUSES = [
  "available",
  "held",
  "acquired"
];

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

    callback(null, rows.length, outPath);
  });
}

/* =========================================================
   IMPORT PUBLIC SG JSON INTO SQLITE
========================================================= */

app.get("/admin/import-public-json", async (req, res) => {
  const url = "https://claycraze.com/data/pieces.json";

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const pieces = await response.json();

    if (!Array.isArray(pieces)) {
      return res.status(400).json({
        ok: false,
        error: "SG pieces.json did not return an array",
      });
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO inventory (
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
        price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;

    for (const p of pieces) {
      stmt.run(
        p.id || "",
        p.shape || "",
        p.piece_number || null,
        p.date_code || "",
        p.title || "",
        p.category || "",
        p.description || "",
        p.clay_body || "",
        p.glaze || "",
        p.notes || "",
        p.dimensions || "",
        p.image_path || "",
        p.image_path_2 || "",
        p.image_path_3 || "",
        p.image_path_4 || "",
        p.status || "available",
        p.price || ""
      );

      inserted++;
    }

    stmt.finalize();

    res.json({
      ok: true,
      source: url,
      imported: inserted,
      message: "Render SQLite database repopulated from SiteGround pieces.json",
    });

  } catch (err) {
    console.error("IMPORT PUBLIC JSON ERROR:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ClaycrazE admin running on port ${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`Deploy health: http://localhost:${PORT}/deploy-health`);
});