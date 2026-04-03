const galleryGrid = document.getElementById("galleryGrid");

async function loadBonsai() {
  try {
    const response = await fetch("/gallery-data/bonsai");

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const pieces = await response.json();

    if (!pieces.length) {
      galleryGrid.innerHTML = `
        <div class="empty-state">
          No bonsai pieces are currently available for display.
        </div>
      `;
      return;
    }

    galleryGrid.innerHTML = pieces.map(buildCardHtml).join("");
  } catch (error) {
    galleryGrid.innerHTML = `
      <div class="error-state">
        Could not load bonsai gallery data: ${escapeHtml(error.message)}
      </div>
    `;
  }
}

function buildCardHtml(piece) {
  const title = piece.description || "Untitled Piece";
  const id = piece.id || "";
  const shape = String(piece.shape || "").toUpperCase();
  const dimensions = shape === "RD" ? formatRoundDimensions(piece) : formatStandardDimensions(piece);
  const clayBody = piece.clay_body || "—";
  const glaze = piece.glaze || "—";
  const firing = piece.firing || "—";
  const status = piece.status || "";
  const price = formatPrice(piece.price);
  const imageHtml = buildImageHtml(piece.image_path, title);
  const category = shapeLabel(shape);

  return `
    <article class="piece-card">
      <div class="piece-image-wrap">
        ${imageHtml}
      </div>
      <div class="piece-body">
        <h3 class="piece-title">${escapeHtml(title)}</h3>
        <p class="piece-id">${escapeHtml(id)}</p>

        <div class="museum-card">
          <p class="card-row"><span class="card-label">Category:</span> ${escapeHtml(category)}</p>
          <p class="card-row"><span class="card-label">Dimensions:</span> ${escapeHtml(dimensions)}</p>
          <p class="card-row"><span class="card-label">Clay Body:</span> ${escapeHtml(clayBody)}</p>
          <p class="card-row"><span class="card-label">Glaze:</span> ${escapeHtml(glaze)}</p>
          <p class="card-row"><span class="card-label">Firing:</span> ${escapeHtml(firing)}</p>
          <p class="card-row"><span class="card-label">Price:</span> ${escapeHtml(price)}</p>
          <div class="status-badge">${escapeHtml(status)}</div>
        </div>
      </div>
    </article>
  `;
}

function shapeLabel(shape) {
  switch (shape) {
    case "OV":
      return "Oval";
    case "RD":
      return "Round";
    case "RC":
      return "Rectangle";
    case "FS":
      return "Freestyle";
    default:
      return shape || "—";
  }
}

function buildImageHtml(imagePath, altText) {
  if (!imagePath) {
    return `<div class="no-image">No image available</div>`;
  }

  const normalizedPath = normalizeImagePath(imagePath);

  return `
    <img
      class="piece-image"
      src="${escapeAttribute(normalizedPath)}"
      alt="${escapeAttribute(altText || "ClaycrazE piece")}"
      loading="lazy"
      onerror="this.replaceWith(document.createElement('div'));"
    />
  `;
}

function normalizeImagePath(imagePath) {
  const trimmed = String(imagePath).trim().replace(/\\/g, "/");

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  return `/${trimmed.replace(/^\.?\/*/, "")}`;
}

function formatStandardDimensions(piece) {
  const length = safeDim(piece.width);
  const width = safeDim(piece.depth);
  const height = safeDim(piece.height);

  if (!length && !width && !height) {
    return "—";
  }

  return `${length || "?"} x ${width || "?"} x ${height || "?"}`;
}

function formatRoundDimensions(piece) {
  const diameter = safeDim(piece.width);
  const height = safeDim(piece.height);

  if (!diameter && !height) {
    return "—";
  }

  return `${diameter || "?"} x ${height || "?"}`;
}

function safeDim(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value).trim();
  return text || "";
}

function formatPrice(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "—";
  }

  const cleaned = raw.replace(/\$/g, "").replace(/,/g, "");
  const number = Number(cleaned);

  if (Number.isNaN(number)) {
    return raw;
  }

  return `$${number.toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

loadBonsai();