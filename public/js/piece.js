const navToggle = document.getElementById("navToggle");
const siteNav = document.getElementById("siteNav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
}

const pieceStage = document.getElementById("pieceStage");
const pieceDetails = document.getElementById("pieceDetails");

function getPieceId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderError(message) {
  if (pieceStage) {
    pieceStage.innerHTML = `
      <div class="piece-message">
        <p>${message}</p>
      </div>
    `;
  }

  if (pieceDetails) {
    pieceDetails.innerHTML = "";
  }
}

function renderPiece(piece) {
  const id = piece.id || piece.pieceId || piece.code || piece.name || "Untitled";
  const title = piece.title || piece.name || id;
  const clay = piece.clay || "";
  const glaze = piece.glaze || "";
  const description = piece.description || "";

  const topImage =
    piece.topImage ||
    piece.image_top ||
    piece.top ||
    `/images/full/${id}_top.jpg`;

  const bottomImage =
    piece.bottomImage ||
    piece.image_bottom ||
    piece.bottom ||
    `/images/full/${id}_bottom.jpg`;

  if (pieceStage) {
    pieceStage.innerHTML = `
      <div class="flip-stage">
        <div class="flip-card-large">
          <div class="flip-inner" id="flipInner">
            <img
              src="${topImage}"
              alt="${title} top view"
              class="flip-face front"
            />
            <img
              src="${bottomImage}"
              alt="${title} bottom view"
              class="flip-face back"
            />
          </div>
        </div>

        <div class="viewer-controls">
          <button class="flip-btn" id="flipBtn" type="button">Flip</button>
        </div>
      </div>
    `;
  }

  if (pieceDetails) {
    pieceDetails.innerHTML = `
      <article class="piece-info">
        <h1>${title}</h1>
        <div class="piece-details">
          <p><strong>Piece ID:</strong> ${id}</p>
          ${clay ? `<p><strong>Clay:</strong> ${clay}</p>` : ""}
          ${glaze ? `<p><strong>Glaze:</strong> ${glaze}</p>` : ""}
          ${description ? `<p>${description}</p>` : ""}
        </div>
      </article>
    `;
  }

  const flipInner = document.getElementById("flipInner");
  const flipBtn = document.getElementById("flipBtn");

  if (flipInner && flipBtn) {
    flipBtn.addEventListener("click", () => {
      flipInner.classList.toggle("flipped");
    });
  }
}

async function fetchPieces() {
  const response = await fetch("/data/pieces.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load /data/pieces.json (${response.status})`);
  }

  return await response.json();
}

async function loadPiece() {
  const pieceId = getPieceId();

  if (!pieceId) {
    renderError("No piece ID was provided in the URL.");
    return;
  }

  try {
    const data = await fetchPieces();

    const pieces = Array.isArray(data)
      ? data
      : Array.isArray(data.pieces)
        ? data.pieces
        : [];

    const piece = pieces.find((item) =>
      item.id === pieceId ||
      item.pieceId === pieceId ||
      item.code === pieceId ||
      item.name === pieceId
    );

    if (!piece) {
      renderError(`Piece "${pieceId}" was not found in /data/pieces.json.`);
      return;
    }

    renderPiece(piece);
  } catch (error) {
    console.error("piece.js load error:", error);
    renderError(error.message);
  }
}

loadPiece();