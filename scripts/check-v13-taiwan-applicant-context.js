'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const POLICY = require('../calibration/v13-taiwan-applicant-context-readiness-policy.json');
const TEMPLATE = require('../calibration/v13-taiwan-applicant-context-intake.template.json');

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

function get(obj, dotted) {
  return dotted.split('.').reduce((v, k) => (v == null ? undefined : v[k]), obj);
}

function present(value) {
  return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

function validateContext(doc) {
  const errors = [];
  const missing = [];

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) errors.push('context must be an object');
  if (doc?.privacy?.publicGitStorageAllowedForCompletedRecord !== false) errors.push('completed applicant context must not be allowed in public Git');
  if (doc?.privacy?.completedRecordMustRemainPrivate !== true) errors.push('completed applicant context must remain private');

  for (const field of POLICY.minimumRequiredFields) {
    if (!present(get(doc, field))) missing.push(field);
  }

  const route = doc?.principalInvestigator?.route;
  if (present(route) && !POLICY.allowedPiRoutes.includes(route)) errors.push('unsupported principalInvestigator.route');
  if (route && POLICY.conditionalRequirements[route]) {
    for (const field of POLICY.conditionalRequirements[route]) {
      if (!present(get(doc, field))) missing.push(field);
    }
  }

  const funding = doc?.funding?.declaration;
  if (present(funding) && !POLICY.allowedFundingDeclarations.includes(funding)) errors.push('unsupported funding.declaration');
  if (funding === 'external-funded' && !present(doc?.funding?.funderLegalNameIfApplicable)) {
    missing.push('funding.funderLegalNameIfApplicable');
  }

  const coi = doc?.conflictOfInterest?.declaration;
  if (present(coi) && !POLICY.allowedConflictDeclarations.includes(coi)) errors.push('unsupported conflictOfInterest.declaration');
  if (coi === 'declared-see-private-record' && !present(doc?.conflictOfInterest?.privateDetailsRecordReferenceIfApplicable)) {
    missing.push('conflictOfInterest.privateDetailsRecordReferenceIfApplicable');
  }

  if (doc?.boardSelection?.selectedBoard != null) errors.push('selectedBoard must remain null at applicant-context stage');
  if (doc?.boardSelection?.rankingAllowed !== false) errors.push('board ranking must remain false');
  if (doc?.boardSelection?.automaticSelectionAllowed !== false) errors.push('automatic board selection must remain false');
  if (doc?.submission?.submissionAuthorized !== false) errors.push('submission authorization must remain false');
  if (doc?.submission?.externalBoardContactAuthorized !== false) errors.push('external board contact must remain false');

  for (const key of ['realParticipantCollectionAuthorized','recruitmentLaunchAuthorized','participantDataAccessAuthorized','schemaActivationAuthorized']) {
    if (doc?.collection?.[key] !== false) errors.push(key + ' must remain false');
  }
  for (const key of ['productNormEligible','productIqUnlocked','autoCpiToIq']) {
    if (doc?.governance?.[key] !== false) errors.push(key + ' must remain false');
  }

  const uniqueMissing = [...new Set(missing)].sort();
  const status = errors.length === 0 && uniqueMissing.length === 0
    ? POLICY.readinessStates.ready
    : POLICY.readinessStates.blocked;

  return {
    valid: errors.length === 0,
    status,
    missing: uniqueMissing,
    errors,
    boardSelected: false,
    externalBoardContactAuthorized: false,
    submissionAuthorized: false,
    collectionAuthorized: false
  };
}

function parseArgs(argv) {
  let input = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') input = argv[++i];
  }
  return { input };
}

function main(argv = process.argv.slice(2)) {
  const { input } = parseArgs(argv);
  const doc = input ? JSON.parse(fs.readFileSync(input, 'utf8')) : TEMPLATE;
  const result = validateContext(doc);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (require.main === module) main();

module.exports = { POLICY, TEMPLATE, gitBlobSha, get, present, validateContext, parseArgs, main };
