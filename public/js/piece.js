const pieceRoot = document.getElementById("pieceRoot");

document.addEventListener("DOMContentLoaded", loadPiece);

async function loadPiece() {
  if (!pieceRoot) return;

  const params = new URLSearchParams(window.location.search);
  const pieceId = params.get("id");

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

      <div class="piece-image-pair">
        <a href="${topImage}" target="_blank" rel="noopener">
          <img class="piece-detail-image" src="${topImage}" alt="${escapeHtml(title)} top view">
        </a>

        ${
          hasBottom
            ? `
              <a href="${bottomImage}" target="_blank" rel="noopener">
                <img class="piece-detail-image" src="${bottomImage}" alt="${escapeHtml(title)} underside">
              </a>
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
  `;
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