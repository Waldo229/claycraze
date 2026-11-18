const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const script = fs.readFileSync("public/js/firing-broadcast.js", "utf8");
const time = "2026-11-18T07:00:00Z";
const missionId = "major-tom-5";
const archiveUrl = `/gene/firing-missions/${"a".repeat(64)}.json`;

function element() {
  return {
    style: {},
    children: [],
    setAttribute() {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; }
  };
}

function event(sequence, kind, evidence, overrides = {}) {
  return {
    mission_id: missionId, event_id: `e-${sequence}`, sequence, kind, evidence,
    observed_at_utc: new Date(Date.parse(time) - (60 - sequence) * 1000).toISOString(),
    howard: "Howard: Is this a question?", gene: "GENE: Archived answer.",
    ...overrides
  };
}

function journal(events, overrides = {}) {
  return {
    record_type: "gene_firing_broadcast", mission_id: missionId,
    mission_name: "Major Tom 5", mission_status: "FIRING", generated_at_utc: time,
    archive_url: archiveUrl, events,
    current_probe_evidence: {available: true, probe: "GREEN_0", temperature_f: 1087, source_time: time},
    ...overrides
  };
}

async function startJournal(recent, archive) {
  const host = element();
  let current = recent;
  let history = archive;
  let archiveRequests = 0;
  let refresh;
  const context = {
    AbortSignal,
    Date: class extends Date { static now() { return Date.parse(time); } },
    document: {querySelector: () => host, createElement: element},
    window: {GeneTemperature: {evidenceTime: Date.parse}},
    setInterval(callback, interval) { if (interval === 10000) refresh = callback; },
    async fetch(url) {
      const isArchive = url.startsWith(archiveUrl);
      if (isArchive) archiveRequests += 1;
      const data = isArchive ? history : current;
      return {ok: !!data, json: async () => data};
    }
  };
  vm.runInNewContext(script, context);
  await new Promise(resolve => setImmediate(resolve));
  const [, status, currentReading, picture, , historyStatus, list, probeDetails, microphoneDetails] = host.children;
  return {
    status, currentReading, picture, historyStatus, list, probeDetails, microphoneDetails, refresh,
    get archiveRequests() { return archiveRequests; },
    set recent(data) { current = data; },
    set archive(data) { history = data; }
  };
}

test("GENE tells the whole journal in time order and retains open evidence on refresh", async () => {
  const launch = event(1, "mission", {mission_status: "FIRING"});
  const stage = event(2, "gene_stage", {stage: "atomic_gene1", probe: "GREEN_0", temperature_f: 1083}, {
    image: "/images/1atomic.jpg",
    gene: "GENE: This is probe evidence, not proof of heatwork throughout the kiln."
  });
  const observations = Array.from({length: 31}, (_, i) => event(i + 3, "evidence", {available: true}));
  const app = await startJournal(journal(observations.slice(-30)), journal([
    ...observations, event(34, "mission", {}, {mission_id: "another-mission"}), stage, launch
  ]));
  assert.equal(app.list.children.length, 2);
  assert.equal(app.probeDetails.children[0].textContent, "Probe evidence");
  assert.equal(app.probeDetails.children[1].children.length, 31);
  assert.match(app.list.children[0].children[1].textContent, /Ignition is on the record/);
  assert.match(app.list.children[1].children[1].textContent, /Atomic GENE I.*GREEN_0.*°F/);
  const stageWords = app.list.children[1].children[1].textContent;
  assert.doesNotMatch(stageWords, /Howard|Q:|A:|proof of heatwork/);
  assert.equal(app.picture.src, "/images/1atomic.jpg");
  assert.match(app.currentReading.textContent, /1087 °F/);
  assert.equal(app.historyStatus.hidden, true);

  const saved = app.list.children[1].children[2];
  saved.open = true;
  const microphone = event(34, "microphone", {available: true, sample_generated_unix: 1794985200});
  app.recent = journal([...observations.slice(-29), microphone]);
  await app.refresh();
  assert.equal(app.list.children.length, 2);
  assert.equal(app.microphoneDetails.hidden, false);
  assert.equal(app.microphoneDetails.children[0].textContent, "Microphone evidence");
  const [micRecord] = app.microphoneDetails.children[1].children;
  assert.equal(micRecord.children[0].dateTime, microphone.observed_at_utc);
  assert.deepEqual(JSON.parse(micRecord.children[1].textContent), microphone.evidence);
  assert.equal(app.list.children[1].children[2], saved);
  assert.equal(saved.open, true);
  assert.equal(app.archiveRequests, 1);

  const sound = event(35, "microphone", {available: true, sound_level: 80}, {
    gene: "GENE: I registered a brief rise in studio sound."
  });
  app.microphoneDetails.open = true;
  app.recent = journal([microphone, sound]);
  await app.refresh();
  assert.equal(app.list.children.length, 3);
  assert.match(app.list.children.at(-1).children[1].textContent, /brief rise in studio sound/);
  assert.equal(app.microphoneDetails.open, true);
  assert.equal(app.microphoneDetails.children[1].children.length, 1);

  app.recent = null;
  await app.refresh();
  assert.equal(app.list.children.length, 3);
  assert.match(app.currentReading.textContent, /out of date/);

  app.recent = journal([], {mission_id: "new-mission", archive_url: null});
  await app.refresh();
  assert.equal(app.list.children.length, 0);
  assert.equal(app.picture.hidden, true);
  assert.equal(app.microphoneDetails.hidden, true);
  assert.equal(app.microphoneDetails.open, false);
  assert.equal(app.probeDetails.hidden, true);
});

test("a missing or mismatched archive is retried without duplicating the recent entries", async () => {
  const second = event(2, "evidence", {available: false});
  const app = await startJournal(journal([second]), journal([], {mission_id: "different"}));
  assert.equal(app.list.children.length, 0);
  assert.equal(app.probeDetails.children[1].children.length, 1);
  assert.equal(app.historyStatus.hidden, false);
  app.archive = journal([second]);
  await app.refresh();
  assert.equal(app.list.children.length, 0);
  assert.equal(app.probeDetails.children[1].children.length, 1);
  assert.equal(app.historyStatus.hidden, false);

  app.archive = journal([event(1, "mission", {mission_status: "GO"}), second]);
  await app.refresh();
  assert.equal(app.list.children.length, 1);
  assert.equal(app.historyStatus.hidden, true);
});

test("GENE narrates state changes and keeps same-state readings in probe evidence", async () => {
  const stage = (sequence, label, temperature) => event(sequence, "gene_stage",
    {available: true, stage: label, temperature_f: temperature, probe: "GREEN_0"});
  const repeated = stage(4, "Safety GENE", 991);
  const app = await startJournal(journal([
    stage(1, "Safety GENE", 845),
    event(2, "evidence", {available: false}),
    event(3, "evidence", {available: true, temperature_f: 991}),
    repeated,
    stage(5, "atomic_gene1", 1024),
    stage(6, "Safety GENE", 985)
  ]));
  const words = app.list.children.map(entry => entry.children[1].textContent);
  assert.equal(words.length, 3);
  assert.match(words[0], /Safety GENE.*845/);
  assert.match(words[1], /Atomic GENE I.*1,?024/);
  assert.match(words[2], /Safety GENE.*985/);
  const readings = app.probeDetails.children[1].children;
  assert.equal(readings.length, 3);
  assert.equal(readings[2].children[0].dateTime, repeated.observed_at_utc);
  assert.deepEqual(JSON.parse(readings[2].children[1].textContent), repeated.evidence);
  assert.equal(app.archiveRequests, 0);
});
