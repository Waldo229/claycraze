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
const DATA_DIR = path.join(PUBLIC_DIR, "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const PUBLIC_IMAGES_DIR = path.join(PUBLIC_DIR, "images");
const TREES_DIR = path.join(PUBLIC_IMAGES_DIR, "trees");
const FULL_DIR = path.join(PUBLIC_IMAGES_DIR, "full");
const THUMBS_DIR = path.join(PUBLIC_IMAGES_DIR, "thumbs");
const BONSAI_DIR = path.join(PUBLIC_IMAGES_DIR, "bonsai");
const BONSAI_FULL_DIR = path.join(BONSAI_DIR, "full");
const BONSAI_THUMBS_DIR = path.join(BONSAI_DIR, "thumbs");
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
const SG_PUBLIC_TREES_URL =
  process.env.SG_PUBLIC_TREES_URL || "https://claycraze.com/data/trees.json";

let TREE_STARTUP_RESTORE = {
  ok: false,
  source: SG_PUBLIC_TREES_URL,
  count: 0,
  message: "Tree startup restore has not run yet.",
  time: null,
};

const SURVEILLANCE_INTERVAL_MINUTES = Math.max(
  1,
  Number.parseInt(process.env.SURVEILLANCE_INTERVAL_MINUTES || "10", 10) || 10
);

const SURVEILLANCE_HISTORY_LIMIT = 50;
const SURVEILLANCE_HISTORY = [];
let SURVEILLANCE_TIMER = null;

// ============================================================
// POTTERY FREEZE / TRUST STATE
// Canonical pottery may grow or change in place, but it may not
// unexpectedly lose records or IDs. A detected loss freezes all
// pottery writes until a human explicitly accepts a recovered state.
// Protection metadata and evidence live privately on SiteGround so
// they survive Render restarts.
// ============================================================

const POTTERY_PROTECTION_REMOTE_DIR =
  process.env.POTTERY_PROTECTION_REMOTE_DIR ||
  "/home/customer/www/claycraze.com/backups/pottery";

const POTTERY_FREEZE_REMOTE_PATH =
  `${POTTERY_PROTECTION_REMOTE_DIR}/POTTERY_FREEZE.json`;

const POTTERY_TRUST_REMOTE_PATH =
  `${POTTERY_PROTECTION_REMOTE_DIR}/POTTERY_TRUST.json`;

let POTTERY_FREEZE_STATE = {
  frozen: false,
  reason: "",
  detected_at: null,
  trigger: "",
  evidence_dir: "",
  missing_ids: [],
};

let POTTERY_TRUST_STATE = null;

for (const dir of [
  PUBLIC_DIR,
  ADMIN_DIR,
  DATA_DIR,
  BACKUP_DIR,
  PUBLIC_IMAGES_DIR,
  FULL_DIR,
  THUMBS_DIR,
  BONSAI_DIR,
  BONSAI_FULL_DIR,
  BONSAI_THUMBS_DIR,
  TREES_DIR,
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
      assigned_to TEXT DEFAULT 'studio',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS trees (
      id TEXT PRIMARY KEY,
      title TEXT,
      species TEXT,
      cultivar TEXT,
      style TEXT,
      person_slug TEXT,
      owner_slug TEXT,
      tree_slug TEXT,
      image_path TEXT,
      page_path TEXT,
      status TEXT DEFAULT 'active',
      owner_credit TEXT,
      pot_credit TEXT,
      display_notes TEXT,
      provenance TEXT,
      description TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

db.run(
  `ALTER TABLE inventory ADD COLUMN assigned_to TEXT DEFAULT 'studio'`,
  (err) => {
    if (err && !String(err.message).includes("duplicate column name")) {
      console.error("Could not add assigned_to column:", err);
    }
  }
);

app.use(express.urlencoded({ extended: true, limit: "80mb" }));
app.use(express.json({ limit: "80mb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Pottery-Freeze-Token");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ============================================================
// LIMITED VENDOR AUTHENTICATION
// Credentials are stored in Render environment variables:
//   CHRIS_VENDOR_USER
//   CHRIS_VENDOR_PASSWORD
// This middleware MUST appear before /admin static files and vendor API routes.
// ============================================================

function secureStringEqual(actual, expected) {
  const crypto = require("crypto");
  const actualBuffer = Buffer.from(String(actual || ""), "utf8");
  const expectedBuffer = Buffer.from(String(expected || ""), "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function requireVendorAuth(req, res, next) {
  const expectedUser = String(process.env.CHRIS_VENDOR_USER || "").trim();
  const expectedPassword = String(
    process.env.CHRIS_VENDOR_PASSWORD || ""
  );

  if (!expectedUser || !expectedPassword) {
    console.error(
      "VENDOR AUTH CONFIGURATION ERROR: Missing CHRIS_VENDOR_USER or CHRIS_VENDOR_PASSWORD."
    );

    return res.status(503).send(
      "Vendor access is temporarily unavailable because authentication is not configured."
    );
  }

  const authorization = String(req.headers.authorization || "");

  if (!authorization.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="ClaycrazE Vendor Pots"');
    res.set("Cache-Control", "no-store");
    return res.status(401).send("Authentication required.");
  }

  let decoded = "";

  try {
    decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
  } catch (_) {
    res.set("WWW-Authenticate", 'Basic realm="ClaycrazE Vendor Pots"');
    res.set("Cache-Control", "no-store");
    return res.status(401).send("Invalid authentication header.");
  }

  const separator = decoded.indexOf(":");
  const suppliedUser = separator >= 0 ? decoded.slice(0, separator) : "";
  const suppliedPassword = separator >= 0 ? decoded.slice(separator + 1) : "";

  const userMatches = secureStringEqual(suppliedUser, expectedUser);
  const passwordMatches = secureStringEqual(suppliedPassword, expectedPassword);

  if (!userMatches || !passwordMatches) {
    res.set("WWW-Authenticate", 'Basic realm="ClaycrazE Vendor Pots"');
    res.set("Cache-Control", "no-store");
    return res.status(401).send("Invalid username or password.");
  }

  req.authenticatedVendor = expectedUser.toLowerCase();
  res.set("Cache-Control", "no-store");
  next();
}

function enforceAuthenticatedVendor(req, res, next) {
  const authenticatedVendor = String(req.authenticatedVendor || "")
    .trim()
    .toLowerCase();

  const requestedVendor = String(
    req.method === "GET" ? req.query.vendor : req.body.vendor
  )
    .trim()
    .toLowerCase();

  if (!requestedVendor) {
    return res.status(400).json({
      ok: false,
      error: "Missing vendor parameter.",
    });
  }

  if (requestedVendor !== authenticatedVendor) {
    return res.status(403).json({
      ok: false,
      error: "This login may access only its assigned vendor inventory.",
    });
  }

  next();
}

// Protect Chris's page before the general /admin static handler can serve it.
app.use(
  "/admin/vendor-pots.html",
  requireVendorAuth
);

// Protect both reading and changing vendor records.
app.use(
  "/api/vendor-pots",
  requireVendorAuth,
  enforceAuthenticatedVendor
);

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
    "SL",
  ].includes(String(shape || "").toUpperCase());
}

function normalizeShapeCode(shape) {
  const raw = String(shape || "").toUpperCase();

  if (raw === "FF") return "FREE";
  if (raw === "IK") return "IKE";
  if (raw === "SC") return "SCULP";
  if (raw === "SLAB") return "SL";

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
  const SG_PORT = process.env.SG_PORT || "18765";
  const SG_PUBLIC_HTML =
    process.env.SG_PUBLIC_HTML || "/home/customer/www/claycraze.com/public_html";

  if (!SG_HOST || !SG_USER || !SG_CI_KEY) {
    throw new Error("Missing SG_HOST, SG_USER, or SG_CI_KEY.");
  }

  return { SG_HOST, SG_PORT, SG_USER, SG_CI_KEY, SG_PUBLIC_HTML };
}

function writeSshKey(keyTextOrPath) {
  const value = String(keyTextOrPath || "").trim();

  if (!value) {
    throw new Error("Missing SSH key text or path.");
  }

  if (fs.existsSync(value)) {
    return value;
  }

  const keyPath = path.join(os.tmpdir(), "sg_ci_key");

  const normalizedKey =
    value
      .replace(/\\n/g, "\n")
      .replace(/\r/g, "")
      .trim() + "\n";

  fs.writeFileSync(keyPath, normalizedKey, {
    mode: 0o600,
  });

  fs.chmodSync(keyPath, 0o600);

  return keyPath;
}

function getSiteGroundSshContext() {
  const { SG_HOST, SG_PORT, SG_USER, SG_CI_KEY } = getSgConfig();
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

  return {
    SG_HOST,
    SG_PORT,
    SG_USER,
    keyPath,
    remote,
    sshArgs,
  };
}

async function readPrivateJsonFromSiteGround(remotePath) {
  const { remote, sshArgs } = getSiteGroundSshContext();

  const { stdout } = await runCommand("ssh", [
    ...sshArgs,
    remote,
    `if [ -f "${remotePath}" ]; then cat "${remotePath}"; fi`,
  ]);

  const raw = String(stdout || "").trim();

  if (!raw) return null;

  return JSON.parse(raw);
}

async function writePrivateJsonToSiteGround(remotePath, value) {
  const { SG_PORT, keyPath, remote, sshArgs } = getSiteGroundSshContext();
  const remoteDir = path.posix.dirname(remotePath);
  const remoteTemp = `${remotePath}.tmp-${process.pid}-${Date.now()}`;
  const localTemp = path.join(
    os.tmpdir(),
    `claycraze-private-${process.pid}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.json`
  );

  fs.writeFileSync(localTemp, JSON.stringify(value, null, 2), "utf8");

  try {
    await runCommand("ssh", [
      ...sshArgs,
      remote,
      `mkdir -p "${remoteDir}"`,
    ]);

    await runCommand("scp", [
      "-P",
      SG_PORT,
      "-i",
      keyPath,
      "-o",
      "StrictHostKeyChecking=no",
      localTemp,
      `${remote}:${remoteTemp}`,
    ]);

    await runCommand("ssh", [
      ...sshArgs,
      remote,
      `mv "${remoteTemp}" "${remotePath}"`,
    ]);
  } finally {
    try {
      fs.unlinkSync(localTemp);
    } catch (_) {
      // Ignore temporary-file cleanup errors.
    }
  }
}

async function removePrivateSiteGroundFile(remotePath) {
  const { remote, sshArgs } = getSiteGroundSshContext();

  await runCommand("ssh", [
    ...sshArgs,
    remote,
    `rm -f "${remotePath}"`,
  ]);
}

function makeProtectionTimestamp() {
  return new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "");
}

function buildPotteryTrustManifest(pieces, source = "verified canonical truth") {
  const ids = [...normalizePieceIdSet(pieces)].sort();

  return {
    version: 1,
    count: Array.isArray(pieces) ? pieces.length : 0,
    ids,
    updated_at: new Date().toISOString(),
    source,
  };
}

async function loadPotteryFreezeStateFromSiteGround() {
  const remoteState = await readPrivateJsonFromSiteGround(
    POTTERY_FREEZE_REMOTE_PATH
  );

  if (remoteState && remoteState.frozen === true) {
    POTTERY_FREEZE_STATE = {
      frozen: true,
      reason: cleanText(remoteState.reason),
      detected_at: remoteState.detected_at || null,
      trigger: cleanText(remoteState.trigger),
      evidence_dir: cleanText(remoteState.evidence_dir),
      missing_ids: Array.isArray(remoteState.missing_ids)
        ? remoteState.missing_ids
        : [],
    };
  } else {
    POTTERY_FREEZE_STATE = {
      frozen: false,
      reason: "",
      detected_at: null,
      trigger: "",
      evidence_dir: "",
      missing_ids: [],
    };
  }

  return POTTERY_FREEZE_STATE;
}

async function loadPotteryTrustStateFromSiteGround() {
  const remoteState = await readPrivateJsonFromSiteGround(
    POTTERY_TRUST_REMOTE_PATH
  );

  if (
    remoteState &&
    Number.isInteger(remoteState.count) &&
    Array.isArray(remoteState.ids)
  ) {
    POTTERY_TRUST_STATE = remoteState;
  } else {
    POTTERY_TRUST_STATE = null;
  }

  return POTTERY_TRUST_STATE;
}

async function writePotteryTrustManifest(pieces, source) {
  const manifest = buildPotteryTrustManifest(pieces, source);

  await writePrivateJsonToSiteGround(
    POTTERY_TRUST_REMOTE_PATH,
    manifest
  );

  POTTERY_TRUST_STATE = manifest;
  return manifest;
}

async function getPotteryFreezeState(options = {}) {
  const refresh = options.refresh !== false;

  if (refresh) {
    try {
      await loadPotteryFreezeStateFromSiteGround();
    } catch (err) {
      console.error("POTTERY FREEZE STATE READ FAILED:", err.message);
      // Fail closed if we cannot confirm that the remote freeze marker is clear.
      POTTERY_FREEZE_STATE = {
        frozen: true,
        reason:
          "Protection state could not be read from SiteGround. Pottery writes are frozen until coherence is restored.",
        detected_at: new Date().toISOString(),
        trigger: "freeze-state-read-failure",
        evidence_dir: "",
        missing_ids: [],
      };
    }
  }

  return { ...POTTERY_FREEZE_STATE };
}

async function assertPotteryWritable(reason = "pottery write") {
  const freeze = await getPotteryFreezeState({ refresh: true });

  if (freeze.frozen) {
    const err = new Error(
      `POTTERY FREEZE: ${reason} blocked. ${freeze.reason || "Canonical pottery truth is frozen pending human review."}`
    );
    err.code = "POTTERY_FREEZE";
    err.freeze = freeze;
    throw err;
  }

  return true;
}

async function requirePotteryWritable(req, res, next) {
  try {
    await assertPotteryWritable(`${req.method} ${req.originalUrl || req.url}`);
    next();
  } catch (err) {
    res.status(423).json({
      ok: false,
      frozen: true,
      error: err.message,
      pottery_freeze: err.freeze || POTTERY_FREEZE_STATE,
    });
  }
}

async function freezePottery(options = {}) {
  const existing = await getPotteryFreezeState({ refresh: true });

  if (existing.frozen) {
    return existing;
  }

  const detectedAt = new Date().toISOString();
  const stamp = makeProtectionTimestamp();
  const evidenceDir =
    `${POTTERY_PROTECTION_REMOTE_DIR}/freeze-events/${stamp}`;

  const siteGroundPieces = Array.isArray(options.siteGroundPieces)
    ? options.siteGroundPieces
    : [];
  const renderPieces = Array.isArray(options.renderPieces)
    ? options.renderPieces
    : [];
  const localPieces =
    options.local && options.local.ok && Array.isArray(options.local.pieces)
      ? options.local.pieces
      : null;

  const missingIds = Array.isArray(options.missingIds)
    ? [...new Set(options.missingIds)].sort()
    : [];

  const state = {
    frozen: true,
    version: 1,
    reason:
      cleanText(options.reason) ||
      "SiteGround canonical pottery unexpectedly lost records or IDs.",
    detected_at: detectedAt,
    trigger: cleanText(options.trigger) || "surveillance",
    evidence_dir: evidenceDir,
    missing_ids: missingIds,
    siteground_count: siteGroundPieces.length,
    render_count: renderPieces.length,
    local_count: localPieces ? localPieces.length : null,
    trusted_count:
      POTTERY_TRUST_STATE && Number.isInteger(POTTERY_TRUST_STATE.count)
        ? POTTERY_TRUST_STATE.count
        : null,
  };

  POTTERY_FREEZE_STATE = {
    frozen: true,
    reason: state.reason,
    detected_at: state.detected_at,
    trigger: state.trigger,
    evidence_dir: state.evidence_dir,
    missing_ids: state.missing_ids,
  };

  const evidenceWrites = [
    writePrivateJsonToSiteGround(
      `${evidenceDir}/siteground-pieces.json`,
      siteGroundPieces
    ),
    writePrivateJsonToSiteGround(
      `${evidenceDir}/render-db-pieces.json`,
      renderPieces
    ),
    writePrivateJsonToSiteGround(
      `${evidenceDir}/freeze.json`,
      state
    ),
  ];

  if (localPieces) {
    evidenceWrites.push(
      writePrivateJsonToSiteGround(
        `${evidenceDir}/local-pieces.json`,
        localPieces
      )
    );
  }

  const evidenceResults = await Promise.allSettled(evidenceWrites);
  const evidenceErrors = evidenceResults
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason?.message || String(result.reason));

  if (evidenceErrors.length > 0) {
    state.evidence_errors = evidenceErrors;
    console.error(
      "POTTERY FREEZE EVIDENCE WRITE ERROR:",
      evidenceErrors.join(" | ")
    );
  }

  await writePrivateJsonToSiteGround(
    POTTERY_FREEZE_REMOTE_PATH,
    state
  );

  console.error("POTTERY FREEZE ENGAGED:", JSON.stringify(state));

  return { ...POTTERY_FREEZE_STATE };
}

async function initializePotteryProtectionState() {
  await loadPotteryFreezeStateFromSiteGround();

  let bootstrapped = false;

  try {
    await loadPotteryTrustStateFromSiteGround();
  } catch (err) {
    console.error("POTTERY TRUST STATE READ FAILED:", err.message);
    POTTERY_TRUST_STATE = null;
  }

  if (POTTERY_FREEZE_STATE.frozen) {
    console.error(
      "POTTERY FREEZE ACTIVE AT STARTUP:",
      JSON.stringify(POTTERY_FREEZE_STATE)
    );
    return {
      freeze: { ...POTTERY_FREEZE_STATE },
      trust: POTTERY_TRUST_STATE,
      bootstrapped,
    };
  }

  if (!POTTERY_TRUST_STATE) {
    const currentPieces = await fetchPiecesJsonViaScp();
    await writePotteryTrustManifest(
      currentPieces,
      "initial protection bootstrap from current SiteGround canonical truth"
    );

    bootstrapped = true;

    console.log(
      `POTTERY TRUST BOOTSTRAP: ${currentPieces.length} canonical record(s) registered.`
    );
  }

  return {
    freeze: { ...POTTERY_FREEZE_STATE },
    trust: POTTERY_TRUST_STATE,
    bootstrapped,
  };
}

function requirePotteryFreezeAdminAuth(req, res, next) {
  const expected = String(
    process.env.POTTERY_FREEZE_ADMIN_TOKEN || ""
  );

  if (!expected) {
    return res.status(503).json({
      ok: false,
      error:
        "POTTERY_FREEZE_ADMIN_TOKEN is not configured. Freeze clearance is unavailable.",
    });
  }

  const supplied =
    String(req.get("X-Pottery-Freeze-Token") || "") ||
    String((req.body && req.body.token) || "");

  if (!secureStringEqual(supplied, expected)) {
    return res.status(403).json({
      ok: false,
      error: "Invalid pottery freeze administration token.",
    });
  }

  next();
}

async function deployToSiteGround(filesToDeploy, options = {}) {
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
   `mkdir -p ${SG_PUBLIC_HTML}/images/full ${SG_PUBLIC_HTML}/images/thumbs ${SG_PUBLIC_HTML}/images/bonsai/full ${SG_PUBLIC_HTML}/images/bonsai/thumbs ${SG_PUBLIC_HTML}/images/trees ${SG_PUBLIC_HTML}/data`
  ]);

  const canonicalPiecesPath = `${SG_PUBLIC_HTML}/data/pieces.json`;
  const allowCanonicalPiecesWrite =
    options.allowCanonicalPiecesWrite === true;

  for (const item of filesToDeploy) {
    if (!item || !item.localPath || !item.remotePath) continue;
    if (!fs.existsSync(item.localPath)) continue;

    if (
      path.posix.normalize(item.remotePath) ===
        path.posix.normalize(canonicalPiecesPath)
    ) {
      if (!allowCanonicalPiecesWrite) {
        throw new Error(
          "CANONICAL POTTERY CHOKEPOINT: deployToSiteGround may not write data/pieces.json directly. Use the canonical pottery transaction."
        );
      }

      await assertPotteryWritable(
        cleanText(options.reason) || "direct canonical pottery deploy"
      );
    }

    const remoteDir = path.posix.dirname(item.remotePath);

    await runCommand("ssh", [
      ...sshArgs,
      remote,
      `mkdir -p ${remoteDir}`,
    ]);

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
async function fetchPiecesJsonViaScp() {
  const { SG_HOST, SG_PORT, SG_USER, SG_CI_KEY, SG_PUBLIC_HTML } =
    getSgConfig();

  const keyPath = writeSshKey(SG_CI_KEY);
  const remote = `${SG_USER}@${SG_HOST}`;
  const remoteJson = `${remote}:${SG_PUBLIC_HTML}/data/pieces.json`;
  const localTempJson = path.join(os.tmpdir(), `pieces-${Date.now()}.json`);

  await runCommand("scp", [
    "-P",
    SG_PORT,
    "-i",
    keyPath,
    "-o",
    "StrictHostKeyChecking=no",
    remoteJson,
    localTempJson,
  ]);

  const raw = fs.readFileSync(localTempJson, "utf8");

  try {
    fs.unlinkSync(localTempJson);
  } catch (_) {
    // Ignore cleanup errors
  }

  const pieces = JSON.parse(raw);

  if (!Array.isArray(pieces)) {
    throw new Error("SCP-restored pieces.json did not contain a JSON array.");
  }

  return pieces;
}


function readPiecesJsonFile(filepath) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Local pieces.json not found: ${filepath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(filepath, "utf8"));

  if (!Array.isArray(parsed)) {
    throw new Error(`Local pieces.json is not a JSON array: ${filepath}`);
  }

  return parsed;
}

function normalizePieceIdSet(pieces) {
  return new Set(
    (Array.isArray(pieces) ? pieces : [])
      .map((piece) => String(piece && piece.id ? piece.id : "").trim().toUpperCase())
      .filter(Boolean)
  );
}

async function assertCanonicalPiecesPublishSafe(localPiecesPath, options = {}) {
  const allowCanonicalShrink = options.allowCanonicalShrink === true;
  const reason = cleanText(options.reason) || "unspecified pottery publish";

  await assertPotteryWritable(reason);

  const proposedPieces = readPiecesJsonFile(localPiecesPath);
  const canonicalPieces = await fetchPiecesJsonViaScp();

  const proposedIds = normalizePieceIdSet(proposedPieces);
  const canonicalIds = normalizePieceIdSet(canonicalPieces);
  const missingCanonicalIds = [...canonicalIds].filter((id) => !proposedIds.has(id));

  if (!allowCanonicalShrink) {
    if (proposedPieces.length < canonicalPieces.length) {
      throw new Error(
        `CANONICAL SHRINK LOCK: Publish blocked during ${reason}. ` +
        `SiteGround currently has ${canonicalPieces.length} records, but the proposed export has ${proposedPieces.length}. ` +
        `A normal save may never reduce canonical truth.`
      );
    }

    if (missingCanonicalIds.length > 0) {
      throw new Error(
        `CANONICAL ID LOCK: Publish blocked during ${reason}. ` +
        `The proposed export is missing ${missingCanonicalIds.length} SiteGround record(s): ` +
        `${missingCanonicalIds.slice(0, 12).join(", ")}` +
        `${missingCanonicalIds.length > 12 ? ", ..." : ""}. ` +
        `Only an explicit deletion workflow may remove canonical IDs.`
      );
    }
  }

  return {
    ok: true,
    allow_canonical_shrink: allowCanonicalShrink,
    canonical_count: canonicalPieces.length,
    proposed_count: proposedPieces.length,
    missing_canonical_ids: missingCanonicalIds,
    reason,
  };
}

async function deployCanonicalPiecesJson(localPiecesPath, options = {}) {
  const sgPublicHtml =
    process.env.SG_PUBLIC_HTML || "/home/customer/www/claycraze.com/public_html";

  const safety = await assertCanonicalPiecesPublishSafe(localPiecesPath, options);

  await deployToSiteGround(
    [
      {
        localPath: localPiecesPath,
        remotePath: `${sgPublicHtml}/data/pieces.json`,
      },
    ],
    {
      allowCanonicalPiecesWrite: true,
      reason: safety.reason,
    }
  );

  const confirmedPieces = await fetchPiecesJsonViaScp();
  const proposedPieces = readPiecesJsonFile(localPiecesPath);

  if (confirmedPieces.length !== proposedPieces.length) {
    throw new Error(
      `SITEGROUND VERIFY FAILED: Published pieces.json has ${confirmedPieces.length} records, ` +
      `but the proposed canonical export has ${proposedPieces.length}.`
    );
  }

  const confirmedIds = normalizePieceIdSet(confirmedPieces);
  const proposedIds = normalizePieceIdSet(proposedPieces);
  const missingAfterPublish = [...proposedIds].filter((id) => !confirmedIds.has(id));

  if (missingAfterPublish.length > 0) {
    throw new Error(
      `SITEGROUND VERIFY FAILED: Canonical publish is missing proposed record(s): ` +
      `${missingAfterPublish.slice(0, 12).join(", ")}` +
      `${missingAfterPublish.length > 12 ? ", ..." : ""}.`
    );
  }

  return {
    ...safety,
    deployed_to_siteground: true,
    verified_count: confirmedPieces.length,
  };
}

// ============================================================
// CANONICAL POTTERY TRANSACTION
// SiteGround pieces.json is the durable source of truth.
// Render SQLite and local pieces.json are disposable working copies.
// Every normal save reads SiteGround, merges by ID, atomically replaces
// the canonical file, verifies it, and then refreshes the working copies.
// ============================================================

let CANONICAL_PIECES_WRITE_CHAIN = Promise.resolve();

function normalizeCanonicalPiece(piece) {
  const parsed = parsePieceId(piece.id);

  return {
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
    assigned_to: cleanText(piece.assigned_to) || "studio",
  };
}

function sortCanonicalPieces(pieces) {
  return [...pieces].sort((a, b) => {
    const shapeCompare = String(a.shape || "").localeCompare(
      String(b.shape || "")
    );

    if (shapeCompare !== 0) return shapeCompare;

    return Number(b.piece_number || 0) - Number(a.piece_number || 0);
  });
}

async function syncWorkingCopiesFromCanonical(pieces) {
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
    message:
      "Render working copies refreshed from verified SiteGround canonical truth.",
    time: new Date().toISOString(),
  };

  return {
    local_path: localPath,
    imported,
    render_public_db_count: dbCount,
  };
}

async function performCanonicalPiecesMerge(updates, options = {}) {
  const reason = cleanText(options.reason) || "pottery save";
  const updateList = Array.isArray(updates) ? updates : [updates];

  await assertPotteryWritable(reason);

  if (updateList.length === 0) {
    throw new Error("Canonical merge requires at least one pottery record.");
  }

  const canonicalBefore = await fetchPiecesJsonViaScp();
  const canonicalBeforeIds = normalizePieceIdSet(canonicalBefore);
  const mergedById = new Map();

  for (const existing of canonicalBefore) {
    const id = cleanText(existing && existing.id).toUpperCase();
    if (id) mergedById.set(id, existing);
  }

  const normalizedUpdates = updateList.map(normalizeCanonicalPiece);

  for (const update of normalizedUpdates) {
    if (!PUBLIC_STATUSES.includes(update.status)) {
      throw new Error(
        `NORMAL SAVE BLOCKED: ${update.id} has non-public status "${update.status}". ` +
        `Removing a canonical record requires an explicit archive/delete workflow.`
      );
    }

    mergedById.set(update.id, update);
  }

  const mergedPieces = sortCanonicalPieces([...mergedById.values()]);
  const mergedIds = normalizePieceIdSet(mergedPieces);
  const missingOldIds = [...canonicalBeforeIds].filter(
    (id) => !mergedIds.has(id)
  );

  if (missingOldIds.length > 0) {
    throw new Error(
      `CANONICAL MERGE BLOCKED during ${reason}: existing SiteGround IDs would disappear: ` +
      `${missingOldIds.slice(0, 12).join(", ")}`
    );
  }

  const { SG_HOST, SG_PORT, SG_USER, SG_CI_KEY, SG_PUBLIC_HTML } =
    getSgConfig();

  const keyPath = writeSshKey(SG_CI_KEY);
  const remote = `${SG_USER}@${SG_HOST}`;
  const remoteFinal = `${SG_PUBLIC_HTML}/data/pieces.json`;
  const remoteTemp = `${remoteFinal}.tmp-${process.pid}-${Date.now()}`;
  const localTemp = path.join(
    os.tmpdir(),
    `pieces-merged-${process.pid}-${Date.now()}.json`
  );

  fs.writeFileSync(localTemp, JSON.stringify(mergedPieces, null, 2), "utf8");

  try {
    await deployToSiteGround([
      {
        localPath: localTemp,
        remotePath: remoteTemp,
      },
    ]);

    // Re-check immediately before the atomic canonical replacement so a
    // surveillance freeze that occurs while this transaction is staging
    // cannot be raced by the final mv.
    await assertPotteryWritable(`${reason} final canonical replace`);

    await runCommand("ssh", [
      "-p",
      SG_PORT,
      "-i",
      keyPath,
      "-o",
      "StrictHostKeyChecking=no",
      remote,
      `mv ${remoteTemp} ${remoteFinal}`,
    ]);

    const confirmedPieces = await fetchPiecesJsonViaScp();
    const confirmedIds = normalizePieceIdSet(confirmedPieces);

    if (confirmedPieces.length !== mergedPieces.length) {
      throw new Error(
        `SITEGROUND VERIFY FAILED during ${reason}: expected ${mergedPieces.length} records, ` +
        `but confirmed ${confirmedPieces.length}.`
      );
    }

    const missingAfterPublish = [...mergedIds].filter(
      (id) => !confirmedIds.has(id)
    );

    if (missingAfterPublish.length > 0) {
      throw new Error(
        `SITEGROUND VERIFY FAILED during ${reason}: missing ID(s) after publish: ` +
        `${missingAfterPublish.slice(0, 12).join(", ")}`
      );
    }

    for (const update of normalizedUpdates) {
      const confirmed = confirmedPieces.find(
        (piece) => cleanText(piece.id).toUpperCase() === update.id
      );

      if (!confirmed) {
        throw new Error(
          `SITEGROUND VERIFY FAILED during ${reason}: ${update.id} was not confirmed.`
        );
      }
    }

    try {
      await writePotteryTrustManifest(
        confirmedPieces,
        `verified canonical publish: ${reason}`
      );
    } catch (trustErr) {
      await freezePottery({
        reason:
          `Canonical publish was verified during ${reason}, but the durable trust manifest could not be updated: ${trustErr.message}`,
        trigger: "trust-manifest-update-failure",
        siteGroundPieces: confirmedPieces,
        renderPieces: await getPublicDbPieces(),
        local: readLocalPiecesJsonSafely(),
        missingIds: [],
      });

      throw new Error(
        `POTTERY FREEZE: Canonical publish verified, but trust state could not be preserved. ${trustErr.message}`
      );
    }

    const workingCopy = await syncWorkingCopiesFromCanonical(confirmedPieces);

    return {
      ok: true,
      reason,
      canonical_count_before: canonicalBefore.length,
      canonical_count_after: confirmedPieces.length,
      updated_ids: normalizedUpdates.map((piece) => piece.id),
      verified_count: confirmedPieces.length,
      working_copy: workingCopy,
      confirmed_pieces: confirmedPieces,
    };
  } finally {
    try {
      fs.unlinkSync(localTemp);
    } catch (_) {
      // Ignore temporary-file cleanup errors.
    }
  }
}

function mergeAndPublishCanonicalPieces(updates, options = {}) {
  const operation = CANONICAL_PIECES_WRITE_CHAIN.then(() =>
    performCanonicalPiecesMerge(updates, options)
  );

  CANONICAL_PIECES_WRITE_CHAIN = operation.catch(() => undefined);

  return operation;
}

const RENDER_RESTORE_URL =
  process.env.RENDER_RESTORE_URL ||
  "https://claycraze-admin-test.onrender.com/admin/restore-from-siteground";

function isRunningOnRender() {
  return Boolean(
    process.env.RENDER ||
    process.env.RENDER_SERVICE_ID ||
    process.env.RENDER_EXTERNAL_URL
  );
}

async function refreshRenderFromSiteGround() {
  if (isRunningOnRender()) {
    return {
      ok: true,
      skipped: true,
      message: "Render refresh skipped because this process is already running on Render.",
    };
  }

  const separator = RENDER_RESTORE_URL.includes("?") ? "&" : "?";
  const url = `${RENDER_RESTORE_URL}${separator}v=${Date.now()}`;
  const raw = await fetchText(url);
  const result = JSON.parse(raw);

  if (!result || result.ok !== true) {
    throw new Error(
      result && result.error
        ? `Render refresh failed: ${result.error}`
        : "Render refresh did not return an OK response."
    );
  }

  console.log(
    `RENDER AUTO-REFRESH OK: ${result.restored?.count ?? "unknown"} pottery records restored.`
  );

  return {
    ok: true,
    skipped: false,
    url: RENDER_RESTORE_URL,
    restored_count: result.restored?.count ?? null,
    message: "Render automatically refreshed from SiteGround canonical truth.",
  };
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
  const url = `${SG_PUBLIC_DATA_URL}?v=${Date.now()}`;
  const raw = await fetchText(url);
  const trimmed = raw.trim();

  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    console.error("FIRST 500 CHARACTERS:");
    console.error(trimmed.substring(0, 500));

    throw new Error(`${url} returned HTML instead of JSON.`);
  }

  const pieces = JSON.parse(trimmed);

  if (!Array.isArray(pieces)) {
    throw new Error(`${url} did not contain a JSON array.`);
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
  price,
  assigned_to
`;

const PUBLIC_STATUSES = ["available", "donated","held", "acquired"];

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

function getPublicDbPieces() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT ${PUBLIC_FIELDS}
      FROM inventory
      WHERE TRIM(LOWER(status)) IN (${publicStatusPlaceholders()})
      ORDER BY id ASC
    `;

    db.all(sql, PUBLIC_STATUSES, (err, rows) => {
      if (err) return reject(err);
      resolve(Array.isArray(rows) ? rows : []);
    });
  });
}

