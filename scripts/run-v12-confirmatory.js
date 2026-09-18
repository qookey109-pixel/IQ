#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  DOMAINS, ageBand, hashSeed, mulberry32, normal,
  buildSyntheticBank, chooseItemsForParticipant, rowsToCsv
} = require('./generate-synthetic-calibration.js');

const PREREG_PATH = path.join(__dirname, '..', 'calibration', 'v12-confirmatory-preregistration.json');
const FREEZE_PATH = path.join(__dirname, '..', 'calibration', 'v12-dif-matching-method-freeze.json');
const ANALYSIS_PATH = path.join(__dirname, '..', 'calibration', 'analysis', 'v12_dif_confirmatory_selected.R');
const DEFAULT_AUTHORITY_PATH = path.join(__dirname, '..', 'calibration', 'v12-confirmatory-execution-authority.json');

const PREREG = require(PREREG_PATH);
const FREEZE = require(FREEZE_PATH);
const VERSION = 'CIL-V12-CONFIRMATORY-RUNNER-2026.09.1';
const AUTHORITY_VERSION = 'CIL-V12-CONFIRMATORY-EXECUTION-AUTHORITY-2026.09.1';
const SELECTED_METHOD = 'domain-loo-eap-fixed-theta';

function logistic(x) {
  return 1 / (1 + Math.exp(-x));
}

