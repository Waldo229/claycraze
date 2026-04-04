const form = document.getElementById("pieceForm");
const statusBox = document.getElementById("statusBox");
const idPreview = document.getElementById("idPreview");
const clearBtn = document.getElementById("clearBtn");
const refreshBtn = document.getElementById("refreshBtn");
const updateBtn = document.getElementById("updateBtn");
const archiveBtn = document.getElementById("archiveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const tableBody = document.querySelector("#piecesTable tbody");

const originalIdInput = document.getElementById("original_id");
const shapeInput = document.getElementById("shape");
const pieceNumberInput = document.getElementById("piece_number");
const dateCodeInput = document.getElementById("date_code");

function getCurrentDateCode() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

function updateIdPreview() {
  const shape = shapeInput.value.trim().toUpperCase();
  const pieceNumber = pieceNumberInput.value.trim();
  const dateCode = dateCodeInput.value.trim();

  if (!shape || !pieceNumber || !dateCode) {
    idPreview.textContent = "ID Preview: —";
    return;
  }

  const padded = String(pieceNumber).padStart(4, "0");
  idPreview.textContent = `ID Preview: ${shape}-${padded}-${dateCode}`;
}

async function loadNextPieceNumber() {
  try {
    const response = await fetch("/next-piece-number");
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();

    if (!originalIdInput.value.trim()) {
      pieceNumberInput.value = data.next_piece_number;
      updateIdPreview();
    }
  } catch (error) {
    console.error("Could not load next piece number:", error);
  }
}

function loadCurrentDateCode() {
  if (!originalIdInput.value.trim()) {
    dateCodeInput.value = getCurrentDateCode();
    updateIdPreview();
  }
}

shapeInput.addEventListener("change", updateIdPreview);
pieceNumberInput.addEventListener("input", updateIdPreview);
dateCodeInput.addEventListener("input", updateIdPreview);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await addPiece();
});

updateBtn.addEventListener("click", async () => {
  await updatePiece();
});

archiveBtn.addEventListener("click", async () => {
  await archivePiece();
});

deleteBtn.addEventListener("click", async () => {
  await deletePiece();
});

clearBtn.addEventListener("click", async () => {
  await clearForm();
});

refreshBtn.addEventListener("click", () => {
  loadPieces();
});

function setStatusMessage(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = "status";

  if (type === "archive") {
    statusBox.classList.add("status-message-archive");
  }
}

function getStatusClass(status) {
  const clean = String(status || "").trim().toLowerCase();

  switch (clean) {
    case "archive":
      return "status-archive";
    case "sold":
      return "status-sold";
    case "held":
      return "status-held";
    case "gifted":
      return "status-gifted";
    case "available":
      return "status-available";
    default:
      return "";
  }
}

function collectFormData() {
  return {
    original_id: originalIdInput.value.trim(),
    shape: document.getElementById("shape").value.trim().toUpperCase(),
    piece_number: document.getElementById("piece_number").value.trim(),
    date_code: document.getElementById("date_code").value.trim(),
    description: document.getElementById("description").value.trim(),
    clay_body: document.getElementById("clay_body").value.trim(),
    glaze: document.getElementById("glaze").value.trim(),
    width: document.getElementById("width").value.trim(),
    depth: document.getElementById("depth").value.trim(),
    height: document.getElementById("height").value.trim(),
    firing: document.getElementById("firing").value.trim(),
    image_path: document.getElementById("image_path").value.trim(),
    status: document.getElementById("status").value,
    price: document.getElementById("price").value.trim(),
    sale_date: document.getElementById("sale_date").value,
    patron: document.getElementById("patron").value.trim(),
    patron_location: document.getElementById("patron_location").value.trim(),
    patron_contact: document.getElementById("patron_contact").value.trim(),
    context_of_sale: document.getElementById("context_of_sale").value,
    notes: document.getElementById("notes").value.trim()
  };
}

async function addPiece() {
  const formData = collectFormData();

  try {
    const response = await fetch("/add-piece", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    const resultText = await response.text();
    setStatusMessage(resultText);

    if (response.ok) {
      await clearForm();
      loadPieces();
    }
  } catch (error) {
    setStatusMessage("Error adding piece: " + error.message);
  }
}

async function updatePiece() {
  const formData = collectFormData();

  if (!formData.original_id) {
    setStatusMessage("Select a row first to update an existing piece.");
    return;
  }

  try {
    const response = await fetch("/update-piece", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    const resultText = await response.text();
    setStatusMessage(resultText);

    if (response.ok) {
      await clearForm();
      loadPieces();
    }
  } catch (error) {
    setStatusMessage("Error updating piece: " + error.message);
  }
}

async function archivePiece() {
  const originalId = originalIdInput.value.trim();

  if (!originalId) {
    setStatusMessage("Select a row first to archive a piece.");
    return;
  }

  const confirmed = confirm(`Archive ${originalId}?`);
  if (!confirmed) return;

  try {
    const response = await fetch("/archive-piece", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ original_id: originalId })
    });

    const resultText = await response.text();
    setStatusMessage(resultText, "archive");

    if (response.ok) {
      await clearForm();
      loadPieces();
    }
  } catch (error) {
    setStatusMessage("Error archiving piece: " + error.message, "archive");
  }
}

