document.addEventListener("DOMContentLoaded", initializeCurator);

const APP_VERSION = "260527-clean-no-labels-file";

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
    showStatus(error.message || "Could not load pieces.", "error");
  }
}

async function loadPiecesFresh() {
  const response = await fetch(`/gallery-data/all?v=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Could not load all gallery data: ${response.status}`);
  }

  return await response.json();
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

  await updateGeneratedId();

  const saveButton = document.getElementById("saveButton");

  if (saveButton) {
    saveButton.textContent = "Create New Piece";
  }

  showPreviewMessage("Choose a shape and top image to create a new piece.");
  showStatus("Create mode. Choose shape, images, and record details.", "working");
}

function setEditMode() {
  formMode = "edit";

  document.getElementById("pieceSelect").disabled = false;
  document.getElementById("shape").disabled = true;

  clearForm();

  const saveButton = document.getElementById("saveButton");

  if (saveButton) {
    saveButton.textContent = "Save Curatorial Changes";
  }

  showStatus("Edit mode. Select an existing piece.", "working");
}

function populatePieceSelect(pieces) {
  const select = document.getElementById("pieceSelect");

  const sorted = [...pieces].sort((a, b) =>
    String(b.id || "").localeCompare(String(a.id || ""))
  );

  select.innerHTML = '<option value="">Select piece</option>';

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

  setStructuredDimensions(currentPiece.dimensions || "");

  clearFileInput("topImageFile");
  clearFileInput("bottomImageFile");

  updatePreview(currentPiece);

  showStatus(`Editing existing piece: ${currentPiece.id}`, "working");
}

async function saveRecord(event) {
  event.preventDefault();

  try {
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

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Save failed.");
    }

    showStatus("Record saved successfully.", "success");

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
  }
}