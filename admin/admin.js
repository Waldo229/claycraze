const $ = (id) => document.getElementById(id);

const state = {
  incoming: [],
  topImage: "",
  bottomImage: "",
  publishOnSave: false
};

const shape = $("shape");
const yearMonth = $("yearMonth");
const pieceIdPreview = $("pieceIdPreview");
const dimensions = $("dimensions");
const notes = $("notes");
const title = $("title");
const description = $("description");
const price = $("price");
const statusEl = $("status");
const incomingGrid = $("incomingGrid");
const topSelected = $("topSelected");
const bottomSelected = $("bottomSelected");
const preview = $("preview");

function setStatus(msg) { statusEl.textContent = msg; }
function setSaleStatus(msg) { $("saleStatus").textContent = msg; }
function todayYYMM() {
  const d = new Date();
  return String(d.getFullYear()).slice(-2) + String(d.getMonth() + 1).padStart(2, "0");
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

async function refreshId() {
  const response = await fetch(`/api/next-id?shape=${encodeURIComponent(shape.value)}&yearMonth=${encodeURIComponent(yearMonth.value)}`);
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "Could not generate ID.");
  pieceIdPreview.value = result.piece_id;
  renderPreview();
}

async function loadIncoming() {
  const response = await fetch("/api/incoming-images");
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "Could not load incoming images.");
  state.incoming = result.images;
  renderIncoming();
  setStatus(`${result.images.length} incoming image(s) found.`);
}

function renderIncoming() {
  topSelected.textContent = state.topImage || "none";
  bottomSelected.textContent = state.bottomImage || "none";
  incomingGrid.innerHTML = "";

  if (!state.incoming.length) {
    incomingGrid.innerHTML = `<p class="hint">No images found. Put JPG/PNG/WebP files in the incoming folder.</p>`;
    return;
  }

  for (const img of state.incoming) {
    const tile = document.createElement("div");
    tile.className = "image-tile";
    if (img.filename === state.topImage) tile.classList.add("top");
    if (img.filename === state.bottomImage) tile.classList.add("bottom");
    tile.innerHTML = `
      <img src="${img.url}" alt="${escapeHtml(img.filename)}" loading="lazy" />
      <div class="name">${escapeHtml(img.filename)}</div>
      <div class="tile-actions">
        <button type="button" data-role="top" data-name="${escapeHtml(img.filename)}">Top</button>
        <button type="button" data-role="bottom" data-name="${escapeHtml(img.filename)}">Bottom</button>
      </div>
    `;
    incomingGrid.appendChild(tile);
  }
}

function renderPreview() {
  const id = pieceIdPreview.value || "ID pending";
  const top = state.topImage ? `/incoming/${encodeURIComponent(state.topImage)}` : "";
  const bottom = state.bottomImage ? `/incoming/${encodeURIComponent(state.bottomImage)}` : "";

  preview.className = "preview";
  preview.innerHTML = `
    <div class="preview-piece">
      <div>
        ${top ? `<img src="${top}" alt="Top image preview" />` : `<div class="empty">No top image selected.</div>`}
      </div>
      <div>
        <p class="eyebrow">${escapeHtml(id)} · ${escapeHtml(shape.options[shape.selectedIndex].text)}</p>
        <h3>${escapeHtml(title.value || "Untitled piece")}</h3>
        <p>${escapeHtml(description.value || "Description pending.")}</p>
        <p><strong>Dimensions:</strong> ${escapeHtml(dimensions.value || "Required")}</p>
        <p><strong>Price:</strong> ${escapeHtml(price.value || "Pending")}</p>
        <p><strong>Availability:</strong> Available until a sale record exists.</p>
        <div class="view-row">
          <span>Thumbnail generated from top.</span>
          <span>Top view selected.</span>
          <span>${bottom ? "Bottom view selected." : "No bottom view."}</span>
          <span>Detail/magnification uses full-size view.</span>
        </div>
        ${bottom ? `<p><img src="${bottom}" alt="Bottom image preview" style="max-width:240px;margin-top:.5rem" /></p>` : ""}
      </div>
    </div>
  `;
}

