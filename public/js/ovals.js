/* =========================================================
   ClaycrazE — Ovals Gallery
   Full drop-in replacement for /js/ovals.js
   Cards show: dimensions, price, status
   Uses live endpoint: /gallery-data/ovals
   Version 1019
   ========================================================= */

document.addEventListener("DOMContentLoaded", loadOvals);

async function loadOvals() {
  const galleryGrid = document.getElementById("galleryGrid");

  if (!galleryGrid) return;

  galleryGrid.innerHTML = `<div class="loading">Loading ovals...</div>`;

  try {
    const response = await fetch(`/gallery-data/ovals?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Could not load oval gallery data: ${response.status}`);
    }

    const ovals = await response.json();

    if (!Array.isArray(ovals)) {
      throw new Error("Oval gallery endpoint did not return an array.");
    }

    const sortedOvals = ovals.sort(sortNewestFirst);

    if (!sortedOvals.length) {
      galleryGrid.innerHTML = `
        <div class="empty-state">
          No oval pieces are currently available.
        </div>
      `;
      return;
    }

    galleryGrid.innerHTML = sortedOvals.map(buildOvalCard).join("");

  } catch (error) {
    console.error("Oval gallery error:", error);

    galleryGrid.innerHTML = `
      <div class="empty-state">
        Could not load oval gallery data.
      </div>
    `;
  }
}

function sortNewestFirst(a, b) {
  const aNum = Number(a.piece_number || parsePieceNumber(a.id) || 0);
  const bNum = Number(b.piece_number || parsePieceNumber(b.id) || 0);

  if (aNum !== bNum) return bNum - aNum;

  return clean(b.id).localeCompare(clean(a.id));
}

function parsePieceNumber(id) {
  const match = clean(id).match(/-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function buildOvalCard(piece) {
  const id = clean(piece.id);
  const title = clean(piece.title) || id || "Oval Bonsai Container";
  const dimensions = getDimensions(piece);
  const price = getPrice(piece);
  const status = formatStatus(piece.status);
  const image = chooseImage(piece);

  const detailUrl = `/gallery/piece.html?id=${encodeURIComponent(id)}`;

  return `
    <article class="gallery-card" data-piece-id="${escapeAttribute(id)}">
      <a class="gallery-card-link" href="${escapeAttribute(detailUrl)}">

        <div class="gallery-thumb-wrap">
          ${
            image
              ? `
                <img
                  class="gallery-thumb"
                  src="${escapeAttribute(addCacheBust(image))}"
                  alt="${escapeAttribute(title)}"
                  loading="lazy"
                >
              `
              : `<div class="no-image">No image available</div>`
          }
        </div>

        <div class="gallery-card-body">
          <h2>${escapeHtml(id)}</h2>

          ${dimensions ? `<p class="gallery-meta">${escapeHtml(dimensions)}</p>` : ""}
          ${price ? `<p class="gallery-meta">${escapeHtml(price)}</p>` : ""}
          ${status ? `<p class="gallery-meta">${escapeHtml(status)}</p>` : ""}
        </div>

      </a>
    </article>
  `;
}

function getDimensions(piece) {
  const direct =
    clean(piece.dimensions) ||
    clean(piece.dimension) ||
    clean(piece.size);

  if (direct) return direct;

  const l = clean(piece.length || piece.dim_length || piece.dimHeight);
  const w = clean(piece.width || piece.dim_width || piece.dimWidth);
  const h = clean(piece.height || piece.dim_depth || piece.dimDepth);

  if (l && w && h) return `${l} × ${w} × ${h} in.`;

  return "";
}

function getPrice(piece) {
  return formatPrice(
    piece.price ||
    piece.public_price ||
    piece.sale_price ||
    piece.amount
  );
}

function chooseImage(piece) {
  const candidates = [
    piece.image_path,
    piece.thumbnail,
    piece.top_image,
    piece.image_path_2,
    piece.full_top_image,
    piece.image_path_3
  ];

  for (const candidate of candidates) {
    const normalized = normalizeImagePath(candidate);
    if (normalized) return normalized;
  }

  return "";
}

function normalizeImagePath(path) {
  if (!path) return "";

  const cleanPath = String(path).trim().replace(/\\/g, "/");

  if (!cleanPath) return "";

  if (
    cleanPath.startsWith("http://") ||
    cleanPath.startsWith("https://") ||
    cleanPath.startsWith("/")
  ) {
    return cleanPath;
  }

  return `/${cleanPath.replace(/^\.?\/*/, "")}`;
}

function addCacheBust(path) {
  if (!path) return "";

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${Date.now()}`;
}

function formatStatus(value) {
  const raw = clean(value).toLowerCase();

  if (!raw) return "";

  if (raw === "available") return "Available";
  if (raw === "sold") return "Sold";
  if (raw === "reserved") return "Reserved";
  if (raw === "held") return "Held";
  if (raw === "acquired") return "Acquired";
  if (raw === "archive") return "Archive";

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatPrice(value) {
  const raw = clean(value);

  if (!raw) return "";

  if (raw.startsWith("$")) return raw;

  const number = Number(raw);

  if (Number.isFinite(number) && number > 0) {
    return `$${number}`;
  }

  return raw;
}

function clean(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}