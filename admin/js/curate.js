document.addEventListener("DOMContentLoaded", initializeCurator);

let allPieces = [];
let currentPiece = null;

async function initializeCurator() {
  try {
    const response = await fetch(`/data/pieces.json?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Could not load pieces.json: ${response.status}`);
    }

    allPieces = await response.json();

    populatePieceSelect(allPieces);
    bindEvents();

  } catch (error) {
    console.error(error);

    const statusBox = document.getElementById("statusBox");

    if (statusBox) {
      statusBox.textContent = "Could not load pieces.";
      statusBox.className = "status-box error";
    }
  }
}

function bindEvents() {
  const pieceSelect = document.getElementById("pieceSelect");

  pieceSelect.addEventListener("change", event => {
    loadPiece(event.target.value);
  });

  document.getElementById("generateDescription")
    .addEventListener("click", generateDescription);

  document.getElementById("suggestPrice")
    .addEventListener("click", suggestPrice);

  document.getElementById("generateWineLabel")
    .addEventListener("click", generateWineLabel);

  document.getElementById("generateLaoTzu")
    .addEventListener("click", generateLaoTzu);

  document.getElementById("curateForm")
    .addEventListener("submit", saveCuratorialChanges);
}

function populatePieceSelect(pieces) {
  const select = document.getElementById("pieceSelect");

  const sorted = [...pieces].sort((a, b) =>
    String(b.id || "").localeCompare(String(a.id || ""))
  );

  select.innerHTML = `
    <option value="">Select piece</option>
  `;

  sorted.forEach(piece => {
    const option = document.createElement("option");

    option.value = piece.id;
    option.textContent = `${piece.id} — ${piece.title || "Untitled"}`;

    select.appendChild(option);
  });
}

function loadPiece(id) {
  currentPiece = allPieces.find(piece => piece.id === id);

  if (!currentPiece) return;

  document.getElementById("title").value =
    currentPiece.title || "";

  document.getElementById("color").value =
    currentPiece.glaze || currentPiece.color || "";

  document.getElementById("description").value =
    currentPiece.description || "";

  document.getElementById("price").value =
    currentPiece.price || "";

  document.getElementById("dimensions").value =
    currentPiece.dimensions || "";

  document.getElementById("objectIdentifier").value =
    currentPiece.object_identifier ||
    currentPiece.objectIdentifier ||
    currentPiece.camera_id ||
    "";

  document.getElementById("status").value =
    currentPiece.status || "available";

  updatePreview(currentPiece);
}

function updatePreview(piece) {
  const preview = document.getElementById("piecePreview");

  const image =
    piece.image_path_2 ||
    piece.image_path ||
    "";

  if (!image) {
    preview.classList.add("empty");

    preview.innerHTML = `
      No preview image available.
    `;

    return;
  }

  preview.classList.remove("empty");

  preview.innerHTML = `
    <img
      src="${image}?v=${Date.now()}"
      alt="${escapeHtml(piece.title || piece.id)}"
    />
  `;
}

function generateDescription() {
  const title = getValue("title");
  const color = getValue("color");
  const dimensions = getValue("dimensions");
  const surface = getValue("surfaceCharacter");
  const mood = getValue("mood");
  const use = getValue("suggestedUse");
  const feature = getValue("notableFeature");

  const dimensionLine = dimensions
    ? `Measuring approximately ${dimensions}, `
    : "";

  const output = `
${title}

${dimensionLine}this ${mood || "quiet"} bonsai container carries ${surface || "restrained surface movement"}.

Its ${feature || "proportions and atmosphere"} make it especially suitable for ${use || "calm compositions"}.

The surface carries a ${color || "soft"} character that rewards close looking and long companionship.
  `.trim();

  setOutput(output);
}

function suggestPrice() {
  const dimensions = getValue("dimensions") || currentPiece?.dimensions || "";
  const mood = getValue("mood").toLowerCase();

  let suggestion = "Suggested range: $125–175";

  if (dimensions.includes("13")) {
    suggestion = "Suggested range: $145–175\nRecommended tag: $150";
  }

  if (mood.includes("exceptional")) {
    suggestion += "\nPossible premium placement piece.";
  }

  setOutput(suggestion);
}

function generateWineLabel() {
  const feature = getValue("notableFeature");

  const output = `
Quietly weathered with restrained movement and a calm interior atmosphere.

${feature || "Subtle details emerge slowly with use."}

Best appreciated over time.
  `.trim();

  setOutput(output);
}

function generateLaoTzu() {
  const lines = [
    "The pot that waits longest often leaves first.",
    "A shallow basin may still hold a deep tree.",
    "The customer who hesitates is already halfway home with it.",
    "To glaze aggressively is to distrust the clay.",
    "The tree chooses the container more often than the owner does."
  ];

  const selected =
    lines[Math.floor(Math.random() * lines.length)];

  setOutput(selected);
}

async function saveCuratorialChanges(event) {
  event.preventDefault();

  if (!currentPiece) {
    showStatus("Select a piece first.", "error");
    return;
  }

  currentPiece.title =
    getValue("title");

  currentPiece.glaze =
    getValue("color");

  currentPiece.description =
    getValue("description");

  currentPiece.price =
    getValue("price");

  currentPiece.dimensions =
    getValue("dimensions");

  currentPiece.object_identifier =
    getValue("objectIdentifier");

  currentPiece.status =
    getValue("status");

  try {
    const response = await fetch("/api/save-curation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(currentPiece)
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Could not save.");
    }

    showStatus("Curatorial changes saved.", "success");

  } catch (error) {
    console.error(error);

    showStatus(error.message || "Save failed.", "error");
  }
}

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function setOutput(text) {
  document.getElementById("geneOutput").value = text;
}

function showStatus(message, type) {
  const statusBox = document.getElementById("statusBox");

  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}