(async function () {
  const pieceLayout = document.getElementById("pieceLayout");
  if (!pieceLayout) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    pieceLayout.innerHTML = `
      <section class="not-found">
        <h1>Piece not found</h1>
        <p>No piece ID was provided.</p>
      </section>
    `;
    return;
  }

  try {
    const response = await fetch("/data/pieces.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load pieces.json");
    }

    const pieces = await response.json();
    const piece = Array.isArray(pieces) ? pieces.find((item) => item.id === id) : null;

    if (!piece) {
      pieceLayout.innerHTML = `
        <section class="not-found">
          <h1>Piece not found</h1>
          <p>The requested piece could not be found in <code>/data/pieces.json</code>.</p>
        </section>
      `;
      return;
    }

    const topSrc = `/images/full/${piece.id}_top.jpg`;
    const bottomSrc = `/images/full/${piece.id}_bottom.jpg`;

    const [hasTop, hasBottom] = await Promise.all([
      imageExists(topSrc),
      imageExists(bottomSrc)
    ]);

    if (!hasTop) {
      pieceLayout.innerHTML = `
        <section class="not-found">
          <h1>${escapeHtml(piece.title || "Piece view unavailable")}</h1>
          <p>The full top image for <code>${escapeHtml(piece.id)}</code> could not be found.</p>
          <p>Expected file:</p>
          <p><code>${topSrc}</code></p>
        </section>
      `;
      return;
    }

    pieceLayout.innerHTML = `
      <section class="viewer-shell">
        <div class="flip-stage">
          <div class="flip-card-large">
            <div class="flip-inner" id="flipInner">
              <img
                src="${topSrc}"
                alt="${escapeHtml(piece.title)} ${escapeHtml(piece.id)} top view"
                class="flip-face front"
              />
              ${
                hasBottom
                  ? `
              <img
                src="${bottomSrc}"
                alt="${escapeHtml(piece.title)} ${escapeHtml(piece.id)} underside"
                class="flip-face back"
              />
              `
                  : ""
              }
            </div>
          </div>
        </div>

        <div class="viewer-controls">
          ${
            hasBottom
              ? `<button class="flip-btn" id="flipBtn" type="button">View underside</button>`
              : ""
          }
          <a class="secondary-link" href="/bonsai.html">Back to gallery</a>
        </div>

        <p class="viewer-note">
          ${
            hasBottom
              ? "The gallery shows the top image only. Here you can inspect the full piece and its underside."
              : "The gallery shows the top image only. The underside image has not been added yet."
          }
        </p>
      </section>

      <aside class="piece-info">
        <p class="eyebrow">${escapeHtml(piece.category || "Piece")}</p>
        <h1>${escapeHtml(piece.title)}</h1>
        <p class="piece-id">${escapeHtml(piece.id)}</p>

        <p class="piece-description">
          ${escapeHtml(piece.description || "")}
        </p>

        <dl class="piece-details">
          <div>
            <dt>Clay</dt>
            <dd>${escapeHtml(piece.clay || "—")}</dd>
          </div>
          <div>
            <dt>Finish</dt>
            <dd>${escapeHtml(piece.finish || "—")}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>${escapeHtml(piece.dimensions || "—")}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>${escapeHtml(piece.price || "—")}</dd>
          </div>
        </dl>
      </aside>
    `;

    const flipBtn = document.getElementById("flipBtn");
    const flipInner = document.getElementById("flipInner");

    if (hasBottom && flipBtn && flipInner) {
      flipBtn.addEventListener("click", function () {
        flipInner.classList.toggle("flipped");
        flipBtn.textContent = flipInner.classList.contains("flipped")
          ? "View top"
          : "View underside";
      });
    }
  } catch {
    pieceLayout.innerHTML = `
      <section class="not-found">
        <h1>Piece view unavailable</h1>
        <p>Something went wrong while loading the piece data.</p>
      </section>
    `;
  }

  function imageExists(src) {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = function () {
        resolve(true);
      };

      img.onerror = function () {
        resolve(false);
      };

      img.src = src;
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