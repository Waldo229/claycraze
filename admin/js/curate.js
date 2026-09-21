document.addEventListener("DOMContentLoaded", initializeCurator);

const APP_VERSION = "260921-curator-readiness-and-controls";
const DATA_RETRY_LIMIT = 30;
const DATA_RETRY_DELAY_MS = 1000;

const FORM_TYPES = {
  OV: { label: "Oval", category: "bonsai", title: "Oval Bonsai Container" },
  RD: { label: "Round", category: "bonsai", title: "Round Bonsai Container" },
  RC: { label: "Rectangle", category: "bonsai", title: "Rectangular Bonsai Container" },
  CS: { label: "Cascade", category: "bonsai", title: "Cascade Bonsai Container" },
  FREE: { label: "Freeform", category: "vessel", title: "Freeform Ceramic Piece" },
  SL: { label: "Slab", category: "bonsai", title: "Slab Bonsai Container" },
  FJ: { label: "Face Jug", category: "face-jug", title: "Face Jug" },
  IKE: { label: "Ikebana", category: "ikebana", title: "Ikebana Vessel" },
  SCULP: { label: "Sculpture", category: "sculpture", title: "Ceramic Sculpture" },
};
const SHAPE_MAP = FORM_TYPES;
let allPieces = [];
let currentPiece = null;
let formMode = "edit";

async function initializeCurator() {
  bindEvents();

  try {
    showStatus("Loading pottery records...", "working");
    allPieces = await loadPiecesFresh();
    populatePieceSelect(allPieces);
    setEditMode();

    console.log(`ClaycrazE curator loaded: ${APP_VERSION}`);
  } catch (error) {
    console.error(error);
    showStatus(error.message || "Could not load pieces.", "error");
  }
}

async function loadPiecesFresh() {
  for (let attempt = 1; attempt <= DATA_RETRY_LIMIT; attempt += 1) {
    const response = await fetch(`/gallery-data/all?v=${Date.now()}`, {
      cache: "no-store"
    });

    const result = await readJsonResponse(response);

    if (response.ok) {
      if (!Array.isArray(result)) {
        throw new Error("The pottery record response was not a list.");
      }

      return result;
    }

    if (
      response.status === 503 &&
      result &&
      result.code === "CURATION_DATA_NOT_READY" &&
      attempt < DATA_RETRY_LIMIT
    ) {
      showStatus(
        `Render is restoring the pottery records (${attempt}/${DATA_RETRY_LIMIT})...`,
        "working"
      );
      await wait(DATA_RETRY_DELAY_MS);
      continue;
    }

    throw new Error(
      (result && result.error) ||
      `Could not load pottery records: ${response.status}`
    );
  }

  throw new Error("Pottery records did not become ready. Reload the page to try again.");
}

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch (_) {
    throw new Error(`The server returned an unreadable response (${response.status}).`);
  }
}

