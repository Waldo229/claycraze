(function () {
  const form = document.getElementById("adminForm");

  const shapeInput = document.getElementById("shape");
  const yearMonthInput = document.getElementById("yearMonth");
  const pieceIdPreviewInput = document.getElementById("pieceIdPreview");

  const titleInput = document.getElementById("title");
  const categoryInput = document.getElementById("category");
  const clayInput = document.getElementById("clay");
  const finishInput = document.getElementById("finish");
  const dimensionsInput = document.getElementById("dimensions");
  const statusInput = document.getElementById("status");
  const hasBottomImageInput = document.getElementById("hasBottomImage");
  const isPublishedInput = document.getElementById("isPublished");
  const descriptionInput = document.getElementById("description");

  const thumbImageInput = document.getElementById("thumbImage");
  const fullTopImageInput = document.getElementById("fullTopImage");
  const fullBottomImageInput = document.getElementById("fullBottomImage");

  const previewBtn = document.getElementById("previewBtn");
  const resetBtn = document.getElementById("resetBtn");

  const pieceIdOutput = document.getElementById("pieceIdOutput");
  const imageOutput = document.getElementById("imageOutput");
  const recordOutput = document.getElementById("recordOutput");
  const statusOutput = document.getElementById("statusOutput");

  init();

  function init() {
    setDefaultYearMonth();
    updateTitleFromShape();

    shapeInput.addEventListener("change", async function () {
      updateTitleFromShape();
      await refreshGeneratedId();
    });

    yearMonthInput.addEventListener("change", refreshGeneratedId);
    yearMonthInput.addEventListener("blur", refreshGeneratedId);

    previewBtn.addEventListener("click", previewEntry);

    resetBtn.addEventListener("click", function () {
      setTimeout(async () => {
        form.reset();
        setDefaultYearMonth();
        updateTitleFromShape();
        clearOutputs();
        await refreshGeneratedId();
        setStatus("Fill out the form, choose the image files, then preview or save.");
      }, 0);
    });

    form.addEventListener("submit", submitForm);

    refreshGeneratedId().catch((error) => {
      setStatus(`Could not generate next ID: ${error.message}`);
    });
  }

  async function submitForm(event) {
    event.preventDefault();

    const payload = await buildPayload(true);
    if (!payload) return;

    previewPayload(payload, payload.preview_id);
    setStatus("Saving to database and processing images...");

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

      const finalId = String(result.piece_id || payload.preview_id || "").trim();
      const previewId = String(payload.preview_id || "").trim();

      pieceIdPreviewInput.value = finalId;
      pieceIdOutput.textContent = finalId;
      updateImagePreview(finalId);
      updateRecordOutput(payload, finalId);

      if (finalId && previewId && finalId !== previewId) {
        setStatus(
          `Saved as ${finalId}. Another save happened first, so the final ID advanced from ${previewId}.`
        );
      } else {
        setStatus(
          `Saved ${finalId}. Images processed and gallery data refreshed.`
        );
      }

      await refreshGeneratedId();
    } catch (error) {
      setStatus(`Save failed: ${error.message}`);
    }
  }

  async function previewEntry() {
    const payload = await buildPayload(false);
    if (!payload) return;

    previewPayload(payload, payload.preview_id);
    setStatus("Preview generated. Ready to save.");
  }

  async function refreshGeneratedId() {
    const shape = getValue(shapeInput).toUpperCase();
    const yearMonth = getValue(yearMonthInput);

    pieceIdPreviewInput.value = "";
    pieceIdOutput.textContent = "—";

    if (!/^[A-Z]{2}$/.test(shape)) return;
    if (!/^\d{4}$/.test(yearMonth)) return;

    const response = await fetch(
      `/api/pieces/next-id?shape=${encodeURIComponent(shape)}&yearMonth=${encodeURIComponent(yearMonth)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Could not fetch next ID.");
    }

    const previewId = String(result.preview_id || "").trim();

    pieceIdPreviewInput.value = previewId;
    pieceIdOutput.textContent = previewId;
    updateImagePreview(previewId);
  }

  async function buildPayload(requireFiles) {
    const shape = getValue(shapeInput).toUpperCase();
    const yearMonth = getValue(yearMonthInput);
    const previewId = getValue(pieceIdPreviewInput);

    if (!/^[A-Z]{2}$/.test(shape)) {
      setStatus("Shape code must be 2 letters.");
      return null;
    }

    if (!/^\d{4}$/.test(yearMonth)) {
      setStatus("Year + Month must be 4 digits, like 2604.");
      return null;
    }

    if (!previewId) {
      setStatus("Could not generate a piece ID yet.");
      return null;
    }

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

    if (requireFiles) {
      if (!thumbImageInput.files[0]) {
        setStatus("Thumbnail / top source image is required.");
        return null;
      }

      if (!fullTopImageInput.files[0]) {
        setStatus("Full top image is required.");
        return null;
      }

      if (hasBottomImage && !fullBottomImageInput.files[0]) {
        setStatus("Full bottom image is required when bottom image is set to Yes.");
        return null;
      }
    }

    const thumbImage = thumbImageInput.files[0]
      ? await fileToDataURL(thumbImageInput.files[0])
      : null;

    const fullTopImage = fullTopImageInput.files[0]
      ? await fileToDataURL(fullTopImageInput.files[0])
      : null;

    const fullBottomImage = fullBottomImageInput.files[0]
      ? await fileToDataURL(fullBottomImageInput.files[0])
      : null;

    return {
      shape,
      year_month: yearMonth,
      preview_id: previewId,
      title,
      category,
      clay,
      finish,
      dimensions,
      status,
      description,
      has_bottom_image: hasBottomImage,
      is_published: isPublished,
      thumb_image: thumbImage,
      full_top_image: fullTopImage,
      full_bottom_image: fullBottomImage
    };
  }

  function previewPayload(payload, displayId) {
    const id = String(displayId || payload.preview_id || "").trim();

    pieceIdOutput.textContent = id || "—";
    updateImagePreview(id);
    updateRecordOutput(payload, id);
  }

  function updateImagePreview(id) {
    if (!id) {
      imageOutput.textContent = "—";
      return;
    }

    const topThumb = `/images/thumbs/${id}_top_thumb.jpg`;
    const topFull = `/images/full/${id}_top.jpg`;
    const bottomFull = `/images/full/${id}_bottom.jpg`;

    imageOutput.textContent = [
      `Thumbnail: ${topThumb}`,
      `Full top: ${topFull}`,
      `Full bottom: ${bottomFull}`
    ].join("\n");
  }

  function updateRecordOutput(payload, id) {
    recordOutput.textContent = JSON.stringify(
      {
        id,
        title: payload.title,
        category: payload.category,
        clay: payload.clay,
        finish: payload.finish,
        dimensions: payload.dimensions,
        status: payload.status,
        description: payload.description,
        has_bottom_image: payload.has_bottom_image,
        is_published: payload.is_published
      },
      null,
      2
    );
  }

  function clearOutputs() {
    pieceIdOutput.textContent = "—";
    imageOutput.textContent = "—";
    recordOutput.textContent = "—";

    if (pieceIdPreviewInput) {
      pieceIdPreviewInput.value = "";
    }
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
    return String(el?.value || "").trim();
  }

  function setStatus(message) {
    statusOutput.textContent = message;
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function () {
        resolve(reader.result);
      };

      reader.onerror = function () {
        reject(new Error(`Could not read file: ${file.name}`));
      };

      reader.readAsDataURL(file);
    });
  }
})();