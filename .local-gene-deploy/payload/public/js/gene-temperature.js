(function (root) {
  "use strict";
  const MAX_AGE_MS = 120000;
  const states = [
    [200, "Normal", "/images/gene-kilnwatch-emoji.png"],
    [800, "Chili", "/images/gene-chilli-pepper-hot.png"],
    [1001, "Safety GENE", "/images/safety_gene.jpg"],
    [1801, "atomic_gene1", "/images/1atomic.jpg"],
    [2000, "atomic_Gene2", "/images/2Atomic.jpg"],
    [Infinity, "ultimate_gene", "/images/ultimate_gene.jpg"]
  ];
  const unavailable = () => ({ state: "unavailable", image: null, temperature: null, ramp: null });
  function number(value) {
    if (typeof value !== "number" && typeof value !== "string") return null;
    if (typeof value === "string" && !value.trim()) return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  }
  function classify(value) {
    const temperature = number(value);
    if (temperature === null || temperature < -459.67) return unavailable();
    const [, state, image] = states.find(([limit]) => temperature < limit);
    return { state, image, temperature, ramp: null };
  }
  // The kiln publisher uses studio-local timestamps without a timezone.
  function evidenceTime(value) {
    if (typeof value !== "string") return NaN;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
      const wall = Date.parse(value.replace(" ", "T") + "Z");
      if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 19) !== value.replace(" ", "T")) return NaN;
      const formatter = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
      });
      let instant = wall;
      for (let i = 0; i < 3; i++) {
        const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p => [p.type, p.value]));
        const represented = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
        instant += wall - represented;
      }
      return instant;
    }
    return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
  }
  function evaluate(data, now = Date.now()) {
    if (!data || data.source_status !== "current" || data.gene_visual?.state === "unavailable") return unavailable();
    const timestamp = evidenceTime(data.evidence_generated_at);
    const age = now - timestamp;
    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) return unavailable();
    if (!Array.isArray(data.summaries) || !data.summaries.length) return unavailable();
    const probes = data.summaries.map(summary => {
      const result = classify(summary?.latest_temp_f ?? summary?.latest_temp);
      result.ramp = number(summary?.latest_ramp_f_per_hr ?? summary?.latest_ramp ?? summary?.latest_rate);
      return result;
    });
    // An invalid present probe makes the hottest current temperature unknown.
    if (probes.some(probe => probe.state === "unavailable")) return unavailable();
    return probes.reduce((a, b) => a.temperature >= b.temperature ? a : b);
  }
  function render(image, label, result) {
    image.hidden = !result.image;
    image.style.display = result.image ? "" : "none";
    if (result.image) image.setAttribute("src", result.image);
    else image.removeAttribute("src");
    image.alt = result.state === "unavailable" ? "GENE temperature unavailable" : result.state;
    label.textContent = result.state === "unavailable" ? "Temperature unavailable" : result.state;
  }
  const api = { MAX_AGE_MS, classify, evaluate, render, evidenceTime };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GeneTemperature = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
