const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const multer = require("multer");
const sharp = require("sharp");

const app = express();
const PORT = process.env.PORT || 3010;

/* -------------------------
   PATHS
-------------------------- */
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const IMAGES_DIR = path.join(PUBLIC_DIR, "images");
const FULL_DIR = path.join(IMAGES_DIR, "full");
const THUMBS_DIR = path.join(IMAGES_DIR, "thumbs");
const DB_PATH = path.join(ROOT_DIR, "claycraze_inventory.db");

/* -------------------------
   DATABASE
-------------------------- */
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Could not open database:", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite database.");
});

/* -------------------------
   DATABASE SETUP
-------------------------- */
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS uploaded_pieces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      piece_id TEXT NOT NULL UNIQUE,
      title TEXT,
      top_full_path TEXT,
      top_thumb_path TEXT,
      bottom_full_path TEXT,
      bottom_thumb_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

/* -------------------------
   HELPERS
-------------------------- */
function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

ensureDirSync(PUBLIC_DIR);
ensureDirSync(IMAGES_DIR);
ensureDirSync(FULL_DIR);
ensureDirSync(THUMBS_DIR);

function sanitizePieceId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "");
}

function sanitizeTitle(value) {
  return String(value || "").trim();
}

function fileUrlFromRelative(relativePath) {
  return "/" + relativePath.replace(/\\/g, "/");
}

