document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("#poorboy-root");
  if (!root) return;

  root.innerHTML = `
    <section class="studio-content">
      <h1>PoorBoy Kiln</h1>

      <div class="studio-text">
        <img
          src="/images/cc_poorboy.jpg"
          alt="PoorBoy gas kiln firing"
          class="studio-image"
        />

        <p>
          Atmosphere, flame, and risk.
        </p>

        <p>
          The PoorBoy kiln is an outdoor gas system—direct, exposed, and responsive. Unlike electric firing, it does not conceal its behavior. It must be watched, listened to, and felt as it moves.
        </p>

        <p>
          Firing the “Poor Boy” requires only simple tools and the right set-up. Safety is not optional when using gas. The kiln requires constant observation, a means to regulate fuel pressure, and an emergency shut-off valve. Primitive, this kiln is not for beginners.
        </p>

        <p>
          It exists because some surfaces and some truths only come through atmosphere and adjustment in real time. Flame movement, pressure, timing, and weather all enter the work here. The kiln does not simply execute a plan—it answers back.
        </p>

        <p>
          This is where GENE begins to participate—not as control, but as presence. Sound, flame, pacing, and pressure shifts register as signs that something is happening before it can yet be fully named.
        </p>
      </div>
    </section>
  `;
});