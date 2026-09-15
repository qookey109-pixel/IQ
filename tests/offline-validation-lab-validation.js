#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  generateSynthetic,
  buildSyntheticBank
} = require('../scripts/generate-synthetic-calibration');
const {
  normalizePublicDataset
} = require('../scripts/normalize-public-dataset');
const {
  buildPlan
} = require('../scripts/run-offline-validation-lab');

const root = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'calibration/offline-validation-policy.json'), 'utf8'));

assert.strictEqual(policy.mode, 'offline-validation-lab');
assert.strictEqual(policy.network.automaticUpload, false);
assert.strictEqual(policy.network.participantBackend, false);
assert.strictEqual(policy.network.databaseRequired, false);
assert.strictEqual(policy.network.backgroundCollection, false);
assert.strictEqual(policy.productSafety.productIqUnlocked, false);
assert.strictEqual(policy.productSafety.populationNormed, false);
assert.strictEqual(policy.productSafety.autoConvertCpiToIq, false);
assert.strictEqual(policy.sourceIsolation.syntheticCanCreateProductNorms, false);
assert.strictEqual(policy.sourceIsolation.publicExternalCanCreateProductNorms, false);
assert.strictEqual(policy.sourceIsolation.externalResponsesCanBeMixedIntoCilNorms, false);

const synA = generateSynthetic({ participants: 40, seed: 'validation-seed' });
const synB = generateSynthetic({ participants: 40, seed: 'validation-seed' });
assert.strictEqual(synA.rows.length, 40 * 42, 'synthetic sessions must contain exactly 42 rows each');
assert.strictEqual(synA.manifest.participants, 40);
assert.strictEqual(synA.manifest.containsRealParticipants, false);
assert.strictEqual(synA.manifest.productNormEligible, false);
assert.strictEqual(synA.manifest.productIqUnlocked, false);
assert.ok(synA.manifest.controlledDefects.length >= 6, 'synthetic bank should contain known QA controls');
assert.deepStrictEqual(synA.rows.slice(0, 100), synB.rows.slice(0, 100), 'same seed must produce deterministic responses');
assert.strictEqual(buildSyntheticBank().length, 6 * 49, 'synthetic method-validation bank should have 49 items per domain');

const participantCounts = new Map();
for (const row of synA.rows) {
  participantCounts.set(row.sourceKey, (participantCounts.get(row.sourceKey) || 0) + 1);
  assert.ok(Number.isInteger(row.ageYears) && row.ageYears >= 18 && row.ageYears <= 65);
  assert.ok(['18–24','25–34','35–44','45–54','55–65'].includes(row.ageBand));
  assert.strictEqual(row.iqEstimate, '');
  assert.ok(Number(row.cpi) >= 0 && Number(row.cpi) <= 100);
  for (const forbidden of ['name','email','phone','address','location','ipAddress','accountId','dateOfBirth','birthday']) {
    assert.ok(!(forbidden in row), `synthetic row must not contain ${forbidden}`);
  }
}
assert.ok([...participantCounts.values()].every(n => n === 42));

const publicCsv = [
  'participant_id,age,item_01,item_02,item_03',
  'p001,22,1,0,1',
  'p002,37,0,1,1',
  'p003,61,1,1,0'
].join('\n');
const mapping = {
  datasetId: 'public-demo',
  participantIdColumn: 'participant_id',
  ageColumn: 'age',
  itemColumns: ['item_01','item_02','item_03'],
  itemContentStored: false,
  scoringKeyStored: false,
  licenseReference: 'test-license',
  sourceReference: 'test-source'
};
const normalized = normalizePublicDataset(publicCsv, mapping);
assert.strictEqual(normalized.manifest.participants, 3);
assert.strictEqual(normalized.rows.length, 9);
assert.strictEqual(normalized.manifest.containsItemContent, false);
assert.strictEqual(normalized.manifest.containsScoringKey, false);
assert.strictEqual(normalized.manifest.containsDirectIdentifiers, false);
assert.strictEqual(normalized.manifest.participantIdsPseudonymized, true);
assert.strictEqual(normalized.manifest.productNormEligible, false);
assert.strictEqual(normalized.manifest.productIqUnlocked, false);
assert.ok(normalized.rows.every(row => row.productNormEligible === false && row.cilItem === false));
assert.ok(normalized.rows.every(row => !['p001','p002','p003'].includes(row.sourceKey)));
assert.ok(JSON.stringify(normalized).indexOf('p001') === -1, 'raw participant IDs must not survive normalization');

assert.throws(() => normalizePublicDataset([
  'participant_id,age,email,item_01',
  'p001,22,a@example.test,1'
].join('\n'), { ...mapping, itemColumns: ['item_01'] }), /Direct-identifier-like columns/);

assert.throws(() => normalizePublicDataset(publicCsv, { ...mapping, itemContentStored: true }), /item content and scoring keys/i);
assert.throws(() => normalizePublicDataset(publicCsv, { ...mapping, scoringKeyStored: true }), /item content and scoring keys/i);

const syntheticPlan = buildPlan({ mode: 'synthetic', participants: 120, seed: 'x', out: 'tmp/offline', runPsychometrics: true });
assert.strictEqual(syntheticPlan.safety.participantBackend, false);
assert.strictEqual(syntheticPlan.safety.automaticUpload, false);
assert.strictEqual(syntheticPlan.safety.productIqUnlocked, false);
assert.deepStrictEqual(syntheticPlan.steps.map(step => step.name), ['generate-synthetic','run-v5-psychometric-pipeline']);

const localPlan = buildPlan({ mode: 'local', input: '/manual/export.csv', out: 'tmp/local', runPsychometrics: true });
assert.strictEqual(localPlan.psychometricInput, '/manual/export.csv');
assert.strictEqual(localPlan.sourceIsolation.manualLocalExportRequiresUserAction, true);

const publicPlan = buildPlan({ mode: 'public', input: '/public/data.csv', mapping: '/public/map.json', out: 'tmp/public' });
assert.deepStrictEqual(publicPlan.steps.map(step => step.name), ['normalize-public-external']);
assert.strictEqual(publicPlan.sourceIsolation.publicExternalProductNormEligible, false);
assert.throws(() => buildPlan({ mode: 'public', input: 'x.csv', mapping: 'm.json', runPsychometrics: true }), /source-isolated/);

for (const relative of [
  'scripts/generate-synthetic-calibration.js',
  'scripts/normalize-public-dataset.js',
  'scripts/run-offline-validation-lab.js'
]) {
  const code = fs.readFileSync(path.join(root, relative), 'utf8');
  assert.ok(!/\bXMLHttpRequest\b/.test(code), `${relative} must not contain XMLHttpRequest`);
  assert.ok(!/\bsendBeacon\b/.test(code), `${relative} must not contain sendBeacon`);
  assert.ok(!/\bsupabase\b/i.test(code), `${relative} must not contain Supabase integration`);
  assert.ok(!/\bfetch\s*\(/.test(code), `${relative} must not contain network fetch calls`);
}

console.log('Offline Validation Lab v6 validation PASS');
console.log(`Synthetic QA: ${synA.manifest.participants} participants / ${synA.rows.length} rows / ${synA.manifest.controlledDefects.length} controlled defect items`);
console.log(`Public adapter QA: ${normalized.manifest.participants} participants / ${normalized.rows.length} source-isolated rows`);
console.log('Participant backend: NONE; automatic upload: NONE; product IQ: LOCKED');
