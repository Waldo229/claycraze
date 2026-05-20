document.addEventListener("DOMContentLoaded", initializeSiteSearch);

let searchablePieces = [];

async function initializeSiteSearch() {
  const input = document.getElementById("siteSearchInput");
  const results = document.getElementById("siteSearchResults");

  if (!input || !results) return;

  try {
    const response = await fetch(`/data/pieces.json?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Could not load archive.");
    }

    searchablePieces = await response.json();

    input.addEventListener("input", () => {
      runSearch(input.value);
    });

  } catch (error) {
    results.textContent = "Search is temporarily unavailable.";
  }
}

function runSearch(query) {
  const results = document.getElementById("siteSearchResults");
  const cleanQuery = query.trim().toLowerCase();

  if (!cleanQuery) {
    results.textContent = "Type to search available pieces.";
    return;
  }

  const matches = searchablePieces.filter(piece => {
    const haystack = [
      piece.id,
      piece.title,
      piece.shape,
      piece.category,
      piece.description,
      piece.clay_body,
      piece.glaze,
      piece.notes,
      piece.dimensions,
      piece.status,
      piece.price
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(cleanQuery);
  });

  if (!matches.length) {
    results.innerHTML = `<p>No matching pieces found.</p>`;
    return;
  }

  results.innerHTML = matches.slice(0, 8).map(piece => {
    const image = piece.image_path || piece.image_path_2 || "";
    const href = `/gallery/viewer.html?id=${encodeURIComponent(piece.id)}`;

    return `
      <a class="site-search-result" href="${href}">
        ${image ? `<img src="${image}" alt="${escapeHtml(piece.title || piece.id)}" />` : ""}
        <span>
          <strong>${escapeHtml(piece.title || piece.id)}</strong>
          <small>
            ${escapeHtml(piece.id || "")}
            ${piece.dimensions ? ` · ${escapeHtml(piece.dimensions)}` : ""}
            ${piece.price ? ` · $${escapeHtml(piece.price)}` : ""}
          </small>
        </span>
      </a>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}