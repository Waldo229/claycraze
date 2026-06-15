const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const https = require("https");
const { execFile } = require("child_process");

const app = express();
const PORT = process.env.PORT || 10000;

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const ADMIN_DIR = path.join(ROOT, "admin");
const DATA_DIR = path.join(PUBLIC_DIR, "data");app.post
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const PUBLIC_IMAGES_DIR = path.join(PUBLIC_DIR, "images");
const TREES_DIR = path.join(PUBLIC_IMAGES_DIR, "trees");
const FULL_DIR = path.join(PUBLIC_IMAGES_DIR, "full");
const THUMBS_DIR = path.join(PUBLIC_IMAGES_DIR, "thumbs");
const DB_PATH = path.join(ROOT, "claycraze_inventory.db");

const SG_PUBLIC_DATA_URL =
  process.env.SG_PUBLIC_DATA_URL || "https://claycraze.com/data/pieces.json";

let STARTUP_RESTORE = {
  ok: false,
  source: SG_PUBLIC_DATA_URL,
  count: 0,
  message: "Startup restore has not run yet.",
  time: null,
};

for (const dir of [TREES_DIR,
  PUBLIC_DIR,
  ADMIN_DIR,
  DATA_DIR,
  BACKUP_DIR,

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
  return [
    "OV",
    "RD",
    "RC",
    "FREE",
    "CS",
    "FJ",
    "IKE",
    "SCULP",
    "FF",
    "IK",
    "SC",
  ].includes(String(shape || "").toUpperCase());
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
  const SG_PUBLIC_HTML =
    process.env.SG_PUBLIC_HTML || "/home/customer/www/claycraze.com/public_html";

  if (!SG_HOST || !SG_USER || !SG_CI_KEY) {
    throw new Error("Missing SG_HOST, SG_USER, or SG_CI_KEY.");
  }

  return { SG_HOST, SG_PORT, SG_USER, SG_CI_KEY, SG_PUBLIC_HTML };
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
  const { SG_HOST, SG_PORT, SG_USER, SG_CI_KEY, SG_PUBLIC_HTML } =
    getSgConfig();

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
    if (!item || !item.localPath || !item.remotePath) continue;
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

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;

    const req = client.get(
      parsed,
      {
        headers: {
          "User-Agent": "ClaycrazE-Render-Restore/1.0",
          Accept: "application/json,text/plain,*/*",
        },
      },
      (res) => {
        let body = "";

        res.setEncoding("utf8");

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(
              new Error(`${url} returned HTTP ${res.statusCode}`)
            );
          }

          resolve(body);
        });
      }
    );

    req.setTimeout(30000, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });

    req.on("error", reject);
  });
}

async function fetchPiecesJsonFromSiteGround() {
  const raw = await fetchText(SG_PUBLIC_DATA_URL);
  const trimmed = raw.trim();

  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error(`${SG_PUBLIC_DATA_URL} returned HTML instead of JSON.`);
  }

  const pieces = JSON.parse(trimmed);

  if (!Array.isArray(pieces)) {
    throw new Error(`${SG_PUBLIC_DATA_URL} did not contain a JSON array.`);
  }

  return pieces;
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

const PUBLIC_STATUSES = ["available", "held", "acquired"];

function publicStatusPlaceholders() {
  return PUBLIC_STATUSES.map(() => "?").join(", ");
}

function getLocalPiecesJsonCount() {
  const outPath = path.join(DATA_DIR, "pieces.json");

  if (!fs.existsSync(outPath)) {
    return 0;
  }

  try {
    const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    return Array.isArray(existing) ? existing.length : 0;
  } catch (err) {
    console.warn("Could not read local pieces.json count:", err.message);
    return 0;
  }
}

