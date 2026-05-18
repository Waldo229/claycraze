document.addEventListener("DOMContentLoaded", () => {
  loadOvals();
});

async function loadOvals() {
  const galleryGrid = document.getElementById("galleryGrid");
  if (!galleryGrid) return;

  try {
    const response = await fetch("/data/pieces.json?v=1011", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const pieces = await response.json();

    const ovals = pieces.filter((piece) => {
      const id = String(piece.id || "").trim().toUpperCase();
      const shape = String(piece.shape || "").trim().toUpperCase();
      const status = String(piece.status || "").trim().toLowerCase();
      const published = piece.is_published !== false;

      return (
        published &&
        status !== "archive" &&
        status !== "sold" &&
        (shape === "OV" || id.startsWith("OV-"))
      );
    });

    if (!ovals.length) {
      galleryGrid.innerHTML = `
        <div class="empty-state">
          No oval pieces are currently available.
        </div>
      `;
      return;
    }

    galleryGrid.innerHTML = ovals.map(buildOvalTile).join("");

  } catch (error) {
    console.error("Oval gallery error:", error);

    galleryGrid.innerHTML = `
      <div class="empty-state">
        Could not load oval gallery data.
      </div>
    `;
  }
}

function buildOvalTile(piece) {
  const id = String(piece.id || "").trim();
  const title = piece.title || "Oval Bonsai Container";
  const dimensions = piece.dimensions || "";
  const price = piece.price ? `$${piece.price}` : "";

  const image = normalizeImagePath(
    piece.image_path ||
    piece.thumbnail ||
    piece.top_image ||
    piece.image_path_2 ||
    piece.full_top_image ||
    ""
  );

  return `
    <article class="gallery-card">
      <a class="gallery-card-link" href="/gallery/piece.html?id=${encodeURIComponent(id)}">

        <div class="gallery-thumb-wrap">
          ${
            image
              ? `<img class="gallery-thumb" src="${escapeAttribute(image)}?v=1011" alt="${escapeAttribute(title)}" loading="lazy">`
              : `<div class="no-image">No image available</div>`
          }
        </div>

        <div class="gallery-card-body">
          <h2>${escapeHtml(title)}</h2>

          ${id ? `<p class="gallery-meta">${escapeHtml(id)}</p>` : ""}
          ${dimensions ? `<p class="gallery-meta">${escapeHtml(dimensions)}</p>` : ""}
          ${price ? `<p class="gallery-meta">${escapeHtml(price)}</p>` : ""}

          <p class="gallery-more">View details</p>
        </div>

      </a>
    </article>
  `;
}

function normalizeImagePath(path) {
  if (!path) return "";

  const clean = String(path).trim().replace(/\\/g, "/");

  if (
    clean.startsWith("/") ||
    clean.startsWith("http://") ||
    clean.startsWith("https://")
  ) {
    return clean;
  }

  return `/${clean.replace(/^\.?\/*/, "")}`;
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
  return escapeHtml(value);
}