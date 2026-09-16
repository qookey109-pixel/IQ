'use strict';

const assert = require('assert');
const fs = require('fs');
const {
  VERSION,
  PREREGISTRATION_COMMIT,
  PREREGISTRATION_SHA256,
  sha256,
  loadProtocol,
  generateProfiledSynthetic,
  classifyReport,
  aggregateResults
} = require('../scripts/run-confirmatory-reliability-v11.js');

const protocolPath = 'calibration/confirmatory-reliability-v11.json';
const protocolText = fs.readFileSync(protocolPath, 'utf8');
const protocol = loadProtocol(protocolPath);

(function validateFrozenProtocol() {
  assert.strictEqual(VERSION, 'CIL-V11-RELIABILITY-SCREEN-2026.09.1');
  assert.strictEqual(PREREGISTRATION_COMMIT, 'e1428b44167cfd2d8f882b11d417b6e8789f8223');
  assert.strictEqual(sha256(protocolText), PREREGISTRATION_SHA256);
  assert.strictEqual(protocol.design.replicatesPerCondition, 3);
  assert.strictEqual(protocol.design.participantsPerReplicate, 1200);
  assert.strictEqual(protocol.acceptance.minimumOmegaTotal, 0.70);
  assert.strictEqual(protocol.governance.productNormEligible, false);
  assert.strictEqual(protocol.governance.productIqUnlocked, false);
  assert.strictEqual(protocol.governance.autoCpiToIq, false);
})();

(function validateSyntheticControls() {
  const weak = protocol.design.conditions.find(x => x.id === 'weak-control');
  const strong = protocol.design.conditions.find(x => x.id === 'high-information-control');
  const a = generateProfiledSynthetic({ participants: 20, seed: 'v11-test', condition: weak });
  const b = generateProfiledSynthetic({ participants: 20, seed: 'v11-test', condition: strong });
  assert.strictEqual(a.rows.length, 20 * 42);
  assert.strictEqual(b.rows.length, 20 * 42);
  assert.strictEqual(a.manifest.administeredUniqueItems, 42);
  assert.strictEqual(b.manifest.administeredUniqueItems, 42);
  assert.deepStrictEqual(a.manifest.administeredControlledDefects, []);
  assert.deepStrictEqual(b.manifest.administeredControlledDefects, []);
  assert.strictEqual(a.manifest.itemDiscriminationMultiplier, 1);
  assert.strictEqual(b.manifest.itemDiscriminationMultiplier, 2);
})();

function mockReport(omega, difRate = 0.05) {
  return {
    status: 'complete-diagnostic',
    configuration: { seed: 'mock-seed', analysisSeed: 123 },
    recovery: {
      reliability: Object.fromEntries([
        'verbal-comprehension',
        'fluid-reasoning',
        'visual-spatial',
        'working-memory',
        'processing-speed',
        'quantitative-reasoning'
      ].map(domain => [domain, { omegaTotal: omega }])),
      cfaInvariance: {
        configural: { cfi: 0.95, rmsea: 0.05 },
        delta: { metricVsConfiguralCFI: 0.005, scalarVsMetricCFI: 0.004 }
      },
      cleanPanelDif: { falsePositiveRate: difRate }
    },
    gates: {
      allStructuralChecksPassed: true,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    },
    safety: {
      syntheticOnly: true,
      containsRealParticipants: false,
      autoPublishNorms: false,
      autoConvertCpiToIq: false,
      productNormEligible: false,
      productIqUnlocked: false
    }
  };
}

(function validateClassificationLogic() {
  const weak = protocol.design.conditions.find(x => x.id === 'weak-control');
  const strong = protocol.design.conditions.find(x => x.id === 'high-information-control');

  const weakRow = classifyReport(mockReport(0.60), protocol, weak);
  assert.strictEqual(weakRow.reliabilityScreenPass, false);
  assert.strictEqual(weakRow.reliabilityClassificationMatched, true);
  assert.strictEqual(weakRow.cfaScreenPass, true);
  assert.strictEqual(weakRow.cleanDifScreenPass, true);
  assert.strictEqual(weakRow.locksClosed, true);

  const strongRow = classifyReport(mockReport(0.75), protocol, strong);
  assert.strictEqual(strongRow.reliabilityScreenPass, true);
  assert.strictEqual(strongRow.reliabilityClassificationMatched, true);

  const badStrong = classifyReport(mockReport(0.60), protocol, strong);
  assert.strictEqual(badStrong.reliabilityClassificationMatched, false);
})();

(function validateAggregateLogic() {
  const weak = protocol.design.conditions.find(x => x.id === 'weak-control');
  const strong = protocol.design.conditions.find(x => x.id === 'high-information-control');
  const weakRow = classifyReport(mockReport(0.60), protocol, weak);
  const strongRow = classifyReport(mockReport(0.75), protocol, strong);

  const pass = aggregateResults(protocol, {
    'weak-control': [weakRow, weakRow, weakRow],
    'high-information-control': [strongRow, strongRow, strongRow]
  });
  assert.strictEqual(pass.status, 'complete-confirmatory');
  assert.strictEqual(pass.gates.allReliabilityClassificationsMatch, true);
  assert.strictEqual(pass.gates.productIqUnlocked, false);

  const fail = aggregateResults(protocol, {
    'weak-control': [weakRow, weakRow, weakRow],
    'high-information-control': [strongRow, strongRow, classifyReport(mockReport(0.60), protocol, strong)]
  });
  assert.strictEqual(fail.status, 'failed-confirmatory');
})();

console.log('Calibration v11 confirmatory reliability-screen validation PASS');
