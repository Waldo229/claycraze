document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("#practice-root");
  if (!root) return;

  const sections = [
    {
      title: "Bonsai",
      href: "/gallery/bonsai",
      text: "Pots shaped for tree, season, and long companionship."
    },
    {
      title: "Ikebana",
      href: "/gallery/ikebana",
      text: "Containers for line, interval, flower, and space."
    },
    {
      title: "Sculpture",
      href: "/gallery/sculpture",
      text: "Work that leans more toward image, gesture, and presence."
    },
    {
      title: "Face Jugs",
      href: "/gallery/facejugs",
      text: "A lively and older current in the work, carrying wit, character, and voice."
    }
  ];

  root.innerHTML = sections
    .map(
      (section) => `
        <article class="gallery-card">
          <a class="gallery-card-link" href="${section.href}">
            <h3>${section.title}</h3>
            <p>${section.text}</p>
          </a>
        </article>
      `
    )
    .join("");
});