function readLocalPiecesJsonSafely() {
  const localPath = path.join(DATA_DIR, "pieces.json");

  if (!fs.existsSync(localPath)) {
    return {
      ok: false,
      path: localPath,
      pieces: [],
      error: "Local pieces.json does not exist.",
    };
  }

  try {
    const pieces = JSON.parse(fs.readFileSync(localPath, "utf8"));

    if (!Array.isArray(pieces)) {
      throw new Error("Local pieces.json is not a JSON array.");
    }

    return {
      ok: true,
      path: localPath,
      pieces,
      error: "",
    };
  } catch (err) {
    return {
      ok: false,
      path: localPath,
      pieces: [],
      error: err.message,
    };
  }
}

function normalizePieceForComparison(piece) {
  const normalized = {};

  for (const field of PUBLIC_FIELDS.split(",").map((name) => name.trim()).filter(Boolean)) {
    normalized[field] = piece && piece[field] != null ? piece[field] : "";
  }

  normalized.id = String(normalized.id || "").trim().toUpperCase();
  normalized.shape = String(normalized.shape || "").trim().toUpperCase();
  normalized.status = String(normalized.status || "").trim().toLowerCase();
  normalized.assigned_to = String(normalized.assigned_to || "").trim().toLowerCase();

  return normalized;
}

