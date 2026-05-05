const express = require("express");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const sharp = require("sharp");
const { execFile } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = __dirname;
const INCOMING_DIR = path.join(ROOT, "incoming");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");
const FULL_DIR = path.join(PUBLIC_DIR, "images", "full");
const THUMBS_DIR = path.join(PUBLIC_DIR, "images", "thumbs");
const ARCHIVE_DIR = path.join(PUBLIC_DIR, "images", "archive");
const PIECES_FILE = path.join(DATA_DIR, "pieces.json");
const SALES_FILE = path.join(DATA_DIR, "sales.json");
const CUSTOMERS_FILE = path.join(DATA_DIR, "customers.json");

app.use(express.json({ limit: "1mb" }));
app.use("/admin", express.static(path.join(ROOT, "admin")));
app.use("/images", express.static(path.join(PUBLIC_DIR, "images")));
app.use("/incoming", express.static(INCOMING_DIR));
app.use("/data", express.static(DATA_DIR));

app.get("/", (_req, res) => res.redirect("/admin"));

const SHAPES = {
  OV: "Oval",
  RC: "Rectangle",
  RD: "Round",
  CS: "Cascade",
  SL: "Slab",
  FJ: "Face Jug"
};

async function ensureDirs() {
  for (const dir of [INCOMING_DIR, DATA_DIR, FULL_DIR, THUMBS_DIR, ARCHIVE_DIR]) {
    await fsp.mkdir(dir, { recursive: true });
  }
  for (const file of [PIECES_FILE, SALES_FILE, CUSTOMERS_FILE]) {
    if (!fs.existsSync(file)) await fsp.writeFile(file, "[]\n", "utf8");
  }
}

async function readJson(file) {
  await ensureDirs();
  const raw = await fsp.readFile(file, "utf8");
  try { return JSON.parse(raw || "[]"); }
  catch { return []; }
}

