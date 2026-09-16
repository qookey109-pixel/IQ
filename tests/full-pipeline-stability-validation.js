'use strict';
const assert = require('assert');
const { DOMAINS, parseArgs, metricSummary, summarizeReports } = require('../scripts/run-full-pipeline-stability.js');

const args = parseArgs(['--replicates','5','--participants','1200','--seed-prefix','new-seeds','--out','/tmp/x','--dry-run']);
assert.strictEqual(args.replicates, 5);
assert.strictEqual(args.participants, 1200);
assert.strictEqual(args.seedPrefix, 'new-seeds');
assert.throws(() => parseArgs(['--seed-prefix','cil-v10-ci']), /distinct from the development seed/);
assert.deepStrictEqual(metricSummary([1,2,3]), { mean: 2, min: 1, max: 3 });

function report(seed, delta = 0) {
  const reliability = Object.fromEntries(DOMAINS.map((d, i) => [d, {
    alphaRaw: 0.60 + i * 0.001 + delta,
    omegaTotal: 0.61 + i * 0.001 + delta,
    omegaHierarchical: 0.605 + i * 0.001 + delta
  }]));
  return {
    status: 'complete-diagnostic',
    configuration: { seed, analysisSeed: 100 + Math.round(delta * 1000) },
    recovery: {
      reliability,
      cfaInvariance: { configural: { cfi: 0.99, rmsea: 0.02 }, delta: { metricVsConfiguralCFI: 0, scalarVsMetricCFI: 0 } },
      generalTheta: { correlationWithTrueG: 0.87 + delta, standardizedRmseVsTrueG: 0.50 },
      norming: { bandMeanRecoveryRmse: 0.03 },
      externalLinking: { pearsonR: 0.93, cpiSlopeBias: 0.001, ageSlopeBias: -0.002 },
      cleanPanelDif: { falsePositiveRate: 0 }
    },
    gates: { allStructuralChecksPassed: true, productNormEligible: false, productIqUnlocked: false, autoCpiToIq: false },
    safety: { containsRealParticipants: false, syntheticOnly: true }
  };
}
const reports = [0,1,2,3,4].map(i => report(`seed-${i}`, i * 0.001));
const summary = summarizeReports(reports, { replicates: 5, participants: 1200, seedPrefix: 'new-seeds' });
assert.strictEqual(summary.status, 'complete-diagnostic');
assert.strictEqual(summary.replicates.length, 5);
assert.strictEqual(Object.keys(summary.aggregate.reliability).length, 6);
assert(summary.aggregate.generalThetaCorrelationWithTrueG.mean > 0.87);
assert.strictEqual(summary.gates.scientificThresholdsPreRegistered, false);
assert.strictEqual(summary.gates.productIqUnlocked, false);
assert.strictEqual(summary.safety.containsRealParticipants, false);
console.log('Calibration v10 multi-seed stability harness validation PASS');