function mapPiecesById(pieces) {
  const map = new Map();

  for (const piece of Array.isArray(pieces) ? pieces : []) {
    const normalized = normalizePieceForComparison(piece);
    if (normalized.id) map.set(normalized.id, normalized);
  }

  return map;
}

function comparePieceCollections(leftPieces, rightPieces) {
  const left = mapPiecesById(leftPieces);
  const right = mapPiecesById(rightPieces);

  const missingFromRight = [...left.keys()].filter((id) => !right.has(id));
  const extraInRight = [...right.keys()].filter((id) => !left.has(id));
  const changedRecords = [];

  for (const id of left.keys()) {
    if (!right.has(id)) continue;

    const leftRecord = left.get(id);
    const rightRecord = right.get(id);
    const fields = [];

    for (const field of Object.keys(leftRecord)) {
      if (JSON.stringify(leftRecord[field]) !== JSON.stringify(rightRecord[field])) {
        fields.push({
          field,
          siteground_value: leftRecord[field],
          compared_value: rightRecord[field],
          siteground_type: typeof leftRecord[field],
          compared_type: typeof rightRecord[field],
        });
      }
    }

    if (fields.length > 0) {
      changedRecords.push({
        id,
        changed_field_count: fields.length,
        fields,
      });
    }
  }

  const changedIds = changedRecords.map((record) => record.id);

  return {
    left_count: left.size,
    right_count: right.size,
    missing_from_right: missingFromRight,
    extra_in_right: extraInRight,
    changed_ids: changedIds,
    changed_records: changedRecords,
    exact_match:
      missingFromRight.length === 0 &&
      extraInRight.length === 0 &&
      changedIds.length === 0,
  };
}

