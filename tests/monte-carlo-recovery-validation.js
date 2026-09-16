'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildSyntheticBank,
  chooseItemsForParticipant,
  generateSynthetic,
  rowsToCsv
} = require('../scripts/generate-synthetic-calibration.js');
const {
  parseArgs,
  analysisSeed,
  buildPlan,
  parseCsv,
  prepareSyntheticDifInput,
  summarizeReplicate
} = require('../scripts/run-monte-carlo-recovery.js');

(function validateArgumentAndPlanSafety() {
  const args = parseArgs([
    '--replicates', '2',
    '--participants', '900',
    '--seed-prefix', 'test-v9',
    '--out', '/tmp/cil-mc-v9',
    '--dry-run'
  ]);
  assert.strictEqual(args.replicates, 2);
  assert.strictEqual(args.participants, 900);
  assert.strictEqual(args.seedPrefix, 'test-v9');
  assert.strictEqual(args.dryRun, true);

  const plan = buildPlan(args);
  assert.strictEqual(plan.version, 'CIL-MONTE-CARLO-RECOVERY-2026.09.2');
  assert.strictEqual(plan.design, 'fixed-42-item-synthetic-recovery-panel');
  assert.strictEqual(plan.steps.length, 6);
  assert.deepStrictEqual(plan.steps.map(step => step.name), [
    'generate-01', 'irt-01', 'age-dif-01',
    'generate-02', 'irt-02', 'age-dif-02'
  ]);
  assert(plan.steps.filter(step => step.name.startsWith('generate-')).every(step => step.args.includes('recovery')));

  const r1Seed = analysisSeed('test-v9-r01');
  const r2Seed = analysisSeed('test-v9-r02');
  assert(Number.isInteger(r1Seed) && r1Seed > 0);
  assert(Number.isInteger(r2Seed) && r2Seed > 0);
  assert.notStrictEqual(r1Seed, r2Seed);
  assert.strictEqual(plan.steps.find(step => step.name === 'irt-01').env.CIL_ANALYSIS_SEED, String(r1Seed));
  assert.strictEqual(plan.steps.find(step => step.name === 'age-dif-01').env.CIL_ANALYSIS_SEED, String(r1Seed));
  assert.strictEqual(plan.steps.find(step => step.name === 'irt-02').env.CIL_ANALYSIS_SEED, String(r2Seed));
  assert.strictEqual(plan.steps.find(step => step.name === 'age-dif-02').env.CIL_ANALYSIS_SEED, String(r2Seed));

  assert.strictEqual(plan.safety.containsRealParticipants, false);
  assert.strictEqual(plan.safety.syntheticOnly, true);
  assert.strictEqual(plan.safety.automaticUpload, false);
  assert.strictEqual(plan.safety.participantBackend, false);
  assert.strictEqual(plan.safety.productNormEligible, false);
  assert.strictEqual(plan.safety.productIqUnlocked, false);
  assert.strictEqual(plan.safety.autoConvertCpiToIq, false);
})();

(function validateRecoveryPanelDoesNotChangeDefaultMatrixSampling() {
  const bank = buildSyntheticBank();
  const defaultItems = chooseItemsForParticipant(bank, 17);
  const explicitMatrix = chooseItemsForParticipant(bank, 17, 'matrix');
  assert.deepStrictEqual(defaultItems, explicitMatrix, 'Default synthetic sampling must remain matrix mode');
  assert.strictEqual(defaultItems.length, 42);

  const recovery = chooseItemsForParticipant(bank, 17, 'recovery');
  assert.strictEqual(recovery.length, 42);
  assert.strictEqual(new Set(recovery.map(item => item.itemId)).size, 42);
  assert.strictEqual(recovery.filter(item => item.defect === 'low-discrimination-control').length, 6);
  assert.strictEqual(recovery.filter(item => item.defect === 'age-dif-control').length, 6);
  assert.strictEqual(recovery.filter(item => item.defect === 'negative-discrimination-control').length, 6);
  assert.throws(() => chooseItemsForParticipant(bank, 0, 'unknown'), /Unsupported synthetic panel/);
})();

