'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const POLICY = require('../calibration/v13-taiwan-activation-readiness-policy.json');
const TARGET = require('../calibration/v13-target-population-amendment.json');
const SCHEMA_PRIVACY = require('../calibration/v13-taiwan-schema-privacy-amendment.json');
const RECRUITMENT = require('../calibration/v13-taiwan-recruitment-consent-plan.json');
const ACTIVE_SCHEMA = require('../calibration/pooled-study-schema.json');
const PROPOSED_SCHEMA = require('../calibration/pooled-study-schema-v2-tw.proposed.json');

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) throw new Error('date must be YYYY-MM-DD');
  const d = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(d.getTime())) throw new Error('invalid date');
  return d;
}

function daysBetween(a, b) {
  return Math.floor((parseDate(b) - parseDate(a)) / 86400000);
}

function parseArgs(argv) {
  let asOf = POLICY.evaluation.ciAsOfDate;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--as-of') {
      asOf = argv[++i];
      if (!asOf) throw new Error('--as-of requires YYYY-MM-DD');
    }
  }
  parseDate(asOf);
  return { asOf };
}

function consentVersionFromFile() {
  const text = fs.readFileSync(path.join(ROOT, 'calibration', 'V13_TAIWAN_PARTICIPANT_CONSENT_ZH_HANT_TW.md'), 'utf8');
  const match = text.match(/CIL-V13-TW-CONSENT-\d{4}\.\d{2}\.\d+/);
  return match ? match[0] : null;
}