async function runSiteGroundSurveillance(trigger = "manual") {
  const startedAt = new Date().toISOString();

  try {
    const [siteGroundPieces, renderPieces] = await Promise.all([
      fetchPiecesJsonViaScp(),
      getPublicDbPieces(),
    ]);

    const local = readLocalPiecesJsonSafely();

    const sgVsRender = comparePieceCollections(siteGroundPieces, renderPieces);
    const sgVsLocal = comparePieceCollections(
      siteGroundPieces,
      local.ok ? local.pieces : []
    );

    let trust = POTTERY_TRUST_STATE;

    try {
      trust = await loadPotteryTrustStateFromSiteGround();
    } catch (trustErr) {
      console.error("POTTERY TRUST STATE READ FAILED:", trustErr.message);
    }

    const siteGroundIds = normalizePieceIdSet(siteGroundPieces);
    const trustedIds =
      trust && Array.isArray(trust.ids)
        ? new Set(
            trust.ids
              .map((id) => cleanText(id).toUpperCase())
              .filter(Boolean)
          )
        : new Set();

    const missingTrustedIds = [...trustedIds].filter(
      (id) => !siteGroundIds.has(id)
    );

    const trustedShrink =
      Boolean(trust) &&
      (
        siteGroundPieces.length < Number(trust.count || 0) ||
        missingTrustedIds.length > 0
      );

    const workingCopyMissingIds = [
      ...new Set([
        ...sgVsRender.extra_in_right,
        ...sgVsLocal.extra_in_right,
      ]),
    ].sort();

    const workingCopyShowsLoss =
      workingCopyMissingIds.length > 0 &&
      (
        siteGroundPieces.length < renderPieces.length ||
        (local.ok && siteGroundPieces.length < local.pieces.length)
      );

    const missingIds = [
      ...new Set([
        ...missingTrustedIds,
        ...workingCopyMissingIds,
      ]),
    ].sort();

    let actionTaken = "NONE";
    let freezeState = await getPotteryFreezeState({ refresh: true });

    if (!freezeState.frozen && (trustedShrink || workingCopyShowsLoss)) {
      const reasons = [];

      if (trustedShrink) {
        reasons.push(
          `trusted canonical state was ${trust.count} record(s), current SiteGround has ${siteGroundPieces.length}`
        );
      }

      if (missingTrustedIds.length > 0) {
        reasons.push(
          `trusted ID(s) disappeared: ${missingTrustedIds.slice(0, 12).join(", ")}`
        );
      }

      if (workingCopyShowsLoss) {
        reasons.push(
          `working copy still contains ID(s) absent from SiteGround: ${workingCopyMissingIds
            .slice(0, 12)
            .join(", ")}`
        );
      }

      freezeState = await freezePottery({
        reason:
          `Unexpected canonical pottery loss detected: ${reasons.join("; ")}.`,
        trigger,
        siteGroundPieces,
        renderPieces,
        local,
        missingIds,
      });

      actionTaken = "POTTERY_FREEZE";
    } else if (freezeState.frozen) {
      actionTaken = "ALREADY_FROZEN";
    }

    const result = {
      ok: true,
      canonical_read_only: true,
      trigger,
      time: startedAt,
      source: "SiteGround SCP canonical pieces.json",
      siteground_count: siteGroundPieces.length,
      render_db_count: renderPieces.length,
      local_json_count: local.ok ? local.pieces.length : null,
      local_json_ok: local.ok,
      local_json_error: local.error,
      trusted_count:
        trust && Number.isInteger(trust.count) ? trust.count : null,
      missing_trusted_ids: missingTrustedIds,
      siteground_vs_render: sgVsRender,
      siteground_vs_local_json: sgVsLocal,
      pottery_freeze: freezeState,
      action_taken: actionTaken,
    };

    SURVEILLANCE_HISTORY.unshift(result);
    SURVEILLANCE_HISTORY.splice(SURVEILLANCE_HISTORY_LIMIT);

    console.log("SITEGROUND SURVEILLANCE:", JSON.stringify(result));

    return result;
  } catch (err) {
    const result = {
      ok: false,
      canonical_read_only: true,
      trigger,
      time: startedAt,
      error: err.message,
      pottery_freeze: { ...POTTERY_FREEZE_STATE },
      action_taken: "NONE",
    };

    SURVEILLANCE_HISTORY.unshift(result);
    SURVEILLANCE_HISTORY.splice(SURVEILLANCE_HISTORY_LIMIT);

    console.error("SITEGROUND SURVEILLANCE FAILED:", err);

    return result;
  }
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

function getLocalTreesJsonCount() {
  const outPath = path.join(DATA_DIR, "trees.json");

  if (!fs.existsSync(outPath)) {
    return 0;
  }

  try {
    const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    return Array.isArray(existing) ? existing.length : 0;
  } catch (err) {
    console.warn("Could not read local trees.json count:", err.message);
    return 0;
  }
}

function getTreeDbCount() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) AS count FROM trees`, [], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.count : 0);
    });
  });
}

async function getTreeRegistrationState() {
  const jsonCount = getLocalTreesJsonCount();
  const dbCount = await getTreeDbCount();

  return {
    registered: dbCount >= jsonCount && TREE_STARTUP_RESTORE.ok,
    local_trees_json_count: jsonCount,
    render_tree_db_count: dbCount,
    startup_restore_ok: TREE_STARTUP_RESTORE.ok,
    startup_restore_count: TREE_STARTUP_RESTORE.count,
    startup_restore_source: TREE_STARTUP_RESTORE.source,
    message:
      dbCount >= jsonCount && TREE_STARTUP_RESTORE.ok
        ? "Render tree DB is registered with SiteGround-restored trees.json."
        : "Render tree DB is not safely registered. Restore trees from SiteGround before saving.",
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
      assigned_to: cleanText(piece.assigned_to) || "studio",
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
        assigned_to,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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
        finalPiece.assigned_to,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(finalPiece);
      }
    );
  });
}
const TREE_PUBLIC_FIELDS = `
  id,
  title,
  species,
  cultivar,
  style,
  person_slug,
  owner_slug,
  tree_slug,
  image_path,
  page_path,
  status,
  owner_credit,
  pot_credit,
  display_notes,
  provenance,
  description,
  notes,
  created_at,
  updated_at