function gitBlobSha(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from('blob ' + content.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

function analysisSeed(seed) {
  return (hashSeed('analysis:' + seed) % 2147483646) + 1;
}

function validatePreregistration() {
  if (PREREG.version !== 'CIL-V12-CONFIRMATORY-PREREG-2026.09.1') throw new Error('Unexpected confirmatory preregistration version');
  if (PREREG.status !== 'preregistered-design-execution-locked') throw new Error('Confirmatory preregistration must remain execution locked');
  if (PREREG.selectedMethod.id !== SELECTED_METHOD) throw new Error('Selected method drift');
  if (FREEZE.selectedMethod.id !== SELECTED_METHOD) throw new Error('Method freeze drift');
  if (PREREG.design.replicatesPerPanel !== 5) throw new Error('Replicate count drift');
  if (PREREG.design.participantsPerReplicate !== 1200) throw new Error('Participant count drift');
  if (PREREG.design.totalTargetItemsPerReplicate !== 42) throw new Error('Target item count drift');
  if (PREREG.acceptance.everyCleanReplicateMaximumDifFlagRate !== 0.10) throw new Error('Clean FPR threshold drift');
  if (PREREG.acceptance.minimumAggregateImplantedDifSensitivity !== 0.70) throw new Error('Sensitivity threshold drift');
  if (PREREG.acceptance.runnerUpFallbackAllowed !== false) throw new Error('Runner-up fallback must remain forbidden');
  if (PREREG.acceptance.postExecutionThresholdChangesAllowed !== false) throw new Error('Post-execution threshold changes must remain forbidden');
  if (PREREG.acceptance.partialRunInferenceAllowed !== false) throw new Error('Partial-run inference must remain forbidden');
  if (PREREG.executionLock.executionAuthorized !== false) throw new Error('Preregistration execution lock must remain false');
  if (PREREG.executionLock.confirmatorySeedsConsumed !== false) throw new Error('Confirmatory seeds must remain unused before execution authority');
  ['autoCpiToIq','productNormEligible','productIqUnlocked'].forEach(function(key) {
    if (PREREG.governance[key] !== false) throw new Error(key + ' must remain false');
  });
  return PREREG;
}

function parseArgs(argv) {
  const out = {
    dryRun: false,
    outDir: 'calibration/output/v12-confirmatory',
    authorityPath: DEFAULT_AUTHORITY_PATH
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') out.dryRun = true;
    else if (argv[i] === '--out') out.outDir = String(argv[++i]);
    else if (argv[i] === '--authority') out.authorityPath = String(argv[++i]);
    else throw new Error('Unsupported argument: ' + argv[i] + '. Confirmatory subset execution is not allowed.');
  }
  if (!out.outDir) throw new Error('--out requires a path');
  if (!out.authorityPath) throw new Error('--authority requires a path');
  return out;
}

function makePlan(args) {
  validatePreregistration();
  const reps = [];
  [
    ['clean', PREREG.design.cleanPanel.reservedSeeds],
    ['implanted', PREREG.design.implantedDifPanel.reservedSeeds]
  ].forEach(function(entry) {
    entry[1].forEach(function(seed, index) {
      const id = String(index + 1).padStart(2, '0');
      const root = path.join(args.outDir, 'private-work', entry[0], 'replicate-' + id);
      reps.push({
        panel: entry[0],
        replicate: index + 1,
        seed: seed,
        analysisSeed: analysisSeed(seed),
        root: root,
        dataDir: path.join(root, 'private-synthetic'),
        input: path.join(root, 'private-synthetic', 'calibration-responses.csv'),
        truth: path.join(root, 'private-synthetic', 'true-domain-theta.csv'),
        itemTruth: path.join(root, 'private-synthetic', 'item-truth.json'),
        report: path.join(root, 'selected-method-report.json')
      });
    });
  });
  return {
    version: VERSION,
    selectedMethod: SELECTED_METHOD,
    participantsPerReplicate: PREREG.design.participantsPerReplicate,
    totalReplicates: reps.length,
    targetsPerDomain: PREREG.design.itemsPerDomain,
    replicates: reps,
    acceptance: PREREG.acceptance,
    executionAuthorityRequired: true,
    governance: {
      dryRunOnlyWithoutAuthority: true,
      executionAuthorized: false,
      confirmatorySeedsConsumed: false,
      partialRunInferenceAllowed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };
}

function requireExecutionAuthority(authorityPath) {
  validatePreregistration();
  if (!fs.existsSync(authorityPath)) {
    throw new Error('Confirmatory execution is locked: execution authority file is absent');
  }
  const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
  if (authority.version !== AUTHORITY_VERSION) throw new Error('Unexpected execution authority version');
  if (authority.executionAuthorized !== true) throw new Error('Confirmatory execution authority is not true');
  if (authority.userAuthorizationRecorded !== true) throw new Error('Explicit user execution authorization is not recorded');
  if (authority.executionScope !== 'all-10-preregistered-replicates') throw new Error('Execution authority scope mismatch');
  if (authority.selectedMethod !== SELECTED_METHOD) throw new Error('Execution authority selected method mismatch');
  if (authority.preregistrationBlobSha !== gitBlobSha(PREREG_PATH)) throw new Error('Execution authority preregistration hash mismatch');
  if (authority.runnerBlobSha !== gitBlobSha(__filename)) throw new Error('Execution authority runner hash mismatch');
  if (authority.analysisBlobSha !== gitBlobSha(ANALYSIS_PATH)) throw new Error('Execution authority analysis hash mismatch');
  return authority;
}

function generatePanel(panelType, participants, seed) {
  const rand = mulberry32(hashSeed(seed));
  const bank = buildSyntheticBank();
  const panel = panelType === 'clean' ? 'pipeline' : 'recovery';
  const multiplier = panelType === 'clean' ? Number(PREREG.design.cleanPanel.itemDiscriminationMultiplier) : 1;
  const rows = [];
  const people = [];
  let administered = null;

  for (let p = 0; p < participants; p++) {
    const age = 18 + (p * 13 + Math.floor(rand() * 7)) % 48;
    const band = ageBand(age);
    const g = normal(rand);
    const sourceKey = 'synthetic-' + String(p + 1).padStart(6, '0');
    const sessionId = 'synthetic-session-' + String(p + 1).padStart(6, '0');
    const chosen = chooseItemsForParticipant(bank, p, panel);
    if (!administered) administered = chosen;
    const theta = Object.fromEntries(DOMAINS.map(function(domain) {
      return [domain, 0.75 * g + 0.66 * normal(rand)];
    }));
    let correctCount = 0;
    const personRows = [];

    chosen.forEach(function(item) {
      const older = age >= 45 ? 1 : 0;
      const difShift = panelType === 'implanted' ? item.ageDif * older : 0;
      const pc = logistic((item.a * multiplier) * (theta[item.domain] - item.b) + difShift);
      const correct = rand() < pc ? 1 : 0;
      const timeout = rand() < (item.domain === 'processing-speed' ? 0.035 : 0.006) ? 1 : 0;
      const skipped = timeout ? 1 : (rand() < 0.006 ? 1 : 0);
      const finalCorrect = skipped ? 0 : correct;
      correctCount += finalCorrect;
      const correctOption = (hashSeed(item.itemId) + p) % 4;
      const selectedOption = skipped ? '' : (finalCorrect ? correctOption : (correctOption + 1 + (p % 3)) % 4);
      const secondsBase = item.domain === 'processing-speed' ? 8 : 28;
      const seconds = Math.max(1, Math.round((secondsBase + Math.abs(normal(rand)) * secondsBase * 0.45) * 10) / 10);
      personRows.push({
        schemaVersion: 1,
        sourceKey: sourceKey,
        sessionId: sessionId,
        ageYears: age,
        ageBand: band,
        bankVersion: 'synthetic-v12-confirmatory',
        bankRevision: seed,
        scoringVersion: 'synthetic-confirmatory-method-validation-only',
        formId: 'synthetic-v12-confirmatory-' + panelType + '-panel-v1',
        itemId: item.itemId,
        domain: item.domain,
        family: item.family,
        semanticKey: item.semanticKey,
        difficulty: item.difficulty,
        selectedOption: selectedOption,
        correctOption: correctOption,
        correct: finalCorrect,
        skipped: skipped,
        timeout: timeout,
        seconds: seconds,
        cpi: '',
        iqEstimate: ''
      });
    });

    const cpi = Math.round((correctCount / 42) * 100);
    personRows.forEach(function(row) { row.cpi = cpi; });
    rows.push.apply(rows, personRows);
    people.push({ sourceKey: sourceKey, ageYears: age, ageBand: band, syntheticDomainTheta: theta });
  }

  const itemTruth = (administered || []).map(function(item) {
    return {
      itemId: item.itemId,
      domain: item.domain,
      a: item.a * multiplier,
      b: item.b,
      ageDif: panelType === 'implanted' ? item.ageDif : 0,
      defect: item.defect
    };
  });
  return { rows: rows, participantsMeta: people, itemTruth: itemTruth };
}

function truthCsv(people) {
  const lines = ['sourceKey,domain,trueTheta'];
  people.forEach(function(person) {
    DOMAINS.forEach(function(domain) {
      lines.push([person.sourceKey, domain, person.syntheticDomainTheta[domain]].join(','));
    });
  });
  return lines.join('\n') + '\n';
}

function writePrivateData(rep, participants) {
  const generated = generatePanel(rep.panel, participants, rep.seed);
  fs.mkdirSync(rep.dataDir, { recursive: true });
  fs.writeFileSync(rep.input, rowsToCsv(generated.rows));
  fs.writeFileSync(rep.truth, truthCsv(generated.participantsMeta));
  fs.writeFileSync(rep.itemTruth, JSON.stringify(generated.itemTruth, null, 2) + '\n');
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: Object.assign({}, process.env, env || {}, { ALLOW_RESEARCH_STANDARD_SCORE: '0' })
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(command + ' failed with exit code ' + result.status);
}

function aggregateSelected(reports) {
  const clean = reports.filter(function(x) { return x.panel === 'clean'; }).map(function(x) { return x.report; });
  const implanted = reports.filter(function(x) { return x.panel === 'implanted'; }).map(function(x) { return x.report; });
  const cleanRates = clean.map(function(x) { return Number(x.selectedMethod.difFalsePositiveRate); });
  const knownObserved = implanted.reduce(function(a, x) { return a + Number(x.selectedMethod.knownDifControlsObserved || 0); }, 0);
  const knownDetected = implanted.reduce(function(a, x) { return a + Number(x.selectedMethod.knownDifControlsDetected || 0); }, 0);
  const complete = reports.length === 10 && reports.every(function(x) { return x.report.selectedMethod.complete === true; });
  const sensitivity = knownObserved ? knownDetected / knownObserved : null;
  const cleanPass = cleanRates.length === 5 && cleanRates.every(function(x) { return Number.isFinite(x) && x <= 0.10; });
  const sensitivityPass = Number.isFinite(sensitivity) && sensitivity >= 0.70;
  const pass = complete && cleanPass && sensitivityPass;
  return {
    version: VERSION,
    status: pass ? 'confirmatory-pass' : 'confirmatory-fail',
    selectedMethod: SELECTED_METHOD,
    allTenReplicatesComplete: complete,
    clean: {
      replicateFalsePositiveRates: cleanRates,
      maximumReplicateFalsePositiveRate: cleanRates.length ? Math.max.apply(Math, cleanRates) : null,
      threshold: 0.10,
      pass: cleanPass
    },
    implanted: {
      knownDifControlsObserved: knownObserved,
      knownDifControlsDetected: knownDetected,
      aggregateSensitivity: sensitivity,
      threshold: 0.70,
      pass: sensitivityPass
    },
    governance: {
      syntheticOnly: true,
      containsRealParticipants: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false,
      interpretationLimitedToSyntheticKnownTruthDifValidation: true
    }
  };
}

function execute(plan) {
  const reports = [];
  fs.mkdirSync(plan.outDir || path.dirname(plan.replicates[0].root), { recursive: true });
  try {
    plan.replicates.forEach(function(rep, index) {
      console.log('Running preregistered confirmatory replicate ' + (index + 1) + '/10');
      writePrivateData(rep, plan.participantsPerReplicate);
      run('Rscript', [
        ANALYSIS_PATH,
        rep.input,
        rep.truth,
        rep.itemTruth,
        rep.report
      ], { CIL_ANALYSIS_SEED: String(rep.analysisSeed) });
      reports.push({
        panel: rep.panel,
        replicate: rep.replicate,
        report: JSON.parse(fs.readFileSync(rep.report, 'utf8'))
      });
      fs.rmSync(rep.root, { recursive: true, force: true });
    });
  } finally {
    plan.replicates.forEach(function(rep) {
      fs.rmSync(rep.root, { recursive: true, force: true });
    });
  }
  const summary = aggregateSelected(reports);
  fs.mkdirSync(plan.outDir, { recursive: true });
  fs.writeFileSync(path.join(plan.outDir, 'v12-confirmatory-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ status: summary.status, selectedMethod: summary.selectedMethod }, null, 2));
  return summary;
}

function main(argv) {
  const args = parseArgs(argv || process.argv.slice(2));
  const plan = makePlan(args);
  plan.outDir = args.outDir;
  if (args.dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }
  requireExecutionAuthority(args.authorityPath);
  return execute(plan);
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  VERSION, AUTHORITY_VERSION, SELECTED_METHOD,
  gitBlobSha, analysisSeed, validatePreregistration, parseArgs, makePlan,
  requireExecutionAuthority, generatePanel, truthCsv, aggregateSelected, main
};
