'use strict';

const fs = require('fs');

const TEMPLATE = require('../calibration/v13-taiwan-board-verification-response.template.json');
const MATRIX = require('../calibration/v13-taiwan-irb-rec-candidate-matrix.json');

function present(v) {
  return typeof v === 'string' ? v.trim().length > 0 : v != null;
}

function hasEvidence(v) {
  return Array.isArray(v?.evidence?.publicOfficialUrls) && v.evidence.publicOfficialUrls.some(present) ||
    present(v?.evidence?.privateBoardReplyRecordReference);
}

function validate(v) {
  const errors = [];
  const boardIds = new Set(MATRIX.candidates.map(c => c.id));

  if (v.status !== 'unverified-template' && !present(v.boardId)) errors.push('boardId required');
  if (present(v.boardId) && !boardIds.has(v.boardId)) errors.push('boardId must exist in candidate matrix');
  if (v.evidence?.phoneOnlyEvidenceAllowedForFreeze !== false) errors.push('phone-only evidence may not freeze verification');
  if (v.selection?.selected !== false) errors.push('board selection must remain false');
  if (v.selection?.selectionAuthorized !== false) errors.push('selection authorization must remain false');
  if (v.contactAndSubmission?.contactAuthorized !== false) errors.push('contact authorization must remain false in response template');
  if (v.contactAndSubmission?.submissionAuthorized !== false) errors.push('submission authorization must remain false');
  for (const key of ['realParticipantCollectionAuthorized','recruitmentLaunchAuthorized','participantDataAccessAuthorized']) {
    if (v.collection?.[key] !== false) errors.push(key + ' must remain false');
  }

  const anyPositiveVerification = [
    v.availability?.acceptingNewExternalSubmissions,
    v.intake?.unaffiliatedIndividualAccepted,
    v.scope?.onlineNonclinicalPsychometricStudyAccepted,
    v.scope?.publicWebRecruitmentAccepted,
    v.review?.applicabilityDeterminationServiceAvailable,
    v.review?.currentFeeVerified,
    v.training?.requirementsVerified,
    v.submissionProcess?.currentFormsAndSystemVerified,
    v.privacyAndConsent?.additionalRequirementsVerified
  ].some(x => x === true);

  if (anyPositiveVerification && !hasEvidence(v)) errors.push('positive verification requires official URL or private board reply record');

  return {
    valid: errors.length === 0,
    errors,
    boardSelectable: false,
    contactAuthorized: false,
    submissionAuthorized: false,
    collectionAuthorized: false
  };
}

function main(argv = process.argv.slice(2)) {
  let input = null;
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--input') input = argv[++i];
  const doc = input ? JSON.parse(fs.readFileSync(input, 'utf8')) : TEMPLATE;
  const result = validate(doc);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (require.main === module) main();
module.exports = { TEMPLATE, MATRIX, present, hasEvidence, validate, main };
