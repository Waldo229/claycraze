const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const gene = require('../public/js/gene-temperature');
const now = Date.parse('2026-09-16T14:00:00Z');
const evidence = (temp, overrides = {}) => ({ source_status: 'current', evidence_generated_at: new Date(now).toISOString(), summaries: [{latest_temp: temp}], ...overrides });

for (const [temperature, state] of [
  [-10, 'Normal'], [199, 'Normal'], [199.999, 'Normal'], [200, 'Chili'],
  [200.001, 'Chili'], [799, 'Chili'], [799.999, 'Chili'], [800, 'Safety GENE'],
  [800.001, 'Safety GENE'], [1000, 'Safety GENE'], [1000.999, 'Safety GENE'],
  [1001, 'atomic_gene1'], [1001.001, 'atomic_gene1'], [1800, 'atomic_gene1'],
  [1800.999, 'atomic_gene1'], [1801, 'atomic_Gene2'], [1801.001, 'atomic_Gene2'],
  [1999, 'atomic_Gene2'], [1999.999, 'atomic_Gene2'], [2000, 'ultimate_gene'], [2000.001, 'ultimate_gene'], [2400, 'ultimate_gene']
]) test(`boundary ${temperature} => ${state}`, () => assert.equal(gene.evaluate(evidence(temperature), now).state, state));

test('missing, invalid, stale and unavailable evidence never becomes Normal', () => {
  for (const value of [null, undefined, '', ' ', true, false, [], {}, NaN, Infinity, -Infinity, 'bad', -500]) {
    assert.equal(gene.evaluate(evidence(value), now).state, 'unavailable');
  }
  for (const data of [null, {}, evidence(2200, {source_status: 'unavailable'}), evidence(2200, {source_status: 'stale'}),
    evidence(2200, {gene_visual: {state: 'unavailable'}}), evidence(2200, {summaries: []}),
    evidence(2200, {summaries: [{latest_temp: 2200}, {latest_temp: null}]}),
    evidence(2200, {evidence_generated_at: null, generated_at: new Date(now).toISOString()}),
    evidence(2200, {summaries: [], last_known_summaries: [{latest_temp: 2200}]})]) {
    assert.equal(gene.evaluate(data, now).state, 'unavailable');
  }
  for (const timestamp of ['', 'bad', '2026-99-99 00:00:00', '2026-02-30 00:00:00']) {
    assert.equal(gene.evaluate(evidence(2200, {evidence_generated_at: timestamp}), now).state, 'unavailable');
  }
});
test('freshness boundaries and studio timezone', () => {
  assert.equal(gene.evaluate(evidence(200), now + 119999).state, 'Chili');
  assert.equal(gene.evaluate(evidence(200), now + 120000).state, 'Chili');
  assert.equal(gene.evaluate(evidence(200), now + 120001).state, 'unavailable');
  assert.equal(gene.evaluate(evidence(200), now - 1).state, 'unavailable');
  assert.equal(gene.evidenceTime('2026-09-16 10:00:00'), now);
  assert.equal(gene.evidenceTime('2026-01-16 10:00:00'), Date.parse('2026-01-16T15:00:00Z'));
});
test('evidence badge shares freshness cutoff and prioritizes invalidity over age', () => {
  assert.equal(gene.evaluate(evidence(2000), now + 120000).evidenceStatus, 'LIVE');
  const stale = gene.evaluate(evidence(2000), now + 120001);
  assert.equal(stale.evidenceStatus, 'STALE');
  assert.equal(stale.image, null);
  for (const data of [null, {}, evidence(null), evidence('invalid'), evidence(2000, {source_status:'unavailable'}), evidence(2000, {gene_visual:{state:'unavailable'}}), evidence(2000, {evidence_generated_at:null}), evidence(2000, {summaries:[]})]) {
    assert.equal(gene.evaluate(data, now + 120001).evidenceStatus, 'UNAVAILABLE');
  }
  assert.equal(gene.evaluate(evidence(2000), now - 1).evidenceStatus, 'UNAVAILABLE');
});
test('hottest current probe and numeric strings', () => {
  assert.equal(gene.evaluate(evidence(20, {summaries: [{latest_temp: 20}, {latest_temp: '1801'}]}), now).state, 'atomic_Gene2');
});
test('all image paths exist with exact capitalization', () => {
  for (const temp of [0,200,800,1001,1801,2000]) {
    const filename = gene.classify(temp).image.split('/').pop();
    assert.ok(fs.readdirSync('public/images').includes(filename), filename);
  }
});

