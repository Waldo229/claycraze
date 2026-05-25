document.addEventListener("DOMContentLoaded", initializeCurator);

const APP_VERSION = "260525-server-id";

const SHAPE_MAP = {
  OV: { label: "Oval", category: "bonsai", title: "Oval Bonsai Container" },
  RD: { label: "Round", category: "bonsai", title: "Round Bonsai Container" },
  RC: { label: "Rectangle", category: "bonsai", title: "Rectangular Bonsai Container" },
  CS: { label: "Cascade", category: "bonsai", title: "Cascade Bonsai Container" },
  FREE: { label: "Freeform", category: "vessel", title: "Freeform Ceramic Piece" },
  FJ: { label: "Face Jugs", category: "face-jug", title: "Face Jug" },
  IKE: { label: "Ikebana", category: "ikebana", title: "Ikebana Container" },
  SCULP: { label: "Sculpture", category: "sculpture", title: "Ceramic Sculpture" }
};

let allPieces = [];
let currentPiece = null;
let formMode = "edit";

async function initializeCurator() {
  try {
    allPieces = await loadPiecesFresh();

    populatePieceSelect(allPieces);
    bindEvents();
    setEditMode();

    console.log(`ClaycrazE curator loaded: ${APP_VERSION}`);
  } catch (error) {
    console.error(error);
    showStatus("Could not load pieces.", "error");
  }
}

async function loadPiecesFresh() {
  const response = await fetch(`/data/pieces.json?v=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Could not load pieces.json: ${response.status}`);
  }

  return await response.json();
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
    .addEventListener("change", async () => {
      if (formMode === "create") await updateGeneratedId();
    });

  document.getElementById("shape")
    .addEventListener("input", async () => {
      if (formMode === "create") await updateGeneratedId();
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

async function setCreateMode() {
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

  await updateGeneratedId();

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
  setValue("shape", normalizeShapeCode(currentPiece.shape || parsed.shape || ""));
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

/* =========================================================
   SERVER-SIDE ID GENERATION
========================================================= */

async function updateGeneratedId() {
  const shape = normalizeShapeCode(getValue("shape"));

  if (!shape) {
    setValue("pieceId", "");
    return "";
  }

  const dateCode = getCurrentDateCode();

  try {
    showStatus("Asking server for next piece ID...", "working");

    const response = await fetch(
      `/api/next-piece-id?shape=${encodeURIComponent(shape)}&date_code=${encodeURIComponent(dateCode)}&v=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Could not generate piece ID.");
    }

    setValue("pieceId", result.id);
    showStatus(`Next piece ID ready: ${result.id}`, "working");

    return result.id;

  } catch (error) {
    console.error(error);
    setValue("pieceId", "");
    showStatus("Could not generate piece ID.", "error");
    return "";
  }
}

async function ensureGeneratedId() {
  let id = getValue("pieceId");

  if (id) return id;

  id = await updateGeneratedId();

  if (!id) {
    throw new Error("Could not generate piece ID. Choose a shape first.");
  }

  return id;
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
    return { shape: "", dateCode: "", number: 0 };
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
  if (raw === "ROUND") return "RD";
  if (raw === "RND") return "RD";
  if (raw === "RECT") return "RC";
 