function evaluate(asOf) {
  const checks = {};
  const blockers = [];

  checks.authorityPins = (
    POLICY.authority.targetPopulationAmendmentBlobSha === gitBlobSha(path.join(ROOT, 'calibration', 'v13-target-population-amendment.json')) &&
    POLICY.authority.schemaPrivacyAmendmentBlobSha === gitBlobSha(path.join(ROOT, 'calibration', 'v13-taiwan-schema-privacy-amendment.json')) &&
    POLICY.authority.recruitmentConsentPlanBlobSha === gitBlobSha(path.join(ROOT, 'calibration', 'v13-taiwan-recruitment-consent-plan.json')) &&
    POLICY.authority.consentDraftBlobSha === gitBlobSha(path.join(ROOT, 'calibration', 'V13_TAIWAN_PARTICIPANT_CONSENT_ZH_HANT_TW.md')) &&
    POLICY.authority.proposedTaiwanSchemaBlobSha === gitBlobSha(path.join(ROOT, 'calibration', 'pooled-study-schema-v2-tw.proposed.json'))
  );

  checks.targetPopulationComplete = (
    TARGET.version === POLICY.requiredVersions.targetPopulationVersion &&
    TARGET.targetPopulation.complete === true &&
    TARGET.targetPopulation.jurisdiction === 'Taiwan' &&
    TARGET.targetPopulation.productionLanguageVersion === 'zh-Hant-TW'
  );

  const benchmarkAgeDays = daysBetween(TARGET.populationBenchmark.referenceDate, asOf);
  checks.benchmarkFresh = benchmarkAgeDays >= 0 && benchmarkAgeDays <= POLICY.evaluation.benchmarkMaximumAgeDays;

  checks.ethicsDeterminationResolved =
    POLICY.evaluation.acceptedEthicsDeterminationStates.includes(RECRUITMENT.ethicsGate.determinationStatus);

  checks.consentArtifactPinned = (
    RECRUITMENT.consent.version === POLICY.requiredVersions.participantConsentVersion &&
    consentVersionFromFile() === POLICY.requiredVersions.participantConsentVersion
  );

  checks.schemaPrivacyPinned =
    SCHEMA_PRIVACY.version === POLICY.requiredVersions.schemaPrivacyVersion;

  checks.proposedSchemaPinned =
    PROPOSED_SCHEMA.properties?.schemaVersion?.const === POLICY.requiredVersions.proposedSchemaVersion;

  checks.recruitmentConsentPlanPinned =
    RECRUITMENT.version === POLICY.requiredVersions.recruitmentConsentVersion;

  checks.retentionAndDeletionDefined = (
    Number.isInteger(RECRUITMENT.retentionAndDeletion.participantLevelRetentionYearsAfterStudyClosure) &&
    RECRUITMENT.retentionAndDeletion.participantLevelRetentionYearsAfterStudyClosure > 0 &&
    Number.isInteger(RECRUITMENT.retentionAndDeletion.deletionSlaCalendarDays) &&
    RECRUITMENT.retentionAndDeletion.deletionSlaCalendarDays > 0 &&
    RECRUITMENT.retentionAndDeletion.deletionRequestMustNotRequireNameEmailAccountOrGovernmentId === true
  );

  checks.activeRuntimeStillPreActivation = (
    ACTIVE_SCHEMA.properties?.schemaVersion?.const === POLICY.requiredVersions.expectedActiveSchemaVersionBeforeActivation &&
    RECRUITMENT.schemaActivationBoundary.schemaActivationAuthorized === false &&
    RECRUITMENT.schemaActivationBoundary.productionExporterModificationAuthorized === false &&
    RECRUITMENT.schemaActivationBoundary.poolingRuntimeModificationAuthorized === false &&
    RECRUITMENT.executionLock.recruitmentLaunchAuthorized === false &&
    RECRUITMENT.executionLock.consentPageActivationAuthorized === false &&
    RECRUITMENT.executionLock.realParticipantCollectionAuthorized === false &&
    RECRUITMENT.executionLock.participantDataAccessAuthorized === false &&
    RECRUITMENT.executionLock.phaseAAnalysisAuthorized === false &&
    RECRUITMENT.executionLock.phaseBCollectionAuthorized === false &&
    RECRUITMENT.executionLock.phaseBNormEstimationAuthorized === false &&
    RECRUITMENT.executionLock.backendCollectionAuthorized === false
  );

  checks.productGovernanceStillLocked = (
    RECRUITMENT.governance.autoPublishNorms === false &&
    RECRUITMENT.governance.autoCpiToIq === false &&
    RECRUITMENT.governance.productNormEligible === false &&
    RECRUITMENT.governance.productIqUnlocked === false &&
    RECRUITMENT.governance.populationNormClaimAllowedNow === false
  );

  for (const key of Object.keys(POLICY.hardRequirements)) {
    if (checks[key] !== true) blockers.push(key);
  }
  if (!checks.authorityPins) blockers.push('authorityPins');
  if (!checks.activeRuntimeStillPreActivation) blockers.push('activeRuntimeStillPreActivation');
  if (!checks.productGovernanceStillLocked) blockers.push('productGovernanceStillLocked');

  const status = blockers.length === 0
    ? POLICY.evaluation.readyStatus
    : POLICY.evaluation.blockedStatus;

  return {
    version: POLICY.version,
    asOf,
    benchmarkReferenceDate: TARGET.populationBenchmark.referenceDate,
    benchmarkAgeDays,
    benchmarkMaximumAgeDays: POLICY.evaluation.benchmarkMaximumAgeDays,
    status,
    checks,
    blockers,
    collectionAuthorized: false,
    recruitmentLaunchAuthorized: false,
    schemaActivationAuthorized: false,
    productIqUnlocked: false,
    note: status === POLICY.evaluation.readyStatus
      ? 'Design prerequisites pass. Separate explicit activation authorization is still required.'
      : 'At least one prerequisite is unresolved. No activation or collection is authorized.'
  };
}

function main(argv = process.argv.slice(2)) {
  const { asOf } = parseArgs(argv);
  const result = evaluate(asOf);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (require.main === module) main();

module.exports = { POLICY, parseDate, daysBetween, parseArgs, consentVersionFromFile, evaluate, main };
