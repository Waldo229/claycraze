/* The Mission Journal tells the firing in GENE's voice. */
(() => {
  "use strict";

  const host = document.querySelector("[data-firing-broadcast]");
  if (!host) return;

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
  const microphoneDetails = document.createElement("details");
  microphoneDetails.className = "microphone-evidence";
  microphoneDetails.hidden = true;
  const microphoneSummary = document.createElement("summary");
  microphoneSummary.textContent = "Microphone evidence";
  const microphoneList = document.createElement("div");
  microphoneList.className = "memory-list";
  microphoneDetails.append(microphoneSummary, microphoneList);
  host.append(heading, status, current, picture, caption, historyStatus, list, microphoneDetails);

  const entries = new Map();
  const sequences = new Set();
  let received = null;
  let failed = false;
  let busy = false;
  let nextSequence = 1;
  let lastSequence = 0;

  function renderFreshness() {
    const age = (Date.now() - Date.parse(received?.generated_at_utc)) / 1000;
    const live = !failed && age >= -5 && age <= 90;
    status.textContent = !received ? "Awaiting the first mission broadcast."
      : live ? `Mission: ${received.mission_name || "Unnamed mission"} · ${received.mission_status || "Unknown"} · Updated ${new Date(received.generated_at_utc).toLocaleTimeString()}`
      : "Latest broadcast unavailable. Showing the saved journal.";
    const evidence = received?.current_probe_evidence;
    const at = window.GeneTemperature?.evidenceTime(evidence?.source_time);
    const evidenceAge = (Date.now() - at) / 1000;
    current.textContent = live && evidence?.available && evidenceAge >= 0 && evidenceAge <= 120
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
      case "evidence":
        return evidence.available
          ? "I have a fresh reading from the kiln."
          : "I’m waiting for the next reading from the kiln.";
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
      const evidenceOnly = isMicrophoneStatus(event);
      entries.set(key, {event, evidenceOnly, item: makeEntry(event, evidenceOnly)});
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
    const microphoneEntries = ordered.filter(entry => entry.evidenceOnly);
    list.replaceChildren(...ordered.filter(entry => !entry.evidenceOnly).map(entry => entry.item));
    microphoneList.replaceChildren(...microphoneEntries.map(entry => entry.item));
    microphoneDetails.hidden = microphoneEntries.length === 0;

    const portrait = ordered.map(entry => entry.event).reverse().find(event =>
      typeof event.image === "string" && /^\/images\/[A-Za-z0-9_.-]+(?:\?v=[A-Za-z0-9]+)?$/.test(event.image));
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

  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      const data = await getJournal("/gene/firing_broadcast_latest.json");
      const newMission = received?.mission_id !== data.mission_id;
      if (newMission) {
        entries.clear();
        sequences.clear();
        microphoneDetails.open = false;
        nextSequence = 1;
        lastSequence = 0;
      }
      received = data;
      failed = false;
      renderFreshness();

      if (addEvents(data.events) || newMission) renderEntries();

      if (nextSequence <= lastSequence && /^\/gene\/firing-missions\/[a-f0-9]{64}\.json$/.test(data.archive_url)) {
        try {
          const archive = await getJournal(data.archive_url);
          if (archive.mission_id !== data.mission_id) throw Error("Wrong mission archive.");
          if (addEvents(archive.events)) renderEntries();
        } catch {
          // Keep the entries we have and retry the archive on the next refresh.
        }
      }
      historyStatus.hidden = nextSequence > lastSequence;
      historyStatus.textContent = "Some earlier journal entries are temporarily unavailable.";
    } catch {
      failed = true;
      renderFreshness();
    } finally {
      busy = false;
    }
  }

  refresh();
  setInterval(refresh, 10000);
  setInterval(renderFreshness, 1000);
})();