`;

function normalizeTreeStatus(status) {
  const raw = cleanText(status).toLowerCase();
  return raw || "active";
}

function upsertTree(tree) {
  return new Promise((resolve, reject) => {
    const finalTree = {
      id: cleanText(tree.id),
      title: cleanText(tree.title),
      species: cleanText(tree.species),
      cultivar: cleanText(tree.cultivar),
      style: cleanText(tree.style),
      person_slug: cleanText(tree.person_slug),
      owner_slug: cleanText(tree.owner_slug),
      tree_slug: cleanText(tree.tree_slug),
      image_path: cleanText(tree.image_path),
      page_path: cleanText(tree.page_path),
      status: normalizeTreeStatus(tree.status),
      owner_credit: cleanText(tree.owner_credit),
      pot_credit: cleanText(tree.pot_credit),
      display_notes: cleanText(tree.display_notes),
      provenance: cleanText(tree.provenance),
      description: cleanText(tree.description),
      notes: cleanText(tree.notes),
    };

    db.run(
      `
      INSERT OR REPLACE INTO trees (
        id,
        title,
        species,
        cultivar,
        style,
        person_slug,
        owner_slug,
        tree_slug,
        image_path,
        page_path,
        status,
        owner_credit,
        pot_credit,
        display_notes,
        provenance,
        description,
        notes,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        finalTree.id,
        finalTree.title,
        finalTree.species,
        finalTree.cultivar,
        finalTree.style,
        finalTree.person_slug,
        finalTree.owner_slug,
        finalTree.tree_slug,
        finalTree.image_path,
        finalTree.page_path,
        finalTree.status,
        finalTree.owner_credit,
        finalTree.pot_credit,
        finalTree.display_notes,
        finalTree.provenance,
        finalTree.description,
        finalTree.notes,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(finalTree);
      }
    );
  });
}