function suggestText() {
  const shapeText = shape.options[shape.selectedIndex].text;
  const dim = dimensions.value.trim() || "the listed dimensions";
  const raw = notes.value.trim();

  if (!title.value.trim()) title.value = `${shapeText} Bonsai Container`;
  if (!description.value.trim()) {
    description.value = raw
      ? `${shapeText} bonsai container, ${dim}. ${raw}`
      : `${shapeText} bonsai container, ${dim}. A quiet studio piece suited to a considered planting.`;
  }
  if (!price.value.trim()) price.value = "Review needed";
  renderPreview();
  setStatus("Suggestions added. Human approval still required.");
}

async function savePiece(published) {
  const payload = {
    shape: shape.value,
    year_month: yearMonth.value,
    dimensions: dimensions.value,
    notes: notes.value,
    title: title.value,
    description: description.value,
    price: price.value,
    top_image: state.topImage,
    bottom_image: state.bottomImage || null,
    published
  };

  const response = await fetch("/api/pieces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "Save failed.");

  setStatus(`${published ? "Published" : "Saved draft"}: ${result.piece.piece_id}`);
  resetPieceForm();
  await loadIncoming();
  await refreshId();
}

function resetPieceForm() {
  $("pieceForm").reset();
  yearMonth.value = todayYYMM();
  state.topImage = "";
  state.bottomImage = "";
  renderIncoming();
  renderPreview();
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[c]));
}

incomingGrid.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-role]");
  if (!btn) return;
  const name = btn.dataset.name;
  const role = btn.dataset.role;
  if (role === "top") {
    state.topImage = name;
    if (state.bottomImage === name) state.bottomImage = "";
  }
  if (role === "bottom") {
    state.bottomImage = state.bottomImage === name ? "" : name;
    if (state.topImage === name) state.topImage = "";
  }
  renderIncoming();
  renderPreview();
});

$("refreshImagesBtn").addEventListener("click", async () => {
  try { await loadIncoming(); }
  catch (err) { setStatus(err.message); }
});

shape.addEventListener("change", () => refreshId().catch((err) => setStatus(err.message)));
yearMonth.addEventListener("change", () => refreshId().catch((err) => setStatus(err.message)));
[dimensions, notes, title, description, price].forEach((el) => el.addEventListener("input", renderPreview));
$("suggestBtn").addEventListener("click", suggestText);

$("pieceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await savePiece(false); }
  catch (err) { setStatus(`Save failed: ${err.message}`); }
});

$("publishBtn").addEventListener("click", async () => {
  try { await savePiece(true); }
  catch (err) { setStatus(`Publish failed: ${err.message}`); }
});

$("saleDate").value = todayISO();
$("saleForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    piece_id: $("salePieceId").value,
    customer_name: $("customerName").value,
    email: $("customerEmail").value,
    phone: $("customerPhone").value,
    sale_price: $("salePrice").value,
    payment_method: $("paymentMethod").value,
    sale_date: $("saleDate").value,
    sale_notes: $("saleNotes").value
  };
  try {
    const response = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Sale save failed.");
    setSaleStatus(`Sale saved. ${payload.piece_id} is now SOLD.`);
    $("saleForm").reset();
    $("saleDate").value = todayISO();
  } catch (err) {
    setSaleStatus(`Sale failed: ${err.message}`);
  }
});

$("deployBtn").addEventListener("click", async () => {
  const btn = $("deployBtn");
  const log = $("deployStatus");
  btn.disabled = true;
  log.textContent = "Deploying...";
  try {
    const response = await fetch("/api/deploy", { method: "POST" });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Deploy failed.");
    log.textContent = result.output || "Deploy complete.";
  } catch (err) {
    log.textContent = `Deploy failed:\n${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

(async function init() {
  yearMonth.value = todayYYMM();
  try {
    await refreshId();
    await loadIncoming();
    renderPreview();
  } catch (err) {
    setStatus(err.message);
  }
})();
