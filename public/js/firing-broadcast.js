/* The Mission Journal tells the firing in GENE's voice. */
(() => {
  "use strict";

  const host = document.querySelector("[data-firing-broadcast]");
  if (!host) return;
  const missionScoped = host.hasAttribute("data-mission-id");
  let missionId = host.dataset.missionId;
  let missionGeneration = 0;

  const heading = document.createElement("h2");
  heading.className = "panel-title";
  heading.textContent = "GENE Speaks";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  const current = document.createElement("p");
  const picture = document.createElement("img");
  picture.hidden = true;
  picture.style.cssText = "display:none;width:min(260px,100%);height:auto;border-radius:12px;margin:12px 0";
  const caption = document.createElement("p");
  caption.className = "memory-time";
  const historyStatus = document.createElement("p");
  historyStatus.className = "note-copy muted";
  historyStatus.hidden = true;
  const list = document.createElement("div");
  list.className = "memory-list";
  const probeEvidence = createEvidenceSection("Probe evidence");
  const microphoneEvidence = createEvidenceSection("Microphone evidence");
  host.append(heading, status, current, picture, caption, historyStatus, list,
    probeEvidence.details, microphoneEvidence.details);

  const entries = new Map();
  const sequences = new Set();
  let received = null;
  let failed = false;
  let busy = false;
  let nextSequence = 1;
  let lastSequence = 0;

  function createEvidenceSection(label) {
    const details = document.createElement("details");
    details.className = "journal-evidence";
    details.hidden = true;
    const summary = document.createElement("summary");
    summary.textContent = label;
    const items = document.createElement("div");
    items.className = "memory-list";
    details.append(summary, items);
    return {details, items};
  }

  function renderFreshness() {
    const age = (Date.now() - Date.parse(received?.generated_at_utc)) / 1000;
    const live = !failed && age >= -5 && age <= 90;
    status.textContent = !received ? missionScoped
      ? !missionId ? "Waiting for Mission Control to load a mission."
        : failed ? "Journal unavailable for this mission. Check the Mission Journal for saved broadcasts."
          : "Loading the journal for this mission…"
      : "Awaiting the first mission broadcast."
      : live ? `Mission: ${received.mission_name || "Unnamed mission"} · ${received.mission_status || "Unknown"} · Updated ${new Date(received.generated_at_utc).toLocaleTimeString()}`
      : "Latest broadcast unavailable. Showing the saved journal.";
    const evidence = received?.current_probe_evidence;
    const at = window.GeneTemperature?.evidenceTime(evidence?.source_time);
    const evidenceAge = (Date.now() - at) / 1000;
    current.textContent = missionScoped && !received ? ""
      : live && evidence?.available && evidenceAge >= 0 && evidenceAge <= 120
      ? `Current probe evidence: ${evidence.probe} · ${evidence.temperature_f} °F.`
      : "Current probe evidence is unavailable or out of date.";
  }

  function narrate(event) {
    const evidence = event.evidence || {};
    switch (event.kind) {
      case "mission":
        return {
          PLANNED: "I have a firing to watch. I’m getting ready.",
          GO: "The operator called GO. I’ll keep watch for ignition.",
          FIRING: "Ignition is on the record. I’m here to watch the firing unfold.",
          HOLD: "The mission is on hold. I’ll stay with it.",
          "NO-GO": "The operator called NO-GO. The firing plan is still on the record.",
          COOLING: "We’ve reached cooling. I’ll keep watch as the kiln gives up its heat.",
          COMPLETE: "The operator marked the mission complete. I’ll keep what I witnessed here.",
          ABORTED: "The operator ended the mission early. I’ll keep the record we have.",
          SCRUBBED: "The operator called off this firing. The plan stays in my journal."
        }[evidence.mission_status] || originalNarrative(event);
      case "gene_stage": {
        const stage = {
          atomic_gene1: "Atomic GENE I",
          atomic_Gene2: "Atomic GENE II",
          ultimate_gene: "Ultimate GENE"
        }[evidence.stage] || evidence.stage;
        if (!stage || !evidence.probe || !Number.isFinite(evidence.temperature_f)) {
          return originalNarrative(event);
        }
        const temperature = evidence.temperature_f.toLocaleString();
        return `I took on my ${stage} form when ${evidence.probe} read ${temperature}°F.`;
      }
      default:
        return originalNarrative(event);
    }
  }

  function originalNarrative(event) {
    return String(event.gene || "").replace(/^\s*GENE\s*:\s*/i, "").trim();
  }

  function isMicrophoneStatus(event) {
    return event.kind === "microphone" && typeof event.evidence?.available === "boolean" &&
      Object.keys(event.evidence).every(key => key === "available" || key === "sample_generated_unix");
  }

  function makeEntry(event, evidenceOnly) {
    const item = document.createElement("article");
    item.className = "memory-item";
    const when = document.createElement("time");
    when.className = "memory-time";
    when.dateTime = event.observed_at_utc;
    when.textContent = new Date(event.observed_at_utc).toLocaleString();
    const evidence = document.createElement("pre");
    evidence.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere";
    evidence.textContent = JSON.stringify(event.evidence, null, 2);
    if (evidenceOnly) {
      item.append(when, evidence);
      return item;
    }

    const words = document.createElement("p");
    words.className = "memory-text";
    words.textContent = narrate(event);
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Recorded evidence";
    details.append(summary, evidence);
    item.append(when, words, details);
    return item;
  }

  function addEvents(events) {
    let changed = false;
    for (const event of events) {
      if (event?.mission_id !== received.mission_id ||
          !Number.isFinite(Date.parse(event.observed_at_utc))) continue;
      const key = event.event_id || event.sequence;
      if (key == null || entries.has(key)) continue;
      entries.set(key, {event});
      if (Number.isInteger(event.sequence)) {
        sequences.add(event.sequence);
        lastSequence = Math.max(lastSequence, event.sequence);
      }
      changed = true;
    }
    while (sequences.has(nextSequence)) nextSequence += 1;
    return changed;
  }

  function renderEntries() {
    const ordered = [...entries.values()].sort((a, b) =>
      Date.parse(a.event.observed_at_utc) - Date.parse(b.event.observed_at_utc) ||
      (a.event.sequence ?? 0) - (b.event.sequence ?? 0));
    const narrative = [];
    const probe = [];
    const microphone = [];
    let portrait;
    let lastStage;
    for (const entry of ordered) {
      const {event} = entry;
      const evidence = event.evidence;
      const stage = event.kind === "gene_stage" && evidence?.available !== false &&
        evidence?.probe && Number.isFinite(evidence.temperature_f) ? evidence.stage : null;
      const repeatedStage = !!stage && stage === lastStage;
      if (stage) lastStage = stage;

      const destination = isMicrophoneStatus(event) ? microphone
        : event.kind === "evidence" || repeatedStage ? probe : narrative;
      const evidenceOnly = destination !== narrative;
      if (!entry.item || entry.evidenceOnly !== evidenceOnly) {
        entry.item = makeEntry(event, evidenceOnly);
        entry.evidenceOnly = evidenceOnly;
      }
      destination.push(entry.item);
      if (!evidenceOnly && typeof event.image === "string" &&
          /^\/images\/[A-Za-z0-9_.-]+(?:\?v=[A-Za-z0-9]+)?$/.test(event.image)) {
        portrait = event;
      }
    }

    list.replaceChildren(...narrative);
    probeEvidence.items.replaceChildren(...probe);
    probeEvidence.details.hidden = probe.length === 0;
    microphoneEvidence.items.replaceChildren(...microphone);
    microphoneEvidence.details.hidden = microphone.length === 0;

    picture.hidden = !portrait;
    picture.style.display = portrait ? "block" : "none";
    if (portrait) {
      picture.src = portrait.image;
      picture.alt = "GENE at a recorded journal event";
    }
    caption.textContent = portrait
      ? `Recorded at ${new Date(portrait.observed_at_utc).toLocaleString()}` : "";
  }

  function validJournal(data) {
    return data?.record_type === "gene_firing_broadcast" && data.mission_id &&
      Array.isArray(data.events);
  }

  async function getJournal(path) {
    const response = await fetch(`${path}?t=${Date.now()}`, {
      cache: "no-store", signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw Error("Journal unavailable.");
    const journal = await response.json();
    if (!validJournal(journal)) throw Error("Invalid journal.");
    return journal;
  }

  function resetJournal() {
    entries.clear();
    sequences.clear();
    probeEvidence.details.open = false;
    microphoneEvidence.details.open = false;
    historyStatus.hidden = true;
    nextSequence = 1;
    lastSequence = 0;
  }

  async function refresh() {
    if (busy || (missionScoped && !missionId)) return;
    busy = true;
    const generation = missionGeneration;
    try {
      const data = await getJournal("/gene/firing_broadcast_latest.json");
      if (generation !== missionGeneration) return;
      if (missionScoped && data.mission_id !== missionId) throw Error("Journal is for a different mission.");
      const newMission = received?.mission_id !== data.mission_id;
      if (newMission) resetJournal();
      received = data;
      failed = false;
      renderFreshness();

      if (addEvents(data.events) || newMission) renderEntries();

      if (nextSequence <= lastSequence && /^\/gene\/firing-missions\/[a-f0-9]{64}\.json$/.test(data.archive_url)) {
        try {
          const archive = await getJournal(data.archive_url);
          if (generation !== missionGeneration) return;
          if (archive.mission_id !== data.mission_id) throw Error("Wrong mission archive.");
          if (addEvents(archive.events)) renderEntries();
        } catch {
          // Keep the entries we have and retry the archive on the next refresh.
        }
      }
      historyStatus.hidden = nextSequence > lastSequence;
      historyStatus.textContent = "Some earlier journal entries are temporarily unavailable.";
    } catch {
      if (generation !== missionGeneration) return;
      failed = true;
      renderFreshness();
    } finally {
      busy = false;
      if (generation !== missionGeneration) refresh();
    }
  }

  if (missionScoped) {
    host.addEventListener("mission-change", () => {
      missionId = host.dataset.missionId;
      missionGeneration += 1;
      received = null;
      failed = false;
      resetJournal();
      renderEntries();
      renderFreshness();
      refresh();
    });
    renderFreshness();
  }
  refresh();
  setInterval(refresh, 10000);
  setInterval(renderFreshness, 1000);
})();
