'use strict';

const assert = require('assert');
const guard = require('../scripts/check-v13-taiwan-activation-readiness.js');

const now = guard.evaluate('2026-09-19');
assert.strictEqual(now.status, 'NOT_READY');
assert.strictEqual(now.checks.authorityPins, true);
assert.strictEqual(now.checks.targetPopulationComplete, true);
assert.strictEqual(now.checks.benchmarkFresh, true);
assert.strictEqual(now.checks.ethicsDeterminationResolved, false);
assert.strictEqual(now.checks.consentArtifactPinned, true);
assert.strictEqual(now.checks.schemaPrivacyPinned, true);
assert.strictEqual(now.checks.proposedSchemaPinned, true);
assert.strictEqual(now.checks.recruitmentConsentPlanPinned, true);
assert.strictEqual(now.checks.retentionAndDeletionDefined, true);
assert.strictEqual(now.checks.activeRuntimeStillPreActivation, true);
assert.strictEqual(now.checks.productGovernanceStillLocked, true);
assert.deepStrictEqual(now.blockers, ['ethicsDeterminationResolved']);
assert.strictEqual(now.collectionAuthorized, false);
assert.strictEqual(now.recruitmentLaunchAuthorized, false);
assert.strictEqual(now.schemaActivationAuthorized, false);
assert.strictEqual(now.productIqUnlocked, false);

const boundary = guard.evaluate('2026-12-29');
assert.strictEqual(boundary.benchmarkAgeDays, 120);
assert.strictEqual(boundary.checks.benchmarkFresh, true);

const expired = guard.evaluate('2026-12-30');
assert.strictEqual(expired.benchmarkAgeDays, 121);
assert.strictEqual(expired.checks.benchmarkFresh, false);
assert.strictEqual(expired.status, 'NOT_READY');
assert.strictEqual(expired.blockers.includes('benchmarkFresh'), true);
assert.strictEqual(expired.collectionAuthorized, false);

assert.strictEqual(guard.POLICY.evaluation.authorizedStatusExists, false);

console.log('Calibration v13 Taiwan activation-readiness guard validation PASS');