(function validateRecoveryGeneratorIsSyntheticOnly() {
  const generated = generateSynthetic({ participants: 250, seed: 'v9-test', panel: 'recovery' });
  assert.strictEqual(generated.rows.length, 250 * 42);
  assert.strictEqual(generated.manifest.panel, 'recovery');
  assert.strictEqual(generated.manifest.administeredUniqueItems, 42);
  assert.strictEqual(generated.manifest.containsRealParticipants, false);
  assert.strictEqual(generated.manifest.containsDirectIdentifiers, false);
  assert.strictEqual(generated.manifest.productNormEligible, false);
  assert.strictEqual(generated.manifest.productIqUnlocked, false);
  assert(generated.rows.every(row => row.iqEstimate === ''));
  assert(generated.rows.every(row => row.formId === 'synthetic-recovery-panel-v1'));
})();

(function validateDifCompatibleRecoveryInput() {
  const truth = buildSyntheticBank();
  const generated = generateSynthetic({ participants: 250, seed: 'v9-dif-filter-test', panel: 'recovery' });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cil-mc-v9-dif-'));
  try {
    const source = path.join(tmp, 'calibration-responses.csv');
    const output = path.join(tmp, 'calibration-responses-dif-compatible.csv');
    fs.writeFileSync(source, rowsToCsv(generated.rows));
    const prepared = prepareSyntheticDifInput(source, output, truth);
    assert.strictEqual(prepared.sourceRows, 250 * 42);
    assert.strictEqual(prepared.filteredRows, 250 * 30);
    assert.strictEqual(prepared.excludedItemCount, 12);

    const filtered = parseCsv(fs.readFileSync(output, 'utf8'));
    const filteredIds = new Set(filtered.map(row => row.itemId));
    const excluded = truth.filter(item => item.defect === 'low-discrimination-control' || item.defect === 'negative-discrimination-control');
    const ageDifControls = truth.filter(item => item.defect === 'age-dif-control');
    assert(excluded.every(item => !filteredIds.has(item.itemId)));
    assert(ageDifControls.every(item => filteredIds.has(item.itemId)));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})();

(function validateCsvParserAndRecoverySummarizer() {
  assert.deepStrictEqual(parseCsv('a,b\n1,"two,2"\n'), [{ a: '1', b: 'two,2' }]);

  const truth = buildSyntheticBank();
  const selected = truth.filter(item => ['SYN-01-02','SYN-01-04','SYN-01-05','SYN-01-06','SYN-01-07'].includes(item.itemId));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cil-mc-v9-'));
  try {
    fs.writeFileSync(path.join(tmp, 'item-parameters.csv'), [
      'a,b,itemId,domain',
      ...selected.map(item => `${item.a},${item.b},${item.itemId},${item.domain}`)
    ].join('\n') + '\n');
    fs.writeFileSync(path.join(tmp, 'age-dif.csv'), [
      'domain,itemId,difFlag,difDeltaR2,status',
      'verbal-comprehension,SYN-01-02,TRUE,0.03,ok',
      'verbal-comprehension,SYN-01-04,FALSE,0.00,ok'
    ].join('\n') + '\n');

    const summary = summarizeReplicate(tmp, truth);
    assert.strictEqual(summary.matchedParameterRows, selected.length);
    assert.strictEqual(summary.regularParameterRows, 4);
    assert(Math.abs(summary.discriminationCorrelation - 1) < 1e-12);
    assert(Math.abs(summary.difficultyCorrelation - 1) < 1e-12);
    assert(Math.abs(summary.discriminationBias) < 1e-12);
    assert(Math.abs(summary.difficultyBias) < 1e-12);
    assert.strictEqual(summary.domainRecovery['verbal-comprehension'].regularParameterRows, 4);
    assert(Math.abs(summary.domainRecovery['verbal-comprehension'].discriminationCorrelation - 1) < 1e-12);
    assert(Math.abs(summary.domainRecovery['verbal-comprehension'].difficultyCorrelation - 1) < 1e-12);
    assert(Math.abs(summary.domainRecovery['verbal-comprehension'].discriminationBias) < 1e-12);
    assert(Math.abs(summary.domainRecovery['verbal-comprehension'].difficultyBias) < 1e-12);
    assert.strictEqual(summary.knownDifControlsObserved, 1);
    assert.strictEqual(summary.knownDifControlsDetected, 1);
    assert.strictEqual(summary.nullDifItemsObserved, 1);
    assert.strictEqual(summary.nullDifItemsFlagged, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})();

console.log('Calibration v9 Monte Carlo recovery validation PASS');