function getPublicDbCount() {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT COUNT(*) AS count
      FROM inventory
      WHERE TRIM(LOWER(status)) IN (${publicStatusPlaceholders()})
      `,
      PUBLIC_STATUSES,
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.count : 0);
      }
    );
  });
}

async function getRegistrationState() {
  const jsonCount = getLocalPiecesJsonCount();
  const dbCount = await getPublicDbCount();

  return {
    registered: dbCount >= jsonCount && STARTUP_RESTORE.ok,
    local_pieces_json_count: jsonCount,
    render_public_db_count: dbCount,
    startup_restore_ok: STARTUP_RESTORE.ok,
    startup_restore_count: STARTUP_RESTORE.count,
    startup_restore_source: STARTUP_RESTORE.source,
    message:
      dbCount >= jsonCount && STARTUP_RESTORE.ok
        ? "Render DB is registered with SiteGround-restored pieces.json."
        : "Render DB is not safely registered. Restore from SiteGround before saving.",
  };
}

function makeTimestamp() {
  return new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "");
}

function backupExistingPiecesJson() {
  const sourcePath = path.join(DATA_DIR, "pieces.json");

  if (!fs.existsSync(sourcePath)) {
    return "";
  }

  const backupName = `pieces-${makeTimestamp()}.json`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  fs.copyFileSync(sourcePath, backupPath);

  console.log(`pieces.json backup created: ${backupName}`);

  return backupPath;
}

function exportPiecesJson(callback, options = {}) {
  const allowShrink = options.allowShrink === true;
  const outPath = path.join(DATA_DIR, "pieces.json");

  let previousCount = 0;

  if (fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
      if (Array.isArray(existing)) {
        previousCount = existing.length;
      }
    } catch (err) {
      console.warn("Could not read existing pieces.json:", err.message);
    }
  }

  const sql = `
    SELECT ${PUBLIC_FIELDS}
    FROM inventory
    WHERE TRIM(LOWER(status)) IN (${publicStatusPlaceholders()})
    ORDER BY shape ASC, piece_number DESC
  `;

  db.all(sql, PUBLIC_STATUSES, (err, rows) => {
    if (err) return callback(err);

    const newCount = Array.isArray(rows) ? rows.length : 0;

    if (!allowShrink && previousCount > 0 && newCount < previousCount) {
      return callback(
        new Error(
          `SAFETY LOCK: Export blocked. pieces.json would shrink from ${previousCount} records to ${newCount}. Use explicit reset/delete workflow to allow shrink.`
        )
      );
    }

    backupExistingPiecesJson();

    fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf8");

    console.log(`pieces.json exported successfully (${newCount} records)`);

    callback(null, newCount, outPath);
  });
}

function exportPiecesJsonPromise(options = {}) {
  return new Promise((resolve, reject) => {
    exportPiecesJson((err, count, outPath) => {
      if (err) return reject(err);
      resolve({ count, outPath });
    }, options);
  });
}

function getPublicPiecesByShape(shapeCode, res) {
  const sql = `
    SELECT ${PUBLIC_FIELDS}
    FROM inventory
    WHERE TRIM(UPPER(shape)) = ?
      AND TRIM(LOWER(status)) IN (${publicStatusPlaceholders()})
    ORDER BY piece_number DESC
  `;

  db.all(sql, [shapeCode, ...PUBLIC_STATUSES], (err, rows) => {
    if (err) {
      return res.status(500).json({
        ok: false,
        error: err.message,
      });
    }

    res.json(rows || []);
  });
}

function upsertPiece(piece) {
  return new Promise((resolve, reject) => {
    const parsed = parsePieceId(piece.id);

    const finalPiece = {
      id: parsed.id,
      shape: normalizeShapeCode(piece.shape || parsed.shape),
      piece_number: piece.piece_number || parsed.piece_number,
      date_code: piece.date_code || parsed.date_code,
      title: cleanText(piece.title),
      category: cleanText(piece.category),
      description: cleanText(piece.description),
      clay_body: cleanText(piece.clay_body),
      glaze: cleanText(piece.glaze),
      notes: cleanText(piece.notes),
      dimensions: cleanText(piece.dimensions),
      image_path: cleanText(piece.image_path),
      image_path_2: cleanText(piece.image_path_2),
      image_path_3: cleanText(piece.image_path_3),
      image_path_4: cleanText(piece.image_path_4),
      status: normalizeStatus(piece.status),
      price: cleanText(piece.price),
    };

    db.run(
      `
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
        price,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        finalPiece.id,
        finalPiece.shape,
        finalPiece.piece_number,
        finalPiece.date_code,
        finalPiece.title,
        finalPiece.category,
        finalPiece.description,
        finalPiece.clay_body,
        finalPiece.glaze,
        finalPiece.notes,
        finalPiece.dimensions,
        finalPiece.image_path,
        finalPiece.image_path_2,
        finalPiece.image_path_3,
        finalPiece.image_path_4,
        finalPiece.status,
        finalPiece.price,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(finalPiece);
      }
    );
  });
}

