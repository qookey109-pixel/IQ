'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  DATASET_ID,
  DOMAIN_COUNTS,
  detectItemColumns,
  normalizeIcarCsv
} = require('../scripts/normalize-icar-sapa.js');
const { buildPlan } = require('../scripts/run-external-dataset-research-pack.js');

function itemNames() {
  return [
    ...Array.from({ length: 9 }, (_, i) => `LN${i + 1}`),
    ...Array.from({ length: 11 }, (_, i) => `MR${i + 1}`),
    ...Array.from({ length: 16 }, (_, i) => `VR${i + 1}`),
    ...Array.from({ length: 24 }, (_, i) => `R3D${i + 1}`)
  ];
}

function makeFixture() {
  const items = itemNames();
  const headers = ['age', 'gender', ...items];
  const ages = [17, 18, 25, 44, 65, 66];
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

(function validateIcarNormalization() {
  const fixture = makeFixture();
  const headers = fixture.split(/\r?\n/)[0].split(',');
  assert.strictEqual(detectItemColumns(headers).length, 60);

  const first = normalizeIcarCsv(fixture);
  const second = normalizeIcarCsv(fixture);
  assert.deepStrictEqual(first, second, 'ICAR normalization must be deterministic');
  assert.strictEqual(first.manifest.itemColumns, 60);
  assert.deepStrictEqual(first.manifest.domainCounts, DOMAIN_COUNTS);
  assert.strictEqual(first.manifest.sourceRecordsInAdultRange, 4);
  assert.strictEqual(first.manifest.participantsWithScoredResponses, 4);
  assert.strictEqual(first.manifest.productNormEligible, false);
  assert.strictEqual(first.manifest.productIqUnlocked, false);
  assert.strictEqual(first.manifest.containsItemText, false);
  assert.strictEqual(first.manifest.containsScoringKey, false);
  assert(first.rows.length > 0);
  assert(first.rows.every(row => row.ageYears >= 18 && row.ageYears <= 65));
  assert(first.rows.every(row => row.productNormEligible === false));
  assert(first.rows.every(row => row.cilItem === false));
  assert(first.rows.every(row => row.productIqUnlocked === false));
  assert(first.rows.every(row => ['LN','MR','VR','R3D'].includes(row.externalDomain)));
  assert(!first.rows.some(row => Object.prototype.hasOwnProperty.call(row, 'itemText')));
  assert(!first.rows.some(row => Object.prototype.hasOwnProperty.call(row, 'scoringKey')));
})();

(function validateRejectsIncompleteItemStructure() {
  const fixture = makeFixture();
  const lines = fixture.trimEnd().split('\n');
  const headers = lines[0].split(',');
  const removeIndex = headers.indexOf('R3D24');
  const reduced = lines.map(line => {
    const cells = line.split(',');
    cells.splice(removeIndex, 1);
    return cells.join(',');
  }).join('\n') + '\n';
  assert.throws(() => normalizeIcarCsv(reduced), /Expected 60 scored ICAR item columns/);
})();

(function validateOfflinePlan() {
  const plan = buildPlan({ input: '/tmp/icar.csv', out: '/tmp/out', runR: true });
  assert.strictEqual(plan.safety.networkFetch, false);
  assert.strictEqual(plan.safety.participantBackend, false);
  assert.strictEqual(plan.safety.automaticUpload, false);
  assert.strictEqual(plan.safety.rawThirdPartyDataCommitted, false);
  assert.strictEqual(plan.safety.productNormEligible, false);
  assert.strictEqual(plan.safety.productIqUnlocked, false);
  assert.deepStrictEqual(plan.steps.map(step => step.name), ['normalize-icar-sapa', 'external-icar-validation']);
})();

(function validateNoNetworkOrBackendApis() {
  const files = [
    'scripts/normalize-icar-sapa.js',
    'scripts/run-external-dataset-research-pack.js',
    'calibration/analysis/external_icar_validation.R'
  ];
  for (const rel of files) {
    const text = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    assert(!/fetch\s*\(/.test(text), `${rel} must not fetch remote data`);
    assert(!/axios|supabase|postgres|XMLHttpRequest|WebSocket/i.test(text), `${rel} must remain offline`);
  }
})();

console.log('External Dataset Research Pack validation PASS');
