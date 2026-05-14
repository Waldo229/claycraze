const galleryGrid = document.getElementById("galleryGrid");

document.addEventListener("DOMContentLoaded", () => {
  removeLegacyNav();
  injectPathNav("practice");
  injectGalleryNav("ovals");
  loadOvals();
});

async function loadOvals() {
  try {
    const response = await fetch("/data/pieces.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const allPieces = await response.json();

    const pieces = allPieces.filter((piece) =>
      piece.id && piece.id.startsWith("OV-")
    );

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
      <div class="error-state">
        Could not load oval gallery data: ${escapeHtml(error.message)}
      </div>
    `;

    console.error("Oval gallery error:", error);
  }
}

function buildCardHtml(piece) {
  const title = piece.title || "Untitled Piece";
  const id = piece.id || "";

  const dimensions =
    piece.dimensions ||
    formatDims(piece.width, piece.depth, piece.height);

  const price = formatPrice(piece.price);

  const imageHtml = buildImageHtml(
    `/images/thumbs/${piece.id}_top_thumb.jpg`,
    title
  );

  return `
    <article class="piece-card">

      <div class="piece-image-wrap">
        ${imageHtml}
      </div>

      <div class="piece-body">

        <h3 class="piece-title">
          ${escapeHtml(title)}
        </h3>

        <p class="piece-id">
          ${escapeHtml(id)}
        </p>

        <div class="museum-card">

          <p class="card-row">
            <span class="card-label">Dimensions:</span>
            ${escapeHtml(dimensions)}
          </p>

          <p class="card-row">
            <span class="card-label">Price:</span>
            ${escapeHtml(price)}
          </p>

          <p class="card-row">
            <a
              class="more-link"
              href="/gallery/piece.html?id=${encodeURIComponent(id)}"
            >
              More
            </a>
          </p>

        </div>

      </div>

    </article>
  `;
}

function removeLegacyNav() {
  const siteHeader = document.querySelector(".site-header");
  const galleryPage = document.querySelector(".gallery-page");

  if (!siteHeader || !galleryPage) return;

  let node = siteHeader.nextSibling;

  while (node && node !== galleryPage) {
    const next = node.nextSibling;

    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.remove();
    }

    node = next;
  }

  document.querySelectorAll("body > a").forEach((el) => el.remove());
}

function injectPathNav(activeKey) {
  if (document.getElementById("gallery-path-nav")) return;

  const headerInner = document.querySelector(".header-shell");

  if (!headerInner) return;

  const nav = document.createElement("nav");

  nav.className = "gallery-path-nav";
  nav.id = "gallery-path-nav";

  nav.innerHTML = `
    <a href="/index.html"${activeKey === "home" ? ' class="active"' : ""}>
      Home
    </a>

    <a href="/theory.html"${activeKey === "theory" ? ' class="active"' : ""}>
      Theory
    </a>

    <a href="/practice.html"${activeKey === "practice" ? ' class="active"' : ""}>
      Practice
    </a>
  `;

  headerInner.prepend(nav);
}

function injectGalleryNav(activeKey) {
  if (document.getElementById("gallery-nav-links")) return;

  const headerInner = document.querySelector(".header-shell");

  if (!headerInner) return;

  const items = [
    ["bonsai", "/gallery/bonsai.html", "Bonsai"],
    ["ovals", "/gallery/ovals.html", "Ovals"],
    ["rectangles", "/gallery/rectangles.html", "Rectangles"],
    ["freeform", "/gallery/freeform.html", "Freeform"],
    ["cascade", "/gallery/cascade.html", "Cascade"],
    ["rounds", "/gallery/rounds.html", "Rounds"],
    ["ikebana", "/gallery/ikebana.html", "Ikebana"],
    ["sculpture", "/gallery/sculpture.html", "Sculpture"],
    ["facejugs", "/gallery/facejugs.html", "Face Jugs"]
  ];

  const nav = document.createElement("nav");

  nav.className = "gallery-top-nav";
  nav.id = "gallery-nav-links";

  nav.innerHTML = items
    .map(([key, href, label]) =>
      `<a href="${href}"${key === activeKey ? ' class="active"' : ""}>
        ${label}
      </a>`
    )
    .join("");

  headerInner.appendChild(nav);
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
      onerror="this.outerHTML='<div class=&quot;no-image&quot;>Image not found</div>'"
    />
  `;
}

function normalizeImagePath(imagePath) {
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

function formatDims(a, b, c) {
  const x = safeDim(a);
  const y = safeDim(b);
  const z = safeDim(c);

  if (!x && !y && !z) return "—";

  return `${x || "?"} x ${y || "?"} x ${z || "?"}`;
}

function safeDim(value) {
  if (value === null || value === undefined) return "";

  const text = String(value).trim();

  return text || "";
}

function formatPrice(value) {
  const raw = String(value || "").trim();

  if (!raw) return "—";

  if (raw.toLowerCase() === "available") {
    return "Available";
  }

  const cleaned = raw
    .replace(/\$/g, "")
    .replace(/,/g, "");

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