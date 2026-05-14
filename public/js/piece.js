const pieceRoot = document.getElementById("pieceRoot") || document.getElementById("pieceDetail");

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
    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    const pieces = await response.json();
    const piece = pieces.find((item) => item.id === pieceId);

    if (!piece) {
      pieceRoot.innerHTML = `<div class="error-state">Piece not found.</div>`;
      return;
    }

    renderPiece(piece);
    setupControls(piece);
  } catch (error) {
    pieceRoot.innerHTML = `
      <div class="error-state">
        Could not load piece data: ${escapeHtml(error.message)}
      </div>
    `;
  }
}

function renderPiece(piece) {
  const id = piece.id;
  const title = piece.title || "Untitled Piece";
  const dimensions = piece.dimensions || "—";
  const price = piece.price || "Available";
  const description = piece.description || "";

  const topImage = `/images/full/${id}_top.jpg`;
  const bottomImage = `/images/full/${id}_bottom.jpg`;
  const hasBottom = piece.has_bottom_image === true || piece.has_bottom_image === "true";

  pieceRoot.innerHTML = `
    <article class="piece-detail">

      <div class="piece-detail-image-wrap">
        <img
          id="pieceMainImage"
          class="piece-detail-image"
          src="${topImage}"
          alt="${escapeAttribute(title)} top view"
          data-top="${topImage}"
          data-bottom="${bottomImage}"
          data-view="top"
        />
      </div>

      <div class="piece-detail-body">
        <p class="piece-detail-kicker">${escapeHtml(id)}</p>
        <h1>${escapeHtml(title)}</h1>

        <p><strong>Dimensions:</strong> ${escapeHtml(dimensions)}</p>
        <p><strong>Price:</strong> ${escapeHtml(price)}</p>

        ${description ? `<div class="piece-description">${formatDescription(description)}</div>` : ""}

        <div class="piece-actions">
          ${
            hasBottom
              ? `<button id="toggleImage" class="piece-button" type="button">View underside</button>`
              : ""
          }

          <button id="magnifyImage" class="piece-button" type="button">
            Magnify
          </button>

          <a class="piece-button" href="/gallery/ovals.html">
            Back to ovals
          </a>

          <a class="piece-button" href="/practice.html">
            Practice gallery
          </a>
        </div>
      </div>

    </article>

    <div id="lightbox" class="image-lightbox" aria-hidden="true">
      <button id="closeLightbox" class="lightbox-close" type="button">×</button>
      <img id="lightboxImage" class="lightbox-image" src="" alt="" />
    </div>
  `;
}

function setupControls(piece) {
  const mainImage = document.getElementById("pieceMainImage");
  const toggleButton = document.getElementById("toggleImage");
  const magnifyButton = document.getElementById("magnifyImage");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const closeButton = document.getElementById("closeLightbox");

  if (toggleButton && mainImage) {
    toggleButton.addEventListener("click", () => {
      const current = mainImage.dataset.view;

      if (current === "top") {
        mainImage.src = mainImage.dataset.bottom;
        mainImage.alt = `${piece.title || piece.id} underside`;
        mainImage.dataset.view = "bottom";
        toggleButton.textContent = "View top";
      } else {
        mainImage.src = mainImage.dataset.top;
        mainImage.alt = `${piece.title || piece.id} top view`;
        mainImage.dataset.view = "top";
        toggleButton.textContent = "View underside";
      }
    });
  }

  function openMagnifier() {
    lightboxImage.src = mainImage.src;
    lightboxImage.alt = mainImage.alt;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
  }

  function closeMagnifier() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImage.src = "";
  }

  mainImage.addEventListener("click", openMagnifier);
  magnifyButton.addEventListener("click", openMagnifier);
  closeButton.addEventListener("click", closeMagnifier);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeMagnifier();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMagnifier();
  });
}

function formatDescription(text) {
  return String(text)
    .split(/\n{2,}/)
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