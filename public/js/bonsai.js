(async function () {
  const galleryGrid = document.getElementById("galleryGrid");
  if (!galleryGrid) return;

  galleryGrid.innerHTML = `
    <div class="empty-state">
      <h2>Loading gallery...</h2>
      <p>Checking available piece images.</p>
    </div>
  `;

  try {
    const response = await fetch("/data/pieces.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load pieces.json");
    }

    const pieces = await response.json();

    if (!Array.isArray(pieces) || !pieces.length) {
      galleryGrid.innerHTML = `
        <div class="empty-state">
          <h2>No pieces yet</h2>
          <p>No published piece records were found.</p>
        </div>
      `;
      return;
    }

    const results = await Promise.all(pieces.map(checkPieceThumbnail));
    const visiblePieces = results
      .filter((result) => result.hasThumb)
      .map((result) => result.piece);

    if (!visiblePieces.length) {
      galleryGrid.innerHTML = `
        <div class="empty-state">
          <h2>No gallery images found</h2>
          <p>Published records exist, but no matching thumbnail images were found.</p>
        </div>
      `;
      return;
    }

    galleryGrid.innerHTML = visiblePieces
      .map((piece) => {
        const thumbSrc = `/images/thumbs/${piece.id}_top.jpg`;
        const href = `/piece.html?id=${encodeURIComponent(piece.id)}`;

        return `
          <article class="gallery-card">
            <a href="${href}" aria-label="Open ${escapeHtml(piece.title)} ${escapeHtml(piece.id)}">
              <div class="gallery-thumb-wrap">
                <img
                  class="gallery-thumb"
                  src="${thumbSrc}"
                  alt="${escapeHtml(piece.title)} ${escapeHtml(piece.id)} top view"
                  loading="lazy"
                />
              </div>
              <div class="gallery-card-body">
                <h2>${escapeHtml(piece.title || "Untitled Piece")}</h2>
                <p class="gallery-meta">${escapeHtml(piece.id)}</p>
              </div>
            </a>
          </article>
        `;
      })
      .join("");
  } catch {
    galleryGrid.innerHTML = `
      <div class="empty-state">
        <h2>Gallery error</h2>
        <p>Something went wrong while loading the gallery data.</p>
      </div>
    `;
  }

  function checkPieceThumbnail(piece) {
    const thumbSrc = `/images/thumbs/${piece.id}_top.jpg`;

    return new Promise((resolve) => {
      const img = new Image();

      img.onload = function () {
        resolve({ piece, hasThumb: true });
      };

      img.onerror = function () {
        resolve({ piece, hasThumb: false });
      };

      img.src = thumbSrc;
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();