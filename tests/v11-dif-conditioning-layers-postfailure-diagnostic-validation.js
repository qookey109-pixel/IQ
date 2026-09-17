'use strict';

const assert = require('assert');
const {
  VERSION,
  TARGET_CONDITION_ID,
  TARGET_SEED,
  TARGET_ANALYSIS_SEED,
  buildDryRun,
  buildAggregate
} = require('../scripts/run-v11-dif-conditioning-layers-postfailure-diagnostic.js');

(function validateFrozenScope() {
  const dry = buildDryRun({ protocol: 'calibration/confirmatory-reliability-v11.json', outDir: '/tmp/test' });
  assert.strictEqual(VERSION, 'CIL-V11-DIF-CONDITIONING-LAYERS-POSTFAILURE-DIAGNOSTIC-2026.09.1');
  assert.strictEqual(dry.targetConditionId, TARGET_CONDITION_ID);
  assert.strictEqual(dry.targetSeed, TARGET_SEED);
  assert.strictEqual(dry.targetAnalysisSeed, TARGET_ANALYSIS_SEED);
  assert.strictEqual(dry.conditioningSources.length, 5);
  assert.strictEqual(dry.governance.confirmatoryVerdictRemains, 'failed-confirmatory');
  assert.strictEqual(dry.governance.changesConfirmatoryVerdict, false);
  assert.strictEqual(dry.governance.thresholdChangesAllowed, false);
  assert.strictEqual(dry.governance.productNormEligible, false);
  assert.strictEqual(dry.governance.productIqUnlocked, false);
  assert.strictEqual(dry.governance.autoCpiToIq, false);
})();

(function validateAggregate() {
  const base = {
    status: 'post-failure-conditioning-diagnostic-complete',
    scope: { conditionId: TARGET_CONDITION_ID, replicate: 1, seed: TARGET_SEED, analysisSeed: TARGET_ANALYSIS_SEED },
    sourceEvidence: { confirmatoryVerdict: 'failed-confirmatory' },
    finding: { classification: 'estimated-theta-conditioning-artifact-supported' },
    thetaRecoveryAudit: { maxAbsoluteAgeBandBiasZ: 0.05 },
    productionEffectSizeDefect: { difDeltaR2AvailableItems: 0, difDeltaR2MissingItems: 42, causalForV11Failure: false }
  };
  const layers = {
    complete: true,
    method: { criterion: 'Chisqr', alpha: 0.01, pseudoR2: 'McFadden', referenceR2Change: 0.02 },
    summary: {
      trueTheta: { materialByMcFaddenR2: 0 },
      pipelineEap: { materialByMcFaddenR2: 2 },
      lordifInitial: { materialByMcFaddenR2: 1 },
      lordifSparse: { materialByMcFaddenR2: 5 },
      lordifFinal: { materialByMcFaddenR2: 5 }
    },
    finding: {
      classification: 'lordif-purification-amplifies-estimated-theta-artifact',
      trueThetaMaterialFlags: 0,
      pipelineEapMaterialFlags: 2,
      lordifInitialMaterialFlags: 1,
      lordifSparseMaterialFlags: 5,
      lordifFinalMaterialFlags: 5
    },
    domains: { 'fluid-reasoning': { participants: 1200, items: 7 } }
  };
  const report = buildAggregate(base, layers);
  assert.strictEqual(report.status, 'post-failure-conditioning-layer-isolation-complete');
  assert.strictEqual(report.conditioningLayers.finding.trueThetaMaterialFlags, 0);
  assert.strictEqual(report.conditioningLayers.finding.lordifFinalMaterialFlags, 5);
  assert.strictEqual(report.governance.confirmatoryVerdictRemains, 'failed-confirmatory');
  assert.strictEqual(report.governance.changesConfirmatoryVerdict, false);
  assert.strictEqual(report.governance.thresholdChangesAllowed, false);
  assert.strictEqual(report.governance.productIqUnlocked, false);
  const serialized = JSON.stringify(report);
  assert.strictEqual(serialized.includes('sourceKey'), false);
  assert.strictEqual(serialized.includes('sessionId'), false);
})();

console.log('Calibration v11 post-failure DIF conditioning-layer isolation validation PASS');
