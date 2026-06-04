/* =========================================================
   ClaycrazE — Universal Shape Gallery
   Cards show: image, ID, dimensions, price, status
   Version 1019
   ========================================================= */

document.addEventListener("DOMContentLoaded", loadShapeGallery);

async function loadShapeGallery() {
  installGalleryImageTweaks();

  const galleryGrid = document.getElementById("galleryGrid");
  const shapeCode = String(window.CLAYCRAZE_GALLERY_SHAPE || "").toUpperCase();

  if (!galleryGrid) return;

  if (!shapeCode) {
    galleryGrid.innerHTML = `<div class="empty-state">Gallery shape not set.</div>`;
    return;
  }

  galleryGrid.innerHTML = `<div class="loading">Loading gallery...</div>`;

  try {
    const response = await fetch(`/data/pieces.json?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Could not load pieces.json: ${response.status}`);
    }

    const pieces = await response.json();

    if (!Array.isArray(pieces)) {
      throw new Error("pieces.json did not return an array.");
    }

    const filtered = pieces
      .filter(piece => matchesShape(piece, shapeCode))
      .sort(sortNewestFirst);

    if (!filtered.length) {
      galleryGrid.innerHTML = `<div class="empty-state">No pieces are currently available.</div>`;
      return;
    }

    galleryGrid.innerHTML = filtered.map(piece => buildCard(piece, shapeCode)).join("");

  } catch (error) {
    console.error("Gallery error:", error);
    galleryGrid.innerHTML = `<div class="empty-state">Could not load gallery data.</div>`;
  }
}

function installGalleryImageTweaks() {
  if (document.getElementById("claycraze-gallery-image-tweaks")) return;

  const style = document.createElement("style");
  style.id = "claycraze-gallery-image-tweaks";

  style.textContent = `
    .gallery-card[data-shape="FJ"] .gallery-thumb,
    .gallery-card[data-shape="S"] .gallery-thumb,
    .gallery-card[data-shape="IK"] .gallery-thumb {
      object-fit: contain;
      object-position: center center;
    }

    .gallery-card[data-shape="RD"] .gallery-thumb,
    .gallery-card[data-shape="CS"] .gallery-thumb {
      object-fit: contain;
      object-position: center center;
    }

    .gallery-card[data-shape="OV"] .gallery-thumb,
    .gallery-card[data-shape="RC"] .gallery-thumb,
    .gallery-card[data-shape="REC"] .gallery-thumb,
    .gallery-card[data-shape="FF"] .gallery-thumb {
      object-fit: cover;
      object-position: center center;
    }
  `;

  document.head.appendChild(style);
}

function matchesShape(piece, shapeCode) {
  const id = clean(piece.id).toUpperCase();
  const shape = normalizeShape(clean(piece.shape));

  return shape === shapeCode || id.startsWith(`${shapeCode}-`);
}

function normalizeShape(value) {
  const raw = clean(value).toUpperCase();

  if (raw === "ROUND") return "RD";
  if (raw === "ROUNDS") return "RD";
  if (raw === "RND") return "RD";

  if (raw === "RECT") return "RC";
  if (raw === "RECTANGLE") return "RC";
  if (raw === "RECTANGLES") return "RC";
  if (raw === "REC") return "RC";

  if (raw === "CASCADE") return "CS";
  if (raw === "CASCADES") return "CS";

  if (raw === "FREEFORM") return "FF";
  if (raw === "FREE") return "FF";

  if (raw === "IKEBANA") return "IK";
  if (raw === "IK") return "IK";

  if (raw === "FACE") return "FJ";
  if (raw === "FACEJUG") return "FJ";
  if (raw === "FACEJUGS") return "FJ";
  if (raw === "FACE JUG") return "FJ";
  if (raw === "FACE JUGS") return "FJ";

  if (raw === "SCULPTURE") return "S";

  return raw;
}

function sortNewestFirst(a, b) {
  const aNum = Number(a.piece_number || 0);
  const bNum = Number(b.piece_number || 0);

  if (aNum !== bNum) return bNum - aNum;

  return clean(b.id).localeCompare(clean(a.id));
}

function buildCard(piece, shapeCode) {
  const id = clean(piece.id);
  const normalizedShape = normalizeShape(clean(piece.shape)) || shapeCode;
  const dimensions = formatDimensions(piece, normalizedShape);
  const status = formatStatus(piece.status);
  const price = formatPrice(piece.price);
  const image = chooseImage(piece);
  const detailUrl = `/gallery/piece.html?id=${encodeURIComponent(id)}`;

  return `
    <article
      class="gallery-card"
      data-piece-id="${escapeAttribute(id)}"
      data-shape="${escapeAttribute(normalizedShape)}"
    >
      <a class="gallery-card-link" href="${escapeAttribute(detailUrl)}">

        <div class="gallery-thumb-wrap">
          ${
            image
              ? `
                <img
                  class="gallery-thumb"
                  src="${escapeAttribute(addCacheBust(image))}"
                  alt="${escapeAttribute(id)}"
                  loading="lazy"
                >
              `
              : `<div class="no-image">No image available</div>`
          }
        </div>

        <div class="gallery-card-body">
          ${id ? `<p class="piece-id">${escapeHtml(id)}</p>` : ""}
          ${dimensions ? `<h2>${escapeHtml(dimensions)}</h2>` : ""}
          ${price ? `<p class="gallery-meta">${escapeHtml(price)}</p>` : ""}
          ${status ? `<p class="gallery-meta">${escapeHtml(status)}</p>` : ""}
        </div>

      </a>
    </article>
  `;
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

function formatDimensions(piece, shapeCode) {
  const direct = clean(piece.dimensions);

  if (direct) {
    return formatDimensionString(direct, shapeCode);
  }

  const length = clean(piece.length);
  const width = clean(piece.width);
  const height = clean(piece.height);

  if (length && width && height) {
    if (isZero(length)) {
      return `${width} in. W × ${height} in. H`;
    }

    return `${length} × ${width} × ${height} in.`;
  }

  if (width && height) {
    return `${width} in. W × ${height} in. H`;
  }

  if (height) {
    return `${height} in. H`;
  }

  return "";
}

function formatDimensionString(value, shapeCode) {
  const raw = clean(value);

  const parts = raw
    .replace(/in\.?/gi, "")
    .split("×")
    .map(part => clean(part));

  if (parts.length === 3 && isZero(parts[0])) {
    return `${parts[1]} in. W × ${parts[2]} in. H`;
  }

  return raw;
}

function isZero(value) {
  const raw = clean(value);
  return raw === "0" || raw === "0.0" || raw === "0.00";
}

function clean(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(//>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
