document.addEventListener("DOMContentLoaded", initializeCurator);

const APP_VERSION = "260527-clean-no-labels";

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

```
console.log(`ClaycrazE curator loaded: ${APP_VERSION}`);
```

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

```
option.value = piece.id;
option.textContent = `${piece.id || "Untitled record"}${piece.title ? " — " + piece.title : ""}`;

select.appendChild(option);
```

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

```
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
```

} catch (error) {
console.error(error);
showStatus(error.message || "Save failed.", "error");
}
}

function readFileAsDataUrl(file) {
return new Promise((resolve, reject) => {
if (!file) {
return resolve("");
}

```
if (!/image\/jpe?g/i.test(file.type)) {
  return reject(new Error("Images must be JPEG files."));
}

const reader = new FileReader();

reader.onload = () => resolve(reader.result);
reader.onerror = () => reject(new Error("Could not read image file."));

reader.readAsDataURL(file);
```

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

```
if (!shape) {
  throw new Error("Choose a shape first.");
}

const response = await fetch(
  `/api/next-piece-id?shape=${encodeURIComponent(shape)}&date_code=${encodeURIComponent(dateCode)}&v=${Date.now()}`,
  { cache: "no-store" }
);

const result = await response.json();

if (!response.ok || !result.ok) {
  throw new Error(result.error || "Could not generate piece ID.");
}

setValue("pieceId", result.id);
showStatus(`Next piece ID ready: ${result.id}`, "working");

return result.id;
```

} catch (error) {
console.error(error);

```
setValue("pieceId", "");
showStatus(error.message || "Could not generate piece ID.", "error");

return "";
```

}
}

async function ensureGeneratedId() {
let id = getValue("pieceId");

if (id) {
return id;
}

id = await updateGeneratedId();

if (!id) {
throw new Error("Could not generate piece ID. Choose a shape first.");
}

return id;
}

function previewSelectedTopImage() {
const file = document.getElementById("topImageFile").files[0];

if (!file) {
return;
}

const preview = document.getElementById("piecePreview");
const url = URL.createObjectURL(file);

preview.classList.remove("empty");

preview.innerHTML = `     <img
      src="${url}"
      alt="Selected top image preview"
      style="max-width:100%; border-radius:12px; margin-bottom:10px;"     >     <strong>${getValue("pieceId") || "New piece"}</strong><br>
    Selected top image ready.
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

setStructuredDimensions("");

clearFileInput("topImageFile");
clearFileInput("bottomImageFile");

showPreviewMessage("Select a piece or create a new one.");
}

function clearWorkFields() {
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

setStructuredDimensions("");
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

preview.classList.remove("empty");

preview.innerHTML = `    ${
      img
        ?`<img
src="${img}"
alt="${piece.id || ""}"
style="max-width:100%; border-radius:12px; margin-bottom:10px;"
>`        : ""
    }     <strong>${piece.id || ""}</strong><br>
    ${piece.title || ""}<br>
    ${piece.dimensions || ""}<br>
    ${piece.status ?`<em>${piece.status}</em>`: ""}
 `;
}

function showPreviewMessage(message) {
const preview = document.getElementById("piecePreview");

preview.classList.add("empty");
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

function getCurrentDateCode() {
const now = new Date();

const yy = String(now.getFullYear()).slice(-2);
const mm = String(now.getMonth() + 1).padStart(2, "0");

return `${yy}${mm}`;
}

function parsePieceIdParts(id) {
const cleanId = String(id || "")
.trim()
.toUpperCase();

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
const raw = String(shape || "")
.trim()
.toUpperCase();

if (raw === "FF") return "FREE";
if (raw === "IK") return "IKE";
if (raw === "SC") return "SCULP";
if (raw === "ROUND") return "RD";
if (raw === "RND") return "RD";
if (raw === "RECT") return "RC";

return raw;
}

function generateDescription() {
const shape = normalizeShapeCode(getValue("shape"));

const shapeInfo = SHAPE_MAP[shape] || {
title: "Ceramic Piece"
};

const surface = getValue("surfaceCharacter");
const mood = getValue("mood");
const use = getValue("suggestedUse");
const feature = getValue("notableFeature");

const draft = [
`${shapeInfo.title}.`,
surface ? `Surface: ${surface}.` : "",
mood ? `Mood: ${mood}.` : "",
use ? `Suggested use: ${use}.` : "",
feature ? `Notable feature: ${feature}.` : ""
]
.filter(Boolean)
.join("\n");

setValue("geneOutput", draft);
}

function suggestPrice() {
const shape = normalizeShapeCode(getValue("shape"));

const base =
shape === "FJ"
? "125–185"
: shape === "OV"
? "125–225"
: "95–225";

setValue(
"geneOutput",
`Suggested price range: $${base}. Adjust for size, finish, presence, and difficulty.`
);
}