function wait(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function bindEvents() {
  document.getElementById("createModeButton").addEventListener("click", setCreateMode);
  document.getElementById("editModeButton").addEventListener("click", setEditMode);

  document.getElementById("pieceSelect").addEventListener("change", event => {
    loadPiece(event.target.value);
  });

  document.getElementById("shape").addEventListener("change", async () => {
    if (formMode === "create") {
      await updateGeneratedId();
    }
  });

  document.getElementById("topImageFile").addEventListener("change", previewSelectedTopImage);
  document.getElementById("curateForm").addEventListener("submit", saveRecord);

  bindOptionalButton("generateDescription", generateDescription);
  bindOptionalButton("suggestPrice", suggestPrice);
  bindOptionalButton("generateWineLabel", generateWineLabel);
  bindOptionalButton("generateLaoTzu", generateLaoTzu);
}

function bindOptionalButton(id, handler) {
  const button = document.getElementById(id);

  if (button) {
    button.addEventListener("click", handler);
  }
}

async function setCreateMode() {
  formMode = "create";
  currentPiece = null;

  document.getElementById("pieceSelect").value = "";
  document.getElementById("pieceSelect").disabled = true;
  document.getElementById("shape").disabled = false;

  clearForm();
  setValue("status", "available");

  updateSaveButtonLabels("Create New Piece");
  setModeButtonState("create");

  showPreviewMessage("Choose a shape and top image to create a new piece.");
  showStatus("Create mode. Choose shape, images, and record details.", "working");
}

function setEditMode() {
  formMode = "edit";

  document.getElementById("pieceSelect").disabled = false;
  document.getElementById("shape").disabled = true;

  clearForm();
  updateSaveButtonLabels("Save Curatorial Changes");
  setModeButtonState("edit");

  showStatus("Edit mode. Select an existing piece.", "working");
}

function populatePieceSelect(pieces) {
  const select = document.getElementById("pieceSelect");

  const sorted = [...pieces].sort((a, b) =>
    String(b.id || "").localeCompare(String(a.id || ""))
  );

  select.innerHTML = pieces.length
    ? '<option value="">Select piece</option>'
    : '<option value="">No pieces available</option>';

  sorted.forEach(piece => {
    const option = document.createElement("option");

    option.value = piece.id;
    option.textContent = `${piece.id || "Untitled record"}${piece.title ? " - " + piece.title : ""}`;

    select.appendChild(option);
  });
}

function loadPiece(id) {
  currentPiece = allPieces.find(piece => piece.id === id);

  if (!currentPiece) {
    clearForm();
    showStatus("Edit mode. Select an existing piece.", "working");
    return;
  }

  const parsed = parsePieceIdParts(currentPiece.id);

  setValue("pieceId", currentPiece.id || "");
  setValue("shape", normalizeShapeCode(currentPiece.shape || parsed.shape || ""));
  setValue("color", currentPiece.glaze || currentPiece.color || "");
  setValue("description", currentPiece.description || "");
  setValue("price", currentPiece.price || "");

  setValue(
    "objectIdentifier",
    currentPiece.object_identifier ||
      currentPiece.objectIdentifier ||
      currentPiece.camera_id ||
      ""
  );

  setValue("privateNotes", currentPiece.notes || "");
  setValue("status", currentPiece.status || "available");
  setValue("assignedTo", currentPiece.assigned_to || "studio");

  setStructuredDimensions(currentPiece.dimensions || "");

  clearFileInput("topImageFile");
  clearFileInput("bottomImageFile");

  updatePreview(currentPiece);

  showStatus(`Editing existing piece: ${currentPiece.id}`, "working");
}

async function saveRecord(event) {
  event.preventDefault();

  try {
    setSaveButtonsDisabled(true);
    showStatus("Saving record...", "working");

    let id = getValue("pieceId");
    let shape = normalizeShapeCode(getValue("shape"));

    if (!shape && currentPiece && currentPiece.id) {
      const parsedExisting = parsePieceIdParts(currentPiece.id);
      shape = parsedExisting.shape;
    }

    if (!shape) {
      throw new Error("Choose a shape first.");
    }

    if (formMode === "create") {
      id = await ensureGeneratedId();
    }

    if (!id) {
      throw new Error("Missing piece ID.");
    }

    const shapeInfo = SHAPE_MAP[shape] || {
      title: "Ceramic Piece",
      category: "ceramic"
    };

    updateDimensionsHidden();

    const topFile = document.getElementById("topImageFile").files[0];
    const bottomFile = document.getElementById("bottomImageFile").files[0];

    if (formMode === "create" && !topFile) {
      throw new Error("Top image is required when creating a new piece.");
    }

    const parsed = parsePieceIdParts(id);

    const piece = {
      id,
      shape,
      piece_number: parsed.number || undefined,
      date_code: parsed.dateCode || getCurrentDateCode(),

      title: currentPiece?.title || shapeInfo.title,
      category: currentPiece?.category || shapeInfo.category,

      description: getValue("description"),
      clay_body: currentPiece?.clay_body || "Stoneware - Cone 10",
      glaze: getValue("color"),
      notes: getValue("privateNotes"),
      dimensions: getValue("dimensions"),

      image_path: currentPiece?.image_path || "",
      image_path_2: currentPiece?.image_path_2 || "",
      image_path_3: currentPiece?.image_path_3 || "",
      image_path_4: currentPiece?.image_path_4 || "",

      status: getValue("status") || "available",
      assigned_to: getValue("assignedTo") || "studio",
      price: getValue("price")
    };

    if (topFile) {
      piece.top_image_data = await readFileAsDataUrl(topFile);
    }

    if (bottomFile) {
      piece.bottom_image_data = await readFileAsDataUrl(bottomFile);
    }

    const response = await fetch("/api/save-curation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(piece)
    });

    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Save failed.");
    }

    showStatus(result.message || "Record saved successfully.", "success");

    allPieces = await loadPiecesFresh();
    populatePieceSelect(allPieces);

    const savedPiece =
      result.pieces && result.pieces[0]
        ? result.pieces[0]
        : piece;

    currentPiece = savedPiece;

    setValue("pieceId", savedPiece.id || id);

    document.getElementById("pieceSelect").value = savedPiece.id || id;

    updatePreview(savedPiece);

  } catch (error) {
    console.error(error);
    showStatus(error.message || "Save failed.", "error");
  } finally {
    setSaveButtonsDisabled(false);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");

    if (!/image\/jpe?g/i.test(file.type)) {
      return reject(new Error("Images must be JPEG files."));
    }

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));

    reader.readAsDataURL(file);
  });
}

