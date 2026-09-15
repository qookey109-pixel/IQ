#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { buildSyntheticBank } = require('./generate-synthetic-calibration.js');

function parseArgs(argv) {
  const out = {
    replicates: 5,
    participants: 1200,
    seedPrefix: 'cil-monte-carlo-v9',
    outDir: 'calibration/output/monte-carlo-v9',
    dryRun: false,
    installPackages: false
  };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === 'dryRun' || key === 'installPackages') out[key] = true;
    else if (key === 'replicates' || key === 'participants') out[key] = Number(argv[++i]);
    else if (key === 'seedPrefix') out.seedPrefix = String(argv[++i]);
    else if (key === 'out') out.outDir = String(argv[++i]);
  }
  if (!Number.isInteger(out.replicates) || out.replicates < 1 || out.replicates > 100) {
    throw new Error('--replicates must be an integer from 1 to 100');
  }
  if (!Number.isInteger(out.participants) || out.participants < 250 || out.participants > 20000) {
    throw new Error('--participants must be an integer from 250 to 20000');
  }
  return out;
}

function buildPlan(options = {}) {
  const cfg = { ...parseArgs([]), ...options };
  const steps = [];
  if (cfg.installPackages) {
    steps.push({ name: 'install-packages', command: 'Rscript', args: ['calibration/analysis/install-packages.R'] });
  }
  for (let i = 0; i < cfg.replicates; i++) {
    const id = String(i + 1).padStart(2, '0');
    const repDir = path.join(cfg.outDir, `replicate-${id}`);
    const syntheticDir = path.join(repDir, 'synthetic');
    const analysisDir = path.join(repDir, 'analysis');
    const input = path.join(syntheticDir, 'calibration-responses.csv');
    const seed = `${cfg.seedPrefix}-r${id}`;
    steps.push(
      {
        name: `generate-${id}`,
        command: process.execPath,
        args: [
          'scripts/generate-synthetic-calibration.js',
          '--participants', String(cfg.participants),
          '--seed', seed,
          '--panel', 'recovery',
          '--out', syntheticDir
        ],
        replicate: i + 1,
        seed
      },
      {
        name: `irt-${id}`,
        command: 'Rscript',
        args: ['calibration/analysis/irt_mirt.R', input, analysisDir],
        replicate: i + 1,
        seed
      },
      {
        name: `age-dif-${id}`,
        command: 'Rscript',
        args: ['calibration/analysis/age_dif.R', input, analysisDir],
        replicate: i + 1,
        seed
      }
    );
  }
  return {
    version: 'CIL-MONTE-CARLO-RECOVERY-2026.09.1',
    design: 'fixed-42-item-synthetic-recovery-panel',
    replicates: cfg.replicates,
    participantsPerReplicate: cfg.participants,
    seedPrefix: cfg.seedPrefix,
    outDir: cfg.outDir,
    steps,
    safety: {
      containsRealParticipants: false,
      syntheticOnly: true,
      automaticUpload: false,
      participantBackend: false,
      autoPublishNorms: false,
      autoConvertCpiToIq: false,
      productNormEligible: false,
      productIqUnlocked: false
    }
  };
}

