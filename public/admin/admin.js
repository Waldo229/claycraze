const form = document.getElementById("pieceForm");
const shapeInput = document.getElementById("shape");
const nextIdInput = document.getElementById("nextId");
const message = document.getElementById("message");
const suggestBtn = document.getElementById("suggestBtn");

async function refreshNextId() {
  try {
    const shape = shapeInput.value;
    const response = await fetch(`/api/next-piece-number?shape=${encodeURIComponent(shape)}`);
    const result = await response.json();

    if (!result.ok) throw new Error(result.error || "Could not get next ID.");

    nextIdInput.value = result.id;
  } catch (err) {
    nextIdInput.value = "Error";
    message.textContent = err.message;
  }
}

shapeInput.addEventListener("change", refreshNextId);
refreshNextId();

suggestBtn.addEventListener("click", async () => {
  try {
    message.textContent = "Suggesting studio note…";

    const payload = {
      shape: shapeInput.value,
      dimensions: document.getElementById("dimensions").value,
      description: document.getElementById("description").value
    };

    const response = await fetch("/api/suggest-critique", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!result.ok) throw new Error(result.error || "Could not suggest note.");

    document.getElementById("studioNote").value = result.note;
    message.textContent = "Studio note suggested. Edit before saving.";
  } catch (err) {
    message.textContent = err.message;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    message.textContent = "Saving…";

    const formData = new FormData(form);

    const response = await fetch("/api/pieces", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.error || "Save failed.");
    }

    message.textContent = `Saved ${result.piece.id}.`;

    form.reset();
    await refreshNextId();
  } catch (err) {
    message.textContent = err.message;
  }
});