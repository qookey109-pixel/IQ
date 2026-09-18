'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');

const result = JSON.parse(fs.readFileSync('calibration/v12-dif-matching-development-result.json', 'utf8'));
const freeze = JSON.parse(fs.readFileSync('calibration/v12-dif-matching-method-freeze.json', 'utf8'));
const protocol = JSON.parse(fs.readFileSync('calibration/v12-dif-matching-protocol.json', 'utf8'));

function gitBlobSha(path) {
  const content = fs.readFileSync(path);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

assert.strictEqual(result.status, 'complete-development');
assert.strictEqual(result.authority.executionCommit, '6b90d4855eac8ed37ff14f435470a4615184cae0');
assert.strictEqual(result.authority.workflowRunId, 35320435949);
assert.strictEqual(result.selection.status, 'method-selected-development');
assert.strictEqual(result.selection.selectedMethod, 'domain-loo-eap-fixed-theta');
assert.strictEqual(result.candidates['domain-loo-eap-fixed-theta'].pass, true);
assert.strictEqual(result.candidates['crossfit-six-factor-map-fixed-theta'].pass, true);

assert.strictEqual(
  result.candidates['domain-loo-eap-fixed-theta'].cleanMaximumReplicateFalsePositiveRate,
  0.0714
);
assert.strictEqual(
  result.candidates['crossfit-six-factor-map-fixed-theta'].cleanMaximumReplicateFalsePositiveRate,
  0.0714
);
assert.strictEqual(
  result.candidates['domain-loo-eap-fixed-theta'].implantedDifSensitivity,
  result.candidates['crossfit-six-factor-map-fixed-theta'].implantedDifSensitivity
);
assert.ok(result.candidates['domain-loo-eap-fixed-theta'].implantedDifSensitivity >= 0.70);

assert.strictEqual(freeze.status, 'development-method-frozen-confirmatory-locked');
assert.strictEqual(freeze.selectedMethod.id, 'domain-loo-eap-fixed-theta');
assert.strictEqual(freeze.confirmatory.executionAuthorized, false);
assert.strictEqual(freeze.confirmatory.seedsUsed, false);
assert.strictEqual(freeze.confirmatory.runnerUpFallbackAllowed, false);
assert.strictEqual(freeze.confirmatory.postExecutionThresholdChangesAllowed, false);
assert.strictEqual(freeze.confirmatory.separateAuthorizationRequired, true);

assert.strictEqual(protocol.fixedDifSettings.maximumCleanPanelDifFlagRate, 0.10);
assert.strictEqual(protocol.selectionRule.minimumAggregateImplantedDifSensitivity, 0.70);
assert.strictEqual(protocol.historicalBoundary.v11Verdict, 'failed-confirmatory');

assert.strictEqual(gitBlobSha('calibration/v12-dif-matching-protocol.json'), freeze.selectionAuthority.protocolBlobSha);
assert.strictEqual(gitBlobSha('calibration/analysis/v12_dif_matching_compare.R'), freeze.selectionAuthority.analysisBlobSha);
assert.strictEqual(gitBlobSha('scripts/run-v12-dif-matching-development.js'), freeze.selectionAuthority.developmentRunnerBlobSha);
assert.strictEqual(gitBlobSha('scripts/aggregate-v12-dif-matching-development.js'), freeze.selectionAuthority.aggregatorBlobSha);
assert.strictEqual(gitBlobSha('calibration/v12-dif-matching-development-result.json'), freeze.selectionAuthority.resultBlobSha);

for (const key of ['productNormEligible','productIqUnlocked','autoCpiToIq']) {
  assert.strictEqual(result.governance[key], false, key + ' must remain false');
  assert.strictEqual(freeze.governance[key], false, key + ' must remain false');
}

console.log('Calibration v12 method freeze validation PASS');
