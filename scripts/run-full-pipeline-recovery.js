#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  DOMAINS,
  AGE_BANDS,
  hashSeed,
  mulberry32,
  normal,
  generateSynthetic,
  rowsToCsv
} = require('./generate-synthetic-calibration.js');

const VERSION = 'CIL-FULL-PIPELINE-RECOVERY-2026.09.1';
const EXTERNAL_TRUTH = Object.freeze({
  intercept: 20,
  cpiSlope: 0.60,
  ageSlope: 0.05,
  noiseSd: 4
});

function parseArgs(argv) {
  const out = {
    participants: 900,
    seed: 'cil-v10-ci',
    outDir: 'calibration/output/full-pipeline-v10',
    dryRun: false
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--participants') out.participants = Number(argv[++i]);
    else if (argv[i] === '--seed') out.seed = String(argv[++i]);
    else if (argv[i] === '--out') out.outDir = argv[++i];
    else if (argv[i] === '--dry-run') out.dryRun = true;
  }
  if (!Number.isInteger(out.participants) || out.participants < 500) {
    throw new Error('participants must be an integer >= 500 for the v10 full-pipeline diagnostic');
  }
  return out;
}

function analysisSeed(seed) {
  return 1 + (hashSeed(`analysis:${seed}:full-pipeline-v10`) % 2147483646);
}

function csvCell(value) {
  if (value == null) return '';
  const text = String(value);
  return /[\",\n\r]/.test(text) ? `\"${text.replaceAll('\"', '\"\"')}\"` : text;
}

function externalRowsToCsv(rows) {
  const cols = [
    'sourceKey','sessionId','instrumentId','administrationId','ageYears',
    'externalScoreType','externalScore','itemContentStored','scoringKeyStored'
  ];
  return [
    cols.join(','),
    ...rows.map(row => cols.map(key => csvCell(row[key])).join(','))
  ].join('\n') + '\n';
}

function generateSyntheticExternal(participantsMeta, seed, truth = EXTERNAL_TRUTH) {
  const rand = mulberry32(hashSeed(`external:${seed}`));
  return participantsMeta.map((person, index) => {
    const noise = normal(rand) * truth.noiseSd;
    const externalScore = truth.intercept
      + truth.cpiSlope * person.cpi
      + truth.ageSlope * person.ageYears
      + noise;
    return {
      sourceKey: person.sourceKey,
      sessionId: person.sessionId,
      instrumentId: 'SYNTHETIC-V10-LINK',
      administrationId: `synthetic-v10-${String(index + 1).padStart(6, '0')}`,
      ageYears: person.ageYears,
      externalScoreType: 'synthetic-method-validation-score',
      externalScore: Math.round(externalScore * 1000) / 1000,
      itemContentStored: false,
      scoringKeyStored: false
    };
  });
}

function buildPlan(options = {}) {
  const participants = Number(options.participants || 900);
  const seed = String(options.seed || 'cil-v10-ci');
  const outDir = options.outDir || 'calibration/output/full-pipeline-v10';
  const seedValue = analysisSeed(seed);
  const dataDir = path.join(outDir, 'private-synthetic');
  const analysisDir = path.join(outDir, 'analysis');
  const input = path.join(dataDir, 'calibration-responses.csv');
  const external = path.join(dataDir, 'synthetic-external-validation.csv');
  return {
    version: VERSION,
    design: 'clean-42-item-six-domain-synthetic-pipeline-panel',
    participants,
    seed,
    analysisSeed: seedValue,
    outDir,
    dataDir,
    analysisDir,
    input,
    external,
    pipelineCommand: [
      process.execPath,
      'scripts/run-psychometric-pipeline.js',
      '--input', input,
      '--out', analysisDir,
      '--external', external,
      '--analysis-seed', String(seedValue)
    ],
    safety: {
      syntheticOnly: true,
      containsRealParticipants: false,
      automaticUpload: false,
      participantBackend: false,
      autoPublishNorms: false,
      autoConvertCpiToIq: false,
      productNormEligible: false,
      productIqUnlocked: false
    }
  };
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

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mean(values) {
  const x = values.map(Number).filter(Number.isFinite);
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null;
}

function sd(values) {
  const x = values.map(Number).filter(Number.isFinite);
  if (x.length < 2) return null;
  const m = mean(x);
  return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1));
}

