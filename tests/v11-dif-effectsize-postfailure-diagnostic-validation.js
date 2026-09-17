'use strict';

const assert = require('assert');
const {
  VERSION,
  TARGET_SEED,
  TARGET_ANALYSIS_SEED,
  REFERENCE_R2_CHANGE,
  finiteOrNull,
  enrichReport,
  buildDryRun
} = require('../scripts/run-v11-dif-effectsize-postfailure-diagnostic.js');

(function validateSafeFiniteParsing() {
  assert.strictEqual(finiteOrNull(''), null);
  assert.strictEqual(finiteOrNull('   '), null);
  assert.strictEqual(finiteOrNull(null), null);
  assert.strictEqual(finiteOrNull(undefined), null);
  assert.strictEqual(finiteOrNull('0'), 0);
  assert.strictEqual(finiteOrNull('0.012'), 0.012);
})();

(function validateDryRunGovernance() {
  const dry = buildDryRun({ protocol: 'calibration/confirmatory-reliability-v11.json', outDir: '/tmp/test' });
  assert.strictEqual(VERSION, 'CIL-V11-DIF-EFFECTSIZE-POSTFAILURE-DIAGNOSTIC-2026.09.1');
  assert.strictEqual(dry.targetSeed, TARGET_SEED);
  assert.strictEqual(dry.targetAnalysisSeed, TARGET_ANALYSIS_SEED);
  assert.strictEqual(dry.referenceR2Change, REFERENCE_R2_CHANGE);
  assert.strictEqual(dry.governance.confirmatoryVerdictRemains, 'failed-confirmatory');
  assert.strictEqual(dry.governance.changesConfirmatoryVerdict, false);
  assert.strictEqual(dry.governance.thresholdChangesAllowed, false);
  assert.strictEqual(dry.governance.productNormEligible, false);
  assert.strictEqual(dry.governance.productIqUnlocked, false);
  assert.strictEqual(dry.governance.autoCpiToIq, false);
})();

(function validateSemanticSeparation() {
  const baseReport = {
    scope: {
      conditionId: 'high-information-control',
      replicate: 1,
      seed: TARGET_SEED,
      analysisSeed: TARGET_ANALYSIS_SEED,
      participants: 1200,
      itemDiscriminationMultiplier: 2
    },
    sourceEvidence: { confirmatoryVerdict: 'failed-confirmatory' },
    reproduction: {
      matchesSourceEvidence: true,
      difRows: 42,
      difFlags: 2,
      difFalsePositiveRate: 2 / 42,
      flaggedItems: [
        { itemId: 'i01', domain: 'fluid-reasoning', ageBands: [], correctRateRange: { min: 0.5, max: 0.6, spread: 0.1 } },
        { itemId: 'i02', domain: 'visual-spatial', ageBands: [], correctRateRange: { min: 0.5, max: 0.6, spread: 0.1 } }
      ]
    },
    generatorAudit: { explicitAgeTermInResponseProbability: false },
    governance: {
      postFailureDiagnosticOnly: true,
      confirmatoryVerdictRemains: 'failed-confirmatory',
      changesConfirmatoryVerdict: false,
      thresholdChangesAllowed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };

  const productionDifRows = [
    { itemId: 'i01', status: 'ok', difFlag: 'TRUE', difDeltaR2: '' },
    { itemId: 'i02', status: 'ok', difFlag: 'TRUE', difDeltaR2: '' }
  ];
  for (let i = 3; i <= 42; i++) {
    productionDifRows.push({ itemId: `i${String(i).padStart(2, '0')}`, status: 'ok', difFlag: 'FALSE', difDeltaR2: '' });
  }

  const items = productionDifRows.map((row, i) => ({
    itemId: row.itemId,
    domain: i === 0 ? 'fluid-reasoning' : 'visual-spatial',
    statisticalFlag: i < 2,
    chi12P: i < 2 ? 0.001 : 0.5,
    chi13P: i < 2 ? 0.002 : 0.5,
    chi23P: i < 2 ? 0.003 : 0.5,
    pseudo12McFadden: i === 0 ? 0.003 : 0.001,
    pseudo13McFadden: i === 0 ? 0.008 : (i === 1 ? 0.025 : 0.001),
    pseudo23McFadden: i === 0 ? 0.005 : 0.001,
    materialByMcFaddenR2: i === 1
  }));
  const effectReport = {
    method: { criterion: 'Chisqr', alpha: 0.01, pseudoR2: 'McFadden' },
    summary: {
      analyzedItems: 42,
      statisticalFlags: 2,
      materialByMcFaddenR2: 1,
      statisticalFlagRate: 2 / 42,
      materialByMcFaddenR2Rate: 1 / 42,
      statsExtractionComplete: true
    },
    items
  };

  const report = enrichReport(baseReport, productionDifRows, effectReport);
  assert.strictEqual(report.status, 'post-failure-effectsize-diagnostic-complete');
  assert.strictEqual(report.effectSizeAudit.productionDifDeltaR2AvailableItems, 0);
  assert.strictEqual(report.effectSizeAudit.productionDifDeltaR2MissingItems, 42);
  assert.strictEqual(report.effectSizeAudit.statisticalFlags, 2);
  assert.strictEqual(report.effectSizeAudit.materialByMcFaddenR2, 1);
  assert.strictEqual(report.effectSizeAudit.semantics.sameMeaning, false);
  assert.strictEqual(report.reproduction.flaggedItems[0].productionDifDeltaR2, null);
  assert.strictEqual(report.reproduction.flaggedItems[0].lordifStats.materialByMcFaddenR2, false);
  assert.strictEqual(report.reproduction.flaggedItems[1].lordifStats.materialByMcFaddenR2, true);
  assert.strictEqual(report.governance.confirmatoryVerdictRemains, 'failed-confirmatory');
  assert.strictEqual(report.governance.changesConfirmatoryVerdict, false);
  assert.strictEqual(report.governance.productIqUnlocked, false);

  const serialized = JSON.stringify(report);
  assert.strictEqual(serialized.includes('sourceKey'), false);
  assert.strictEqual(serialized.includes('sessionId'), false);
})();

console.log('Calibration v11 post-failure DIF effect-size diagnostic validation PASS');
