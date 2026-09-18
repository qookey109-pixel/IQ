'use strict';

const assert = require('assert');
const {
  VERSION,
  CANDIDATES,
  parseArgs,
  validateProtocol,
  generatePanel,
  makePlan,
  chooseMethod
} = require('../scripts/run-v12-dif-matching-development.js');

(function protocolAndCli() {
  const protocol = validateProtocol();
  assert.strictEqual(VERSION, 'CIL-V12-DIF-MATCHING-DEVELOPMENT-2026.09.1');
  assert.deepStrictEqual(CANDIDATES, [
    'domain-loo-eap-fixed-theta',
    'crossfit-six-factor-map-fixed-theta'
  ]);
  assert.strictEqual(protocol.version, 'CIL-V12-DIF-MATCHING-2026.09.2');
  const smoke = parseArgs(['--replicates','1','--participants','300','--targets-per-domain','1','--out','/tmp/v12']);
  assert.strictEqual(smoke.replicates, 1);
  assert.strictEqual(smoke.participants, 300);
  assert.strictEqual(smoke.targetsPerDomain, 1);
})();

(function syntheticPanels() {
  const clean = generatePanel('clean', 20, 'v12-test-clean');
  const implanted = generatePanel('implanted', 20, 'v12-test-implanted');

  assert.strictEqual(clean.rows.length, 20 * 42);
  assert.strictEqual(implanted.rows.length, 20 * 42);
  assert.strictEqual(clean.itemTruth.length, 42);
  assert.strictEqual(implanted.itemTruth.length, 42);
  assert.strictEqual(clean.itemTruth.filter(x => x.ageDif > 0).length, 0);
  assert.strictEqual(implanted.itemTruth.filter(x => x.ageDif > 0).length, 6);
  assert.strictEqual(clean.manifest.productIqUnlocked, false);
  assert.strictEqual(implanted.manifest.productIqUnlocked, false);
})();

(function planningIsolation() {
  const smoke = makePlan({
    replicates: 1,
    participants: 300,
    targetsPerDomain: 1,
    outDir: '/tmp/v12-smoke'
  });
  assert.strictEqual(smoke.selectionEligible, false);
  assert.strictEqual(smoke.replicates.length, 2);
  assert.ok(smoke.replicates.every(x => x.seed.startsWith('cil-v12-dev-')));
  assert.ok(smoke.replicates.every(x => !x.seed.startsWith('cil-v12-confirm-')));

  const full = makePlan({
    replicates: 5,
    participants: 1200,
    targetsPerDomain: 7,
    outDir: '/tmp/v12-full'
  });
  assert.strictEqual(full.selectionEligible, true);
  assert.strictEqual(full.replicates.length, 10);
  assert.strictEqual(full.governance.confirmatorySeedsUsed, false);
  assert.strictEqual(full.governance.productNormEligible, false);
  assert.strictEqual(full.governance.productIqUnlocked, false);
  assert.strictEqual(full.governance.autoCpiToIq, false);
})();

function mockAggregate(looClean, looSensitivity, mapClean, mapSensitivity) {
  function entry(clean, sens) {
    return {
      clean: {
        complete: true,
        maximumReplicateDifFalsePositiveRate: clean
      },
      implanted: {
        complete: true,
        implantedDifSensitivity: sens
      }
    };
  }
  const loo = entry(looClean, looSensitivity);
  const map = entry(mapClean, mapSensitivity);
  return {
    clean: {
      'domain-loo-eap-fixed-theta': loo.clean,
      'crossfit-six-factor-map-fixed-theta': map.clean
    },
    implanted: {
      'domain-loo-eap-fixed-theta': loo.implanted,
      'crossfit-six-factor-map-fixed-theta': map.implanted
    }
  };
}

(function deterministicSelection() {
  const fail = chooseMethod(mockAggregate(0.11, 0.80, 0.09, 0.60), true);
  assert.strictEqual(fail.status, 'v12-method-selection-failed');
  assert.strictEqual(fail.selectedMethod, null);

  const mapWins = chooseMethod(mockAggregate(0.10, 0.70, 0.08, 0.70), true);
  assert.strictEqual(mapWins.selectedMethod, 'crossfit-six-factor-map-fixed-theta');

  const looWinsTie = chooseMethod(mockAggregate(0.08, 0.75, 0.08, 0.75), true);
  assert.strictEqual(looWinsTie.selectedMethod, 'domain-loo-eap-fixed-theta');

  const smoke = chooseMethod(mockAggregate(0.01, 1, 0.01, 1), false);
  assert.strictEqual(smoke.status, 'not-eligible-smoke');
  assert.strictEqual(smoke.selectedMethod, null);
})();

console.log('Calibration v12 DIF matching development harness validation PASS');
