(function () {
  const form = document.getElementById("adminForm");

  const shapeInput = document.getElementById("shape");
  const yearMonthInput = document.getElementById("yearMonth");
  const pieceIdPreviewInput = document.getElementById("pieceIdPreview");

  const titleInput = document.getElementById("title");
  const clayInput = document.getElementById("clay");
  const finishInput = document.getElementById("finish");
  const dimensionsInput = document.getElementById("dimensions");
  const statusInput = document.getElementById("status");
  const hasBottomImageInput = document.getElementById("hasBottomImage");
  const isPublishedInput = document.getElementById("isPublished");
  const descriptionInput = document.getElementById("description");

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
        setStatus("Fill out the form, choose the top image, then preview or save.");
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
    setStatus("Saving to database, generating thumbnail, and processing images...");

    try {
      const response = await fetch("/api/pieces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Save failed.");
      }

      const finalId = String(result.piece_id || payload.preview_id || "").trim();
      const previewId = String(payload.preview_id || "").trim();

      pieceIdPreviewInput.value = finalId;
      pieceIdOutput.textContent = finalId;
      updateImagePreview(finalId, payload.has_bottom_image);
      updateRecordOutput(payload, finalId);

      if (finalId && previewId && finalId !== previewId) {
        setStatus(
          `Saved as ${finalId}. Another save happened first, so the final ID advanced from ${previewId}.`
        );
      } else {
        setStatus(`Saved ${finalId}. Images processed and gallery data refreshed.`);
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
    setStatus("Preview generated. Thumbnail will be created automatically from the top image.");
  }

  async function refreshGeneratedId() {
    const shape = getValue(shapeInput).toUpperCase();
    const yearMonth = getValue(yearMonthInput);

    pieceIdPreviewInput.value = "";
    pieceIdOutput.textContent = "—";

    if (!isValidShapeCode(shape)) return;
    if (!/^\d{4}$/.test(yearMonth)) return;

    const response = await fetch(
      `/api/pieces/next-id?shape=${encodeURIComponent(shape)}&yearMonth=${encodeURIComponent(yearMonth)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Could not fetch next ID.");
    }

    const previewId = String(result.preview_id || "").trim();

    pieceIdPreviewInput.value = previewId;
    pieceIdOutput.textContent = previewId;
    updateImagePreview(previewId, getValue(hasBottomImageInput) === "1");
  }

  async function buildPayload(requireFiles) {
    const shape = getValue(shapeInput).toUpperCase();
    const yearMonth = getValue(yearMonthInput);
    const previewId = getValue(pieceIdPreviewInput);

    if (!isValidShapeCode(shape)) {
      setStatus("Choose a valid shape code.");
      return null;
    }

    if (!/^\d{4}$/.test(yearMonth)) {
      setStatus("Year + Month must be 4 digits, like 2605.");
      return null;
    }

    if (!previewId) {
      setStatus("Could not generate a piece ID yet.");
      return null;
    }

    const title = getValue(titleInput);
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

    if (requireFiles && !fullTopImageInput.files[0]) {
      setStatus("Top image is required.");
      return null;
    }

    if (requireFiles && hasBottomImage && !fullBottomImageInput.files[0]) {
      setStatus("Bottom image is required when bottom image is set to Yes.");
      return null;
    }

    const topFile = fullTopImageInput.files[0] || null;
    const bottomFile = fullBottomImageInput.files[0] || null;

    const fullTopImage = topFile ? await fileToDataURL(topFile) : null;
    const thumbImage = topFile ? await createThumbnailDataURL(topFile) : null;
    const fullBottomImage = bottomFile ? await fileToDataURL(bottomFile) : null;

    return {
      shape,
      year_month: yearMonth,
      preview_id: previewId,
      title,
      category: shapeToCategory(shape),
      clay,
      finish,
      dimensions,
      status,
      description,
      has_bottom_image: hasBottomImage,
      is_published: isPublished,
      thumb_image: thumbImage,
      full_top_image: fullTopImage,
      full_bottom_image: fullBottomImage,
    };
  }

  function previewPayload(payload, displayId) {
    const id = String(displayId || payload.preview_id || "").trim();

    pieceIdOutput.textContent = id || "—";
    updateImagePreview(id, payload.has_bottom_image);
    updateRecordOutput(payload, id);
  }

  function updateImagePreview(id, hasBottomImage) {
    if (!id) {
      imageOutput.textContent = "—";
      return;
    }

    const topThumb = `/images/thumbs/${id}_top_thumb.jpg`;
    const topFull = `/images/full/${id}_top.jpg`;
    const bottomFull = `/images/full/${id}_bottom.jpg`;

    const lines = [
      `Thumbnail: ${topThumb}`,
      `Full top: ${topFull}`,
    ];

    if (hasBottomImage) {
      lines.push(`Full bottom: ${bottomFull}`);
    } else {
      lines.push("Full bottom: not used");
    }

    imageOutput.textContent = lines.join("\n");
  }

  function updateRecordOutput(payload, id) {
    recordOutput.textContent = JSON.stringify(
      {
        id,
        shape: payload.shape,
        category: payload.category,
        title: payload.title,
        clay: payload.clay,
        finish: payload.finish,
        dimensions: payload.dimensions,
        status: payload.status,
        description: payload.description,
        has_bottom_image: payload.has_bottom_image,
        is_published: payload.is_published,
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
      RD: "Round Bonsai Container",
      RC: "Rectangle Bonsai Container",
      FREE: "Freeform Bonsai Container",
      CS: "Cascade Bonsai Container",
      FJ: "Face Jug",
      IKE: "Ikebana Vessel",
      SCULP: "Sculpture",
    };

    titleInput.value = map[shapeInput.value] || "ClaycrazE Piece";
  }

  function shapeToCategory(shape) {
    const map = {
      OV: "bonsai",
      RD: "bonsai",
      RC: "bonsai",
      FREE: "bonsai",
      CS: "bonsai",
      FJ: "facejugs",
      IKE: "ikebana",
      SCULP: "sculpture",
    };

    return map[shape] || "archive";
  }

  function isValidShapeCode(shape) {
    return ["OV", "RD", "RC", "FREE", "CS", "FJ", "IKE", "SCULP"].includes(shape);
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

  function createThumbnailDataURL(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = function () {
        img.src = reader.result;
      };

      reader.onerror = function () {
        reject(new Error(`Could not read image for thumbnail: ${file.name}`));
      };

      img.onload = function () {
        const maxSize = 900;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not create thumbnail canvas."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      img.onerror = function () {
        reject(new Error(`Could not load image for thumbnail: ${file.name}`));
      };

      reader.readAsDataURL(file);
    });
  }
})();