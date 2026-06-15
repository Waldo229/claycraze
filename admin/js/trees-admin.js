const form = document.getElementById("treeForm");
const statusBox = document.getElementById("statusBox");
const submitButton = document.getElementById("submitButton");

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));

    reader.readAsDataURL(file);
  });
}

form.addEventListener("submit", async function(event) {
  event.preventDefault();

  statusBox.textContent = "Saving tree...";
  submitButton.disabled = true;

  try {
    const treeImage = document.getElementById("treeImage").files[0];

    const tree = {
      title: document.getElementById("title").value.trim(),
      species: document.getElementById("species").value.trim(),
      status: document.getElementById("status").value.trim(),
      price: document.getElementById("price").value.trim(),
      owner_credit: document.getElementById("ownerCredit").value.trim(),
      description: document.getElementById("description").value.trim(),
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
      `Tree saved: ${result.tree.id}. SiteGround archive confirmed.`;

    form.reset();

  } catch (error) {
    console.error(error);
    statusBox.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});