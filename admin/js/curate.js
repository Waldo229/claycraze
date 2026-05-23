document.addEventListener("DOMContentLoaded", initializeCurator);

let allPieces = [];
let currentPiece = null;
let formMode = "edit"; // "edit" or "create"

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
    setEditMode();

  } catch (error) {
    console.error(error);
    showStatus("Could not load pieces.", "error");
  }
}

function bindEvents() {
  document.getElementById("createModeButton")
    .addEventListener("click", setCreateMode);

  document.getElementById("editModeButton")
    .addEventListener("click", setEditMode);

  document.getElementById("pieceSelect")
    .addEventListener("change", event => {
      loadPiece(event.target.value);
    });

  document.getElementById("shape")
    .addEventListener("change", () => {
      if (formMode === "create") {
        updateGeneratedId();
      }
    });

  document.getElementById("generateDescription")
    .addEventListener("click", generateDescription);

  document.getElementById("suggestPrice")
    .addEventListener("click", suggestPrice);

  document.getElementById("generateWineLabel")
    .addEventListener("click", generateWineLabel);

  document.getElementById("generateLaoTzu")
    .addEventListener("click", generateLaoTzu);

  document.getElementById("topImageFile")
    .addEventListener("change", previewSelectedTopImage);

  document.getElementById("curateForm")
    .addEventListener("submit", saveRecord);
}

function setCreateMode() {
  formMode = "create";
  currentPiece = null;

  document.getElementById("pieceSelect").value = "";
  document.getElementById("pieceSelect").disabled = true;
  document.getElementById("shape").disabled = false;

  clearWorkFields();
  clearFileInput("topImageFile");
  clearFileInput("bottomImageFile");

  setValue("status", "available");
  setValue("pieceId", "");

  const preview = document.getElementById("piecePreview");
  preview.classList.add("empty");
  preview.textContent = "Choose a shape and top image to create a new piece.";

  const saveButton = document.getElementById("saveButton");
  if (saveButton) saveButton.textContent = "Create New Piece";

  showStatus("Create mode. Choose shape, images, and record details.", "working");
}

function setEditMode() {
  formMode = "edit";

  document.getElementById("pieceSelect").disabled = false;
  document.getElementById("shape").disabled = true;

  clearForm();

  const saveButton = document.getElementById("saveButton");
  if (saveButton) saveButton.textContent = "Save Curatorial Changes";

  showStatus("Edit mode. Select an existing piece.", "working");
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
    option.textContent = piece.id || "Untitled record";
    select.appendChild(option);
  });
}

function loadPiece(id) {
  currentPiece = allPieces.find(piece => piece.id === id);

  if (!currentPiece) {
    clearForm();
    return;
  }

  const parsed = parsePieceIdParts(currentPiece.id);

  setValue("pieceId", currentPiece.id || "");
  setValue("shape", currentPiece.shape || parsed.shape || "");
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

  setValue("privateNotes", currentPiece.notes || "");
  setValue("status", currentPiece.status || "available");

  clearFileInput("topImageFile");
  clearFileInput("bottomImageFile");

  updatePreview(currentPiece);
  showStatus(`Editing existing piece: ${currentPiece.id}`, "working");
}

function clearForm() {
  currentPiece = null;

  setValue("pieceId", "");
  setValue("shape", "");
  clearWorkFields();
  setValue("status", "available");
  setOutput("");

  clearFileInput("topImageFile");
  clearFileInput("bottomImageFile");

  const preview = document.getElementById("piecePreview");
  preview.classList.add("empty");
  preview.textContent = "Select a piece or create a new one.";
}

function clearWorkFields() {
  setValue("color", "");
  setValue("description", "");
  setValue("price", "");
  setStructuredDimensions("");
  setValue("objectIdentifier", "");
  setValue("privateNotes", "");
  setValue("surfaceCharacter", "");
  setValue("mood", "");
  setValue("suggestedUse", "");
  setValue("notableFeature", "");
  setOutput("");
}

function updateGeneratedId() {
  const shape = normalizeShapeCode(getValue("shape"));

  if (!shape) {
    setValue("pieceId", "");
    return;
  }

  const dateCode = getCurrentDateCode();
  const nextNumber = getNextPieceNumber(shape, dateCode);
  const id = `${shape}-${dateCode}-${String(nextNumber).padStart(3, "0")}`;

  setValue("pieceId", id);
  showStatus(`New piece ID prepared: ${id}`, "working");
}

function getNextPieceNumber(shape, dateCode) {
  let max = 0;

  allPieces.forEach(piece => {
    const parsed = parsePieceIdParts(piece.id);

    if (
      normalizeShapeCode(piece.shape || parsed.shape) === shape &&
      String(piece.date_code || parsed.dateCode) === String(dateCode)
    ) {
      const n = Number(piece.piece_number || parsed.number || 0);
      if (n > max) max = n;
    }
  });

  return max + 1;
}

function getCurrentDateCode() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

function parsePieceIdParts(id) {
  const cleanId = String(id || "").trim().toUpperCase();
  const match = cleanId.match(/^([A-Z]+)-(\d{4})-(\d{2,4})$/);

  if (!match) {
    return {
      shape: "",
      dateCode: "",
      number: 0
    };
  }

  return {
    shape: normalizeShapeCode(match[1]),
    dateCode: match[2],
    number: Number(match[3] || 0)
  };
}

function normalizeShapeCode(shape) {
  const raw = String(shape || "").trim().toUpperCase();

  if (raw === "FF") return "FREE";
  if (raw === "IK") return "IKE";
  if (raw === "SC") return "SCULP";

  return raw;
}