async function updateGeneratedId() {
  let shape = normalizeShapeCode(getValue("shape"));
  const existingId = getValue("pieceId");

  if (!shape && existingId) {
    const parsed = parsePieceIdParts(existingId);
    shape = parsed.shape;
  }

  const dateCode = getCurrentDateCode();

  try {
    showStatus("Asking server for next piece ID...", "working");

    if (!shape) {
      throw new Error("Choose a shape first.");
    }

    const response = await fetch(
      `/api/next-piece-id?shape=${encodeURIComponent(shape)}&date_code=${encodeURIComponent(dateCode)}&v=${Date.now()}`,
      { cache: "no-store" }
    );

    const result = await readJsonResponse(response);

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Could not generate piece ID.");
    }

    setValue("pieceId", result.id);
    showStatus(`Next piece ID ready: ${result.id}`, "working");

    return result.id;

  } catch (error) {
    console.error(error);

    setValue("pieceId", "");
    showStatus(error.message || "Could not generate piece ID.", "error");

    return "";
  }
}

async function ensureGeneratedId() {
  let id = getValue("pieceId");

  if (id) return id;

  id = await updateGeneratedId();

  if (!id) {
    throw new Error("Could not generate piece ID.");
  }

  return id;
}

function previewSelectedTopImage() {
  const file = document.getElementById("topImageFile").files[0];

  if (!file) return;

  const preview = document.getElementById("piecePreview");
  const url = URL.createObjectURL(file);

  preview.innerHTML = `
    <img
      src="${url}"
      alt="Selected top image preview"
      style="max-width:100%; border-radius:12px;"
    >
  `;
}

function clearForm() {
  currentPiece = null;

  setValue("pieceId", "");
  setValue("shape", "");
  setValue("color", "");
  setValue("description", "");
  setValue("price", "");
  setValue("objectIdentifier", "");
  setValue("privateNotes", "");
  setValue("surfaceCharacter", "");
  setValue("mood", "");
  setValue("suggestedUse", "");
  setValue("notableFeature", "");
  setValue("geneOutput", "");
  setValue("status", "available");
  setValue("assignedTo", "studio");

  setStructuredDimensions("");

  clearFileInput("topImageFile");
  clearFileInput("bottomImageFile");
  showPreviewMessage("Select a piece or create a new one.");
}

function setStructuredDimensions(dimensions) {
  const clean = String(dimensions || "").trim();

  setValue("dimensions", clean);

  const match = clean.match(/([\d.]+)\s*[×x]\s*([\d.]+)\s*[×x]\s*([\d.]+)/i);

  if (match) {
    setValue("dimHeight", match[1]);
    setValue("dimWidth", match[2]);
    setValue("dimDepth", match[3]);
  } else {
    setValue("dimHeight", "");
    setValue("dimWidth", "");
    setValue("dimDepth", "");
  }
}

function updateDimensionsHidden() {
  const l = getValue("dimHeight");
  const w = getValue("dimWidth");
  const h = getValue("dimDepth");

  if (l || w || h) {
    setValue("dimensions", `${l || "0"} × ${w || "0"} × ${h || "0"} in.`);
  } else {
    setValue("dimensions", "");
  }
}

