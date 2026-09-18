'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const runner = require('../scripts/run-v12-confirmatory.js');
const prereg = require('../calibration/v12-confirmatory-preregistration.json');

assert.strictEqual(runner.VERSION, 'CIL-V12-CONFIRMATORY-RUNNER-2026.09.1');
assert.strictEqual(runner.SELECTED_METHOD, 'domain-loo-eap-fixed-theta');
runner.validatePreregistration();

const args = runner.parseArgs(['--dry-run', '--out', '/tmp/v12-confirmatory-dry']);
const plan = runner.makePlan(args);
assert.strictEqual(plan.totalReplicates, 10);
assert.strictEqual(plan.participantsPerReplicate, 1200);
assert.strictEqual(plan.targetsPerDomain, 7);
assert.strictEqual(plan.selectedMethod, 'domain-loo-eap-fixed-theta');
assert.strictEqual(plan.executionAuthorityRequired, true);
assert.strictEqual(plan.governance.executionAuthorized, false);
assert.strictEqual(plan.governance.confirmatorySeedsConsumed, false);
assert.strictEqual(plan.governance.productIqUnlocked, false);
assert.deepStrictEqual(
  plan.replicates.map(x => x.seed),
  prereg.design.cleanPanel.reservedSeeds.concat(prereg.design.implantedDifPanel.reservedSeeds)
);

assert.throws(
  () => runner.parseArgs(['--panel', 'clean']),
  /Unsupported argument/,
  'Subset execution flags must be rejected'
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v12-confirmatory-guard-'));
const missingAuthority = path.join(tmp, 'missing-authority.json');
assert.throws(
  () => runner.requireExecutionAuthority(missingAuthority),
  /execution authority file is absent/
);

const outDir = path.join(tmp, 'forbidden-output');
const proc = spawnSync(process.execPath, [
  'scripts/run-v12-confirmatory.js',
  '--out', outDir,
  '--authority', missingAuthority
], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
assert.notStrictEqual(proc.status, 0, 'Execution without authority must fail');
assert.match((proc.stderr || '') + (proc.stdout || ''), /execution authority file is absent/);
assert.strictEqual(fs.existsSync(outDir), false, 'Guard failure must occur before output/data creation');

const analysisSource = fs.readFileSync(
  path.join(__dirname, '..', 'calibration', 'analysis', 'v12_dif_confirmatory_selected.R'),
  'utf8'
);
assert.match(analysisSource, /domain-loo-eap-fixed-theta/);
assert.doesNotMatch(analysisSource, /crossfit-six-factor-map-fixed-theta/);
assert.doesNotMatch(analysisSource, /lordif-iterative-current/);

for (const key of ['productNormEligible','productIqUnlocked','autoCpiToIq']) {
  assert.strictEqual(prereg.governance[key], false);
}

console.log('Calibration v12 confirmatory runner guard validation PASS');
