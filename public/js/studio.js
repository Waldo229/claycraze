document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("#studio-root");
  if (!root) return;

  root.innerHTML = `
    <section class="studio-content">
      <h1>Studio</h1>

      <div class="studio-text">
        <img
          src="/images/studio-001.jpg"
          alt="ClaycrazE studio"
          class="studio-image"
        />

        <p>
          It is my hope that this website will be of interest to both potters and to bonsai and ikebana enthusiasts, and that they may find something useful here—whether in my clay and glaze choices or in the way I have shaped a home studio and working environment.
        </p>

        <p>
          While not quite the self-reliant potter described by Andrew Holden in his book of the same name, I have found it necessary to make my own way. Much of my equipment has been homemade or repurposed, at least until I could afford to improve it. I tend toward simple tools and techniques; if the ancient Chinese potters didn’t need it, I probably don’t either.
        </p>

        <p>
          I continue the journey—now more than fifty years on—with a light heart, holding that theory and practice are companions in the mischief surrounding creation.
        </p>

        <p>
          Han Shan and Shih-te, the monks of Cold Mountain, stand at the threshold of my creative space as guides: one opening toward contemplation, the other toward work finished. I invite you to step inside, explore, and share in the path.
        </p>
      </div>
    </section>
  `;
});