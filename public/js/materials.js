document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("#materials-root");
  if (!root) return;

  root.innerHTML = `
    <section class="theory-intro">
      <h2>Materials</h2>
      <p>
        Materials are never neutral. Clay bodies, slips, glazes, oxides, ash,
        and local earth all bring their own character, limits, and opportunities.
        The work begins by paying attention to what the material wants to do.
      </p>
      <p>
        This section gathers the physical ingredients of the studio: the clays
        I use, the slips that shape surface and color, the glazes that soften
        or sharpen the finished pot, and the local materials that give the work
        a more particular ground.
      </p>
    </section>

    <section class="theory-grid" aria-label="Materials sections">
      <article class="theory-card">
        <a class="theory-card-link" href="/clays.html">
          <h3>Clays</h3>
          <p>
            Clay bodies, grog, plasticity, color in firing, and the structural
            choices behind different forms.
          </p>
        </a>
      </article>

      <article class="theory-card">
        <a class="theory-card-link" href="/slips.html">
          <h3>Slips</h3>
          <p>
            Layering, tone, iron-bearing surfaces, and the subtle use of slip
            as structure beneath glaze.
          </p>
        </a>
      </article>

      <article class="theory-card">
        <a class="theory-card-link" href="/glazes.html">
          <h3>Glazes</h3>
          <p>
            Surface quality, softness, restraint, and the chemistry that serves
            the work without overwhelming it.
          </p>
        </a>
      </article>

      <article class="theory-card">
        <a class="theory-card-link" href="/local-materials.html">
          <h3>Local Materials</h3>
          <p>
            Local sands, clays, and found materials that carry some of the
            character of place into the studio.
          </p>
        </a>
      </article>

      <article class="theory-card">
        <a class="theory-card-link" href="/tests.html">
          <h3>Tests</h3>
          <p>
            Test tiles, line blends, triaxials, and the slower discipline of
            learning what the kiln reveals.
          </p>
        </a>
      </article>

      <article class="theory-card">
        <a class="theory-card-link" href="/notes.html">
          <h3>Notes</h3>
          <p>
            Studio observations, recipe changes, and working notes that help
            material knowledge accumulate over time.
          </p>
        </a>
      </article>
    </section>
  `;
});