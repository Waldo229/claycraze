document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("#theory-root");
  if (!root) return;

  const sections = [
    {
      title: "Studio",
      href: "/studio.html",
      text: "The physical and material ground of the work: places, materials, tools, and techniques."
    },
    {
      title: "Materials",
      href: "/materials.html",
      text: "Clay bodies, slips, glazes, and the accumulated behavior of matter under heat."
    },
    {
      title: "Places",
      href: "/places.html",
      text: "People, locations, and field notes that shape the larger geography of the work."
    },
    {
      title: "Kiln",
      href: "/kiln.html",
      text: "The transforming field of heat and time: the Electric Skutt 1027 and the outdoor PoorBoy gas kiln."
    },
    {
      title: "GENE Project",
      href: "/gene.html",
      text: "The philosophical and technical work surrounding GENE: concept, build, observation, and notes."
    }
  ];

  root.innerHTML = sections
    .map(
      (section) => `
        <article class="gallery-card theory-card">
          <a class="gallery-card-link theory-card-link" href="${section.href}">
            <h3>${section.title}</h3>
            <p>${section.text}</p>
          </a>
        </article>
      `
    )
    .join("");
});