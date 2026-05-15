VSconst pieceRoot = document.getElementById("pieceRoot");

document.addEventListener("DOMContentLoaded", loadPiece);

async function loadPiece() {
  if (!pieceRoot) return;

  const pieceId = new URLSearchParams(window.location.search).get("id");

  if (!pieceId) {
    pieceRoot.innerHTML = `<div class="error-state">No piece selected.</div>`;
    return;
  }

  try {
    const response = await fetch("/data/pieces.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    const pieces = await response.json();
    const piece = pieces.find((item) => item.id === pieceId);

    if (!piece) {
      pieceRoot.innerHTML = `<div class="error-state">Piece not found.</div>`;
      return;
    }

    renderPiece(piece);
    setupZoomViewer();
  } catch (error) {
    pieceRoot.innerHTML = `<div class="error-state">Could not load piece.</div>`;
    console.error("Piece load error:", error);
  }
}

function renderPiece(piece) {
  const id = piece.id || "";
  const title = piece.title || "Untitled Piece";
  const dimensions = piece.dimensions || "—";
  const price = piece.price || "Available";
  const description = piece.description || "";
  const note = piece.patron_note || "Better after a second look.";

  const topImage = `/images/full/${id}_top.jpg`;
  const bottomImage = `/images/full/${id}_bottom.jpg`;
  const hasBottom = piece.has_bottom_image === true || piece.has_bottom_image === "true";

  pieceRoot.innerHTML = `
    <article class="piece-detail">

      <div class="piece-image-grid">

        <figure class="piece-view-card">
          <button class="zoom-trigger" type="button" data-src="${escapeAttribute(topImage)}" data-alt="${escapeAttribute(title)} top view">
            <img src="${escapeAttribute(topImage)}" alt="${escapeAttribute(title)} top view">
          </button>
          <figcaption>Top view</figcaption>
        </figure>

        ${
          hasBottom
            ? `
              <figure class="piece-view-card">
                <button class="zoom-trigger" type="button" data-src="${escapeAttribute(bottomImage)}" data-alt="${escapeAttribute(title)} underside">
                  <img src="${escapeAttribute(bottomImage)}" alt="${escapeAttribute(title)} underside">
                </button>
                <figcaption>Underside</figcaption>
              </figure>
            `
            : ""
        }

      </div>

      <div class="piece-detail-body">
        <h1>${escapeHtml(title)}</h1>

        <p><strong>Dimensions:</strong> ${escapeHtml(dimensions)}</p>
        <p><strong>Price:</strong> ${escapeHtml(price)}</p>

        ${description ? `<div class="piece-description">${formatDescription(description)}</div>` : ""}

        <p class="patron-note">${escapeHtml(note)}</p>
      </div>

    </article>

    <div id="zoomOverlay" class="zoom-overlay" aria-hidden="true">
      <button id="zoomClose" class="zoom-close" type="button" aria-label="Close magnified image">×</button>
      <div class="zoom-scroll">
        <img id="zoomImage" class="zoom-image" src="" alt="">
      </div>
    </div>
  `;
}

function setupZoomViewer() {
  const overlay = document.getElementById("zoomOverlay");
  const zoomImage = document.getElementById("zoomImage");
  const closeButton = document.getElementById("zoomClose");

  document.querySelectorAll(".zoom-trigger").forEach((button) => {
    button.addEventListener("click", () => {
      zoomImage.src = button.dataset.src;
      zoomImage.alt = button.dataset.alt || "Magnified piece image";
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("zoom-open");
    });
  });

  closeButton.addEventListener("click", closeZoom);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeZoom();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeZoom();
  });

  function closeZoom() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("zoom-open");
    zoomImage.src = "";
    zoomImage.alt = "";
  }
}

function formatDescription(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}