'use strict';

const assert = require('assert');
const {
  VERSION,
  TARGET_CONDITION_ID,
  TARGET_SEED,
  TARGET_ANALYSIS_SEED,
  finiteOrNull,
  correlation,
  standardize,
  truthRowsToCsv,
  estimatedThetaValue,
  buildThetaAudit,
  classifyConditioningFinding,
  buildDryRun
} = require('../scripts/run-v11-dif-conditioning-postfailure-diagnostic.js');

(function validateFrozenScope() {
  const dry = buildDryRun({ protocol: 'calibration/confirmatory-reliability-v11.json', outDir: '/tmp/test' });
  assert.strictEqual(VERSION, 'CIL-V11-DIF-CONDITIONING-POSTFAILURE-DIAGNOSTIC-2026.09.1');
  assert.strictEqual(dry.targetConditionId, TARGET_CONDITION_ID);
  assert.strictEqual(dry.targetSeed, TARGET_SEED);
  assert.strictEqual(dry.targetAnalysisSeed, TARGET_ANALYSIS_SEED);
  assert.strictEqual(dry.governance.confirmatoryVerdictRemains, 'failed-confirmatory');
  assert.strictEqual(dry.governance.changesConfirmatoryVerdict, false);
  assert.strictEqual(dry.governance.thresholdChangesAllowed, false);
  assert.strictEqual(dry.governance.productNormEligible, false);
  assert.strictEqual(dry.governance.productIqUnlocked, false);
  assert.strictEqual(dry.governance.autoCpiToIq, false);
})();

(function validateHelpers() {
  assert.strictEqual(finiteOrNull(''), null);
  assert.strictEqual(finiteOrNull('0.5'), 0.5);
  assert.ok(Math.abs(correlation([1, 2, 3], [2, 4, 6]) - 1) < 1e-12);
  const z = standardize([1, 2, 3]);
  assert.ok(Math.abs(z[1]) < 1e-12);
  assert.strictEqual(estimatedThetaValue({ F1: '0.25' }), 0.25);
  assert.strictEqual(estimatedThetaValue({ theta: '-0.4' }), -0.4);
  assert.strictEqual(classifyConditioningFinding(5, 0), 'estimated-theta-conditioning-artifact-supported');
  assert.strictEqual(classifyConditioningFinding(5, 2), 'estimated-theta-conditioning-contributes');
  assert.strictEqual(classifyConditioningFinding(5, 5), 'estimated-theta-conditioning-not-sufficient');
})();

(function validateTruthCsvAndThetaAudit() {
  const participants = [
    {
      sourceKey: 'p1', ageYears: 20, ageBand: '18–24',
      syntheticDomainTheta: {
        'verbal-comprehension': -1,
        'fluid-reasoning': -1,
        'visual-spatial': -1,
        'working-memory': -1,
        'processing-speed': -1,
        'quantitative-reasoning': -1
      }
    },
    {
      sourceKey: 'p2', ageYears: 30, ageBand: '25–34',
      syntheticDomainTheta: {
        'verbal-comprehension': 0,
        'fluid-reasoning': 0,
        'visual-spatial': 0,
        'working-memory': 0,
        'processing-speed': 0,
        'quantitative-reasoning': 0
      }
    },
    {
      sourceKey: 'p3', ageYears: 40, ageBand: '35–44',
      syntheticDomainTheta: {
        'verbal-comprehension': 1,
        'fluid-reasoning': 1,
        'visual-spatial': 1,
        'working-memory': 1,
        'processing-speed': 1,
        'quantitative-reasoning': 1
      }
    }
  ];
  const csv = truthRowsToCsv(participants);
  assert.ok(csv.includes('sourceKey,domain,trueTheta'));
  assert.ok(csv.includes('p1,verbal-comprehension,-1'));

  const estimatedRows = [];
  for (const p of participants) {
    for (const domain of Object.keys(p.syntheticDomainTheta)) {
      estimatedRows.push({ sourceKey: p.sourceKey, domain, F1: String(p.syntheticDomainTheta[domain]) });
    }
  }
  const audit = buildThetaAudit(participants, estimatedRows);
  assert.strictEqual(audit.domains['verbal-comprehension'].matchedParticipants, 3);
  assert.ok(Math.abs(audit.domains['verbal-comprehension'].trueVsEstimatedThetaCorrelation - 1) < 1e-12);
  assert.ok(audit.maxAbsoluteAgeBandBiasZ < 1e-12);
})();

console.log('Calibration v11 post-failure DIF conditioning diagnostic validation PASS');
