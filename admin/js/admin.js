document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("pieceForm");
  const statusBox = document.getElementById("statusBox");
  const submitButton = document.getElementById("submitButton");

  form.addEventListener("submit", async event => {
    event.preventDefault();

    statusBox.textContent = "";
    statusBox.className = "status-box";

    const topImage = document.getElementById("topImage").files[0];
    const bottomImage = document.getElementById("bottomImage").files[0];
    const shape = document.getElementById("shape").value.trim();
    const dimensions = document.getElementById("dimensions").value.trim();
    const color = document.getElementById("color").value.trim();

    if (!topImage || !shape || !dimensions) {
      showStatus("Please provide top image, shape, and dimensions.", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Creating piece...";

    try {
      const topData = await fileToDataUrl(topImage);
      const bottomData = bottomImage ? await fileToDataUrl(bottomImage) : "";
      const thumbData = await createThumbDataUrl(topImage);

      const payload = {
        shape,
        dimensions,
        glaze: color,
        color,

        title: defaultTitle(shape),
        category: defaultCategory(shape),
        description: "",
        clay_body: "",
        notes: "",
        status: "available",
        price: "",

        source_top_filename: topImage.name,
        source_bottom_filename: bottomImage ? bottomImage.name : "",

        thumb_image: thumbData,
        full_top_image: topData,
        full_bottom_image: bottomData,
        has_bottom_image: Boolean(bottomData),
        is_published: true
      };

      const response = await fetch("/api/pieces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Piece could not be created.");
      }

      showStatus(`Created ${result.id || "new piece"} successfully.`, "success");

      form.reset();

    } catch (error) {
      console.error(error);
      showStatus(error.message || "Something went wrong.", "error");

    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Create Piece";
    }
  });

  function showStatus(message, type) {
    statusBox.textContent = message;
    statusBox.className = `status-box ${type}`;
  }
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));

    reader.readAsDataURL(file);
  });
}

function createThumbDataUrl(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = event => {
      image.src = event.target.result;
    };

    reader.onerror = () => reject(new Error("Could not create thumbnail."));

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 700;

      const ratio = Math.min(size / image.width, size / image.height);

      canvas.width = Math.round(image.width * ratio);
      canvas.height = Math.round(image.height * ratio);

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    image.onerror = () => reject(new Error("Could not load image."));

    reader.readAsDataURL(file);
  });
}

function defaultTitle(shape) {
  const labels = {
    OV: "Oval Bonsai Container",
    RD: "Round Bonsai Container",
    RC: "Rectangular Bonsai Container",
    CS: "Cascade Bonsai Container",
    FF: "Freeform Bonsai Container",
    SL: "Slab Bonsai Container",
    IK: "Ikebana Container",
    SC: "Sculpture"
  };

  return labels[shape] || "ClaycrazE Piece";
}

function defaultCategory(shape) {
  if (shape === "IK") return "ikebana";
  if (shape === "SC") return "sculpture";
  return "bonsai";
}