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
    const elements = new Map();
    function element(id) {
      if (!elements.has(id)) elements.set(id, {style: {setProperty() {}}, classList: {toggle() {}}, setAttribute(k,v) {this[k]=v;}, removeAttribute(k) {delete this[k];}});
      return elements.get(id);
    }
    let current = evidence(2000), fail = false;
    const intervals = [];
    const context = { GeneTemperature: {...gene, evaluate: data => gene.evaluate(data, now)},
      document: {getElementById: element}, window: {setInterval(fn, ms) {intervals.push({fn,ms});}},
      Date, Intl, AbortSignal, console: {warn() {}},
      fetch: async url => {
        if (fail && url.includes('kiln_watch_latest.json')) throw Error('offline');
        return {ok: true, json: async () => url.includes('gene_state') ? {} : current, text: async () => 'note'};
      }
    };
    for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInNewContext(script, context);
    const flush = () => new Promise(resolve => setImmediate(resolve));
    await flush();
    const mascot = element(page === 'kilnwatch.html' ? 'geneMascot' : 'pocketGene');
    const label = element('geneTemperatureState');
    const refresh = intervals.find(item => item.ms === 10000).fn;
    for (const temp of [0,200,800,1001,1801,2000]) {
      current = evidence(temp); await refresh();
      assert.equal(label.textContent, gene.classify(temp).state);
      assert.equal(mascot.src, gene.classify(temp).image);
    }
    fail = true; await refresh();
    assert.equal(label.textContent, 'Temperature unavailable'); assert.equal(mascot.src, undefined); assert.equal(mascot.hidden, true);
    fail = false; current = evidence(1801); await refresh(); assert.equal(mascot.hidden, false);
    current.evidence_generated_at = new Date(now - 120001).toISOString();
    intervals.find(item => item.ms === 1000).fn();
    assert.equal(label.textContent, 'Temperature unavailable'); assert.equal(mascot.src, undefined);
  });
}
