const galleryGrid = document.getElementById("galleryGrid");

document.addEventListener("DOMContentLoaded", () => {
  loadOvals();
});

async function loadOvals() {
  try {
    const response = await fetch("/data/pieces.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    const allPieces = await response.json();
    const pieces = allPieces.filter((piece) => piece.id && piece.id.startsWith("OV-"));

    if (!pieces.length) {
      galleryGrid.innerHTML = `<div class="empty-state">No pieces are currently available.</div>`;
      return;
    }

    galleryGrid.innerHTML = pieces.map(buildCardHtml).join("");
  } catch (error) {
    galleryGrid.innerHTML = `<div class="error-state">Could not load pieces.</div>`;
    console.error("Oval gallery error:", error);
  }
}

function buildCardHtml(piece) {
  const title = piece.title || "Bonsai Container";
  const imageSrc = `/images/thumbs/${piece.id}_top_thumb.jpg`;
  const href = `/gallery/piece.html?id=${encodeURIComponent(piece.id)}`;

  return `
    <article class="piece-card">
      <a href="${href}" aria-label="View ${escapeHtml(title)}">
        <div class="piece-image-wrap">
          <img
            class="piece-image"
            src="${imageSrc}"
            alt="${escapeHtml(title)}"
            loading="lazy"
          />
        </div>

        <div class="piece-body">
          <h3 class="piece-title">${escapeHtml(title)}</h3>
          <span class="more-link">View details</span>
        </div>
      </a>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}