async function writeJson(file, data) {
  await fsp.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function cleanIncomingName(name) {
  const base = path.basename(String(name || ""));
  if (!/\.(jpe?g|png|webp)$/i.test(base)) return null;
  return base;
}

function yearMonthNow() {
  const d = new Date();
  return String(d.getFullYear()).slice(-2) + String(d.getMonth() + 1).padStart(2, "0");
}

function nextPieceId(pieces, shape, yearMonth) {
  const prefix = `${shape}${yearMonth}-`;
  let max = 0;
  for (const piece of pieces) {
    const id = String(piece.piece_id || "");
    if (id.startsWith(prefix)) {
      const n = Number(id.slice(prefix.length));
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function imageToJpeg(src, dest, width = null) {
  let pipeline = sharp(src).rotate().jpeg({ quality: 88, mozjpeg: true });
  if (width) pipeline = pipeline.resize({ width, withoutEnlargement: true });
  await pipeline.toFile(dest);
}

async function archiveOriginal(src, id, role) {
  const ext = path.extname(src).toLowerCase() || ".jpg";
  const archiveName = `${id}_original_${role}${ext}`;
  const archivePath = path.join(ARCHIVE_DIR, archiveName);
  await fsp.copyFile(src, archivePath);
  return `/images/archive/${archiveName}`;
}

app.get("/api/shapes", (_req, res) => res.json({ ok: true, shapes: SHAPES }));

app.get("/api/incoming-images", async (_req, res) => {
  try {
    await ensureDirs();
    const files = await fsp.readdir(INCOMING_DIR);
    const images = files
      .filter((file) => cleanIncomingName(file))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => ({ filename: file, url: `/incoming/${encodeURIComponent(file)}` }));
    res.json({ ok: true, images });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/next-id", async (req, res) => {
  try {
    const shape = String(req.query.shape || "").toUpperCase();
    const yearMonth = String(req.query.yearMonth || yearMonthNow());
    if (!SHAPES[shape]) return res.status(400).json({ ok: false, error: "Unknown shape code." });
    if (!/^\d{4}$/.test(yearMonth)) return res.status(400).json({ ok: false, error: "Year/month must be YYMM." });
    const pieces = await readJson(PIECES_FILE);
    res.json({ ok: true, piece_id: nextPieceId(pieces, shape, yearMonth) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/pieces", async (_req, res) => {
  try {
    const [pieces, sales] = await Promise.all([readJson(PIECES_FILE), readJson(SALES_FILE)]);
    const soldIds = new Set(sales.map((s) => s.piece_id));
    res.json({ ok: true, pieces: pieces.map((p) => ({ ...p, availability: soldIds.has(p.piece_id) ? "SOLD" : "Available" })) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/pieces", async (req, res) => {
  try {
    const body = req.body || {};
    const shape = String(body.shape || "").toUpperCase();
    const yearMonth = String(body.year_month || yearMonthNow());
    const dimensions = String(body.dimensions || "").trim();
    const topName = cleanIncomingName(body.top_image);
    const bottomName = cleanIncomingName(body.bottom_image);
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const price = String(body.price || "").trim();
    const notes = String(body.notes || "").trim();
    const published = Boolean(body.published);

    if (!SHAPES[shape]) return res.status(400).json({ ok: false, error: "Shape is required." });
    if (!/^\d{4}$/.test(yearMonth)) return res.status(400).json({ ok: false, error: "Year/month must be YYMM." });
    if (!dimensions) return res.status(400).json({ ok: false, error: "Dimensions are required." });
    if (!topName) return res.status(400).json({ ok: false, error: "Top image is required." });
    if (published && (!title || !description || !price)) {
      return res.status(400).json({ ok: false, error: "Published pieces need title, description, and price." });
    }

    const topSrc = path.join(INCOMING_DIR, topName);
    const bottomSrc = bottomName ? path.join(INCOMING_DIR, bottomName) : null;
    if (!fs.existsSync(topSrc)) return res.status(400).json({ ok: false, error: "Top image not found in incoming folder." });
    if (bottomSrc && !fs.existsSync(bottomSrc)) return res.status(400).json({ ok: false, error: "Bottom image not found in incoming folder." });

    const pieces = await readJson(PIECES_FILE);
    const pieceId = nextPieceId(pieces, shape, yearMonth);

    const topFullName = `${pieceId}_top.jpg`;
    const topThumbName = `${pieceId}_top_thumb.jpg`;
    const bottomFullName = bottomName ? `${pieceId}_bottom.jpg` : null;

    await imageToJpeg(topSrc, path.join(FULL_DIR, topFullName));
    await imageToJpeg(topSrc, path.join(THUMBS_DIR, topThumbName), 640);
    const topArchive = await archiveOriginal(topSrc, pieceId, "top");

    let bottomArchive = null;
    if (bottomSrc && bottomFullName) {
      await imageToJpeg(bottomSrc, path.join(FULL_DIR, bottomFullName));
      bottomArchive = await archiveOriginal(bottomSrc, pieceId, "bottom");
    }

    const now = new Date().toISOString();
    const record = {
      piece_id: pieceId,
      shape,
      shape_label: SHAPES[shape],
      title,
      description,
      dimensions,
      price,
      notes,
      published,
      images: {
        top: `/images/full/${topFullName}`,
        top_thumb: `/images/thumbs/${topThumbName}`,
        bottom: bottomFullName ? `/images/full/${bottomFullName}` : null,
        archive_top: topArchive,
        archive_bottom: bottomArchive
      },
      created_date: now,
      updated_date: now
    };

    pieces.push(record);
    await writeJson(PIECES_FILE, pieces);

    await fsp.rm(topSrc, { force: true });
    if (bottomSrc) await fsp.rm(bottomSrc, { force: true });

    res.json({ ok: true, piece: record });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/sales", async (req, res) => {
  try {
    const body = req.body || {};
    const pieceId = String(body.piece_id || "").trim();
    const customerName = String(body.customer_name || "").trim();
    if (!pieceId || !customerName) return res.status(400).json({ ok: false, error: "Piece ID and customer name are required." });

    const [pieces, customers, sales] = await Promise.all([readJson(PIECES_FILE), readJson(CUSTOMERS_FILE), readJson(SALES_FILE)]);
    if (!pieces.some((p) => p.piece_id === pieceId)) return res.status(404).json({ ok: false, error: "Piece ID not found." });
    if (sales.some((s) => s.piece_id === pieceId)) return res.status(409).json({ ok: false, error: "Piece already has a sale record." });

    const customerId = `C${String(customers.length + 1).padStart(5, "0")}`;
    const saleId = `S${String(sales.length + 1).padStart(5, "0")}`;
    const customer = {
      customer_id: customerId,
      name: customerName,
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim(),
      address: String(body.address || "").trim(),
      notes: String(body.customer_notes || "").trim(),
      created_date: new Date().toISOString()
    };
    const sale = {
      sale_id: saleId,
      piece_id: pieceId,
      customer_id: customerId,
      sale_price: String(body.sale_price || "").trim(),
      payment_method: String(body.payment_method || "").trim(),
      sale_date: String(body.sale_date || new Date().toISOString().slice(0, 10)),
      notes: String(body.sale_notes || "").trim()
    };
    customers.push(customer);
    sales.push(sale);
    await Promise.all([writeJson(CUSTOMERS_FILE, customers), writeJson(SALES_FILE, sales)]);
    res.json({ ok: true, customer, sale });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/deploy", (_req, res) => {
  const deployScript = path.join(ROOT, "deploy.sh");
  execFile(deployScript, [], { cwd: ROOT, timeout: 180000 }, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ ok: false, error: stderr || error.message, output: stdout });
    res.json({ ok: true, output: stdout });
  });
});

ensureDirs().then(() => {
  app.listen(PORT, () => console.log(`ClaycrazE admin running at http://localhost:${PORT}/admin`));
});
