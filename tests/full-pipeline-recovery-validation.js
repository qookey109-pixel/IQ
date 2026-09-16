#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  DOMAINS,
  buildSyntheticBank,
  chooseItemsForParticipant,
  generateSynthetic
} = require('../scripts/generate-synthetic-calibration.js');
const {
  EXTERNAL_TRUTH,
  parseArgs,
  analysisSeed,
  generateSyntheticExternal,
  buildPlan,
  correlation,
  standardized,
  rmse
} = require('../scripts/run-full-pipeline-recovery.js');

(function validateArgsAndPlan() {
  const args = parseArgs([
    '--participants', '900',
    '--seed', 'v10-test',
    '--out', '/tmp/cil-v10',
    '--dry-run'
  ]);
  assert.strictEqual(args.participants, 900);
  assert.strictEqual(args.seed, 'v10-test');
  assert.strictEqual(args.dryRun, true);

  const plan = buildPlan(args);
  assert.strictEqual(plan.version, 'CIL-FULL-PIPELINE-RECOVERY-2026.09.1');
  assert.strictEqual(plan.design, 'clean-42-item-six-domain-synthetic-pipeline-panel');
  assert(Number.isInteger(plan.analysisSeed) && plan.analysisSeed > 0);
  assert.strictEqual(plan.safety.syntheticOnly, true);
  assert.strictEqual(plan.safety.containsRealParticipants, false);
  assert.strictEqual(plan.safety.productNormEligible, false);
  assert.strictEqual(plan.safety.productIqUnlocked, false);
  assert.strictEqual(plan.safety.autoConvertCpiToIq, false);
  assert(plan.pipelineCommand.includes('--analysis-seed'));
  assert(plan.pipelineCommand.includes(String(plan.analysisSeed)));
  assert.throws(() => parseArgs(['--participants', '100']), />= 500/);
})();

(function validateDeterministicAnalysisSeed() {
  const a = analysisSeed('same-seed');
  const b = analysisSeed('same-seed');
  const c = analysisSeed('different-seed');
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
  assert(a >= 1 && a <= 2147483646);
})();

(function validateCleanPipelinePanel() {
  const bank = buildSyntheticBank();
  const matrix = chooseItemsForParticipant(bank, 7, 'matrix');
  const recovery = chooseItemsForParticipant(bank, 7, 'recovery');
  const pipeline = chooseItemsForParticipant(bank, 7, 'pipeline');

  assert.strictEqual(matrix.length, 42);
  assert.strictEqual(recovery.length, 42);
  assert.strictEqual(pipeline.length, 42);
  assert.strictEqual(new Set(pipeline.map(item => item.itemId)).size, 42);
  assert.strictEqual(pipeline.filter(item => item.defect).length, 0);

  for (const domain of DOMAINS) {
    const items = pipeline.filter(item => item.domain === domain);
    assert.strictEqual(items.length, 7);
    assert(items.every(item => item.a > 0));
    assert(items.every(item => item.ageDif === 0));
    assert.deepStrictEqual(items.map(item => item.b), [-1.5, -1, -0.5, 0, 0.5, 1, 1.5]);
  }

  assert(recovery.some(item => item.defect === 'low-discrimination-control'));
  assert(recovery.some(item => item.defect === 'age-dif-control'));
  assert(recovery.some(item => item.defect === 'negative-discrimination-control'));
})();

(function validateSyntheticPipelineGeneration() {
  const generated = generateSynthetic({
    participants: 500,
    seed: 'v10-generator-test',
    panel: 'pipeline'
  });
  assert.strictEqual(generated.rows.length, 500 * 42);
  assert.strictEqual(generated.manifest.panel, 'pipeline');
  assert.strictEqual(generated.manifest.administeredUniqueItems, 42);
  assert.deepStrictEqual(generated.manifest.administeredControlledDefects, []);
  assert.strictEqual(generated.manifest.containsRealParticipants, false);
  assert.strictEqual(generated.manifest.productNormEligible, false);
  assert.strictEqual(generated.manifest.productIqUnlocked, false);
  assert(generated.rows.every(row => row.formId === 'synthetic-pipeline-panel-v1'));
  assert(generated.rows.every(row => row.iqEstimate === ''));
  assert(generated.participantsMeta.every(person => Number.isFinite(person.syntheticG)));
  assert(generated.participantsMeta.every(person =>
    DOMAINS.every(domain => Number.isFinite(person.syntheticDomainTheta[domain]))
  ));
})();

(function validateSyntheticExternalKnownTruth() {
  const generated = generateSynthetic({
    participants: 800,
    seed: 'v10-external-test',
    panel: 'pipeline'
  });
  const rowsA = generateSyntheticExternal(generated.participantsMeta, 'v10-external-test');
  const rowsB = generateSyntheticExternal(generated.participantsMeta, 'v10-external-test');
  assert.deepStrictEqual(rowsA, rowsB);
  assert.strictEqual(rowsA.length, 800);
  assert(rowsA.every(row => row.itemContentStored === false && row.scoringKeyStored === false));
  assert(rowsA.every(row => row.instrumentId === 'SYNTHETIC-V10-LINK'));

  const observed = correlation(
    generated.participantsMeta.map(x => x.cpi),
    rowsA.map(x => x.externalScore)
  );
  assert(observed > 0.7);
  assert.strictEqual(EXTERNAL_TRUTH.cpiSlope, 0.60);
  assert.strictEqual(EXTERNAL_TRUTH.ageSlope, 0.05);
})();

(function validateMathHelpers() {
  const x = [1, 2, 3, 4, 5];
  const z = standardized(x);
  assert(Math.abs(correlation(x, x) - 1) < 1e-12);
  assert(Math.abs(correlation(x, x.map(v => -v)) + 1) < 1e-12);
  assert(Math.abs(rmse(z, z)) < 1e-12);
})();

console.log('Calibration v10 full-pipeline recovery harness validation PASS');
