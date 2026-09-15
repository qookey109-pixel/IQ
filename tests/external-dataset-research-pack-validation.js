'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  DATASET_ID,
  DOMAIN_COUNTS,
  INCLUDED_SOURCE_AGE_BANDS,
  canonicalItemId,
  detectItemColumns,
  parseSourceAgeBand,
  assertRealRunMinimums,
  normalizeIcarCsv
} = require('../scripts/normalize-icar-sapa.js');
const { buildPlan } = require('../scripts/run-external-dataset-research-pack.js');

function itemNames(style = 'compact') {
  const make = (prefix, count) => Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return style === 'published-dot' ? `${prefix}.${n}` : `${prefix}${i + 1}`;
  });
  return [
    ...make('LN', 9),
    ...make('MR', 11),
    ...make('VR', 16),
    ...make('R3D', 24)
  ];
}

function makeFixture(style = 'compact') {
  const items = itemNames(style);
  const headers = ['age', 'gender', ...items];
  const ages = ['18andUnder', '19to24', '25to29', '35to39', '50to59', '60andOver'];
  const lines = [headers.join(',')];
  ages.forEach((age, rowIndex) => {
    const responses = items.map((_, itemIndex) => {
      if (rowIndex === 2 && itemIndex % 7 === 0) return '';
      return (rowIndex + itemIndex) % 2 ? '1' : '0';
    });
    lines.push([age, rowIndex % 2 ? 'F' : 'M', ...responses].join(','));
  });
  return lines.join('\n') + '\n';
}

(function validateCatalog() {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'calibration', 'external-datasets', 'catalog.json'), 'utf8'));
  assert.strictEqual(catalog.productNormEligible, false);
  assert.strictEqual(catalog.productIqUnlocked, false);
  const icar = catalog.datasets.find(dataset => dataset.id === DATASET_ID);
  assert(icar, 'ICAR/SAPA must be catalogued');
  assert.strictEqual(icar.status, 'enabled-offline');
  assert.strictEqual(icar.license, 'CC0 Public Domain Dedication');
  assert.deepStrictEqual(icar.cilAgeFilter, [18, 65]);
  assert.strictEqual(icar.itemCount, 60);
  assert.deepStrictEqual(icar.domains, DOMAIN_COUNTS);

  const piaac = catalog.datasets.find(dataset => dataset.id === 'oecd-piaac');
  assert(piaac && piaac.autoDownload === false, 'PIAAC must remain manual-access only');
  assert.strictEqual(piaac.productNormEligible, false);

  const pisa = catalog.datasets.find(dataset => dataset.id === 'oecd-pisa');
  assert(pisa && pisa.status === 'method-stress-test-candidate');
  assert.strictEqual(pisa.productNormEligible, false);
})();

(function validatePublishedCategoricalAgeEncoding() {
  assert.deepStrictEqual(Object.keys(INCLUDED_SOURCE_AGE_BANDS), ['19to24','25to29','30to34','35to39','40to49','50to59']);
  assert.deepStrictEqual(parseSourceAgeBand('19to24'), { sourceBand: '19to24', ageBand: '19–24', included: true });
  assert.deepStrictEqual(parseSourceAgeBand('50to59'), { sourceBand: '50to59', ageBand: '50–59', included: true });
  assert.deepStrictEqual(parseSourceAgeBand('18andUnder'), { sourceBand: '18andUnder', ageBand: null, included: false });
  assert.deepStrictEqual(parseSourceAgeBand('60andOver'), { sourceBand: '60andOver', ageBand: null, included: false });
  assert.strictEqual(parseSourceAgeBand(''), null);
})();

