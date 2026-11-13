(function (root) {
  "use strict";
  const GREEN_LIMIT_F = 1800;
  const number = value => (typeof value === "number" || (typeof value === "string" && value.trim()))
    && Number.isFinite(Number(value)) ? Number(value) : null;

  function probeSample(data, evidenceTime, now = Date.now()) {
    const probe = Array.isArray(data?.summaries) && data.summaries.find(item => item?.name === "GREEN_0");
    const temp = number(probe?.raw_latest_temp);
    const rate = number(probe?.latest_rate);
    const at = evidenceTime(data?.evidence_generated_at);
    if (data?.source_status !== "current" || temp === null || temp < -459.67 ||
        !Number.isFinite(at) || at > now) return null;
    return { at, temp, rate };
  }

  function ageLabel(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    if (seconds < 60) return seconds + " sec";
    const minutes = Math.floor(seconds / 60);
    return minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " hr " + (minutes % 60) + " min";
  }

  function validSample(sample) {
    return Number.isFinite(sample?.at) && Number.isFinite(sample?.temp) &&
      sample.temp >= -459.67 && (sample.rate === null || Number.isFinite(sample.rate));
  }

  function estimate(sample, target, source, now, maxAge) {
    if (!validSample(sample) || !Number.isFinite(target) ||
        sample.at > now || now - sample.at > maxAge) return null;
    if (source === "GREEN_0" && (sample.temp >= GREEN_LIMIT_F || target >= GREEN_LIMIT_F)) return null;
    if (sample.rate <= 0 || target <= sample.temp) return null;
    const eta = sample.at + (target - sample.temp) / sample.rate * 3600000;
    return eta > now && Number.isFinite(eta) ? eta : null;
  }

  function readLocal(key) {
    try { return JSON.parse(root.localStorage.getItem(key)); }
    catch (_) { return null; }
  }

  function writeLocal(key, value) {
    try { root.localStorage.setItem(key, JSON.stringify(value)); }
    catch (_) { /* The view still works with storage disabled. */ }
  }

  const api = { GREEN_LIMIT_F, probeSample, ageLabel, validSample, estimate, readLocal, writeLocal };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GeneFiringMeasurements = api;
})(typeof globalThis === "undefined" ? window : globalThis);
