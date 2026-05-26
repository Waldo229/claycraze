document.addEventListener("DOMContentLoaded", initializeCurator);

const APP_VERSION = "260525-all-pieces";

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
    `/gallery-data/all?v=${Date.now()}`,
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {

    throw new Error(
      `Could not load all gallery data: ${response.status}`
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

  const preview =
    document.getElementById("piecePreview");

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

/* =========================================================
   HELPERS
========================================================= */

function clearForm() {

  currentPiece = null;

  setValue("pieceId", "");
  setValue("shape", "");
  setValue("color", "");
  setValue("description", "");
  setValue("price", "");
  setValue("objectIdentifier", "");
  setValue("privateNotes", "");
  setValue("status", "available");

  clearFileInput("topImageFile");
  clearFileInput("bottomImageFile");

  const preview =
    document.getElementById("piecePreview");

  preview.classList.add("empty");

  preview.textContent =
    "Select a piece or create a new one.";
}

function clearWorkFields() {

  setValue("color", "");
  setValue("description", "");
  setValue("price", "");
  setValue("objectIdentifier", "");
  setValue("privateNotes", "");
}

function setValue(id, value) {

  const element =
    document.getElementById(id);

  if (element) {
    element.value = value || "";
  }
}

function clearFileInput(id) {

  const input =
    document.getElementById(id);

  if (input) {
    input.value = "";
  }
}

function showStatus(message, type = "working") {

  const box =
    document.getElementById("statusBox");

  const topBox =
    document.getElementById("topStatusBox");

  if (box) {
    box.textContent = message;
    box.className = `status-box ${type}`;
  }

  if (topBox) {
    topBox.textContent = message;
    topBox.className = `status-inline ${type}`;
  }
}

function updatePreview(piece) {

  const preview =
    document.getElementById("piecePreview");

  preview.classList.remove("empty");

  preview.innerHTML = `
    <strong>${piece.id || ""}</strong><br>
    ${piece.title || ""}<br>
    ${piece.dimensions || ""}
  `;
}

function parsePieceIdParts(id) {

  const cleanId =
    String(id || "").trim().toUpperCase();

  const match =
    cleanId.match(/^([A-Z]+)-(\d{4})-(\d{2,4})$/);

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

  const raw =
    String(shape || "").trim().toUpperCase();

  if (raw === "FF") return "FREE";
  if (raw === "IK") return "IKE";
  if (raw === "SC") return "SCULP";
  if (raw === "ROUND") return "RD";
  if (raw === "RND") return "RD";
  if (raw === "RECT") return "RC";

  return raw;
}

function getCurrentDateCode() {

  const now = new Date();

  const yy =
    String(now.getFullYear()).slice(-2);

  const mm =
    String(now.getMonth() + 1)
      .padStart(2, "0");

  return `${yy}${mm}`;
}

async function updateGeneratedId() {

  const shape =
    normalizeShapeCode(
      document.getElementById("shape").value
    );

  if (!shape) {

    setValue("pieceId", "");

    return "";
  }

  const dateCode =
    getCurrentDateCode();

  try {

    const response = await fetch(
      `/api/next-piece-id?shape=${encodeURIComponent(shape)}&date_code=${encodeURIComponent(dateCode)}&v=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    const result =
      await response.json();

    if (!response.ok || !result.ok) {

      throw new Error(
        result.error ||
        "Could not generate piece ID."
      );
    }

    setValue("pieceId", result.id);

    return result.id;

  } catch (error) {

    console.error(error);

    showStatus(
      "Could not generate piece ID.",
      "error"
    );

    return "";
  }
}

/* =========================================================
   PLACEHOLDERS
========================================================= */

async function saveRecord(event) {

  event.preventDefault();

  try {

    showStatus("Saving record...", "working");

    const piece = {
      id: document.getElementById("pieceId").value.trim(),
      shape: document.getElementById("shape").value.trim(),
      description: document.getElementById("description").value.trim(),
      glaze: document.getElementById("color").value.trim(),
      notes: document.getElementById("privateNotes").value.trim(),
      status: document.getElementById("status").value.trim(),
      price: document.getElementById("price").value.trim()
    };

    const response = await fetch("/api/save-curation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(piece)
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(
        result.error || "Save failed."
      );
    }

    showStatus(
      "Record saved successfully.",
      "success"
    );

    allPieces = await loadPiecesFresh();

    populatePieceSelect(allPieces);

  } catch (error) {

    console.error(error);

    showStatus(
      error.message || "Save failed.",
      "error"
    );
  }
}

function previewSelectedTopImage() {}

function generateDescription() {}

function suggestPrice() {}

function generateWineLabel() {}

function generateLaoTzu() {}