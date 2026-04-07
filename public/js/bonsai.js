const bonsaiCategories = [
  {
    title: "Ovals",
    description:
      "Quiet, elongated containers with a lateral pull suited to many tree forms.",
    image: "/images/bonsai/oval.jpg",
    link: "/gallery/ovals.html",
    alt: "Oval bonsai pot"
  },
  {
    title: "Rectangles",
    description:
      "Rectangular containers with structure, clarity, and a more architectural edge.",
    image: "/images/bonsai/rectangles.jpg",
    link: "/gallery/rectangles.html",
    alt: "Rectangular bonsai pot"
  },
  {
    title: "Freestyle",
    description:
      "Less bound to convention, where utility and gesture begin to move more freely together.",
    image: "/images/bonsai/freestyle.jpg",
    link: "/gallery/freestyle.html",
    alt: "Freestyle bonsai pot"
  },
  {
    title: "Rounds",
    description:
      "Centered, circular forms with a more gathered and self-contained presence.",
    image: "/images/bonsai/rounds.jpg",
    link: "/gallery/rounds.html",
    alt: "Round bonsai pot"
  }
];

function createCard(category) {
  const article = document.createElement("article");
  article.className = "gallery-card";

  article.innerHTML = `
    <a class="gallery-card-link" href="${category.link}">
      <h3>${category.title}</h3>
      <p>${category.description}</p>
      <img src="${category.image}" alt="${category.alt}">
    </a>
  `;

  return article;
}

function renderBonsaiGallery() {
  const grid = document.getElementById("galleryGrid");

  if (!grid) {
    console.error("galleryGrid not found.");
    return;
  }

  grid.innerHTML = "";

  bonsaiCategories.forEach((category) => {
    grid.appendChild(createCard(category));
  });
}

document.addEventListener("DOMContentLoaded", renderBonsaiGallery);