async function processImageBuffer(buffer, fullOutputPath, thumbOutputPath) {
  // Full image: contained within 1600x1600, good quality JPEG
  await sharp(buffer)
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(fullOutputPath);

  // Thumbnail: contained within 420x420
  await sharp(buffer)
    .rotate()
    .resize({
      width: 420,
      height: 420,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(thumbOutputPath);
}

function upsertPieceRecord(piece) {
  const sql = `
    INSERT INTO uploaded_pieces (
      piece_id,
      title,
      top_full_path,
      top_thumb_path,
      bottom_full_path,
      bottom_thumb_path
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(piece_id) DO UPDATE SET
      title = excluded.title,
      top_full_path = excluded.top_full_path,
      top_thumb_path = excluded.top_thumb_path,
      bottom_full_path = excluded.bottom_full_path,
      bottom_thumb_path = excluded.bottom_thumb_path
  `;

  const params = [
    piece.pieceId,
    piece.title,
    piece.topFullPath,
    piece.topThumbPath,
    piece.bottomFullPath,
    piece.bottomThumbPath
  ];

  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function getAllPieces() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT
        id,
        piece_id,
        title,
        top_full_path,
        top_thumb_path,
        bottom_full_path,
        bottom_thumb_path,
        created_at
      FROM uploaded_pieces
      ORDER BY created_at DESC, id DESC
      `,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      }
    );
  });
}

/* -------------------------
   MIDDLEWARE
-------------------------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* Public website root */
app.use(express.static(PUBLIC_DIR));

/* Optional extra image mount if you still use a root-level images folder */
app.use("/images", express.static(path.join(ROOT_DIR, "images")));

/* -------------------------
   FILE UPLOAD SETUP
-------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB per file
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/tiff",
      "image/heic",
      "image/heif"
    ]);

    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
});

/* -------------------------
   ROUTES
-------------------------- */

/**
 * Health check
 */
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "claycraze",
    time: new Date().toISOString()
  });
});

/**
 * List uploaded pieces
 */
app.get("/api/pieces", async (req, res) => {
  try {
    const rows = await getAllPieces();
    res.json({
      ok: true,
      count: rows.length,
      pieces: rows.map((row) => ({
        id: row.id,
        pieceId: row.piece_id,
        title: row.title,
        topFullUrl: row.top_full_path ? fileUrlFromRelative(row.top_full_path) : null,
        topThumbUrl: row.top_thumb_path ? fileUrlFromRelative(row.top_thumb_path) : null,
        bottomFullUrl: row.bottom_full_path ? fileUrlFromRelative(row.bottom_full_path) : null,
        bottomThumbUrl: row.bottom_thumb_path ? fileUrlFromRelative(row.bottom_thumb_path) : null,
        createdAt: row.created_at
      }))
    });
  } catch (err) {
    console.error("Failed to fetch pieces:", err);
    res.status(500).json({
      ok: false,
      error: "Failed to fetch uploaded pieces."
    });
  }
});

/**
 * Upload a piece with top and/or bottom image
 *
 * Expected form-data fields:
 * - pieceId (required)
 * - title (optional)
 * - topImage (optional file)
 * - bottomImage (optional file)
 */
app.post(
  "/admin/upload-piece",
  upload.fields([
    { name: "topImage", maxCount: 1 },
    { name: "bottomImage", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const pieceId = sanitizePieceId(req.body.pieceId);
      const title = sanitizeTitle(req.body.title);

      if (!pieceId) {
        return res.status(400).json({
          ok: false,
          error: "pieceId is required."
        });
      }

      const topFile = req.files?.topImage?.[0] || null;
      const bottomFile = req.files?.bottomImage?.[0] || null;

      if (!topFile && !bottomFile) {
        return res.status(400).json({
          ok: false,
          error: "Upload at least one file: topImage or bottomImage."
        });
      }

      let topFullPath = null;
      let topThumbPath = null;
      let bottomFullPath = null;
      let bottomThumbPath = null;

      if (topFile) {
        const topFullFilename = `${pieceId}_top.jpg`;
        const topThumbFilename = `${pieceId}_top_thumb.jpg`;

        const topFullOutputPath = path.join(FULL_DIR, topFullFilename);
        const topThumbOutputPath = path.join(THUMBS_DIR, topThumbFilename);

        await processImageBuffer(topFile.buffer, topFullOutputPath, topThumbOutputPath);

        topFullPath = path.join("images", "full", topFullFilename);
        topThumbPath = path.join("images", "thumbs", topThumbFilename);
      }

      if (bottomFile) {
        const bottomFullFilename = `${pieceId}_bottom.jpg`;
        const bottomThumbFilename = `${pieceId}_bottom_thumb.jpg`;

        const bottomFullOutputPath = path.join(FULL_DIR, bottomFullFilename);
        const bottomThumbOutputPath = path.join(THUMBS_DIR, bottomThumbFilename);

        await processImageBuffer(bottomFile.buffer, bottomFullOutputPath, bottomThumbOutputPath);

        bottomFullPath = path.join("images", "full", bottomFullFilename);
        bottomThumbPath = path.join("images", "thumbs", bottomThumbFilename);
      }

      await upsertPieceRecord({
        pieceId,
        title,
        topFullPath,
        topThumbPath,
        bottomFullPath,
        bottomThumbPath
      });

      res.json({
        ok: true,
        message: "Piece uploaded and processed successfully.",
        piece: {
          pieceId,
          title,
          topFullUrl: topFullPath ? fileUrlFromRelative(topFullPath) : null,
          topThumbUrl: topThumbPath ? fileUrlFromRelative(topThumbPath) : null,
          bottomFullUrl: bottomFullPath ? fileUrlFromRelative(bottomFullPath) : null,
          bottomThumbUrl: bottomThumbPath ? fileUrlFromRelative(bottomThumbPath) : null
        }
      });
    } catch (err) {
      console.error("Upload failed:", err);
      res.status(500).json({
        ok: false,
        error: err.message || "Upload failed."
      });
    }
  }
);

/**
 * Simple delete endpoint by pieceId
 * This deletes DB record and generated image files if they exist.
 */
app.delete("/admin/piece/:pieceId", async (req, res) => {
  try {
    const pieceId = sanitizePieceId(req.params.pieceId);

    if (!pieceId) {
      return res.status(400).json({
        ok: false,
        error: "Invalid pieceId."
      });
    }

    const row = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT
          piece_id,
          top_full_path,
          top_thumb_path,
          bottom_full_path,
          bottom_thumb_path
        FROM uploaded_pieces
        WHERE piece_id = ?
        `,
        [pieceId],
        (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(result || null);
        }
      );
    });

    if (!row) {
      return res.status(404).json({
        ok: false,
        error: "Piece not found."
      });
    }

    const filesToDelete = [
      row.top_full_path,
      row.top_thumb_path,
      row.bottom_full_path,
      row.bottom_thumb_path
    ]
      .filter(Boolean)
      .map((relativePath) => path.join(PUBLIC_DIR, relativePath));

    for (const filePath of filesToDelete) {
      try {
        await fsp.unlink(filePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          throw err;
        }
      }
    }

    await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM uploaded_pieces WHERE piece_id = ?`,
        [pieceId],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });

    res.json({
      ok: true,
      message: `Deleted piece ${pieceId}.`
    });
  } catch (err) {
    console.error("Delete failed:", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Delete failed."
    });
  }
});

/* -------------------------
   ERROR HANDLER
-------------------------- */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      ok: false,
      error: `Upload error: ${err.message}`
    });
  }

  res.status(500).json({
    ok: false,
    error: err.message || "Internal server error."
  });
});
app.get("/admin", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

/* -------------------------
   START SERVER
-------------------------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  if (!process.env.PORT) {
    console.log(`Home: http://localhost:${PORT}/`);
    console.log(`Theory: http://localhost:${PORT}/theory.html`);
    console.log(`Practice: http://localhost:${PORT}/practice.html`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
    console.log(`Bonsai: http://localhost:${PORT}/gallery/bonsai`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Pieces API: http://localhost:${PORT}/api/pieces`);
  }
});