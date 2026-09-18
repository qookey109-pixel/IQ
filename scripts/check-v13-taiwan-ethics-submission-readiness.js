'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ADMIN = require('../calibration/v13-taiwan-ethics-submission-administration.json');
const PACKET = require('../calibration/v13-taiwan-ethics-applicability-packet.json');
const INTAKE = require('../calibration/v13-taiwan-ethics-decision-intake.template.json');

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function evaluateSubmissionReadiness() {
  const fields = ADMIN.submissionAdministration;
  const required = [
    'principalInvestigatorLegalName',
    'principalInvestigatorTitleOrRole',
    'researchInstitutionOrUnaffiliatedInvestigatorRoute',
    'selectedQualifiedIrborRec',
    'officialResearchContact',
    'officialDataRightsContact',
    'fundingSourceOrNoFundingDeclaration',
    'conflictOfInterestDeclaration',
    'submissionPortalOrMethod'
  ];
  const missing = required.filter(key => !nonEmpty(fields[key]));
  if (fields.submissionFeeReviewed !== true) missing.push('submissionFeeReviewed');
  if (fields.institutionalAuthorizationIfRequired == null) missing.push('institutionalAuthorizationIfRequired');

  const authorityPinsOk =
    ADMIN.authority.ethicsApplicabilityPacketBlobSha === gitBlobSha(path.join(ROOT, 'calibration', 'v13-taiwan-ethics-applicability-packet.json')) &&
    ADMIN.authority.ethicsDeterminationRequestBlobSha === gitBlobSha(path.join(ROOT, 'calibration', 'V13_TAIWAN_ETHICS_DETERMINATION_REQUEST_ZH_HANT_TW.md'));

  return {
    status: missing.length === 0 && authorityPinsOk ? 'SUBMISSION_ADMIN_READY' : 'NOT_SUBMISSION_READY',
    authorityPinsOk,
    missing,
    submissionAuthorized: false,
    collectionAuthorized: false
  };
}

function validateDecisionIntake(intake = INTAKE) {
  const allowed = new Set(['unset', ...ADMIN.decisionIntake.allowedResolvedStatuses]);
  const errors = [];
  if (!allowed.has(intake.status)) errors.push('unsupported status');

  const resolved = ADMIN.decisionIntake.allowedResolvedStatuses.includes(intake.status);
  if (resolved) {
    if (intake.externalDecisionEvidence?.received !== true) errors.push('external decision evidence required');
    for (const key of ['reviewBoard','referenceNumber','decisionDate']) {
      if (!nonEmpty(intake[key])) errors.push(key + ' required for resolved status');
    }
    for (const key of ['decisionDocumentSha256','decisionDocumentLocalRecordReference']) {
      if (!nonEmpty(intake.externalDecisionEvidence?.[key])) errors.push(key + ' required for resolved status');
    }
    if (nonEmpty(intake.externalDecisionEvidence?.decisionDocumentSha256) &&
        !/^[a-f0-9]{64}$/i.test(intake.externalDecisionEvidence.decisionDocumentSha256)) {
      errors.push('decisionDocumentSha256 must be SHA-256 hex');
    }
  } else {
    if (intake.externalDecisionEvidence?.received !== false) errors.push('unset status must not claim received evidence');
  }

  for (const key of ['realParticipantCollectionAuthorized','recruitmentLaunchAuthorized','participantDataAccessAuthorized','schemaActivationAuthorized']) {
    if (intake.collectionAuthorization?.[key] !== false) errors.push(key + ' must remain false in decision intake');
  }
  if (intake.externalDecisionEvidence?.publicGitCommitAllowed !== false) errors.push('decision document public Git commit must remain false');

  return {
    valid: errors.length === 0,
    errors,
    resolved,
    collectionAuthorized: false
  };
}

function main() {
  const result = {
    submission: evaluateSubmissionReadiness(),
    intakeTemplate: validateDecisionIntake()
  };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (require.main === module) main();

module.exports = { evaluateSubmissionReadiness, validateDecisionIntake, main };
