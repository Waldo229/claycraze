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
    showStatus("Could not load pieces.", "error");
  }
}

function bindEvents() {
  document.getElementById("pieceSelect")
    .addEventListener("change", event => {
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

  select.innerHTML = `<option value="">Select piece</option>`;

  sorted.forEach(piece => {
    const option = document.createElement("option");
    option.value = piece.id;
    option.textContent = `${piece.id} — ${piece.title || "Untitled"}`;
    select.appendChild(option);
  });
}

function loadPiece(id) {
  currentPiece = allPieces.find(piece => piece.id === id);

  if (!currentPiece) {
    clearForm();
    return;
  }

  setValue("title", currentPiece.title || "");
  setValue("color", currentPiece.glaze || currentPiece.color || "");
  setValue("description", currentPiece.description || "");
  setValue("price", currentPiece.price || "");
  setStructuredDimensions(currentPiece.dimensions || "");

  setValue("objectIdentifier",
    currentPiece.object_identifier ||
    currentPiece.objectIdentifier ||
    currentPiece.camera_id ||
    ""
  );

  setValue("status", currentPiece.status || "available");

  updatePreview(currentPiece);
}

function clearForm() {
  currentPiece = null;

  setValue("title", "");
  setValue("color", "");
  setValue("description", "");
  setValue("price", "");
  setStructuredDimensions("");
  setValue("objectIdentifier", "");
  setValue("status", "available");
  setOutput("");

  const preview = document.getElementById("piecePreview");
  preview.classList.add("empty");
  preview.textContent = "Select a piece to begin.";
}

function updatePreview(piece) {
  const preview = document.getElementById("piecePreview");

  const image =
    piece.image_path_2 ||
    piece.image_path ||
    "";

  if (!image) {
    preview.classList.add("empty");
    preview.innerHTML = `No preview image available.`;
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

function parseDimensions(value) {
  const clean = String(value || "")
    .replace(/in\.?/gi, "")
    .replace(/"/g, "")
    .trim();

  const parts = clean
    .split(/[xX×]/)
    .map(part => part.trim())
    .filter(Boolean);

  return {
    height: parts[0] || "",
    width: parts[1] || "",
    depth: parts[2] || ""
  };
}

function setStructuredDimensions(value) {
  const parsed = parseDimensions(value);

  setValue("dimHeight", parsed.height);
  setValue("dimWidth", parsed.width);
  setValue("dimDepth", parsed.depth);
  setValue("dimensions", value || "");
}

function getStructuredDimensions() {
  const h = getValue("dimHeight");
  const w = getValue("dimWidth");
  const d = getValue("dimDepth");

  if (!h && !w && !d) return "";

  return `${h} × ${w} × ${d} in.`;
}

function buildSavePayload() {
  if (!currentPiece) return null;

  return {
    id: currentPiece.id,
    shape: currentPiece.shape,
    piece_number: currentPiece.piece_number,
    date_code: currentPiece.date_code,

    title: getValue("title"),
    category: currentPiece.category || "bonsai",
    description: getValue("description"),
    clay_body: currentPiece.clay_body || "Stoneware - Cone 10",
    glaze: getValue("color"),
    notes: currentPiece.notes || "",

    dimensions: getStructuredDimensions(),
    object_identifier: getValue("objectIdentifier"),

    image_path: currentPiece.image_path || "",
    image_path_2: currentPiece.image_path_2 || "",
    image_path_3: currentPiece.image_path_3 || "",
    image_path_4: currentPiece.image_path_4 || "",

    status: getValue("status"),
    price: getValue("price")
  };
}

function generateDescription() {
  const title = getValue("title");
  const color = getValue("color");
  const dimensions = getStructuredDimensions();
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
  const dimensions =
    getStructuredDimensions() ||
    currentPiece?.dimensions ||
    "";

  const mood = getValue("mood").toLowerCase();

  let suggestion = "Suggested range: $125–175";

  if (dimensions.includes("13")) {
    suggestion = "Suggested range: $145–175\nRecommended tag: $150";
  }

  if (dimensions.includes("9 × 7")) {
    suggestion = "Suggested range: $145–185\nRecommended tag: $165";
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

  setOutput(lines[Math.floor(Math.random() * lines.length)]);
}

async function saveCuratorialChanges(event) {
  event.preventDefault();

  const payload = buildSavePayload();

  if (!payload) {
    showStatus("Select a piece first.", "error");
    return;
  }

  try {
    showStatus("Saving curatorial changes...", "working");

    const response = await fetch("/api/save-curation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Could not save.");
    }

    currentPiece = {
      ...currentPiece,
      ...payload
    };

    const index = allPieces.findIndex(piece => piece.id === currentPiece.id);
    if (index >= 0) {
      allPieces[index] = currentPiece;
    }

    let message = "Curatorial changes saved.";

    if (result.deployed_to_siteground === false) {
      message += " Saved on Render, but SiteGround deploy may need checking.";
    }

    showStatus(message, "success");

  } catch (error) {
    console.error(error);
    showStatus(error.message || "Save failed.", "error");
  }
}

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function setOutput(text) {
  document.getElementById("geneOutput").value = text;
}

function showStatus(message, type) {
  const statusBox = document.getElementById("statusBox");

  if (!statusBox) return;

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