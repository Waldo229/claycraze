const galleryGrid = document.getElementById("galleryGrid");

document.addEventListener("DOMContentLoaded", () => {
  removeLegacyNav();
  injectPathNav("practice");
  injectGalleryNav("ovals");
  loadOvals();
});

async function loadOvals() {
  try {
    const response = await fetch("/gallery-data/ovals");
    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    const pieces = await response.json();

    if (!Array.isArray(pieces) || pieces.length === 0) {
      galleryGrid.innerHTML = `<div class="empty-state">No oval pieces are currently available for display.</div>`;
      return;
    }

    galleryGrid.innerHTML = pieces.map(buildCardHtml).join("");
  } catch (error) {
    galleryGrid.innerHTML = `<div class="error-state">Could not load oval gallery data: ${escapeHtml(error.message)}</div>`;
    console.error("Oval gallery error:", error);
  }
}

function buildCardHtml(piece) {
  const title = piece.description || "Untitled Piece";
  const id = piece.id || "";
  const dimensions = formatDims(piece.width, piece.depth, piece.height);
  const price = formatPrice(piece.price);
  const imageHtml = buildImageHtml(piece.image_path, title);

  return `
    <article class="piece-card">
      <div class="piece-image-wrap">${imageHtml}</div>
      <div class="piece-body">
        <h3 class="piece-title">${escapeHtml(title)}</h3>
        <p class="piece-id">${escapeHtml(id)}</p>
        <div class="museum-card">
          <p class="card-row"><span class="card-label">Dimensions:</span> ${escapeHtml(dimensions)}</p>
          <p class="card-row"><span class="card-label">Price:</span> ${escapeHtml(price)}</p>
          <p class="card-row"><a class="more-link" href="/piece/${encodeURIComponent(id)}">More</a></p>
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

  const headerInner = document.querySelector(".header-inner");
  if (!headerInner) return;

  const nav = document.createElement("nav");
  nav.className = "gallery-path-nav";
  nav.id = "gallery-path-nav";
  nav.innerHTML = `
    <a href="/"${activeKey === "home" ? ' class="active"' : ""}>Home</a>
    <a href="https://waldo229.github.io/cc-rebuild<a href="https://waldo229.github.io/cc-rebuild/">Theory</a>${activeKey === "theory" ? ' class="active"' : ""}>Theory</a>
    <a href="/practice.html"${activeKey === "practice" ? ' class="active"' : ""}>Practice</a>
  `;

  headerInner.prepend(nav);
}

function injectGalleryNav(activeKey) {
  if (document.getElementById("gallery-nav-links")) return;

  const headerInner = document.querySelector(".header-inner");
  if (!headerInner) return;

  const items = [
    ["bonsai", "/gallery/bonsai", "Bonsai"],
    ["ovals", "/gallery/ovals", "Ovals"],
    ["rounds", "/gallery/rounds", "Rounds"],
    ["rectangles", "/gallery/rectangles", "Rectangles"],
    ["freestyle", "/gallery/freestyle", "Freestyle"],
    ["facejugs", "/gallery/facejugs", "Facejugs"],
    ["ikebana", "/gallery/ikebana", "Ikebana"],
    ["sculpture", "/gallery/sculpture", "Sculpture"]
  ];

  const nav = document.createElement("nav");
  nav.className = "gallery-top-nav";
  nav.id = "gallery-nav-links";
  nav.innerHTML = items.map(([key, href, label]) =>
    `<a href="${href}"${key === activeKey ? ' class="active"' : ""}>${label}</a>`
  ).join("");

  headerInner.appendChild(nav);
}

function buildImageHtml(imagePath, altText) {
  if (!imagePath) return `<div class="no-image">No image available</div>`;
  const normalizedPath = normalizeImagePath(imagePath);
  return `<img class="piece-image" src="${escapeAttribute(normalizedPath)}" alt="${escapeAttribute(altText || "ClaycrazE piece")}" loading="lazy" onerror="this.outerHTML='<div class=&quot;no-image&quot;>Image not found</div>'" />`;
}

function normalizeImagePath(imagePath) {
  const trimmed = String(imagePath).trim().replace(/\\/g, "/");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) return trimmed;
  return `/${trimmed.replace(/^\.?\/*/, "")}`;
}

function formatDims(a, b, c) {
  const x = safeDim(a), y = safeDim(b), z = safeDim(c);
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
  const cleaned = raw.replace(/\$/g, "").replace(/,/g, "");
  const number = Number(cleaned);
  if (Number.isNaN(number)) return raw;
  return `$${number.toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}