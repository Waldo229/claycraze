const form = document.getElementById("pieceForm");
const statusBox = document.getElementById("statusBox");
const idPreview = document.getElementById("idPreview");
const clearBtn = document.getElementById("clearBtn");
const refreshBtn = document.getElementById("refreshBtn");
const tableBody = document.querySelector("#piecesTable tbody");

const shapeInput = document.getElementById("shape");
const pieceNumberInput = document.getElementById("piece_number");
const dateCodeInput = document.getElementById("date_code");

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

shapeInput.addEventListener("input", () => {
  shapeInput.value = shapeInput.value.toUpperCase();
  updateIdPreview();
});

pieceNumberInput.addEventListener("input", updateIdPreview);
dateCodeInput.addEventListener("input", updateIdPreview);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = {
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

  try {
    const response = await fetch("/add-piece", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    const resultText = await response.text();
    statusBox.textContent = resultText;

    if (response.ok) {
      form.reset();
      idPreview.textContent = "ID Preview: —";
      loadPieces();
      document.getElementById("shape").focus();
    }
  } catch (error) {
    statusBox.textContent = "Error submitting form: " + error.message;
  }
});

clearBtn.addEventListener("click", () => {
  form.reset();
  idPreview.textContent = "ID Preview: —";
  statusBox.textContent = "Form cleared.";
  document.getElementById("shape").focus();
});

refreshBtn.addEventListener("click", () => {
  loadPieces();
});

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
      row.innerHTML = `
        <td>${escapeHtml(piece.id || "")}</td>
        <td>${escapeHtml(piece.status || "")}</td>
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

loadPieces();
updateIdPreview();