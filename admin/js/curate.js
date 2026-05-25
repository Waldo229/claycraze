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

/* =========================================================
   INITIALIZATION
========================================================= */

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

/* =========================================================
   SINGLE SOURCE OF TRUTH
========================================================= */

async function loadPiecesFresh() {
  const response = await fetch(
    `/gallery-data/ovals?v=${Date.now()}`,
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(
      `Could not load gallery data: ${response.status}`
    );
  }

  return await response.json();
}

/* =========================================================
   EVENTS
========================================================= */

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
      if (formMode === "create") {
        await updateGeneratedId();
      }
    });

  document.getElementById("shape")
    .addEventListener("input", async () => {
      if (formMode === "create") {
        await updateGeneratedId();
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

/* =========================================================
   MODE CONTROL
========================================================= */

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

  preview.textContent =
    "Choose a shape and top image to create a new piece.";

  const saveButton =
    document.getElementById("saveButton");

  if (saveButton) {
    saveButton.textContent = "Create New Piece";
  }

  showStatus(
    "Create mode. Choose shape, images, and record details.",
    "working"
  );
}

function setEditMode() {

  formMode = "edit";

  document.getElementById("pieceSelect").disabled = false;
  document.getElementById("shape").disabled = true;

  clearForm();

  const saveButton =
    document.getElementById("saveButton");

  if (saveButton) {
    saveButton.textContent =
      "Save Curatorial Changes";
  }

  showStatus(
    "Edit mode. Select an existing piece.",
    "working"
  );
}

/* =========================================================
   PIECE LOADING
========================================================= */

function populatePieceSelect(pieces) {

  const select =
    document.getElementById("pieceSelect");

  const sorted = [...pieces].sort((a, b) =>
    String(b.id || "")
      .localeCompare(String(a.id || ""))
  );

  select.innerHTML =
    `<option value="">Select piece</option>`;

  sorted.forEach(piece => {

    const option =
      document.createElement("option");

    option.value = piece.id;

    option.textContent =
      piece.id || "Untitled record";

    select.appendChild(option);
  });
}

function loadPiece(id) {

  currentPiece =
    allPieces.find(piece => piece.id === id);

  if (!currentPiece) {
    clearForm();
    return;
  }

  const parsed =
    parsePieceIdParts(currentPiece.id);

  setValue(
    "pieceId",
    currentPiece.id || ""
  );

  setValue(
    "shape",
    normalizeShapeCode(
      currentPiece.shape ||
      parsed.shape ||
      ""
    )
  );

  setValue(
    "color",
    currentPiece.glaze ||
    currentPiece.color ||
    ""
  );

  setValue(
    "description",
    currentPiece.description || ""
  );

  setValue(
    "price",
    currentPiece.price || ""
  );

  setStructuredDimensions(
    currentPiece.dimensions || ""
  );

  setValue(
    "objectIdentifier",
    currentPiece.object_identifier ||
    currentPiece.objectIdentifier ||
    currentPiece.camera_id ||
    ""
  );

  setValue(
    "privateNotes",
    currentPiece.notes || ""
  );

  setValue(
    "status",
    currentPiece.status || "available"
  );

  clearFileInput("topImageFile");
  clearFileInput("bottomImageFile");

  updatePreview(currentPiece);

  showStatus(
    `Editing existing piece: ${currentPiece.id}`,
    "working"
  );
}