function clearInventoryTable() {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM inventory`, [], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function replaceDbWithPieces(pieces) {
  if (!Array.isArray(pieces)) {
    throw new Error("replaceDbWithPieces expected an array.");
  }

  await clearInventoryTable();

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
    await new Promise((resolve, reject) => {
      stmt.run(
        p.id || "",
        normalizeShapeCode(p.shape || ""),
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
        normalizeStatus(p.status || "available"),
        p.price || "",
        (err) => {
          if (err) return reject(err);
          inserted++;
          resolve();
        }
      );
    });
  }

  await new Promise((resolve, reject) => {
    stmt.finalize((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  return inserted;
}

async function restoreFromSiteGround() {
  const pieces = await fetchPiecesJsonFromSiteGround();
  const localPath = path.join(DATA_DIR, "pieces.json");

  backupExistingPiecesJson();

  fs.writeFileSync(localPath, JSON.stringify(pieces, null, 2), "utf8");

  const imported = await replaceDbWithPieces(pieces);
  const dbCount = await getPublicDbCount();

  STARTUP_RESTORE = {
    ok: true,
    source: SG_PUBLIC_DATA_URL,
    count: pieces.length,
    imported,
    render_public_db_count: dbCount,
    message: "Render restored from SiteGround canonical pieces.json.",
    time: new Date().toISOString(),
  };

  console.log(
    `SITEGROUND RESTORE OK: fetched ${pieces.length}, imported ${imported}, DB public count ${dbCount}.`
  );

  return STARTUP_RESTORE;
}

async function importLocalPiecesJsonIntoDb() {
  const localPath = path.join(DATA_DIR, "pieces.json");

  if (!fs.existsSync(localPath)) {
    return {
      ok: false,
      source: localPath,
      imported: 0,
      message: "Local pieces.json not found.",
    };
  }

  const raw = fs.readFileSync(localPath, "utf8");
  const pieces = JSON.parse(raw);

  if (!Array.isArray(pieces)) {
    throw new Error("Local pieces.json did not contain an array.");
  }

  const inserted = await replaceDbWithPieces(pieces);

  STARTUP_RESTORE = {
    ok: false,
    source: localPath,
    count: pieces.length,
    imported: inserted,
    message:
      "Local import completed, but this is not canonical truth. Restore from SiteGround before real saving.",
    time: new Date().toISOString(),
  };

  return {
    ok: true,
    source: localPath,
    imported: inserted,
  };
}

app.get("/deploy-health", (req, res) => {
  res.json({
    ok: true,
    app: "ClaycrazE admin",
    db_path: DB_PATH,
    siteground_truth_url: SG_PUBLIC_DATA_URL,
    startup_restore: STARTUP_RESTORE,
    time: new Date().toISOString(),
  });
});

app.get("/debug/siteground-env", (req, res) => {
  res.json({
    ok: true,
    SG_HOST_present: Boolean(process.env.SG_HOST),
    SG_USER_present: Boolean(process.env.SG_USER),
    SG_CI_KEY_present: Boolean(process.env.SG_CI_KEY),
    SG_PORT: process.env.SG_PORT || "22",
    SG_PUBLIC_HTML:
      process.env.SG_PUBLIC_HTML || "/home/customer/www/claycraze.com/public_html",
    SG_PUBLIC_DATA_URL,
    startup_restore: STARTUP_RESTORE,
  });
});

app.get("/debug/inventory-count", (req, res) => {
  db.get(`SELECT COUNT(*) AS total FROM inventory`, [], (err, totalRow) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }

    db.get(
      `
      SELECT COUNT(*) AS public_total
      FROM inventory
      WHERE TRIM(LOWER(status)) IN (${publicStatusPlaceholders()})
      `,
      PUBLIC_STATUSES,
      (err2, publicRow) => {
        if (err2) {
          return res.status(500).json({ ok: false, error: err2.message });
        }

        res.json({
          ok: true,
          db_path: DB_PATH,
          startup_restore: STARTUP_RESTORE,
          counts: {
            total: totalRow ? totalRow.total : 0,
            public_total: publicRow ? publicRow.public_total : 0,
          },
        });
      }
    );
  });
});

app.get("/debug/shapes", (req, res) => {
  db.all(
    `
    SELECT
      shape,
      TRIM(LOWER(status)) AS status,
      COUNT(*) AS count
    FROM inventory
    GROUP BY shape, TRIM(LOWER(status))
    ORDER BY shape ASC, status ASC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }

      res.json({
        ok: true,
        startup_restore: STARTUP_RESTORE,
        shapes: rows || [],
      });
    }
  );
});

