'use strict';

const assert = require('assert');
const {
  VERSION,
  TARGET_CONDITION_ID,
  TARGET_REPLICATE,
  TARGET_SEED,
  TARGET_ANALYSIS_SEED,
  SOURCE_CONFIRMATORY_RUN_ID,
  SOURCE_EXECUTION_COMMIT,
  SOURCE_OBSERVED_DIF_ROWS,
  SOURCE_OBSERVED_DIF_FLAGS,
  SOURCE_OBSERVED_DIF_RATE,
  buildDiagnosticPlan,
  summarizeAgeBandPattern,
  buildDiagnosticReport,
  buildDryRun
} = require('../scripts/run-v11-dif-postfailure-diagnostic.js');
const { loadProtocol } = require('../scripts/run-confirmatory-reliability-v11.js');

const protocol = loadProtocol('calibration/confirmatory-reliability-v11.json');

(function validateFrozenTarget() {
  const plan = buildDiagnosticPlan(protocol, '/tmp/cil-v11-dif-diagnostic-test');
  assert.strictEqual(VERSION, 'CIL-V11-DIF-POSTFAILURE-DIAGNOSTIC-2026.09.1');
  assert.strictEqual(TARGET_CONDITION_ID, 'high-information-control');
  assert.strictEqual(TARGET_REPLICATE, 1);
  assert.strictEqual(plan.seed, TARGET_SEED);
  assert.strictEqual(plan.analysisSeed, TARGET_ANALYSIS_SEED);
  assert.strictEqual(plan.participants, 1200);
  assert.strictEqual(plan.condition.itemDiscriminationMultiplier, 2);
  assert.strictEqual(plan.sourceEvidence.confirmatoryRunId, SOURCE_CONFIRMATORY_RUN_ID);
  assert.strictEqual(plan.sourceEvidence.executionCommit, SOURCE_EXECUTION_COMMIT);
  assert.strictEqual(plan.sourceEvidence.confirmatoryVerdict, 'failed-confirmatory');
  assert.strictEqual(plan.governance.postFailureDiagnosticOnly, true);
  assert.strictEqual(plan.governance.changesConfirmatoryVerdict, false);
  assert.strictEqual(plan.governance.thresholdChangesAllowed, false);
  assert.strictEqual(plan.governance.productNormEligible, false);
  assert.strictEqual(plan.governance.productIqUnlocked, false);
  assert.strictEqual(plan.governance.autoCpiToIq, false);

  const dry = buildDryRun(plan);
  assert.strictEqual(dry.frozenCleanDifThreshold, 0.10);
  assert.strictEqual(dry.target.seed, TARGET_SEED);
  assert.strictEqual(dry.target.analysisSeed, TARGET_ANALYSIS_SEED);
  assert.strictEqual(dry.governance.changesConfirmatoryVerdict, false);
})();

(function validateAgeBandAggregation() {
  const rows = [
    { itemId: 'item-a', ageBand: '18-24', ageYears: 20, correct: 1, skipped: 0, timeout: 0 },
    { itemId: 'item-a', ageBand: '18-24', ageYears: 22, correct: 0, skipped: 0, timeout: 0 },
    { itemId: 'item-a', ageBand: '25-34', ageYears: 30, correct: 1, skipped: 0, timeout: 0 },
    { itemId: 'item-a', ageBand: '25-34', ageYears: 32, correct: 1, skipped: 0, timeout: 0 },
    { itemId: 'item-b', ageBand: '18-24', ageYears: 21, correct: 0, skipped: 0, timeout: 0 }
  ];
  const result = summarizeAgeBandPattern(rows, 'item-a');
  assert.strictEqual(result.ageBands.length, 2);
  assert.strictEqual(result.ageBands[0].correctRate, 0.5);
  assert.strictEqual(result.ageBands[1].correctRate, 1);
  assert.strictEqual(result.correctRateRange.spread, 0.5);
})();

(function validateKnownFailureReproductionSummary() {
  const plan = buildDiagnosticPlan(protocol, '/tmp/cil-v11-dif-diagnostic-test');
  const flaggedIds = new Set(['i01', 'i02', 'i03', 'i04', 'i05']);
  const difRows = Array.from({ length: SOURCE_OBSERVED_DIF_ROWS }, (_, i) => {
    const itemId = `i${String(i + 1).padStart(2, '0')}`;
    return {
      domain: i < 7 ? 'verbal-comprehension' : 'fluid-reasoning',
      itemId,
      difFlag: flaggedIds.has(itemId) ? 'TRUE' : 'FALSE',
      difDeltaR2: flaggedIds.has(itemId) ? '0.012' : '0.001',
      status: 'ok'
    };
  });
  const syntheticRows = [];
  for (const itemId of flaggedIds) {
    syntheticRows.push(
      { itemId, ageBand: '18-24', ageYears: 20, correct: 0, skipped: 0, timeout: 0 },
      { itemId, ageBand: '25-34', ageYears: 30, correct: 1, skipped: 0, timeout: 0 },
      { itemId, ageBand: '35-44', ageYears: 40, correct: 1, skipped: 0, timeout: 0 }
    );
  }
  const report = buildDiagnosticReport(plan, { rows: syntheticRows }, difRows);
  assert.strictEqual(SOURCE_OBSERVED_DIF_FLAGS, 5);
  assert.strictEqual(SOURCE_OBSERVED_DIF_RATE, 5 / 42);
  assert.strictEqual(report.status, 'post-failure-diagnostic-reproduced');
  assert.strictEqual(report.reproduction.difRows, 42);
  assert.strictEqual(report.reproduction.difFlags, 5);
  assert.strictEqual(report.reproduction.difFalsePositiveRate, 5 / 42);
  assert.strictEqual(report.reproduction.cleanDifScreenPass, false);
  assert.strictEqual(report.reproduction.matchesSourceEvidence, true);
  assert.strictEqual(report.reproduction.flaggedItems.length, 5);
  assert.strictEqual(report.generatorAudit.explicitAgeTermInResponseProbability, false);
  assert.strictEqual(report.governance.confirmatoryVerdictRemains, 'failed-confirmatory');
  assert.strictEqual(report.governance.changesConfirmatoryVerdict, false);
  assert.strictEqual(report.governance.thresholdChangesAllowed, false);
  assert.strictEqual(report.governance.productNormEligible, false);
  assert.strictEqual(report.governance.productIqUnlocked, false);
  assert.strictEqual(report.governance.autoCpiToIq, false);

  const serialized = JSON.stringify(report);
  assert.strictEqual(serialized.includes('sourceKey'), false);
  assert.strictEqual(serialized.includes('sessionId'), false);
})();

console.log('Calibration v11 post-failure DIF diagnostic validation PASS');
