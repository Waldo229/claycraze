document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("#materials-root");
  if (!root) return;

  root.innerHTML = `
    <section class="studio-content">
      <h1>Materials</h1>

      <div class="studio-text">
        <img
          src="/images/materials.jpg"
          alt="Studio materials"
          class="studio-image"
        />

        <p>
          Materials are never neutral. Clay bodies, slips, glazes, oxides, ash, and local earth all bring their own character, limits, and opportunities. The work begins by paying attention to what the material wants to do.
        </p>

        <p>
          This section gathers the physical ingredients of the studio: the clays I use, the slips that shape surface and color, the glazes that soften or sharpen the finished pot, and the local materials that give the work a more particular ground.
        </p>

        <p>
          The point is not simply to list ingredients, but to understand their conduct. Some materials give structure, some hold color in reserve, some soften a surface, and some quietly shift the whole character of a pot. What matters is not chemistry alone, but the felt behavior of materials as they move through making and firing.
        </p>

        <p>
          Over time, these materials become a language. Repetition, testing, and observation make it possible to recognize what each one contributes and where restraint is needed. The work grows not from abundance, but from a smaller set of materials used with increasing attention.
        </p>
      </div>
    </section>
  `;
});