#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  DOMAINS, ageBand, hashSeed, mulberry32, normal,
  buildSyntheticBank, chooseItemsForParticipant, rowsToCsv
} = require('./generate-synthetic-calibration.js');

const PROTOCOL = require('../calibration/v12-dif-matching-protocol.json');
const VERSION = 'CIL-V12-DIF-MATCHING-DEVELOPMENT-2026.09.1';
const CANDIDATES = [
  'domain-loo-eap-fixed-theta',
  'crossfit-six-factor-map-fixed-theta'
];

function finite(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function logistic(x) {
  return 1 / (1 + Math.exp(-x));
}

function analysisSeed(seed) {
  return (hashSeed('analysis:' + seed) % 2147483646) + 1;
}

function validateProtocol() {
  if (PROTOCOL.version !== 'CIL-V12-DIF-MATCHING-2026.09.2') throw new Error('Unexpected v12 protocol version');
  if (PROTOCOL.status !== 'prospective-method-selection-protocol-pre-execution-amended') {
    throw new Error('Unexpected v12 protocol status');
  }
  const amendment = PROTOCOL.preExecutionAmendment || {};
  if (amendment.analysesExecutedBeforeAmendment !== false || amendment.resultsInspectedBeforeAmendment !== false) {
    throw new Error('MAP amendment must remain pre-execution');
  }
  if (PROTOCOL.fixedDifSettings.maximumCleanPanelDifFlagRate !== 0.10) throw new Error('Clean DIF threshold drift');
  if (PROTOCOL.selectionRule.minimumAggregateImplantedDifSensitivity !== 0.70) throw new Error('Sensitivity threshold drift');
  ['autoCpiToIq','productNormEligible','productIqUnlocked'].forEach(function(key) {
    if (PROTOCOL.governance[key] !== false) throw new Error(key + ' must remain false');
  });
  if (PROTOCOL.confirmatory.executionAllowedBeforeMethodFreeze !== false) {
    throw new Error('Confirmatory execution must remain locked');
  }
  return PROTOCOL;
}

function parseArgs(argv) {
  const out = {
    replicates: PROTOCOL.development.replicatesPerPanel,
    participants: PROTOCOL.development.participantsPerReplicate,
    targetsPerDomain: 7,
    panel: 'both',
    replicateStart: 1,
    outDir: 'calibration/output/v12-dif-matching-development',
    dryRun: false
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') out.dryRun = true;
    else if (argv[i] === '--replicates') out.replicates = Number(argv[++i]);
    else if (argv[i] === '--participants') out.participants = Number(argv[++i]);
    else if (argv[i] === '--targets-per-domain') out.targetsPerDomain = Number(argv[++i]);
    else if (argv[i] === '--panel') out.panel = String(argv[++i]);
    else if (argv[i] === '--replicate-start') out.replicateStart = Number(argv[++i]);
    else if (argv[i] === '--out') out.outDir = String(argv[++i]);
  }
  if (!Number.isInteger(out.replicates) || out.replicates < 1 || out.replicates > 5) {
    throw new Error('--replicates must be 1..5');
  }
  if (!Number.isInteger(out.participants) || out.participants < 200 || out.participants > 1200) {
    throw new Error('--participants must be 200..1200');
  }
  if (!Number.isInteger(out.targetsPerDomain) || out.targetsPerDomain < 1 || out.targetsPerDomain > 7) {
    throw new Error('--targets-per-domain must be 1..7');
  }
  if (!['both','clean','implanted'].includes(out.panel)) throw new Error('--panel must be both, clean, or implanted');
  if (!Number.isInteger(out.replicateStart) || out.replicateStart < 1 || out.replicateStart > 5) {
    throw new Error('--replicate-start must be 1..5');
  }
  if (out.replicateStart + out.replicates - 1 > 5) throw new Error('replicate range exceeds preregistered 1..5');
  return out;
}

function generatePanel(panelType, participants, seed) {
  validateProtocol();
  if (panelType !== 'clean' && panelType !== 'implanted') throw new Error('Unknown panel type');
  const rand = mulberry32(hashSeed(seed));
  const bank = buildSyntheticBank();
  const panel = panelType === 'clean' ? 'pipeline' : 'recovery';
  const multiplier = panelType === 'clean'
    ? Number(PROTOCOL.development.cleanPanel.itemDiscriminationMultiplier)
    : 1;
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
        bankVersion: 'synthetic-v12-development',
        bankRevision: seed,
        scoringVersion: 'synthetic-method-validation-only',
        formId: 'synthetic-v12-' + panelType + '-panel-v1',
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

  return {
    rows: rows,
    participantsMeta: people,
    itemTruth: itemTruth,
    manifest: {
      version: VERSION,
      panelType: panelType,
      participants: participants,
      rows: rows.length,
      uniqueItems: itemTruth.length,
      implantedAgeDifControls: itemTruth.filter(function(x) { return x.ageDif > 0; }).length,
      seed: seed,
      syntheticOnly: true,
      containsRealParticipants: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };
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

function makePlan(args) {
  const cfg = Object.assign(parseArgs([]), args || {});
  const allPanels = [
    ['clean', PROTOCOL.development.cleanPanel.seedPrefix],
    ['implanted', PROTOCOL.development.implantedDifPanel.seedPrefix]
  ];
  const panels = cfg.panel === 'both' ? allPanels : allPanels.filter(function(x) { return x[0] === cfg.panel; });
  const reps = [];
  panels.forEach(function(panel) {
    for (let r = cfg.replicateStart; r < cfg.replicateStart + cfg.replicates; r++) {
      const id = String(r).padStart(2, '0');
      const seed = panel[1] + '-r' + id;
      const root = path.join(cfg.outDir, panel[0], 'replicate-' + id);
      const dataDir = path.join(root, 'private-synthetic');
      reps.push({
        panel: panel[0],
        replicate: r,
        seed: seed,
        analysisSeed: analysisSeed(seed),
        dataDir: dataDir,
        input: path.join(dataDir, 'calibration-responses.csv'),
        truth: path.join(dataDir, 'true-domain-theta.csv'),
        itemTruth: path.join(dataDir, 'item-truth.json'),
        report: path.join(root, 'v12-dif-matching-comparison.json')
      });
    }
  });
  return {
    version: VERSION,
    participants: cfg.participants,
    replicatesPerPanel: cfg.replicates,
    targetsPerDomain: cfg.targetsPerDomain,
    panelScope: cfg.panel,
    replicateStart: cfg.replicateStart,
    outDir: cfg.outDir,
    selectionEligible:
      cfg.panel === 'both' &&
      cfg.replicateStart === 1 &&
      cfg.replicates === 5 &&
      cfg.participants === 1200 &&
      cfg.targetsPerDomain === 7,
    replicates: reps,
    governance: {
      developmentOnly: true,
      confirmatorySeedsUsed: false,
      confirmatoryExecutionAllowed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: Object.assign({}, process.env, env || {}, { ALLOW_RESEARCH_STANDARD_SCORE: '0' })
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(command + ' failed with exit code ' + result.status);
}

function writeData(rep, participants) {
  const g = generatePanel(rep.panel, participants, rep.seed);
  fs.mkdirSync(rep.dataDir, { recursive: true });
  fs.writeFileSync(rep.input, rowsToCsv(g.rows));
  fs.writeFileSync(rep.truth, truthCsv(g.participantsMeta));
  fs.writeFileSync(rep.itemTruth, JSON.stringify(g.itemTruth, null, 2) + '\n');
  fs.writeFileSync(path.join(rep.dataDir, 'manifest.json'), JSON.stringify(g.manifest, null, 2) + '\n');
}

function sum(xs) {
  return xs.reduce(function(a, b) { return a + b; }, 0);
}

function aggregateMethod(reports, panel, method) {
  const rows = reports
    .filter(function(x) { return x.panel === panel; })
    .map(function(x) { return x.report.methods && x.report.methods[method]; })
    .filter(Boolean);
  const knownObserved = sum(rows.map(function(x) { return Number(x.knownDifControlsObserved || 0); }));
  const knownDetected = sum(rows.map(function(x) { return Number(x.knownDifControlsDetected || 0); }));
  const nullObserved = sum(rows.map(function(x) { return Number(x.nullDifItemsObserved || 0); }));
  const nullFlagged = sum(rows.map(function(x) { return Number(x.nullDifItemsFlagged || 0); }));
  const rates = rows.map(function(x) { return finite(x.difFalsePositiveRate); }).filter(Number.isFinite);
  return {
    complete: rows.length > 0 && rows.every(function(x) { return x.complete === true; }),
    replicates: rows.length,
    knownDifControlsObserved: knownObserved,
    knownDifControlsDetected: knownDetected,
    implantedDifSensitivity: knownObserved ? knownDetected / knownObserved : null,
    nullDifItemsObserved: nullObserved,
    nullDifItemsFlagged: nullFlagged,
    aggregateDifFalsePositiveRate: nullObserved ? nullFlagged / nullObserved : null,
    maximumReplicateDifFalsePositiveRate: rates.length ? Math.max.apply(Math, rates) : null,
    replicateDifFalsePositiveRates: rates
  };
}

function chooseMethod(aggregate, eligible) {
  if (!eligible) return { status: 'not-eligible-smoke', selectedMethod: null, candidates: {} };
  const candidates = {};
  CANDIDATES.forEach(function(method) {
    const clean = aggregate.clean[method];
    const implanted = aggregate.implanted[method];
    const pass =
      clean.complete === true &&
      implanted.complete === true &&
      Number.isFinite(clean.maximumReplicateDifFalsePositiveRate) &&
      clean.maximumReplicateDifFalsePositiveRate <= 0.10 &&
      Number.isFinite(implanted.implantedDifSensitivity) &&
      implanted.implantedDifSensitivity >= 0.70;
    candidates[method] = { pass: pass, clean: clean, implanted: implanted };
  });
  const passing = CANDIDATES.filter(function(m) { return candidates[m].pass; });
  if (!passing.length) return { status: 'v12-method-selection-failed', selectedMethod: null, candidates: candidates };
  if (passing.length === 1) return { status: 'method-selected-development', selectedMethod: passing[0], candidates: candidates };
  passing.sort(function(a, b) {
    const ac = candidates[a].clean.maximumReplicateDifFalsePositiveRate;
    const bc = candidates[b].clean.maximumReplicateDifFalsePositiveRate;
    if (ac !== bc) return ac - bc;
    const as = candidates[a].implanted.implantedDifSensitivity;
    const bs = candidates[b].implanted.implantedDifSensitivity;
    if (as !== bs) return bs - as;
    return a === 'domain-loo-eap-fixed-theta' ? -1 : 1;
  });
  return { status: 'method-selected-development', selectedMethod: passing[0], candidates: candidates };
}

function summarize(plan, reports) {
  const aggregate = { clean: {}, implanted: {} };
  ['clean','implanted'].forEach(function(panel) {
    ['lordif-iterative-current'].concat(CANDIDATES).forEach(function(method) {
      aggregate[panel][method] = aggregateMethod(reports, panel, method);
    });
  });
  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    status: plan.selectionEligible ? 'complete-development' : 'complete-smoke',
    configuration: {
      participantsPerReplicate: plan.participants,
      replicatesPerPanel: plan.replicatesPerPanel,
      targetsPerDomain: plan.targetsPerDomain,
      panelScope: plan.panelScope,
      replicateStart: plan.replicateStart,
      selectionEligible: plan.selectionEligible,
      developmentSeedPrefixes: {
        clean: PROTOCOL.development.cleanPanel.seedPrefix,
        implanted: PROTOCOL.development.implantedDifPanel.seedPrefix
      }
    },
    aggregate: aggregate,
    selection: chooseMethod(aggregate, plan.selectionEligible),
    governance: plan.governance
  };
}

function main(argv) {
  validateProtocol();
  const args = parseArgs(argv || process.argv.slice(2));
  const plan = makePlan(args);
  if (args.dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }
  const reports = [];
  plan.replicates.forEach(function(rep) {
    console.log('\n=== v12 development ' + rep.panel + ' replicate ' + rep.replicate + ' ===');
    writeData(rep, plan.participants);
    run('Rscript', [
      'calibration/analysis/v12_dif_matching_compare.R',
      rep.input,
      rep.truth,
      rep.itemTruth,
      rep.report,
      String(plan.targetsPerDomain)
    ], { CIL_ANALYSIS_SEED: String(rep.analysisSeed) });
    reports.push({
      panel: rep.panel,
      replicate: rep.replicate,
      seed: rep.seed,
      report: JSON.parse(fs.readFileSync(rep.report, 'utf8'))
    });
  });
  const summary = summarize(plan, reports);
  fs.mkdirSync(plan.outDir, { recursive: true });
  fs.writeFileSync(
    path.join(plan.outDir, 'v12-dif-matching-development-summary.json'),
    JSON.stringify(summary, null, 2) + '\n'
  );
  console.log(JSON.stringify({
    status: summary.status,
    selectionStatus: summary.selection.status,
    selectedMethod: summary.selection.selectedMethod,
    productIqUnlocked: summary.governance.productIqUnlocked
  }, null, 2));
  return summary;
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  VERSION, CANDIDATES, analysisSeed, parseArgs, validateProtocol,
  generatePanel, truthCsv, makePlan, aggregateMethod, chooseMethod,
  summarize, main
};
