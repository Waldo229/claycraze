(function () {
  const form = document.getElementById("adminForm");

  const shapeInput = document.getElementById("shape");
  const pieceNumberInput = document.getElementById("pieceNumber");
  const yearMonthInput = document.getElementById("yearMonth");
  const titleInput = document.getElementById("title");
  const categoryInput = document.getElementById("category");
  const clayInput = document.getElementById("clay");
  const finishInput = document.getElementById("finish");
  const dimensionsInput = document.getElementById("dimensions");
  const statusInput = document.getElementById("status");
  const hasBottomImageInput = document.getElementById("hasBottomImage");
  const isPublishedInput = document.getElementById("isPublished");
  const descriptionInput = document.getElementById("description");

  const previewBtn = document.getElementById("previewBtn");
  const resetBtn = document.getElementById("resetBtn");

  const pieceIdOutput = document.getElementById("pieceIdOutput");
  const imageOutput = document.getElementById("imageOutput");
  const recordOutput = document.getElementById("recordOutput");
  const statusOutput = document.getElementById("statusOutput");

  setDefaultYearMonth();
  updateTitleFromShape();

  shapeInput.addEventListener("change", updateTitleFromShape);
  previewBtn.addEventListener("click", previewEntry);
  resetBtn.addEventListener("click", function () {
    setTimeout(() => {
      setDefaultYearMonth();
      updateTitleFromShape();
      clearOutputs();
      setStatus("Fill out the form, then preview or save.");
    }, 0);
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = buildPayload();
    if (!payload) return;

    previewPayload(payload);
    setStatus("Saving to database...");

    try {
      const response = await fetch("/api/pieces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Save failed.");
      }

      setStatus(`Saved ${result.piece_id}. JSON refreshed with ${result.exported_count} published piece(s).`);
    } catch (error) {
      setStatus(`Save failed: ${error.message}`);
    }
  });

  function previewEntry() {
    const payload = buildPayload();
    if (!payload) return;
    previewPayload(payload);
    setStatus("Preview generated. Ready to save.");
  }

  function buildPayload() {
    const shape = getValue(shapeInput).toUpperCase().trim();
    const pieceNumber = Number(getValue(pieceNumberInput).trim());
    const yearMonth = getValue(yearMonthInput).trim();

    if (!/^[A-Z]{2}$/.test(shape)) {
      setStatus("Shape code must be 2 letters.");
      return null;
    }

    if (!/^\d{4}$/.test(yearMonth)) {
      setStatus("Year + Month must be 4 digits, like 2604.");
      return null;
    }

    if (!Number.isInteger(pieceNumber) || pieceNumber < 1 || pieceNumber > 999) {
      setStatus("Piece number must be between 1 and 999.");
      return null;
    }

    const id = `${shape}-${yearMonth}-${String(pieceNumber).padStart(2, "0")}`;
    const title = getValue(titleInput);
    const category = getValue(categoryInput);
    const clay = getValue(clayInput);
    const finish = getValue(finishInput);
    const dimensions = getValue(dimensionsInput);
    const status = getValue(statusInput);
    const hasBottomImage = getValue(hasBottomImageInput) === "1";
    const isPublished = getValue(isPublishedInput) === "1";
    const description = getValue(descriptionInput);

    if (!title) {
      setStatus("Title is required.");
      return null;
    }

    if (!category) {
      setStatus("Category is required.");
      return null;
    }

    return {
      id,
      title,
      category,
      clay,
      finish,
      dimensions,
      status,
      description,
      has_bottom_image: hasBottomImage,
      is_published: isPublished
    };
  }

  function previewPayload(payload) {
    const topThumb = `/images/thumbs/${payload.id}_top.jpg`;
    const topFull = `/images/full/${payload.id}_top.jpg`;
    const bottomFull = `/images/full/${payload.id}_bottom.jpg`;

    pieceIdOutput.textContent = payload.id;
    imageOutput.textContent = [
      `Thumbnail: ${topThumb}`,
      `Full top: ${topFull}`,
      `Full bottom: ${bottomFull}`
    ].join("\n");

    recordOutput.textContent = JSON.stringify(payload, null, 2);
  }

  function clearOutputs() {
    pieceIdOutput.textContent = "—";
    imageOutput.textContent = "—";
    recordOutput.textContent = "—";
  }

  function setDefaultYearMonth() {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    yearMonthInput.value = year + month;
  }

  function updateTitleFromShape() {
    const map = {
      OV: "Oval Bonsai Container",
      RC: "Rectangular Bonsai Container",
      RD: "Round Bonsai Container",
      CS: "Cascade Container",
      SL: "Slab Planting Tray"
    };
    titleInput.value = map[shapeInput.value] || "Bonsai Container";
  }

  function getValue(el) {
    return String(el.value || "").trim();
  }

  function setStatus(message) {
    statusOutput.textContent = message;
  }
})();