document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("#skutt-root");
  if (!root) return;

  root.innerHTML = `
    <section class="studio-content">
      <h1>Skutt 1027</h1>

      <div class="studio-text">
        <img
          src="/images/gene_001s.jpg"
          alt="Skutt 1027 kiln in the studio"
          class="studio-image"
        />

        <p>
          The Skutt 1027 is the electric kiln line in the studio—steady, legible, and repeatable. It provides a controlled environment for testing, refining, and carrying work through a known firing path.
        </p>

        <p>
          It exists because some questions in clay need a measured answer. When the work asks for pacing, comparison, and dependable repetition, the Skutt becomes the right companion. It makes subtle differences visible: a change in glaze thickness, a shift in schedule, a difference in soak or cooling. What it offers is not drama, but clarity.
        </p>

        <p>
          In that sense, the Skutt is part of the studio’s discipline. It allows work to be judged against itself instead of against accident. That does not make it less alive. It simply means its language is quieter—less flame, less risk, more fidelity to intention and more patience with process.
        </p>

        <p>
          This is also where GENE’s observational role becomes especially clear: not controlling the firing, but registering pace, tension, and the felt approach of transformation as the work moves through heat toward reveal.
        </p>
      </div>
    </section>
  `;
});