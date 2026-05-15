const galleryGrid = document.getElementById("galleryGrid");

document.addEventListener("DOMContentLoaded", () => {
  loadOvals();
});

async function loadOvals() {
  try {
    const response = await fetch("/gallery-data/ovals");

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const pieces = await response.json();

    if (!Array.isArray(pieces) || pieces.length === 0) {
      galleryGrid.innerHTML = `
        <div class="empty-state">
          No oval pieces are currently available for display.
        </div>
      `;
      return;
    }

    galleryGrid.innerHTML = pieces.map(buildCardHtml).join("");

  } catch (error) {
    galleryGrid.innerHTML = `
      <div class="empty-state">
        Could not load oval gallery data.
      </div>
    `;

    console.error("Oval gallery error:", error);
  }
}

function buildCardHtml(piece) {
  const id = piece.id || "";
  const title = piece.description || "Oval Bonsai Container";
  const dimensions = formatDims(piece.width, piece.depth, piece.height);
  const price = formatPrice(piece.price);
  const imagePath = normalizeImagePath(piece.image_path);

  return `
    <article class="gallery-card">

      <a href="/gallery/piece.html?id=${encodeURIComponent(id)}">

        <div class="gallery-thumb-wrap">
          ${buildImageHtml(imagePath, title)}
        </div>

        <div class="gallery-card-body">

          <h2>${escapeHtml(title)}</h2>

          <p class="gallery-meta">
            ${escapeHtml(id)}
          </p>

          <p class="gallery-meta">
            ${escapeHtml(dimensions)}
          </p>

          <p class="gallery-meta">
            ${escapeHtml(price)}
          </p>

          <p class="gallery-meta">
            View details
          </p>

        </div>

      </a>

    </article>
  `;
}

function buildImageHtml(imagePath, altText) {
  if (!imagePath) {
    return `<div class="no-image">No image available</div>`;
  }

  return `
    <img
      class="gallery-thumb"
      src="${escapeAttribute(imagePath)}"
      alt="${escapeAttribute(altText || "ClaycrazE oval bonsai container")}"
      loading="lazy"
      onerror="this.outerHTML='<div class=&quot;no-image&quot;>Image not found</div>'"
    />
  `;
}

function normalizeImagePath(imagePath) {
  if (!imagePath) return "";

  const trimmed = String(imagePath)
    .trim()
    .replace(/\\/g, "/");

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  return `/${trimmed.replace(/^\.?\/*/, "")}`;
}

function formatDims(width, depth, height) {
  const w = safeText(width);
  const d = safeText(depth);
  const h = safeText(height);

  if (!w && !d && !h) return "";

  return `${w || "?"} × ${d || "?"} × ${h || "?"}`;
}

function formatPrice(value) {
  const raw = safeText(value);

  if (!raw) return "";

  const cleaned = raw
    .replace(/\$/g, "")
    .replace(/,/g, "");

  const number = Number(cleaned);

  if (Number.isNaN(number)) return raw;

  return `$${number.toFixed(0)}`;
}

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
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