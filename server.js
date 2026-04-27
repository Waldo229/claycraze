const express = require("express");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const multer = require("multer");
const sharp = require("sharp");

const app = express();
const PORT = process.env.PORT || 3010;

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const PIECES_FILE = path.join(DATA_DIR, "pieces.json");
const FULL_DIR = path.join(PUBLIC_DIR, "images", "full");
const THUMB_DIR = path.join(PUBLIC_DIR, "images", "thumbs");
const TMP_DIR = path.join(ROOT, "tmp_uploads");

for (const dir of [DATA_DIR, FULL_DIR, THUMB_DIR, TMP_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

if (!fs.existsSync(PIECES_FILE)) {
  fs.writeFileSync(PIECES_FILE, "[]\n");
}

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, or WEBP images are allowed."));
  }
});

async function readPieces() {
  try {
    const raw = await fsp.readFile(PIECES_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

async function writePieces(pieces) {
  await fsp.writeFile(PIECES_FILE, JSON.stringify(pieces, null, 2) + "\n");
}

function normalizeShape(shape) {
  const s = String(shape || "OV").toUpperCase().replace(/[^A-Z]/g, "");
  return s || "OV";
}

function currentYYMM() {
  const d = new Date();
  return (
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0")
  );
}

async function nextPieceId(shapeRaw) {
  const shape = normalizeShape(shapeRaw);
  const yymm = currentYYMM();
  const prefix = `${shape}-${yymm}-`;

  const pieces = await readPieces();

  const nums = pieces
    .map(p => String(p.id || ""))
    .filter(id => id.startsWith(prefix))
    .map(id => parseInt(id.slice(prefix.length), 10))
    .filter(Number.isFinite);

  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}

async function saveImagePair(file, outBase) {
  if (!file) return null;

  const fullName = `${outBase}.jpg`;
  const thumbName = `${outBase}_thumb.jpg`;

  const fullPath = path.join(FULL_DIR, fullName);
  const thumbPath = path.join(THUMB_DIR, thumbName);

  try {
    await sharp(file.path)
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true
      })
      .jpeg({
        quality: 88,
        mozjpeg: true
      })
      .toFile(fullPath);

    await sharp(file.path)
      .rotate()
      .resize(700, 700, {
        fit: "cover",
        position: "centre"
      })
      .jpeg({
        quality: 82,
        mozjpeg: true
      })
      .toFile(thumbPath);

    await fsp.unlink(file.path).catch(() => {});

    return {
      full: `/images/full/${fullName}`,
      thumb: `/images/thumbs/${thumbName}`
    };
  } catch (err) {
    console.error("Image processing failed:", err);
    throw new Error(`Image processing failed for ${file.originalname}: ${err.message}`);
  }
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function colorsArray(value) {
  return String(value || "")
    .split(",")
    .map(c => c.trim().toLowerCase())
    .filter(Boolean);
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get(["/admin", "/admin/"], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin", "index.html"));
});

app.get("/api/pieces", async (req, res, next) => {
  try {
    let pieces = await readPieces();

    if (req.query.shape) {
      const shape = normalizeShape(req.query.shape);
      pieces = pieces.filter(p => normalizeShape(p.shape) === shape);
    }

    res.json({ ok: true, pieces });
  } catch (err) {
    next(err);
  }
});

app.get("/api/next-piece-number", async (req, res, next) => {
  try {
    const id = await nextPieceId(req.query.shape || "OV");
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

app.post("/api/suggest-critique", async (req, res) => {
  const {
    shape = "oval",
    dimensions = "",
    description = ""
  } = req.body || {};

  const note = [
    `This ${String(shape).toLowerCase()} form reads with a quiet, serviceable presence.`,
    dimensions
      ? `At ${dimensions}, its proportions should be considered in relation to the visual weight of the tree it will support.`
      : `Its proportions should be considered in relation to the visual weight of the tree it will support.`,
    `The strongest note is the relationship between rim, body, and foot: the piece should feel settled without becoming heavy.`,
    description
      ? `The description already points toward its character; the final note should stay specific and avoid overexplaining the object.`
      : `A final note should stay specific, observational, and restrained.`
  ].join(" ");

  res.json({ ok: true, note });
});

app.post(
  "/api/pieces",
  upload.fields([
    { name: "topImage", maxCount: 1 },
    { name: "bottomImage", maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const shape = normalizeShape(req.body.shape || "OV");
      const id = await nextPieceId(shape);

      const top = await saveImagePair(
        req.files?.topImage?.[0],
        `${id}_top`
      );

      const bottom = await saveImagePair(
        req.files?.bottomImage?.[0],
        `${id}_bottom`
      );

      const piece = {
        id,
        shape,
        title: String(req.body.title || "Untitled").trim(),
        dimensions: String(req.body.dimensions || "").trim(),

        length: numberOrNull(req.body.length),
        width: numberOrNull(req.body.width),
        height: numberOrNull(req.body.height),
        surface: String(req.body.surface || "").trim().toLowerCase(),
        colors: colorsArray(req.body.colors),
        useType: String(req.body.useType || "").trim().toLowerCase(),

        description: String(req.body.description || "").trim(),
        studioNote: String(req.body.studioNote || "").trim(),
        price: String(req.body.price || "").trim(),
        status: String(req.body.status || "available").trim().toLowerCase(),

        images: { top, bottom },
        createdAt: new Date().toISOString()
      };

      const pieces = await readPieces();
      pieces.push(piece);
      await writePieces(pieces);

      res.json({ ok: true, piece });
    } catch (err) {
      next(err);
    }
  }
);

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    ok: false,
    error: err.message || "Server error"
  });
});

app.listen(PORT, () => {
  console.log(`ClaycrazE server running on port ${PORT}`);
});