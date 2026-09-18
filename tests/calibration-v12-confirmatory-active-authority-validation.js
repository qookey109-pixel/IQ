'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const runner = require('../scripts/run-v12-confirmatory.js');

const root = path.join(__dirname, '..');
const authorityPath = path.join(root, 'calibration', 'v12-confirmatory-execution-authority.json');
const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));

assert.strictEqual(authority.version, 'CIL-V12-CONFIRMATORY-EXECUTION-AUTHORITY-2026.09.1');
assert.strictEqual(authority.status, 'active-authorized-for-execution');
assert.strictEqual(authority.activationState, 'active');
assert.strictEqual(authority.executionAuthorized, true);
assert.strictEqual(authority.userAuthorizationRecorded, true);
assert.strictEqual(authority.executionScope, 'all-10-preregistered-replicates');
assert.strictEqual(authority.selectedMethod, 'domain-loo-eap-fixed-theta');
assert.strictEqual(authority.preregistrationBlobSha, 'edb01e1790bee7cb05f72578d9c501aa4e848ea2');
assert.strictEqual(authority.runnerBlobSha, '4e15ca5b94c3138239ae297d9450b1ed15e9f5ea');
assert.strictEqual(authority.analysisBlobSha, '7782586b3a5bc31a94e2204759c45702813ce545');

assert.strictEqual(authority.reservedDesign.cleanReplicates, 5);
assert.strictEqual(authority.reservedDesign.implantedReplicates, 5);
assert.strictEqual(authority.reservedDesign.participantsPerReplicate, 1200);
assert.strictEqual(authority.reservedDesign.targetItemsPerReplicate, 42);
assert.strictEqual(authority.reservedDesign.cleanMaximumReplicateDifFlagRate, 0.10);
assert.strictEqual(authority.reservedDesign.minimumAggregateImplantedDifSensitivity, 0.70);

for (const key of [
  'partialExecutionAllowed',
  'seedOverrideAllowed',
  'methodOverrideAllowed',
  'thresholdOverrideAllowed',
  'runnerUpFallbackAllowed',
  'partialRunInferenceAllowed'
]) {
  assert.strictEqual(authority.executionBoundary[key], false, key + ' must remain false');
}
for (const key of ['productNormEligible','productIqUnlocked','autoCpiToIq','autoPublishNorms']) {
  assert.strictEqual(authority.governance[key], false, key + ' must remain false');
}

const verified = runner.requireExecutionAuthority(authorityPath);
assert.strictEqual(verified.executionAuthorized, true);
assert.strictEqual(verified.userAuthorizationRecorded, true);

const plan = runner.makePlan(runner.parseArgs(['--dry-run', '--out', '/tmp/v12-confirmatory-authorized-dry']));
assert.strictEqual(plan.totalReplicates, 10);
assert.strictEqual(plan.participantsPerReplicate, 1200);
assert.strictEqual(plan.selectedMethod, 'domain-loo-eap-fixed-theta');
assert.deepStrictEqual(
  plan.replicates.map(x => x.seed),
  [
    'cil-v12-confirm-clean-r01',
    'cil-v12-confirm-clean-r02',
    'cil-v12-confirm-clean-r03',
    'cil-v12-confirm-clean-r04',
    'cil-v12-confirm-clean-r05',
    'cil-v12-confirm-implanted-r01',
    'cil-v12-confirm-implanted-r02',
    'cil-v12-confirm-implanted-r03',
    'cil-v12-confirm-implanted-r04',
    'cil-v12-confirm-implanted-r05'
  ]
);

console.log('Calibration v12 active confirmatory authority validation PASS');