function defaultCategory(shape) {
  const cleanShape = normalizeShapeCode(shape);

  if (cleanShape === "IKE") return "ikebana";
  if (cleanShape === "SCULP") return "sculpture";

  return "bonsai";
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
      alt="${escapeHtml(piece.id || "Piece preview")}"
    />
  `;
}

function previewSelectedTopImage() {
  const input = document.getElementById("topImageFile");
  const preview = document.getElementById("piecePreview");

  if (!input || !preview || !input.files || !input.files[0]) {
    if (currentPiece) updatePreview(currentPiece);
    return;
  }

  const file = input.files[0];

  if (!file.type.match(/^image\/jpeg$/)) {
    showStatus("Preview expects a JPEG image.", "error");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    preview.classList.remove("empty");
    preview.innerHTML = `
      <img
        src="${reader.result}"
        alt="Selected top image preview"
      />
    `;

    if (formMode === "create") {
      showStatus("Previewing new top image. Not saved yet.", "working");
    } else if (currentPiece) {
      showStatus(`Previewing replacement top image for ${currentPiece.id}. Not saved yet.`, "working");
    }
  };

  reader.onerror = () => {
    showStatus("Could not preview selected image.", "error");
  };

  reader.readAsDataURL(file);
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

async function buildSavePayload() {
  const id = getValue("pieceId");
  const shape = normalizeShapeCode(getValue("shape"));

  if (formMode === "create") {
    if (!shape) {
      throw new Error("Choose a shape before creating a new piece.");
    }

    if (!id) {
      throw new Error("Could not generate piece ID.");
    }

    if (allPieces.some(piece => piece.id === id)) {
      throw new Error(`${id} already exists. Switch to edit mode or choose a new sequence.`);
    }

    const topInput = document.getElementById("topImageFile");
    if (!topInput || !topInput.files || !topInput.files[0]) {
      throw new Error("Top image is required when creating a new piece.");
    }
  }

  if (formMode === "edit") {
    if (!currentPiece) {
      throw new Error("Select a piece before saving.");
    }
  }

  const topImageData = await readFileAsDataUrl("topImageFile");
  const bottomImageData = await readFileAsDataUrl("bottomImageFile");

  const parsed = formMode === "create"
    ? parsePieceIdParts(id)
    : parsePieceIdParts(currentPiece.id);

  const basePiece = formMode === "edit" ? currentPiece : {};

  return {
    id: formMode === "create" ? id : currentPiece.id,
    shape: formMode === "create" ? shape : normalizeShapeCode(basePiece.shape || parsed.shape),
    piece_number: formMode === "create" ? parsed.number : (basePiece.piece_number || parsed.number),
    date_code: formMode === "create" ? parsed.dateCode : (basePiece.date_code || parsed.dateCode),

    title: basePiece.title || "",
    category: basePiece.category || defaultCategory(shape || basePiece.shape || parsed.shape),
    description: getValue("description"),
    clay_body: basePiece.clay_body || "Stoneware - Cone 10",
    glaze: getValue("color"),
    notes: getValue("privateNotes"),

    dimensions: getStructuredDimensions(),
    object_identifier: getValue("objectIdentifier"),

    image_path: basePiece.image_path || "",
    image_path_2: basePiece.image_path_2 || "",
    image_path_3: basePiece.image_path_3 || "",
    image_path_4: basePiece.image_path_4 || "",

    top_image_data: topImageData,
    bottom_image_data: bottomImageData,

    status: getValue("status"),
    price: getValue("price")
  };
}

function generateDescription() {
  const id = getValue("pieceId");
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
${id}

${dimensionLine}this ${mood || "quiet"} piece carries ${surface || "restrained surface movement"}.

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

async function saveRecord(event) {
  event.preventDefault();

  try {
    const payload = await buildSavePayload();

    const actionLabel = formMode === "create"
      ? `Creating ${payload.id}...`
      : `Saving curatorial changes for ${payload.id}...`;

    showStatus(actionLabel, "working");

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

    const savedPiece = result.pieces && result.pieces[0]
      ? result.pieces[0]
      : payload;

    if (formMode === "create") {
      allPieces.push(savedPiece);
      populatePieceSelect(allPieces);
      document.getElementById("pieceSelect").value = savedPiece.id;
      formMode = "edit";
      document.getElementById("pieceSelect").disabled = false;
      document.getElementById("shape").disabled = true;
    } else {
      const index = allPieces.findIndex(piece => piece.id === savedPiece.id);
      if (index >= 0) {
        allPieces[index] = {
          ...allPieces[index],
          ...savedPiece
        };
      }
    }

    currentPiece = {
      ...(currentPiece || {}),
      ...savedPiece
    };

    setValue("pieceId", currentPiece.id || "");
    setValue("shape", currentPiece.shape || "");

    clearFileInput("topImageFile");
    clearFileInput("bottomImageFile");
    updatePreview(currentPiece);

    const saveButton = document.getElementById("saveButton");
    if (saveButton) saveButton.textContent = "Save Curatorial Changes";

    let message = `Saved ${currentPiece.id}.`;

    if (result.deployed_to_siteground === false) {
      message += " Saved on Render, but SiteGround deploy may need checking.";
    }

    showStatus(message, "success");

  } catch (error) {
    console.error(error);
    showStatus(error.message || "Save failed.", "error");
  }
}

function readFileAsDataUrl(inputId) {
  const input = document.getElementById(inputId);

  if (!input || !input.files || !input.files[0]) {
    return Promise.resolve("");
  }

  const file = input.files[0];

  if (!file.type.match(/^image\/jpeg$/)) {
    return Promise.reject(new Error("Please use JPEG images for upload."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));

    reader.readAsDataURL(file);
  });
}

function clearFileInput(id) {
  const input = document.getElementById(id);
  if (input) input.value = "";
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
  const output = document.getElementById("geneOutput");
  if (output) output.value = text;
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