function updatePreview(piece) {
  const preview = document.getElementById("piecePreview");

  const img = piece.image_path || piece.image_path_2 || "";

  preview.innerHTML = `
    ${
      img
        ? `<img
            src="${img}"
            style="max-width:100%; border-radius:12px;"
          >`
        : ""
    }
    <strong>${piece.id || ""}</strong><br>
    ${piece.title || ""}<br>
    ${piece.dimensions || ""}<br>
    ${piece.status ? `<em>${piece.status}</em>` : ""}
  `;
}

function showPreviewMessage(message) {
  const preview = document.getElementById("piecePreview");
  preview.textContent = message;
}

function getValue(id) {
  const element = document.getElementById(id);
  return element ? String(element.value || "").trim() : "";
}

function setValue(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value || "";
  }
}

function clearFileInput(id) {
  const input = document.getElementById(id);

  if (input) {
    input.value = "";
  }
}

function showStatus(message, type = "working") {
  const box = document.getElementById("statusBox");
  const topBox = document.getElementById("topStatusBox");

  if (box) {
    box.textContent = message;
    box.className = `status-box ${type}`;
  }

  if (topBox) {
    topBox.textContent = message;
    topBox.className = `status-inline ${type}`;
  }
}

function updateSaveButtonLabels(label) {
  for (const id of ["saveButton", "topSaveButton"]) {
    const button = document.getElementById(id);
    if (button) button.textContent = label;
  }
}

function setSaveButtonsDisabled(disabled) {
  for (const id of ["saveButton", "topSaveButton"]) {
    const button = document.getElementById(id);
    if (button) button.disabled = disabled;
  }
}

function setModeButtonState(mode) {
  const createButton = document.getElementById("createModeButton");
  const editButton = document.getElementById("editModeButton");

  if (createButton) createButton.setAttribute("aria-pressed", String(mode === "create"));
  if (editButton) editButton.setAttribute("aria-pressed", String(mode === "edit"));
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
  if (raw === "SLAB") return "SL";
  if (raw === "ROUND") return "RD";
  if (raw === "RND") return "RD";
  if (raw === "RECT") return "RC";

  return raw;
}

function generateDescription() {
  const shape = normalizeShapeCode(getValue("shape"));
  const shapeInfo = SHAPE_MAP[shape] || { title: "Ceramic Piece" };
  const surface = getValue("surfaceCharacter") || getValue("color");
  const mood = getValue("mood");
  const use = getValue("suggestedUse");
  const feature = getValue("notableFeature");

  const draft = [
    `${shapeInfo.title}.`,
    surface ? `Surface: ${surface}.` : "",
    mood ? `Mood: ${mood}.` : "",
    use ? `Suggested use: ${use}.` : "",
    feature ? `Notable feature: ${feature}.` : ""
  ].filter(Boolean).join("\n");

  setValue("geneOutput", draft);
  showStatus("Description draft prepared. Review it before using it.", "success");
}

function suggestPrice() {
  const shape = normalizeShapeCode(getValue("shape"));
  const ranges = {
    OV: "85–225",
    RD: "60–185",
    RC: "85–225",
    CS: "95–225",
    FREE: "50–175",
    SL: "75–185",
    FJ: "125–185",
    IKE: "35–125",
    SCULP: "75–225"
  };
  const range = ranges[shape] || "50–225";

  setValue(
    "geneOutput",
    `Suggested price range: $${range}. Adjust for size, finish, presence, and difficulty.`
  );
  showStatus("Price range prepared. The final price remains yours.", "success");
}

function generateWineLabel() {
  const title = (SHAPE_MAP[normalizeShapeCode(getValue("shape"))] || {
    title: "Ceramic Piece"
  }).title;
  const surface = getValue("surfaceCharacter") || getValue("color");
  const mood = getValue("mood");

  setValue(
    "geneOutput",
    [title, surface, mood].filter(Boolean).join(" — ") || "The kiln has spoken."
  );
  showStatus("Short label prepared.", "success");
}

function generateLaoTzu() {
  const use = getValue("suggestedUse");
  const line = use
    ? `The vessel waits; ${use} gives its emptiness purpose.`
    : "The vessel is useful because of what it holds open.";

  setValue("geneOutput", line);
  showStatus("Lao-tzu line prepared for your review.", "success");
}
