const pieceRoot =
  document.getElementById("pieceRoot") ||
  document.getElementById("pieceDetail");

document.addEventListener("DOMContentLoaded", () => {
  loadPiece();
});

async function loadPiece() {
  if (!pieceRoot) return;

  const params = new URLSearchParams(window.location.search);
  const pieceId = params.get("id");

  if (!pieceId) {
    pieceRoot.innerHTML = `<div class="error-state">No piece ID was provided.</div>`;
    return;
  }

  try {
    const response = await fetch("/data/pieces.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const pieces = await response.json();
    const piece = pieces.find((item) => item.id === pieceId);

    if (!piece) {
      pieceRoot.innerHTML = `<div class="error-state">Piece not found.</div>`;
      return;
    }

    renderPiece(piece);
    setupImageToggle(piece);
  } catch (error) {
    pieceRoot.innerHTML = `
      <div class="error-state">
        Could not load piece data.
      </div>
    `;

    console.error("Piece load error:", error);
  }
}

function renderPiece(piece) {
  const id = piece.id || "";
  const title = piece.title || "Untitled Piece";
  const dimensions = piece.dimensions || "—";
  const price = piece.price || "Available";
  const description = piece.description || "";
  const hasBottom =
    piece.has_bottom_image === true || piece.has_bottom_image === "true";

  const topImage = `/images/full/${id}_top.jpg`;
  const bottomImage = `/images/full/${id}_bottom.jpg`;

  pieceRoot.innerHTML = `
    <article class="piece-detail">

      <div class="piece-detail-image-wrap">
        <img
          id="pieceMainImage"
          class="piece-detail-image"
          src="${escapeAttribute(topImage)}"
          alt="${escapeAttribute(title)} top view"
          data-top="${escapeAttribute(topImage)}"
          data-bottom="${escapeAttribute(bottomImage)}"
          data-view="top"
        />
      </div>

      <div class="piece-detail-body">
        <h1>${escapeHtml(title)}</h1>

        <p><strong>Dimensions:</strong> ${escapeHtml(dimensions)}</p>
        <p><strong>Price:</strong> ${escapeHtml(price)}</p>

        ${
          description
            ? `<div class="piece-description">${formatDescription(description)}</div>`
            : ""
        }

        ${
          hasBottom
            ? `
              <div class="piece-actions">
                <button
                  id="toggleViewBtn"
                  class="piece-button"
                  type="button"
                >
                  View underside
                </button>
              </div>
            `
            : ""
        }

      </div>

    </article>
  `;
}

function setupImageToggle(piece) {
  const image = document.getElementById("pieceMainImage");
  const toggleButton = document.getElementById("toggleViewBtn");

  if (!image) return;

  image.addEventListener("click", () => {
    window.open(image.src, "_blank");
  });

  if (!toggleButton) return;

  toggleButton.addEventListener("click", () => {
    const currentView = image.dataset.view;

    if (currentView === "top") {
      image.src = image.dataset.bottom;
      image.alt = `${piece.title || piece.id} underside`;
      image.dataset.view = "bottom";
      toggleButton.textContent = "View top";
    } else {
      image.src = image.dataset.top;
      image.alt = `${piece.title || piece.id} top view`;
      image.dataset.view = "top";
      toggleButton.textContent = "View underside";
    }
  });
}

function formatDescription(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
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