for (const page of ['kilnwatch.html', 'kiln-watch-graph.html']) {
  test(`${page}: live transitions, failure clears hot image, recovery and expiry`, async () => {
    const html = fs.readFileSync(`public/${page}`, 'utf8');
    assert.ok(html.includes('<meta charset="UTF-8">'));
    const elements = new Map();
    function element(id) {
      if (!elements.has(id)) elements.set(id, {style: {setProperty() {}}, classList: {toggle() {}}, setAttribute(k,v) {this[k]=v;}, removeAttribute(k) {delete this[k];}});
      return elements.get(id);
    }
    let current = evidence(2000), fail = false;
    let clockNow = now;
    current.summaries[0].latest_rate = 0;
    let noteText = 'Ramp 0 ?F/hr.';
    const intervals = [];
    const context = { GeneTemperature: {...gene, evaluate: data => gene.evaluate(data, clockNow)},
      document: {getElementById: element}, window: {setInterval(fn, ms) {intervals.push({fn,ms});}},
      Date, Intl, AbortSignal, console: {warn() {}},
      fetch: async url => {
        if (fail && url.includes('kiln_watch_latest.json')) throw Error('offline');
        return {ok: true, json: async () => url.includes('gene_state') ? {} : current, text: async () => noteText};
      }
    };
    for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInNewContext(script, context);
    const flush = () => new Promise(resolve => setImmediate(resolve));
    await flush();
    assert.equal(element('evidenceBadge').textContent, 'LIVE');
    assert.equal(element('evidenceBadge')['aria-label'], 'Temperature evidence: LIVE');
    assert.equal(element(page === 'kilnwatch.html' ? 'rampNote' : 'firingNote').textContent, 'Ramp 0 \u00B0F/hr.');
    if (page === 'kiln-watch-graph.html') {
      const refreshNote = intervals.find(item => item.ms === 300000).fn;
      for (const unit of ['?', '\uFFFD', '\u00C2\u00B0', '\u00B0']) {
        noteText = `Existing note. Ramp 0 ${unit}F/hr. Keep this wording.`;
        await refreshNote();
        assert.equal(element('firingNote').textContent, 'Existing note. Ramp 0 \u00B0F/hr. Keep this wording.');
      }
    }
    const mascot = element(page === 'kilnwatch.html' ? 'geneMascot' : 'pocketGene');
    const label = element('geneTemperatureState');
    const refresh = intervals.find(item => item.ms === 10000).fn;
    for (const temp of [0,200,800,1001,1801,2000]) {
      current = evidence(temp); await refresh();
      assert.equal(label.textContent, gene.displayName(gene.classify(temp).state));
      assert.equal(mascot.src, gene.classify(temp).image);
      if (temp === 1001) {
        assert.equal(label.textContent, 'Atomic GENE I');
        assert.equal(mascot.alt, 'Atomic GENE I');
        if (page === 'kilnwatch.html') assert.equal(element('heatState').textContent, 'Atomic GENE I');
      }
      assert.equal(element('evidenceBadge').textContent, 'LIVE');
    }
    const tick = intervals.find(item => item.ms === 1000).fn;
    clockNow = now + 120000; tick();
    assert.equal(element('evidenceBadge').textContent, 'LIVE');
    clockNow = now + 120001; tick();
    assert.equal(element('evidenceBadge').textContent, 'STALE');
    assert.equal(mascot.src, undefined);
    clockNow = now; await refresh();
    assert.equal(element('evidenceBadge').textContent, 'LIVE');
    fail = true; await refresh();
    assert.equal(element('evidenceBadge').textContent, 'UNAVAILABLE');
    assert.equal(label.textContent, 'Temperature unavailable'); assert.equal(mascot.src, undefined); assert.equal(mascot.hidden, true);
    fail = false; current = evidence(1801); await refresh(); assert.equal(mascot.hidden, false);
    assert.equal(element('evidenceBadge').textContent, 'LIVE');
    current.evidence_generated_at = new Date(now - 120001).toISOString();
    intervals.find(item => item.ms === 1000).fn();
    assert.equal(label.textContent, 'Temperature unavailable'); assert.equal(mascot.src, undefined);
    assert.equal(element('evidenceBadge').textContent, 'STALE');
  });
}