(function validateIcarNormalization() {
  for (const style of ['compact', 'published-dot']) {
    const fixture = makeFixture(style);
    const headers = fixture.split(/\r?\n/)[0].split(',');
    assert.strictEqual(detectItemColumns(headers).length, 60);

    const first = normalizeIcarCsv(fixture);
    const second = normalizeIcarCsv(fixture);
    assert.deepStrictEqual(first, second, `ICAR normalization must be deterministic for ${style}`);
    assert.strictEqual(first.manifest.itemColumns, 60);
    assert.deepStrictEqual(first.manifest.domainCounts, DOMAIN_COUNTS);
    assert.strictEqual(first.manifest.publishedAgeEncoding, 'categorical-bands');
    assert.deepStrictEqual(first.manifest.requestedAdultAgeBoundary, [18, 65]);
    assert.deepStrictEqual(first.manifest.includedSourceAgeBands, ['19to24','25to29','30to34','35to39','40to49','50to59']);
    assert.deepStrictEqual(first.manifest.excludedAmbiguousSourceAgeBands, ['18andUnder','60andOver']);
    assert.strictEqual(first.manifest.sourceRecordsInIncludedAgeBands, 4);
    assert.strictEqual(first.manifest.sourceRecordsExcludedAmbiguousAgeBands, 2);
    assert.strictEqual(first.manifest.participantsWithScoredResponses, 4);
    assert.strictEqual(first.manifest.exactAgeImputed, false);
    assert.strictEqual(first.manifest.productNormEligible, false);
    assert.strictEqual(first.manifest.productIqUnlocked, false);
    assert.strictEqual(first.manifest.autoCpiToIq, false);
    assert.strictEqual(first.manifest.containsItemText, false);
    assert.strictEqual(first.manifest.containsScoringKey, false);
    assert(first.rows.length > 0);
    assert.deepStrictEqual([...new Set(first.rows.map(row => row.ageBand))].sort(), ['19–24','25–29','35–39','50–59'].sort());
    assert(!first.rows.some(row => Object.prototype.hasOwnProperty.call(row, 'ageYears')), 'Normalizer must not invent exact ages');
    assert(first.rows.every(row => row.productNormEligible === false));
    assert(first.rows.every(row => row.cilItem === false));
    assert(first.rows.every(row => row.productIqUnlocked === false));
    assert(first.rows.every(row => row.autoCpiToIq === false));
    assert(first.rows.every(row => ['LN','MR','VR','R3D'].includes(row.externalDomain)));
    assert(first.rows.every(row => /:(LN|MR|VR|R3D)\d{2}$/.test(row.externalItemId)));
    assert(!first.rows.some(row => Object.prototype.hasOwnProperty.call(row, 'itemText')));
    assert(!first.rows.some(row => Object.prototype.hasOwnProperty.call(row, 'scoringKey')));
    assert.throws(() => assertRealRunMinimums(first), /Too few scored ICAR participants/);
  }
  assert.strictEqual(canonicalItemId('VR.04'), 'VR04');
  assert.strictEqual(canonicalItemId('LN.58'), 'LN58');
  assert.strictEqual(canonicalItemId('R3D_4'), 'R3D04');
})();

(function validateRejectsUnknownAgeCategories() {
  const fixture = makeFixture('published-dot').replace('19to24', '19-24-unknown');
  assert.throws(() => normalizeIcarCsv(fixture), /Unexpected ICAR source age categories/);
})();

(function validateRejectsIncompleteItemStructure() {
  const fixture = makeFixture('published-dot');
  const lines = fixture.trimEnd().split('\n');
  const headers = lines[0].split(',');
  const removeIndex = headers.indexOf('R3D.24');
  const reduced = lines.map(line => {
    const cells = line.split(',');
    cells.splice(removeIndex, 1);
    return cells.join(',');
  }).join('\n') + '\n';
  assert.throws(() => normalizeIcarCsv(reduced), /Expected 60 scored ICAR item columns/);
})();

(function validateRejectsCanonicalCollisions() {
  const fixture = makeFixture('published-dot');
  const lines = fixture.trimEnd().split('\n');
  const headers = lines[0].split(',');
  headers[headers.indexOf('LN.02')] = 'LN_01';
  lines[0] = headers.join(',');
  assert.throws(() => normalizeIcarCsv(lines.join('\n') + '\n'), /duplicate canonical item IDs/);
})();

(function validateOfflinePlan() {
  const plan = buildPlan({ input: '/tmp/icar.csv', out: '/tmp/out', runR: true });
  assert.strictEqual(plan.safety.networkFetch, false);
  assert.strictEqual(plan.safety.participantBackend, false);
  assert.strictEqual(plan.safety.automaticUpload, false);
  assert.strictEqual(plan.safety.rawThirdPartyDataCommitted, false);
  assert.strictEqual(plan.safety.productNormEligible, false);
  assert.strictEqual(plan.safety.productIqUnlocked, false);
  assert.deepStrictEqual(plan.steps.map(step => step.name), [
    'normalize-icar-sapa',
    'external-icar-validation',
    'external-icar-two-factor-interpretation'
  ]);
})();

(function validateNoNetworkOrBackendApis() {
  const files = [
    'scripts/normalize-icar-sapa.js',
    'scripts/run-external-dataset-research-pack.js',
    'calibration/analysis/external_icar_validation.R',
    'calibration/analysis/external_icar_two_factor.R'
  ];
  for (const rel of files) {
    const text = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    assert(!/fetch\s*\(/.test(text), `${rel} must not fetch remote data`);
    assert(!/axios|supabase|postgres|XMLHttpRequest|WebSocket/i.test(text), `${rel} must remain offline`);
  }
})();

console.log('External Dataset Research Pack validation PASS');