function backupExistingTreesJson() {
  const sourcePath = path.join(DATA_DIR, "trees.json");

  if (!fs.existsSync(sourcePath)) {
    return "";
  }

  const backupName = `trees-${makeTimestamp()}.json`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  fs.copyFileSync(sourcePath, backupPath);

  console.log(`trees.json backup created: ${backupName}`);

  return backupPath;
}

function exportTreesJson(callback, options = {}) {
  const allowShrink = options.allowShrink === true;
  const outPath = path.join(DATA_DIR, "trees.json");

  let previousCount = 0;

  if (fs.existsSync(outPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
      if (Array.isArray(existing)) {
        previousCount = existing.length;
      }
    } catch (err) {
      console.warn("Could not read existing trees.json:", err.message);
    }
  }

  const sql = `
    SELECT ${TREE_PUBLIC_FIELDS}
    FROM trees
    ORDER BY title ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) return callback(err);

    const newCount = Array.isArray(rows) ? rows.length : 0;

    if (!allowShrink && previousCount > 0 && newCount < previousCount) {
      return callback(
        new Error(
          `SAFETY LOCK: Export blocked. trees.json would shrink from ${previousCount} records to ${newCount}. Use explicit reset/delete workflow to allow shrink.`
        )
      );
    }

    backupExistingTreesJson();

    fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf8");

    console.log(`trees.json exported successfully (${newCount} records)`);

    callback(null, newCount, outPath);
  });
}

function exportTreesJsonPromise(options = {}) {
  return new Promise((resolve, reject) => {
    exportTreesJson((err, count, outPath) => {
      if (err) return reject(err);
      resolve({ count, outPath });
    }, options);
  });
}

async function fetchTreesJsonViaScp() {
  const { SG_HOST, SG_PORT, SG_USER, SG_CI_KEY, SG_PUBLIC_HTML } =
    getSgConfig();

  const keyPath = writeSshKey(SG_CI_KEY);
  const remote = `${SG_USER}@${SG_HOST}`;
  const remoteJson = `${remote}:${SG_PUBLIC_HTML}/data/trees.json`;
  const localTempJson = path.join(os.tmpdir(), `trees-${Date.now()}.json`);

  await runCommand("scp", [
    "-P",
    SG_PORT,
    "-i",
    keyPath,
    "-o",
    "StrictHostKeyChecking=no",
    remoteJson,
    localTempJson,
  ]);

  const raw = fs.readFileSync(localTempJson, "utf8");

  try {
    fs.unlinkSync(localTempJson);
  } catch (_) {
    // Ignore cleanup errors
  }

  const trees = JSON.parse(raw);

  if (!Array.isArray(trees)) {
    throw new Error("SCP-restored trees.json did not contain a JSON array.");
  }

  return trees;
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
      price,
      assigned_to
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        p.assigned_to || "studio",
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

function clearTreesTable() {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM trees`, [], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function replaceDbWithTrees(trees) {
  if (!Array.isArray(trees)) {
    throw new Error("replaceDbWithTrees expected an array.");
  }

  await clearTreesTable();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO trees (
      id,
      title,
      species,
      cultivar,
      style,
      person_slug,
      owner_slug,
      tree_slug,
      image_path,
      page_path,
      status,
      owner_credit,
      pot_credit,
      display_notes,
      provenance,
      description,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;

  for (const t of trees) {
    await new Promise((resolve, reject) => {
      stmt.run(
        t.id || "",
        t.title || "",
        t.species || "",
        t.cultivar || "",
        t.style || "",
        t.person_slug || "",
        t.owner_slug || "",
        t.tree_slug || "",
        t.image_path || "",
        t.page_path || "",
        normalizeTreeStatus(t.status || "active"),
        t.owner_credit || "",
        t.pot_credit || "",
        t.display_notes || "",
        t.provenance || "",
        t.description || "",
        t.notes || "",
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
  await assertPotteryWritable("restore Render working copies from SiteGround");
  const pieces = await fetchPiecesJsonViaScp();
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

async function restoreTreesFromSiteGround() {
  const trees = await fetchTreesJsonViaScp();
  const localPath = path.join(DATA_DIR, "trees.json");

  backupExistingTreesJson();

  fs.writeFileSync(localPath, JSON.stringify(trees, null, 2), "utf8");

  const imported = await replaceDbWithTrees(trees);
  const dbCount = await getTreeDbCount();

  TREE_STARTUP_RESTORE = {
    ok: true,
    source: SG_PUBLIC_TREES_URL,
    count: trees.length,
    imported,
    render_tree_db_count: dbCount,
    message: "Render restored from SiteGround canonical trees.json.",
    time: new Date().toISOString(),
  };

  console.log(
    `SITEGROUND TREE RESTORE OK: fetched ${trees.length}, imported ${imported}, tree DB count ${dbCount}.`
  );

  return TREE_STARTUP_RESTORE;
}

app.get("/deploy-health", (req, res) => {
  res.json({
    ok: true,
    app: "ClaycrazE admin",
    db_path: DB_PATH,
    siteground_truth_url: SG_PUBLIC_DATA_URL,
    tree_truth_url: SG_PUBLIC_TREES_URL,
    startup_restore: STARTUP_RESTORE,
    tree_startup_restore: TREE_STARTUP_RESTORE,
    pottery_freeze: POTTERY_FREEZE_STATE,
    pottery_trust: POTTERY_TRUST_STATE,
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
    SG_PUBLIC_TREES_URL,
    startup_restore: STARTUP_RESTORE,
    tree_startup_restore: TREE_STARTUP_RESTORE,
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

app.get("/debug/siteground-surveillance", async (req, res) => {
  const result = await runSiteGroundSurveillance("manual-route");
  res.status(result.ok ? 200 : 500).json(result);
});

app.get("/debug/siteground-surveillance-history", (req, res) => {
  res.json({
    ok: true,
    read_only: true,
    interval_minutes: SURVEILLANCE_INTERVAL_MINUTES,
    checks_retained: SURVEILLANCE_HISTORY.length,
    history: SURVEILLANCE_HISTORY,
  });
});

app.get("/debug/pottery-freeze", async (req, res) => {
  try {
    const freeze = await getPotteryFreezeState({ refresh: true });
    const trust = await loadPotteryTrustStateFromSiteGround();

    res.json({
      ok: true,
      pottery_freeze: freeze,
      pottery_trust: trust,
      freeze_marker: POTTERY_FREEZE_REMOTE_PATH,
      trust_manifest: POTTERY_TRUST_REMOTE_PATH,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      pottery_freeze: { ...POTTERY_FREEZE_STATE },
    });
  }
});

app.post(
  "/admin/pottery-freeze/clear",
  requirePotteryFreezeAdminAuth,
  async (req, res) => {
    try {
      const confirmation = cleanText(req.body && req.body.confirm);

      if (confirmation !== "UNFREEZE POTTERY") {
        return res.status(400).json({
          ok: false,
          error:
            'Explicit confirmation required. Send {"confirm":"UNFREEZE POTTERY"} only after human-approved recovery or acceptance of the current SiteGround canonical ledger.',
        });
      }

      const currentPieces = await fetchPiecesJsonViaScp();

      const trust = await writePotteryTrustManifest(
        currentPieces,
        "human-approved pottery freeze clearance"
      );

      await removePrivateSiteGroundFile(POTTERY_FREEZE_REMOTE_PATH);

      POTTERY_FREEZE_STATE = {
        frozen: false,
        reason: "",
        detected_at: null,
        trigger: "",
        evidence_dir: "",
        missing_ids: [],
      };

      res.json({
        ok: true,
        frozen: false,
        accepted_canonical_count: currentPieces.length,
        pottery_trust: trust,
        message:
          "Pottery freeze cleared by explicit human approval. Current SiteGround canonical pottery is now the trusted baseline. No automatic repair was performed.",
      });
    } catch (err) {
      console.error("POTTERY FREEZE CLEAR FAILED:", err);

      res.status(500).json({
        ok: false,
        frozen: true,
        error: err.message,
      });
    }
  }
);

app.get("/debug/tree-registration", async (req, res) => {
  try {
    const registration = await getTreeRegistrationState();

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

app.get("/api/next-piece-id", requirePotteryWritable, async (req, res) => {
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

app.get("/api/generate-piece-id", requirePotteryWritable, async (req, res) => {
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

app.get("/api/next-piece-number", requirePotteryWritable, async (req, res) => {
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


// ============================================================
// LIMITED VENDOR POTTERY ADMIN
// ============================================================

const VENDOR_ALLOWED_STATUSES = new Set([
  "available",
  "acquired",
  "donated",
  "held",
]);

function normalizeVendor(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeVendorStatus(value) {
  return String(value || "").trim().toLowerCase();
}

app.get("/api/vendor-pots", async (req, res) => {
  try {
    const registration = await getRegistrationState();

    if (!registration.registered) {
      return res.status(409).json({
        ok: false,
        error:
          "Vendor inventory is unavailable because Render is not restored from SiteGround truth.",
        registration,
      });
    }

    const vendor = normalizeVendor(req.query.vendor);

    if (!vendor) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendor parameter.",
      });
    }

    const sql = `
      SELECT
        id,
        title,
        category,
        dimensions,
        price,
        status,
        assigned_to,
        image_path,
        image_path_2,
        image_path_3,
        image_path_4,
        updated_at
      FROM inventory
      WHERE LOWER(TRIM(COALESCE(assigned_to, 'studio'))) = ?
      ORDER BY id DESC
    `;

    db.all(sql, [vendor], (err, rows) => {
      if (err) {
        console.error("GET /api/vendor-pots failed:", err);

        return res.status(500).json({
          ok: false,
          error: "Failed to load vendor pots.",
        });
      }

      res.json(rows || []);
    });
  } catch (err) {
    console.error("GET /api/vendor-pots error:", err);

    res.status(500).json({
      ok: false,
      error: err.message || "Failed to load vendor pots.",
    });
  }
});

app.patch("/api/vendor-pots/:id/status", requirePotteryWritable, async (req, res) => {
  try {
    const registration = await getRegistrationState();

    if (!registration.registered) {
      return res.status(409).json({
        ok: false,
        error:
          "Status update blocked because Render is not restored from SiteGround truth.",
        registration,
      });
    }

    const pieceId = cleanText(req.params.id).toUpperCase();
    const vendor = normalizeVendor(req.body.vendor);
    const status = normalizeVendorStatus(req.body.status);

    if (!pieceId) {
      return res.status(400).json({
        ok: false,
        error: "Missing piece ID.",
      });
    }

    if (!vendor) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendor.",
      });
    }

    if (!VENDOR_ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({
        ok: false,
        error:
          "Invalid status. Allowed values are available, acquired, donated, and held.",
      });
    }

    const piece = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT ${PUBLIC_FIELDS}
        FROM inventory
        WHERE id = ?
          AND LOWER(TRIM(COALESCE(assigned_to, 'studio'))) = ?
        LIMIT 1
        `,
        [pieceId, vendor],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });

    if (!piece) {
      return res.status(404).json({
        ok: false,
        error: "Piece not found for this vendor.",
      });
    }

    const updatedPiece = {
      ...piece,
      status,
      assigned_to: vendor,
    };

    const canonicalPublish = await mergeAndPublishCanonicalPieces(
      [updatedPiece],
      {
        reason: `vendor status update for ${pieceId}`,
      }
    );

    const sgPieces = canonicalPublish.confirmed_pieces;

    const confirmed = sgPieces.find(
      (record) =>
        String(record.id || "").toUpperCase() === pieceId &&
        normalizeVendorStatus(record.status) === status &&
        normalizeVendor(record.assigned_to) === vendor
    );

    if (!confirmed) {
      throw new Error(
        `SITEGROUND VERIFY FAILED: ${pieceId} was updated locally but the canonical SiteGround record was not confirmed.`
      );
    }

    res.json({
      ok: true,
      archived: true,
      deployed_to_siteground: true,
      canonical_publish: canonicalPublish,
      id: pieceId,
      vendor,
      status,
      message: `${pieceId} updated to ${status} and confirmed on SiteGround.`,
    });
  } catch (err) {
    console.error("PATCH /api/vendor-pots/:id/status failed:", err);

    res.status(500).json({
      ok: false,
      archived: false,
      error: err.message || "Failed to update vendor pot status.",
      stdout: err.stdout || "",
      stderr: err.stderr || "",
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
app.get("/gallery-data/slabs", (req, res) => {
  getPublicPiecesByShape("SL", res);
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

app.post("/api/save-curation", requirePotteryWritable, async (req, res) => {
  try {
    const beforeRegistration = await getRegistrationState();

    if (!beforeRegistration.registered) {
      throw new Error(
        `REGISTRATION LOCK: Save blocked. Render is not restored from SiteGround truth. ${beforeRegistration.message}`
      );
    }

    const piece = req.body.piece || req.body;
    const pieces = Array.isArray(req.body.pieces) ? req.body.pieces : null;

    const savedPieces = [];
    const filesToDeploy = [];

    const sgPublicHtml =
      process.env.SG_PUBLIC_HTML || "/home/customer/www/claycraze.com/public_html";

    if (pieces) {
      for (const submittedPiece of pieces) {
        savedPieces.push(normalizeCanonicalPiece(submittedPiece));
      }
    } else {
      const parsed = parsePieceId(piece.id);
      const id = parsed.id;

      const topFullPath = path.join(BONSAI_FULL_DIR, `${id}_top.jpg`);
      const bottomFullPath = path.join(BONSAI_FULL_DIR, `${id}_bottom.jpg`);
      const topThumbPath = path.join(BONSAI_THUMBS_DIR, `${id}_top_thumb.jpg`);

      if (piece.top_image_data) {
        saveDataUrlImage(piece.top_image_data, topFullPath);
        fs.copyFileSync(topFullPath, topThumbPath);

        piece.image_path = `/images/bonsai/thumbs/${id}_top_thumb.jpg`;
        piece.image_path_2 = `/images/bonsai/full/${id}_top.jpg`;

        filesToDeploy.push(
          {
            localPath: topFullPath,
            remotePath: `${sgPublicHtml}/images/bonsai/full/${id}_top.jpg`,
          },
          {
            localPath: topThumbPath,
            remotePath: `${sgPublicHtml}/images/bonsai/thumbs/${id}_top_thumb.jpg`,
          }
        );
      }

      if (piece.bottom_image_data) {
        saveDataUrlImage(piece.bottom_image_data, bottomFullPath);

        piece.image_path_3 = `/images/bonsai/full/${id}_bottom.jpg`;

        filesToDeploy.push({
          localPath: bottomFullPath,
          remotePath: `${sgPublicHtml}/images/bonsai/full/${id}_bottom.jpg`,
        });
      }

      delete piece.top_image_data;
      delete piece.bottom_image_data;

      savedPieces.push(normalizeCanonicalPiece(piece));
    }

    // Images are independent artifacts. Publish them first, then commit the
    // pottery records through the one canonical SiteGround transaction.
    await deployToSiteGround(filesToDeploy);

    const canonicalPublish = await mergeAndPublishCanonicalPieces(savedPieces, {
      reason: "curation save",
    });

    res.json({
      ok: true,
      archived: true,
      deployed_to_siteground: true,
      render_refreshed: true,
      message:
        "Truth confirmed: SiteGround canonical pottery was merged by ID, atomically published, verified, and copied back into Render.",
      saved_count: savedPieces.length,
      canonical_count: canonicalPublish.canonical_count_after,
      canonical_publish: {
        reason: canonicalPublish.reason,
        canonical_count_before: canonicalPublish.canonical_count_before,
        canonical_count_after: canonicalPublish.canonical_count_after,
        updated_ids: canonicalPublish.updated_ids,
        verified_count: canonicalPublish.verified_count,
      },
      pieces: savedPieces,
    });
  } catch (err) {
    console.error("SAVE CURATION ERROR:", err);

    res.status(500).json({
      ok: false,
      archived: false,
      error: err.message || "Could not save curatorial changes.",
      stdout: err.stdout || "",
      stderr: err.stderr || "",
    });
  }
});

   // <-- end of save-curation


app.post("/api/save-tree", async (req, res) => {
  try {
    const treeRegistration = await getTreeRegistrationState();

    if (!treeRegistration.registered) {
      throw new Error(
        `TREE REGISTRATION LOCK: Save blocked. Render tree DB is not restored from SiteGround truth. ${treeRegistration.message}`
      );
    }

    const tree = req.body.tree || req.body;

    if (!tree.title) {
      return res.status(400).json({
        ok: false,
        error: "Tree title is required.",
      });
    }

    const slugify = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const escapeHtml = (value) =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const title = cleanText(tree.title || "tree");

    const personSlug =
      slugify(tree.person_slug) ||
      slugify(tree.owner_slug) ||
      "jim-alexander";

    const treeSlug =
      slugify(tree.tree_slug) ||
      slugify(tree.id) ||
      slugify(title);

    const id = cleanText(tree.id) || treeSlug;

    const imageDir = path.join(PUBLIC_DIR, "images", "trees", personSlug);
    fs.mkdirSync(imageDir, { recursive: true });

    const treeImagePath = path.join(imageDir, `${treeSlug}.jpg`);

    if (tree.tree_image_data) {
      saveDataUrlImage(tree.tree_image_data, treeImagePath);
      tree.image_path = `/images/trees/${personSlug}/${treeSlug}.jpg`;
      delete tree.tree_image_data;
    }

    const pageDir = path.join(PUBLIC_DIR, "trees", personSlug, treeSlug);
    fs.mkdirSync(pageDir, { recursive: true });

    const pagePath = `/trees/${personSlug}/${treeSlug}/`;
    const localTreePagePath = path.join(pageDir, "index.html");

    const savedTree = {
      ...tree,
      id,
      title,
      person_slug: personSlug,
      owner_slug: cleanText(tree.owner_slug || personSlug),
      tree_slug: treeSlug,
      image_path:
        tree.image_path || `/images/trees/${personSlug}/${treeSlug}.jpg`,
      page_path: pagePath,
      status: normalizeTreeStatus(tree.status),
    };

    const treePageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" >
  <meta name="viewport" content="width=device-width, initial-scale=1.0" >
  <title>${escapeHtml(savedTree.title)} | ClaycrazE Trees</title>
  <link rel="stylesheet" href="/css/styles.css?v=3028" >
  <link rel="stylesheet" href="/css/gallery.css?v=3004" >
</head>

<body class="practice-page trees-page">
  <header class="site-header">
    <div class="header-shell">
      <a class="site-brand" href="/index.html">
        <span class="site-title">ClaycrazE</span>
        <span class="site-tag">Theory &amp; Practice</span>
      </a>

      <nav class="site-nav" aria-label="Main navigation">
        <a href="/index.html">Home</a>
        <a href="/theory.html">Theory</a>
        <a href="/practice.html">Practice</a>
        <a href="/trees/">Back</a>
      </nav>
    </div>
  </header>

  <main class="gallery-page">
    <section class="gallery-intro minimalist-intro">
      <h1>${escapeHtml(savedTree.title)}</h1>
      <p>${escapeHtml(savedTree.species || "Bonsai tree")}</p>
    </section>

    <section class="piece-detail">
      <figure>
        <img src="${escapeHtml(savedTree.image_path)}" alt="${escapeHtml(savedTree.title)}" >
      </figure>

      <article>
        <p><strong>Status:</strong> ${escapeHtml(savedTree.status || "")}</p>
        <p><strong>Credit:</strong> ${escapeHtml(savedTree.owner_credit || "")}</p>
        <p>${escapeHtml(savedTree.description || "")}</p>
      </article>
    </section>
  </main>
</body>
</html>
`;

    fs.writeFileSync(localTreePagePath, treePageHtml, "utf8");

    const dbTree = await upsertTree(savedTree);
    const exported = await exportTreesJsonPromise();

    const sgPublicHtml =
      process.env.SG_PUBLIC_HTML || "/home/customer/www/claycraze.com/public_html";

    const filesToDeploy = [
      {
        localPath: exported.outPath,
        remotePath: `${sgPublicHtml}/data/trees.json`,
      },
      {
        localPath: localTreePagePath,
        remotePath: `${sgPublicHtml}/trees/${personSlug}/${treeSlug}/index.html`,
      },
    ];

    if (fs.existsSync(treeImagePath)) {
      filesToDeploy.push({
        localPath: treeImagePath,
        remotePath: `${sgPublicHtml}/images/trees/${personSlug}/${treeSlug}.jpg`,
      });
    }

    await deployToSiteGround(filesToDeploy);

    let sgTrees;

    try {
      sgTrees = await fetchTreesJsonViaScp();
    } catch (verifyErr) {
      throw new Error(
        `SITEGROUND VERIFY FAILED: Could not fetch canonical trees.json after publish. ${verifyErr.message}`
      );
    }

    const found = sgTrees.find((t) => t.id === dbTree.id);

    if (!found) {
      throw new Error(
        `SITEGROUND VERIFY FAILED: ${dbTree.id} was saved locally but not found in SiteGround trees.json.`
      );
    }

    res.json({
      ok: true,
      archived: true,
      deployed_to_siteground: true,
      message:
        "Truth confirmed: tree DB saved, trees.json exported, SiteGround archive updated, and canonical tree record verified.",
      exported_count: exported.count,
      tree: dbTree,
    });
  } catch (err) {
    console.error("SAVE TREE ERROR:", err);

    res.status(500).json({
      ok: false,
      archived: false,
      error: err.message || "Could not save tree.",
      stdout: err.stdout || "",
      stderr: err.stderr || "",
    });
  }
});



app.get("/admin/restore-from-siteground", async (req, res) => {
  try {
    await assertPotteryWritable("manual restore from SiteGround");
    const restored = await restoreFromSiteGround();
    const registration = await getRegistrationState();
    const restoredTrees = await restoreTreesFromSiteGround();
    const treeRegistration = await getTreeRegistrationState();

    res.json({
      ok: true,
      restored,
      registration,
      restored_trees: restoredTrees,
      tree_registration: treeRegistration,
      message:
        "Render SQLite and local public JSON restored from SiteGround canonical archives.",
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

    TREE_STARTUP_RESTORE = {
      ok: false,
      source: SG_PUBLIC_TREES_URL,
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

app.get("/admin/import-local-trees-json", async (req, res) => {
  try {
    const localPath = path.join(DATA_DIR, "trees.json");

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({
        ok: false,
        error: "Local public/data/trees.json not found.",
      });
    }

    const raw = fs.readFileSync(localPath, "utf8");
    const trees = JSON.parse(raw);

    if (!Array.isArray(trees)) {
      throw new Error("Local trees.json did not contain an array.");
    }

    let imported = 0;

    for (const tree of trees) {
      await upsertTree(tree);
      imported++;
    }

    const exported = await exportTreesJsonPromise();

    res.json({
      ok: true,
      source: localPath,
      imported,
      exported_count: exported.count,
      message:
        "Local trees.json imported into SQLite trees table and re-exported safely.",
    });
  } catch (err) {
    console.error("IMPORT LOCAL TREES JSON ERROR:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

const claycrazeServer = app.listen(PORT, "0.0.0.0", async () => {
  console.log(`ClaycrazE admin running on port ${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`Curate: http://localhost:${PORT}/admin/curate.html`);
  console.log(`Deploy health: http://localhost:${PORT}/deploy-health`);
  console.log(`SiteGround truth source: ${SG_PUBLIC_DATA_URL}`);

  try {
    const protection = await initializePotteryProtectionState();

    console.log("POTTERY PROTECTION STATE:", protection);

    if (!protection.freeze.frozen) {
      // On the first deployment of this protection, the current SiteGround
      // ledger is explicitly accepted as the initial trusted baseline.
      // Thereafter, surveillance runs before restore so a future shrink
      // cannot overwrite working-copy evidence.
      const preRestoreSurveillance = protection.bootstrapped
        ? {
            pottery_freeze: { frozen: false },
            action_taken: "TRUST_BOOTSTRAP_ACCEPTED",
          }
        : await runSiteGroundSurveillance("startup-before-restore");

      if (!preRestoreSurveillance.pottery_freeze?.frozen) {
        const restored = await restoreFromSiteGround();

        console.log("STARTUP RESTORE OK:", restored);

        const registration = await getRegistrationState();

        console.log("STARTUP REGISTRATION:", registration);
      } else {
        console.error(
          "POTTERY FREEZE: startup restore skipped so local/Render evidence is not overwritten."
        );
      }
    } else {
      console.error(
        "POTTERY FREEZE: startup restore skipped because a persistent freeze is active."
      );
    }
  } catch (err) {
    console.error("STARTUP POTTERY PROTECTION/RESTORE FAILED:", err);

    STARTUP_RESTORE = {
      ok: false,
      source: SG_PUBLIC_DATA_URL,
      count: 0,
      message: err.message,
      time: new Date().toISOString(),
    };

    POTTERY_FREEZE_STATE = {
      frozen: true,
      reason:
        `Startup pottery protection could not establish coherence: ${err.message}`,
      detected_at: new Date().toISOString(),
      trigger: "startup-protection-failure",
      evidence_dir: "",
      missing_ids: [],
    };

    console.error(
      "POTTERY FREEZE: saves are blocked because startup protection could not establish coherence."
    );
  }

  // Trees are independent of the pottery freeze and may restore normally.
  try {
    const restoredTrees = await restoreTreesFromSiteGround();

    console.log("TREE STARTUP RESTORE OK:", restoredTrees);

    const treeRegistration = await getTreeRegistrationState();

    console.log("TREE STARTUP REGISTRATION:", treeRegistration);
  } catch (err) {
    console.error("TREE STARTUP RESTORE FROM SITEGROUND FAILED:", err);

    TREE_STARTUP_RESTORE = {
      ok: false,
      source: SG_PUBLIC_TREES_URL,
      count: 0,
      message: err.message,
      time: new Date().toISOString(),
    };
  }

  // Surveillance never repairs canonical pottery. It may only freeze writes
  // and preserve evidence when canonical truth unexpectedly loses records.
  await runSiteGroundSurveillance("startup-after-restore");

  SURVEILLANCE_TIMER = setInterval(() => {
    runSiteGroundSurveillance("scheduled-interval").catch((err) => {
      console.error("UNEXPECTED SURVEILLANCE TIMER ERROR:", err);
    });
  }, SURVEILLANCE_INTERVAL_MINUTES * 60 * 1000);

  if (typeof SURVEILLANCE_TIMER.unref === "function") {
    SURVEILLANCE_TIMER.unref();
  }

  console.log(
    `SiteGround surveillance scheduled every ${SURVEILLANCE_INTERVAL_MINUTES} minute(s).`
  );
});

claycrazeServer.on("error", (err) => {
  console.error("CLAYCRAZE SERVER LISTEN ERROR:", err);
});

console.log("ClaycrazE server handle retained:", !!claycrazeServer);
