// =====================================================
// ClaycrazE Chris Tree Contributor Form
// =====================================================
// Narrow contributor form for Chris Schmuck.
//
// This follows the existing working tree intake pattern:
// - converts JPEG image to data URL
// - POSTs JSON to /api/save-tree
//
// IMPORTANT:
// Browser-side identity is only a convenience.
// Backend must still force/validate person_slug = "chris-schmuck"
// for this contributor path.
// =====================================================

const form = document.getElementById("chrisTreeForm");
const statusBox = document.getElementById("statusBox");
const submitButton = document.getElementById("submitButton");

const CHRIS_PERSON_SLUG = "chris-schmuck";
const CHRIS_OWNER_CREDIT = "Collection of Chris Schmuck";

const allowedStatuses = new Set([
  "shown-by-appointment",
  "nfs",
  "in-development",
  "private-collection"
]);

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));

    reader.readAsDataURL(file);
  });
}

function cleanText(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

form.addEventListener("submit", async function(event) {
  event.preventDefault();

  statusBox.textContent = "Saving tree...";
  submitButton.disabled = true;

  try {
    const treeImage = document.getElementById("treeImage").files[0];

    const title = cleanText(document.getElementById("title").value);
    const species = cleanText(document.getElementById("species").value);
    const status = cleanText(document.getElementById("status").value);
    const description = cleanText(document.getElementById("description").value);

    if (!treeImage) {
      throw new Error("Please choose a JPEG image.");
    }

    if (treeImage.type !== "image/jpeg") {
      throw new Error("Please use a JPEG image.");
    }

    if (!title) {
      throw new Error("Tree title is required.");
    }

    if (!allowedStatuses.has(status)) {
      throw new Error("Please choose a valid availability value.");
    }

    const tree = {
      person_slug: CHRIS_PERSON_SLUG,
      tree_slug: slugify(title),

      title: title,
      species: species,
      status: status,
      price: "",
      owner_credit: CHRIS_OWNER_CREDIT,
      description: description,

      tree_image_data: await fileToDataUrl(treeImage)
    };

    const response = await fetch("/api/save-tree", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ tree })
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Could not save tree.");
    }

    statusBox.textContent =
      result.message || `Tree saved: ${result.tree.id}. SiteGround archive confirmed.`;

    form.reset();

  } catch (error) {
    console.error(error);
    statusBox.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});