app.get("/debug/registration", async (req, res) => {
  try {
    const registration = await getRegistrationState();

    res.json({
      ok: true,
      ...registration,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

function getNextPieceNumber(shape, dateCode) {
  return new Promise((resolve, reject) => {
    const normalizedShape = normalizeShapeCode(shape);

    db.get(
      `
      SELECT MAX(piece_number) AS max_num
      FROM inventory
      WHERE TRIM(UPPER(shape)) = ?
      AND TRIM(date_code) = ?
      `,
      [normalizedShape, dateCode],
      (err, row) => {
        if (err) return reject(err);

        const nextNumber = ((row && row.max_num) || 0) + 1;

        resolve(nextNumber);
      }
    );
  });
}

function buildPieceId(shape, dateCode, pieceNumber) {
  const normalizedShape = normalizeShapeCode(shape);

  return `${normalizedShape}-${dateCode}-${String(pieceNumber).padStart(3, "0")}`;
}

app.get("/api/next-piece-id", async (req, res) => {
  try {
    const registration = await getRegistrationState();

    if (!registration.registered) {
      return res.status(409).json({
        ok: false,
        error:
          "Cannot generate piece ID. Render is not restored from SiteGround truth.",
        registration,
      });
    }

    const shape = normalizeShapeCode(req.query.shape || "");
    const dateCode = cleanText(req.query.date_code || "");

    if (!shape || !dateCode) {
      return res.status(400).json({
        ok: false,
        error: "shape and date_code are required",
      });
    }

    const nextNumber = await getNextPieceNumber(shape, dateCode);
    const nextId = buildPieceId(shape, dateCode, nextNumber);

    res.json({
      ok: true,
      shape,
      date_code: dateCode,
      piece_number: nextNumber,
      id: nextId,
    });
  } catch (err) {
    console.error("NEXT PIECE ID ERROR:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/generate-piece-id", async (req, res) => {
  try {
    const registration = await getRegistrationState();

    if (!registration.registered) {
      return res.status(409).json({
        ok: false,
        error:
          "Cannot generate piece ID. Render is not restored from SiteGround truth.",
        registration,
      });
    }

    const shape = normalizeShapeCode(req.query.shape || "");
    const dateCode = cleanText(req.query.date_code || "");

    const nextNumber = await getNextPieceNumber(shape, dateCode);

    res.json({
      ok: true,
      id: buildPieceId(shape, dateCode, nextNumber),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/next-piece-number", async (req, res) => {
  try {
    const registration = await getRegistrationState();

    if (!registration.registered) {
      return res.status(409).json({
        ok: false,
        error:
          "Cannot generate piece number. Render is not restored from SiteGround truth.",
        registration,
      });
    }

    const shape = normalizeShapeCode(req.query.shape || "");
    const dateCode = cleanText(req.query.date_code || "");

    const nextNumber = await getNextPieceNumber(shape, dateCode);

    res.json({
      ok: true,
      piece_number: nextNumber,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
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

app.get("/gallery-data/freeform", (req, res) => {
  getPublicPiecesByShape("FREE", res);
});

app.get("/gallery-data/cascade", (req, res) => {
  getPublicPiecesByShape("CS", res);
});

app.get("/gallery-data/facejugs", (req, res) => {
  getPublicPiecesByShape("FJ", res);
});

app.get("/gallery-data/ikebana", (req, res) => {
  getPublicPiecesByShape("IKE", res);
});

app.get("/gallery-data/sculpture", (req, res) => {
  getPublicPiecesByShape("SCULP", res);
});

app.get("/gallery-data/all", (req, res) => {
  const sql = `
    SELECT ${PUBLIC_FIELDS}
    FROM inventory
    WHERE TRIM(LOWER(status)) IN (${publicStatusPlaceholders()})
    ORDER BY id DESC
  `;

  db.all(sql, PUBLIC_STATUSES, (err, rows) => {
    if (err) {
      console.error("Could not load all gallery pieces:", err);

      return res.status(500).json({
        ok: false,
        error: err.message,
      });
    }

    res.json(rows || []);
  });
});

app.post("/api/save-curation", async (req, res) => {
  try {
    const beforeRegistration = await getRegistrationState();

    if (!beforeRegistration.registered) {
      throw new Error(
        `REGISTRATION LOCK: Save blocked. Render is not restored from SiteGround truth. ${beforeRegistration.message}`
      );
    }

    const piece = req.body.piece || req.body;
    const pieces = Array.isArray(req.body.pieces) ? req.body.pieces : null;

    let savedPieces = [];
    let filesToDeploy = [];

    const sgPublicHtml =
      process.env.SG_PUBLIC_HTML || "/home/customer/www/claycraze.com/public_html";

    if (pieces) {
      for (const p of pieces) {
        savedPieces.push(await upsertPiece(p));
      }
    } else {
      const parsed = parsePieceId(piece.id);
      const id = parsed.id;

      const topFullPath = path.join(FULL_DIR, `${id}_top.jpg`);
      const bottomFullPath = path.join(FULL_DIR, `${id}_bottom.jpg`);
      const topThumbPath = path.join(THUMBS_DIR, `${id}_top_thumb.jpg`);

      if (piece.top_image_data) {
        saveDataUrlImage(piece.top_image_data, topFullPath);

        fs.copyFileSync(topFullPath, topThumbPath);

        piece.image_path = `/images/thumbs/${id}_top_thumb.jpg`;
        piece.image_path_2 = `/images/full/${id}_top.jpg`;

        filesToDeploy.push(
          {
            localPath: topFullPath,
            remotePath: `${sgPublicHtml}/images/full/${id}_top.jpg`,
          },
          {
            localPath: topThumbPath,
            remotePath: `${sgPublicHtml}/images/thumbs/${id}_top_thumb.jpg`,
          }
        );
      }

      if (piece.bottom_image_data) {
        saveDataUrlImage(piece.bottom_image_data, bottomFullPath);

        piece.image_path_3 = `/images/full/${id}_bottom.jpg`;

        filesToDeploy.push({
          localPath: bottomFullPath,
          remotePath: `${sgPublicHtml}/images/full/${id}_bottom.jpg`,
        });
      }

      delete piece.top_image_data;
      delete piece.bottom_image_data;

      savedPieces.push(await upsertPiece(piece));
    }

    const exported = await exportPiecesJsonPromise();

    const afterRegistration = await getRegistrationState();

    if (!afterRegistration.registered) {
      throw new Error(
        `POST-SAVE REGISTRATION FAILURE: DB has ${afterRegistration.render_public_db_count}, but pieces.json has ${afterRegistration.local_pieces_json_count}. Save not confirmed.`
      );
    }

    filesToDeploy.push({
      localPath: exported.outPath,
      remotePath: `${sgPublicHtml}/data/pieces.json`,
    });

    try {
      await deployToSiteGround(filesToDeploy);
    } catch (deployErr) {
      console.error("SITEGROUND DEPLOY FAILURE:", deployErr);

      return res.status(500).json({
        ok: false,
        archived: false,
        temporary_render_save_only: true,
        error:
          "TEMPORARY SAVE ONLY: Render updated, but SiteGround publish failed. This record is NOT canonical truth yet.",
        deploy_error: deployErr.message || "",
        stdout: deployErr.stdout || "",
        stderr: deployErr.stderr || "",
        saved_count: savedPieces.length,
        exported_count: exported.count,
        registration: afterRegistration,
        pieces: savedPieces,
      });
    }
    let sgPieces;

    try {
      sgPieces = await fetchPiecesJsonFromSiteGround();
    } catch (verifyErr) {
      throw new Error(
        `SITEGROUND VERIFY FAILED: Could not fetch canonical pieces.json after publish. ${verifyErr.message}`
      );
    }

    for (const saved of savedPieces) {
      const found = sgPieces.find((p) => p.id === saved.id);

      if (!found) {
        throw new Error(
          `SITEGROUND VERIFY FAILED: ${saved.id} was saved in Render but not found in SiteGround pieces.json.`
        );
      }
    }
    
    res.json({
      ok: true,
      archived: true,
      deployed_to_siteground: true,
      message:
        "Truth confirmed: DB saved, pieces.json exported, SiteGround archive updated, and canonical record verified.",
      saved_count: savedPieces.length,
      exported_count: exported.count,
      registration: afterRegistration,
      pieces: savedPieces,
    });
  } catch (err) {
    console.error("SAVE CURATION ERROR:", err);

    res.status(500).json({
      ok: false,
      archived: false,
      error: err.message || "Could not save curatorial changes.",
    });
  }
});

   // <-- end of save-curation


app.post("/api/save-tree", async (req, res) => {
   try {
    const tree = req.body.tree || req.body;

    if (!tree.title) {
      return res.status(400).json({
        ok: false,
        error: "Tree title is required."
      });
    }

    const treesPath = path.join(DATA_DIR, "trees.json");

    let trees = [];
    if (fs.existsSync(treesPath)) {
      trees = JSON.parse(fs.readFileSync(treesPath, "utf8"));
      if (!Array.isArray(trees)) trees = [];
    }

    const safeTitle = String(tree.title || "tree").trim();
    const id =
      tree.id ||
      safeTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const treeImagePath = path.join(TREES_DIR, `${id}.jpg`);

if (tree.tree_image_data) {
  saveDataUrlImage(tree.tree_image_data, treeImagePath);
  tree.image_path = `/images/trees/${id}.jpg`;
  delete tree.tree_image_data;
} 
    const savedTree = {
      ...tree,
      id,
      updated_at: new Date().toISOString()
    };

    const index = trees.findIndex((t) => t.id === id);

    if (index >= 0) {
      trees[index] = {
        ...trees[index],
        ...savedTree
      };
    } else {
      savedTree.created_at = savedTree.updated_at;
      trees.push(savedTree);
    }

    fs.writeFileSync(treesPath, JSON.stringify(trees, null, 2), "utf8");

    res.json({
      ok: true,
      message: "Tree saved successfully.",
      tree: savedTree
    });
  } catch (err) {
    console.error("SAVE TREE ERROR:", err);

    res.status(500).json({
      ok: false,
      error: err.message || "Could not save tree."
    });
  }
});



app.get("/admin/restore-from-siteground", async (req, res) => {
  try {
    const restored = await restoreFromSiteGround();
    const registration = await getRegistrationState();

    res.json({
      ok: true,
      restored,
      registration,
      message:
        "Render SQLite and local pieces.json restored from SiteGround canonical archive.",
    });
  } catch (err) {
    console.error("RESTORE FROM SITEGROUND ERROR:", err);

    STARTUP_RESTORE = {
      ok: false,
      source: SG_PUBLIC_DATA_URL,
      count: 0,
      message: err.message,
      time: new Date().toISOString(),
    };

    res.status(500).json({
      ok: false,
      error: err.message,
      message:
        "Could not restore from SiteGround. Do not save new records until this is fixed.",
    });
  }
});

app.get("/admin/import-public-json", async (req, res) => {
  try {
    const imported = await importLocalPiecesJsonIntoDb();
    const exported = await exportPiecesJsonPromise({ allowShrink: true });
    const registration = await getRegistrationState();

    res.json({
      ok: true,
      source: imported.source,
      imported: imported.imported,
      exported_count: exported.count,
      registration,
      warning:
        "Local import completed. This is not canonical truth unless it came from SiteGround.",
      message:
        "Render SQLite database repopulated from local public/data/pieces.json",
    });
  } catch (err) {
    console.error("IMPORT LOCAL JSON ERROR:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/admin/register-siteground", async (req, res) => {
  try {
    const registration = await getRegistrationState();

    if (!registration.registered) {
      return res.status(409).json({
        ok: false,
        error:
          "Refusing to publish to SiteGround because Render is not registered from SiteGround truth.",
        registration,
      });
    }

    const sgPublicHtml =
      process.env.SG_PUBLIC_HTML || "/home/customer/www/claycraze.com/public_html";

    const exported = await exportPiecesJsonPromise();

    const localPiecesPath = exported.outPath;

    if (!fs.existsSync(localPiecesPath)) {
      return res.status(404).json({
        ok: false,
        error: `Local pieces.json not found at ${localPiecesPath}`,
      });
    }

    const raw = fs.readFileSync(localPiecesPath, "utf8");
    const pieces = JSON.parse(raw);

    if (!Array.isArray(pieces)) {
      return res.status(400).json({
        ok: false,
        error: "Local pieces.json did not contain an array",
      });
    }

    await deployToSiteGround([
      {
        localPath: localPiecesPath,
        remotePath: `${sgPublicHtml}/data/pieces.json`,
      },
    ]);

    res.json({
      ok: true,
      archived: true,
      registered_with_siteground: true,
      local_source: localPiecesPath,
      remote_target: `${sgPublicHtml}/data/pieces.json`,
      count: pieces.length,
      registration,
      message: "SiteGround public data/pieces.json refreshed from Render.",
    });
  } catch (err) {
    console.error("REGISTER SITEGROUND ERROR:", err);

    res.status(500).json({
      ok: false,
      archived: false,
      error: err.message,
      stdout: err.stdout || "",
      stderr: err.stderr || "",
    });
  }
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`ClaycrazE admin running on port ${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`Curate: http://localhost:${PORT}/admin/curate.html`);
  console.log(`Deploy health: http://localhost:${PORT}/deploy-health`);
  console.log(`SiteGround truth source: ${SG_PUBLIC_DATA_URL}`);

  try {
    await restoreFromSiteGround();
  } catch (err) {
    console.error("STARTUP SITEGROUND RESTORE FAILED:", err);

    STARTUP_RESTORE = {
      ok: false,
      source: SG_PUBLIC_DATA_URL,
      count: 0,
      message: err.message,
      time: new Date().toISOString(),
    };

    console.error(
      "TRUTH LOCK: Render did not restore from SiteGround. Saves will be blocked."
    );
  }
});