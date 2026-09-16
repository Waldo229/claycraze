(function () {
  const grid = document.getElementById("treesGallery");

  if (!grid) return;

  const personSlug = grid.dataset.person || "";
  const ownerSlug = grid.dataset.owner || "";

  function esc(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function normalizeImagePath(path) {
    if (!path) return "/images/placeholder.jpg";
    return path.startsWith("/") ? path : "/" + path;
  }

  function normalizePagePath(tree) {
    if (tree.page_path) return tree.page_path;

    if (tree.person_slug && tree.tree_slug) {
      return `/trees/${tree.person_slug}/${tree.tree_slug}/`;
    }

    return "#";
  }

  function buildCard(tree) {
    const title = esc(tree.title || "Untitled Tree");
    const species = esc(tree.species || "");
    const imagePath = normalizeImagePath(tree.image_path);
    const pagePath = normalizePagePath(tree);

    return `
      <a class="gallery-card" href="${esc(pagePath)}">
        <img src="${esc(imagePath)}" alt="${title}">
        <div class="gallery-card-info">
          <h2>${title}</h2>
          ${species ? `<p>${species}</p>` : ""}
        </div>
      </a>
    `;
  }

  async function loadTrees() {
    try {
      grid.innerHTML = "<p>Loading trees...</p>";

      const response = await fetch(`/data/trees.json?v=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Could not load trees.json");
      }

      const trees = await response.json();

      const filtered = trees.filter((tree) => {
        if (personSlug) return tree.person_slug === personSlug;
        if (ownerSlug) return tree.owner_slug === ownerSlug;
        return true;
      });

      if (!filtered.length) {
        grid.innerHTML = "<p>No trees found for this collection yet.</p>";
        return;
      }

      grid.innerHTML = filtered.map(buildCard).join("");
    } catch (error) {
      console.error(error);
      grid.innerHTML = "<p>Tree gallery could not be loaded.</p>";
    }
  }

  loadTrees();
})();