async function deletePiece() {
  const originalId = originalIdInput.value.trim();

  if (!originalId) {
    setStatusMessage("Select a row first to delete a piece.");
    return;
  }

  const confirmed = confirm(`Delete ${originalId}? This cannot be undone.`);
  if (!confirmed) return;

  try {
    const response = await fetch("/delete-piece", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ original_id: originalId })
    });

    const resultText = await response.text();
    setStatusMessage(resultText);

    if (response.ok) {
      await clearForm();
      loadPieces();
    }
  } catch (error) {
    setStatusMessage("Error deleting piece: " + error.message);
  }
}

async function loadPieces() {
  try {
    const response = await fetch("/pieces");
    const pieces = await response.json();

    tableBody.innerHTML = "";

    if (!pieces.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="19">No pieces found in inventory.</td>
        </tr>
      `;
      return;
    }

    for (const piece of pieces) {
      const row = document.createElement("tr");
      row.style.cursor = "pointer";

      const statusClass = getStatusClass(piece.status);

      row.innerHTML = `
        <td>${escapeHtml(piece.id || "")}</td>
        <td class="${statusClass}">${escapeHtml(piece.status || "")}</td>
        <td>${escapeHtml(piece.price || "")}</td>
        <td>${escapeHtml(piece.shape || "")}</td>
        <td>${escapeHtml(String(piece.piece_number || ""))}</td>
        <td>${escapeHtml(piece.date_code || "")}</td>
        <td>${escapeHtml(piece.description || "")}</td>
        <td>${escapeHtml(piece.clay_body || "")}</td>
        <td>${escapeHtml(piece.glaze || "")}</td>
        <td>${escapeHtml(piece.width || "")}</td>
        <td>${escapeHtml(piece.depth || "")}</td>
        <td>${escapeHtml(piece.height || "")}</td>
        <td>${escapeHtml(piece.firing || "")}</td>
        <td>${escapeHtml(piece.patron || "")}</td>
        <td>${escapeHtml(piece.patron_location || "")}</td>
        <td>${escapeHtml(piece.sale_date || "")}</td>
        <td>${escapeHtml(piece.context_of_sale || "")}</td>
        <td>${escapeHtml(piece.image_path || "")}</td>
        <td>${escapeHtml(piece.notes || "")}</td>
      `;

      row.addEventListener("click", () => {
        loadPieceIntoForm(piece);
      });

      tableBody.appendChild(row);
    }
  } catch (error) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="19">Error loading pieces: ${escapeHtml(error.message)}</td>
      </tr>
    `;
  }
}

function loadPieceIntoForm(piece) {
  originalIdInput.value = piece.id || "";
  document.getElementById("shape").value = piece.shape || "";
  document.getElementById("piece_number").value = piece.piece_number || "";
  document.getElementById("date_code").value = piece.date_code || "";
  document.getElementById("description").value = piece.description || "";
  document.getElementById("clay_body").value = piece.clay_body || "";
  document.getElementById("glaze").value = piece.glaze || "";
  document.getElementById("width").value = piece.width || "";
  document.getElementById("depth").value = piece.depth || "";
  document.getElementById("height").value = piece.height || "";
  document.getElementById("firing").value = piece.firing || "";
  document.getElementById("image_path").value = piece.image_path || "";
  document.getElementById("status").value = piece.status || "available";
  document.getElementById("price").value = piece.price || "";
  document.getElementById("sale_date").value = piece.sale_date || "";
  document.getElementById("patron").value = piece.patron || "";
  document.getElementById("patron_location").value = piece.patron_location || "";
  document.getElementById("patron_contact").value = piece.patron_contact || "";
  document.getElementById("context_of_sale").value = piece.context_of_sale || "";
  document.getElementById("notes").value = piece.notes || "";

  updateIdPreview();
  setStatusMessage(`Loaded ${piece.id} for editing.`);
}

async function clearForm() {
  form.reset();
  originalIdInput.value = "";
  setStatusMessage("Ready.");
  document.getElementById("shape").focus();
  await loadNextPieceNumber();
  loadCurrentDateCode();
  updateIdPreview();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

loadPieces();
loadNextPieceNumber();
loadCurrentDateCode();
updateIdPreview();