function runStep(step, cwd = process.cwd()) {
  const result = spawnSync(step.command, step.args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ALLOW_RESEARCH_STANDARD_SCORE: '0' }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${step.name} failed with exit code ${result.status}`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  if (!rows.length) return [];
  const header = rows.shift();
  return rows
    .filter(values => values.length > 1 || values[0] !== '')
    .map(values => Object.fromEntries(header.map((key, i) => [key, values[i] ?? ''])));
}

function readCsv(file) {
  if (!fs.existsSync(file)) return [];
  return parseCsv(fs.readFileSync(file, 'utf8'));
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mean(values) {
  const xs = values.filter(Number.isFinite);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function rmse(pairs, truthKey, estimateKey) {
  if (!pairs.length) return null;
  return Math.sqrt(mean(pairs.map(pair => (pair[estimateKey] - pair[truthKey]) ** 2)));
}

function correlation(pairs, xKey, yKey) {
  if (pairs.length < 3) return null;
  const mx = mean(pairs.map(pair => pair[xKey]));
  const my = mean(pairs.map(pair => pair[yKey]));
  const num = pairs.reduce((s, pair) => s + (pair[xKey] - mx) * (pair[yKey] - my), 0);
  const dx = Math.sqrt(pairs.reduce((s, pair) => s + (pair[xKey] - mx) ** 2, 0));
  const dy = Math.sqrt(pairs.reduce((s, pair) => s + (pair[yKey] - my) ** 2, 0));
  return dx > 0 && dy > 0 ? num / (dx * dy) : null;
}

function summarizeReplicate(analysisDir, truthBank = buildSyntheticBank()) {
  const truth = new Map(truthBank.map(item => [item.itemId, item]));
  const params = readCsv(path.join(analysisDir, 'item-parameters.csv'));
  const dif = readCsv(path.join(analysisDir, 'age-dif.csv'));

  const matched = [];
  for (const row of params) {
    const t = truth.get(row.itemId);
    if (!t) continue;
    const estimateA = finiteNumber(row.a);
    const estimateB = finiteNumber(row.b);
    if (estimateA == null || estimateB == null) continue;
    matched.push({
      itemId: row.itemId,
      truthA: t.a,
      truthB: t.b,
      estimateA,
      estimateB,
      defect: t.defect,
      ageDif: t.ageDif
    });
  }

  const regular = matched.filter(row => !row.defect && row.truthA > 0);
  const lowControls = matched.filter(row => row.defect === 'low-discrimination-control');
  const negativeControls = matched.filter(row => row.defect === 'negative-discrimination-control');

  const difRows = dif.filter(row => row.itemId && row.status === 'ok' && truth.has(row.itemId));
  const knownDif = difRows.filter(row => truth.get(row.itemId).ageDif > 0);
  const nullDif = difRows.filter(row => truth.get(row.itemId).ageDif === 0);
  const isFlagged = row => String(row.difFlag).toLowerCase() === 'true';
  const detectedKnownDif = knownDif.filter(isFlagged).length;
  const falsePositiveDif = nullDif.filter(isFlagged).length;

  return {
    parameterRows: params.length,
    matchedParameterRows: matched.length,
    regularParameterRows: regular.length,
    discriminationCorrelation: correlation(regular, 'truthA', 'estimateA'),
    difficultyCorrelation: correlation(regular, 'truthB', 'estimateB'),
    discriminationRmse: rmse(regular, 'truthA', 'estimateA'),
    difficultyRmse: rmse(regular, 'truthB', 'estimateB'),
    lowDiscriminationControlsObserved: lowControls.length,
    lowDiscriminationControlsBelow035: lowControls.filter(row => Math.abs(row.estimateA) < 0.35).length,
    negativeDiscriminationControlsObserved: negativeControls.length,
    negativeDiscriminationControlsEstimatedNegative: negativeControls.filter(row => row.estimateA < 0).length,
    difRows: difRows.length,
    knownDifControlsObserved: knownDif.length,
    knownDifControlsDetected: detectedKnownDif,
    nullDifItemsObserved: nullDif.length,
    nullDifItemsFlagged: falsePositiveDif,
    difSensitivity: knownDif.length ? detectedKnownDif / knownDif.length : null,
    difFalsePositiveRate: nullDif.length ? falsePositiveDif / nullDif.length : null
  };
}

function rangeSummary(values) {
  const xs = values.filter(Number.isFinite);
  return xs.length ? { mean: mean(xs), min: Math.min(...xs), max: Math.max(...xs) } : null;
}

function aggregateResults(plan) {
  const replicates = [];
  for (let i = 0; i < plan.replicates; i++) {
    const id = String(i + 1).padStart(2, '0');
    const analysisDir = path.join(plan.outDir, `replicate-${id}`, 'analysis');
    replicates.push({
      replicate: i + 1,
      seed: `${plan.seedPrefix}-r${id}`,
      ...summarizeReplicate(analysisDir)
    });
  }

  const totals = {
    knownDifControlsObserved: replicates.reduce((s, r) => s + r.knownDifControlsObserved, 0),
    knownDifControlsDetected: replicates.reduce((s, r) => s + r.knownDifControlsDetected, 0),
    nullDifItemsObserved: replicates.reduce((s, r) => s + r.nullDifItemsObserved, 0),
    nullDifItemsFlagged: replicates.reduce((s, r) => s + r.nullDifItemsFlagged, 0)
  };

  const structuralPass = replicates.every(r =>
    r.matchedParameterRows > 0 &&
    Number.isFinite(r.discriminationCorrelation) &&
    Number.isFinite(r.difficultyCorrelation) &&
    r.difRows > 0
  );

  return {
    version: plan.version,
    generatedAt: new Date().toISOString(),
    status: structuralPass ? 'complete-diagnostic' : 'incomplete-diagnostic',
    interpretation: 'Synthetic parameter/DIF recovery diagnostics only. Empirical pass thresholds are intentionally not used to unlock product scoring.',
    configuration: {
      design: plan.design,
      replicates: plan.replicates,
      participantsPerReplicate: plan.participantsPerReplicate,
      seedPrefix: plan.seedPrefix
    },
    aggregate: {
      discriminationCorrelation: rangeSummary(replicates.map(r => r.discriminationCorrelation)),
      difficultyCorrelation: rangeSummary(replicates.map(r => r.difficultyCorrelation)),
      discriminationRmse: rangeSummary(replicates.map(r => r.discriminationRmse)),
      difficultyRmse: rangeSummary(replicates.map(r => r.difficultyRmse)),
      difSensitivity: totals.knownDifControlsObserved ? totals.knownDifControlsDetected / totals.knownDifControlsObserved : null,
      difFalsePositiveRate: totals.nullDifItemsObserved ? totals.nullDifItemsFlagged / totals.nullDifItemsObserved : null,
      ...totals
    },
    replicates,
    safety: plan.safety,
    gates: {
      allReplicatesProducedFiniteRecoveryMetrics: structuralPass,
      scientificThresholdsPreRegistered: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };
}

function writeSummary(plan, summary) {
  fs.mkdirSync(plan.outDir, { recursive: true });
  const file = path.join(plan.outDir, 'monte-carlo-recovery-summary.json');
  fs.writeFileSync(file, JSON.stringify(summary, null, 2) + '\n');
  return file;
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const plan = buildPlan(options);
  if (options.dryRun) {
    console.log(JSON.stringify({ ...plan, dryRun: true }, null, 2));
    return plan;
  }

  const completed = [];
  for (const step of plan.steps) {
    console.log(`\n=== ${step.name} ===`);
    runStep(step);
    completed.push(step.name);
  }

  const summary = aggregateResults(plan);
  const file = writeSummary(plan, summary);
  console.log(`\nMonte Carlo recovery diagnostics complete: ${file}`);
  console.log('Synthetic evidence only. Product IQ and product norms remain locked.');
  return { plan, summary, completed };
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  parseArgs,
  buildPlan,
  runStep,
  parseCsv,
  summarizeReplicate,
  aggregateResults,
  writeSummary,
  main
};