function correlation(a, b) {
  const pairs = a.map((x, i) => [Number(x), Number(b[i])]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 3) return null;
  const xs = pairs.map(x => x[0]);
  const ys = pairs.map(x => x[1]);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < pairs.length; i++) {
    const x = xs[i] - mx;
    const y = ys[i] - my;
    num += x * y;
    dx += x * x;
    dy += y * y;
  }
  const den = Math.sqrt(dx * dy);
  return den > 0 ? num / den : null;
}

function standardized(values) {
  const nums = values.map(Number);
  const m = mean(nums);
  const s = sd(nums);
  if (!Number.isFinite(m) || !Number.isFinite(s) || s <= 0) return nums.map(() => null);
  return nums.map(v => Number.isFinite(v) ? (v - m) / s : null);
}

function rmse(a, b) {
  const pairs = a.map((x, i) => [Number(x), Number(b[i])]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (!pairs.length) return null;
  return Math.sqrt(mean(pairs.map(([x, y]) => (x - y) ** 2)));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function summarizeOutputs(plan, generated) {
  const reliability = readJson(path.join(plan.analysisDir, 'reliability.json'));
  const cfa = readJson(path.join(plan.analysisDir, 'cfa-invariance.json'));
  const generalManifest = readJson(path.join(plan.analysisDir, 'general-theta-manifest.json'));
  const normingManifest = readJson(path.join(plan.analysisDir, 'norming-manifest.json'));
  const external = readJson(path.join(plan.analysisDir, 'external-linking.json'));
  const pipelineManifest = readJson(path.join(plan.analysisDir, 'pipeline-manifest.json'));

  const generalRows = parseCsv(fs.readFileSync(path.join(plan.analysisDir, 'participant-general-theta.csv'), 'utf8'));
  const normRows = parseCsv(fs.readFileSync(path.join(plan.analysisDir, 'age-norm-table-research.csv'), 'utf8'));
  const difFile = path.join(plan.analysisDir, 'age-dif.csv');
  const difRows = fs.existsSync(difFile) ? parseCsv(fs.readFileSync(difFile, 'utf8')) : [];

  const truthBySource = new Map(generated.participantsMeta.map(person => [person.sourceKey, person]));
  const matched = generalRows
    .map(row => ({ row, truth: truthBySource.get(row.sourceKey) }))
    .filter(entry => entry.truth && Number.isFinite(Number(entry.row.theta)));

  const estimatedTheta = matched.map(entry => Number(entry.row.theta));
  const trueG = matched.map(entry => Number(entry.truth.syntheticG));
  const estimatedZ = standardized(estimatedTheta);
  const trueGZ = standardized(trueG);

  const domainReliability = {};
  for (const domain of DOMAINS) {
    const r = reliability.domains?.[domain] || {};
    domainReliability[domain] = {
      status: r.status || null,
      participants: finite(r.participants),
      items: finite(r.items),
      alphaRaw: finite(r.alphaRaw),
      omegaTotal: finite(r.omegaTotal),
      omegaHierarchical: finite(r.omegaHierarchical)
    };
  }

  const bandRecovery = {};
  for (const [, , band] of AGE_BANDS) {
    const estimatedBand = matched.filter(entry => entry.truth.ageBand === band);
    const truthBandIndices = matched
      .map((entry, i) => entry.truth.ageBand === band ? i : -1)
      .filter(i => i >= 0);
    const norm = normRows.find(row => row.ageBand === band);
    bandRecovery[band] = {
      n: norm ? finite(norm.n) : null,
      normMeanTheta: norm ? finite(norm.mean) : null,
      normSdTheta: norm ? finite(norm.sd) : null,
      estimatedMeanZ: mean(truthBandIndices.map(i => estimatedZ[i])),
      trueMeanGZ: mean(truthBandIndices.map(i => trueGZ[i])),
      matchedParticipants: estimatedBand.length
    };
  }
  const bandMeanRmse = rmse(
    Object.values(bandRecovery).map(x => x.estimatedMeanZ),
    Object.values(bandRecovery).map(x => x.trueMeanGZ)
  );

  const instrument = external.instruments?.['SYNTHETIC-V10-LINK'] || {};
  const externalSummary = {
    linkedParticipants: finite(external.linkedParticipants),
    status: instrument.status || null,
    pearsonR: finite(instrument.pearsonR),
    spearmanRho: finite(instrument.spearmanRho),
    adjustedR2: finite(instrument.adjustedR2),
    cpiSlope: finite(instrument.cpiSlope),
    cpiSlopeTruth: EXTERNAL_TRUTH.cpiSlope,
    cpiSlopeBias: Number.isFinite(Number(instrument.cpiSlope)) ? Number(instrument.cpiSlope) - EXTERNAL_TRUTH.cpiSlope : null,
    ageSlope: finite(instrument.ageSlope),
    ageSlopeTruth: EXTERNAL_TRUTH.ageSlope,
    ageSlopeBias: Number.isFinite(Number(instrument.ageSlope)) ? Number(instrument.ageSlope) - EXTERNAL_TRUTH.ageSlope : null
  };

  const cfaSummary = {
    status: cfa.status || null,
    participants: finite(cfa.participants),
    ageGroups: Array.isArray(cfa.ageGroups) ? cfa.ageGroups : [],
    configural: {
      cfi: finite(cfa.configural?.cfi),
      rmsea: finite(cfa.configural?.rmsea),
      srmr: finite(cfa.configural?.srmr)
    },
    metric: {
      cfi: finite(cfa.metric?.cfi),
      rmsea: finite(cfa.metric?.rmsea),
      srmr: finite(cfa.metric?.srmr)
    },
    scalar: {
      cfi: finite(cfa.scalar?.cfi),
      rmsea: finite(cfa.scalar?.rmsea),
      srmr: finite(cfa.scalar?.srmr)
    },
    delta: {
      metricVsConfiguralCFI: finite(cfa.delta?.metricVsConfiguralCFI),
      scalarVsMetricCFI: finite(cfa.delta?.scalarVsMetricCFI),
      metricVsConfiguralRMSEA: finite(cfa.delta?.metricVsConfiguralRMSEA),
      scalarVsMetricRMSEA: finite(cfa.delta?.scalarVsMetricRMSEA)
    }
  };

  const difOk = difRows.filter(row => row.status === 'ok');
  const difFlags = difOk.filter(row => String(row.difFlag).toLowerCase() === 'true');

  const structuralChecks = {
    sixReliabilityDomainsOk: DOMAINS.every(domain => {
      const r = domainReliability[domain];
      return r.status === 'ok' && Number.isFinite(r.alphaRaw) && Number.isFinite(r.omegaTotal);
    }),
    cfaProducedFiniteDiagnostics: cfaSummary.status === 'ok'
      && ['configural','metric','scalar'].every(level =>
        Number.isFinite(cfaSummary[level].cfi) && Number.isFinite(cfaSummary[level].rmsea)
      )
      && Object.values(cfaSummary.delta).every(Number.isFinite),
    generalThetaMatched: matched.length >= Math.floor(plan.participants * 0.9)
      && Number.isFinite(correlation(estimatedZ, trueGZ)),
    fiveAgeBandsNormed: Object.values(bandRecovery).length === 5
      && Object.values(bandRecovery).every(b => Number.isFinite(b.n) && b.n > 0 && Number.isFinite(b.normMeanTheta) && Number.isFinite(b.normSdTheta)),
    externalLinkingProducedFiniteDiagnostics: externalSummary.linkedParticipants === plan.participants
      && ['pearsonR','spearmanRho','adjustedR2','cpiSlope','ageSlope'].every(key => Number.isFinite(externalSummary[key])),
    fullPipelineSucceeded: pipelineManifest.status === 'success',
    researchStandardScoreDisabled: normingManifest.standardScoreProduced === false,
    productIqLocked: pipelineManifest.safety?.productIqUnlocked === false
      && pipelineManifest.safety?.autoConvertToIq === false
      && pipelineManifest.safety?.autoPublishNorms === false
  };

  const allStructuralChecksPassed = Object.values(structuralChecks).every(Boolean);

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    status: allStructuralChecksPassed ? 'complete-diagnostic' : 'incomplete-diagnostic',
    configuration: {
      design: plan.design,
      participants: plan.participants,
      seed: plan.seed,
      analysisSeed: plan.analysisSeed,
      panel: 'pipeline',
      deterministicAnalysisSeed: true
    },
    recovery: {
      reliability: domainReliability,
      cfaInvariance: cfaSummary,
      generalTheta: {
        matchedParticipants: matched.length,
        correlationWithTrueG: correlation(estimatedZ, trueGZ),
        standardizedRmseVsTrueG: rmse(estimatedZ, trueGZ),
        fittedDomainsAvailable: finite(generalManifest.fittedDomainsAvailable)
      },
      norming: {
        ageBands: finite(normingManifest.ageBands),
        participants: finite(normingManifest.participants),
        bandMeanRecoveryRmse: bandMeanRmse,
        bands: bandRecovery
      },
      externalLinking: externalSummary,
      cleanPanelDif: {
        rows: difOk.length,
        flagged: difFlags.length,
        falsePositiveRate: difOk.length ? difFlags.length / difOk.length : null
      }
    },
    gates: {
      structuralChecks,
      allStructuralChecksPassed,
      scientificThresholdsPreRegistered: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    },
    safety: {
      containsRealParticipants: false,
      syntheticOnly: true,
      automaticUpload: false,
      participantBackend: false,
      autoPublishNorms: false,
      autoConvertCpiToIq: false,
      productNormEligible: false,
      productIqUnlocked: false
    },
    interpretation: 'Calibration v10 validates full-pipeline software behavior on clean synthetic known-truth data only. It is not population reliability, construct validity, external validity, representative norming, or IQ evidence.'
  };
}

function runCommand(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const plan = buildPlan(options);

  if (options.dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }

  fs.mkdirSync(plan.dataDir, { recursive: true });
  fs.mkdirSync(plan.analysisDir, { recursive: true });

  const generated = generateSynthetic({
    participants: plan.participants,
    seed: plan.seed,
    panel: 'pipeline'
  });

  if (generated.manifest.administeredUniqueItems !== 42) {
    throw new Error(`Expected 42 pipeline items, observed ${generated.manifest.administeredUniqueItems}`);
  }
  if (generated.manifest.administeredControlledDefects.length !== 0) {
    throw new Error('Calibration v10 clean pipeline panel must not administer controlled defect items');
  }

  fs.writeFileSync(plan.input, rowsToCsv(generated.rows));
  fs.writeFileSync(
    path.join(plan.dataDir, 'synthetic-truth-private.json'),
    JSON.stringify(generated.participantsMeta, null, 2) + '\n'
  );
  const externalRows = generateSyntheticExternal(generated.participantsMeta, plan.seed);
  fs.writeFileSync(plan.external, externalRowsToCsv(externalRows));

  runCommand(
    plan.pipelineCommand[0],
    plan.pipelineCommand.slice(1),
    { ALLOW_RESEARCH_STANDARD_SCORE: '0' }
  );

  const summary = summarizeOutputs(plan, generated);
  const summaryPath = path.join(plan.outDir, 'full-pipeline-recovery-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

  console.log(JSON.stringify({
    status: summary.status,
    generalThetaCorrelationWithTrueG: summary.recovery.generalTheta.correlationWithTrueG,
    bandMeanRecoveryRmse: summary.recovery.norming.bandMeanRecoveryRmse,
    externalCpiSlopeBias: summary.recovery.externalLinking.cpiSlopeBias,
    cleanPanelDifFalsePositiveRate: summary.recovery.cleanPanelDif.falsePositiveRate,
    productIqUnlocked: summary.gates.productIqUnlocked
  }, null, 2));

  if (summary.status !== 'complete-diagnostic') {
    throw new Error('Calibration v10 full-pipeline recovery did not satisfy structural completeness checks');
  }
  return summary;
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  VERSION,
  EXTERNAL_TRUTH,
  parseArgs,
  analysisSeed,
  externalRowsToCsv,
  generateSyntheticExternal,
  buildPlan,
  parseCsv,
  mean,
  sd,
  correlation,
  standardized,
  rmse,
  summarizeOutputs,
  main
};
