#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  loadProtocol,
  generateProfiledSynthetic
} = require('./run-confirmatory-reliability-v11.js');
const {
  DOMAINS,
  buildSyntheticBank
} = require('./generate-synthetic-calibration.js');
const { parseCsv } = require('./run-full-pipeline-recovery.js');

const VERSION = 'CIL-V11-DIF-CONDITIONING-POSTFAILURE-DIAGNOSTIC-2026.09.1';
const EFFECTSIZE_WRAPPER = 'scripts/run-v11-dif-effectsize-postfailure-diagnostic.js';
const TRUE_THETA_DIAGNOSTIC = 'calibration/analysis/v11_dif_true_theta_diagnostic.R';
const TARGET_CONDITION_ID = 'high-information-control';
const TARGET_SEED = 'cil-v11-high-information-control-r01';
const TARGET_ANALYSIS_SEED = 2147221403;

function parseArgs(argv) {
  const out = {
    protocol: 'calibration/confirmatory-reliability-v11.json',
    outDir: 'calibration/output/v11-dif-postfailure-conditioning-diagnostic',
    dryRun: false
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--protocol') out.protocol = String(argv[++i]);
    else if (argv[i] === '--out') out.outDir = String(argv[++i]);
    else if (argv[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

function finiteOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mean(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
}

function sd(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (nums.length < 2) return null;
  const m = mean(nums);
  return Math.sqrt(nums.reduce((sum, value) => sum + (value - m) ** 2, 0) / (nums.length - 1));
}

function correlation(a, b) {
  const pairs = a.map((x, i) => [Number(x), Number(b[i])])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 3) return null;
  const xs = pairs.map(pair => pair[0]);
  const ys = pairs.map(pair => pair[1]);
  const mx = mean(xs);
  const my = mean(ys);
  let numerator = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i] - mx;
    const y = ys[i] - my;
    numerator += x * y;
    dx += x * x;
    dy += y * y;
  }
  const denominator = Math.sqrt(dx * dy);
  return denominator > 0 ? numerator / denominator : null;
}

function standardize(values) {
  const nums = values.map(Number);
  const m = mean(nums);
  const s = sd(nums);
  if (!Number.isFinite(m) || !Number.isFinite(s) || s <= 0) return nums.map(() => null);
  return nums.map(value => Number.isFinite(value) ? (value - m) / s : null);
}

function runCommand(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
}

function csvCell(value) {
  if (value == null) return '';
  const text = String(value);
  return /[\",\n\r]/.test(text) ? `\"${text.replaceAll('\"', '\"\"')}\"` : text;
}

function truthRowsToCsv(participantsMeta) {
  const columns = ['sourceKey', 'domain', 'trueTheta'];
  const rows = [];
  for (const person of participantsMeta) {
    for (const domain of DOMAINS) {
      rows.push({
        sourceKey: person.sourceKey,
        domain,
        trueTheta: person.syntheticDomainTheta?.[domain]
      });
    }
  }
  return [
    columns.join(','),
    ...rows.map(row => columns.map(key => csvCell(row[key])).join(','))
  ].join('\n') + '\n';
}

function estimatedThetaValue(row) {
  for (const key of ['F1', 'theta', 'Theta', 'THETA_1']) {
    const value = finiteOrNull(row[key]);
    if (value != null) return value;
  }
  return null;
}

function buildThetaAudit(participantsMeta, estimatedRows) {
  const truth = new Map();
  for (const person of participantsMeta) {
    for (const domain of DOMAINS) {
      truth.set(`${person.sourceKey}\u0000${domain}`, {
        ageYears: Number(person.ageYears),
        ageBand: person.ageBand,
        trueTheta: Number(person.syntheticDomainTheta?.[domain])
      });
    }
  }

  const domains = {};
  let maxAbsoluteAgeBandBiasZ = 0;
  for (const domain of DOMAINS) {
    const pairs = estimatedRows
      .filter(row => String(row.domain) === domain)
      .map(row => {
        const t = truth.get(`${row.sourceKey}\u0000${domain}`);
        const estimatedTheta = estimatedThetaValue(row);
        if (!t || !Number.isFinite(estimatedTheta) || !Number.isFinite(t.trueTheta)) return null;
        return { ...t, estimatedTheta };
      })
      .filter(Boolean);

    const trueValues = pairs.map(x => x.trueTheta);
    const estimatedValues = pairs.map(x => x.estimatedTheta);
    const trueZ = standardize(trueValues);
    const estimatedZ = standardize(estimatedValues);
    const enriched = pairs.map((pair, i) => ({ ...pair, trueZ: trueZ[i], estimatedZ: estimatedZ[i] }));
    const bands = [...new Set(enriched.map(x => x.ageBand))].map(ageBand => {
      const group = enriched.filter(x => x.ageBand === ageBand);
      const trueMeanZ = mean(group.map(x => x.trueZ));
      const estimatedMeanZ = mean(group.map(x => x.estimatedZ));
      const meanBiasZ = Number.isFinite(trueMeanZ) && Number.isFinite(estimatedMeanZ)
        ? estimatedMeanZ - trueMeanZ
        : null;
      if (Number.isFinite(meanBiasZ)) maxAbsoluteAgeBandBiasZ = Math.max(maxAbsoluteAgeBandBiasZ, Math.abs(meanBiasZ));
      return {
        ageBand,
        n: group.length,
        trueMeanZ,
        estimatedMeanZ,
        meanBiasZ
      };
    });

    domains[domain] = {
      matchedParticipants: pairs.length,
      ageVsTrueThetaCorrelation: correlation(pairs.map(x => x.ageYears), trueValues),
      ageVsEstimatedThetaCorrelation: correlation(pairs.map(x => x.ageYears), estimatedValues),
      trueVsEstimatedThetaCorrelation: correlation(trueValues, estimatedValues),
      ageBands: bands
    };
  }

  return { domains, maxAbsoluteAgeBandBiasZ };
}

function classifyConditioningFinding(estimatedMaterial, trueMaterial) {
  if (!Number.isFinite(estimatedMaterial) || !Number.isFinite(trueMaterial)) return 'incomplete';
  if (estimatedMaterial > 0 && trueMaterial === 0) return 'estimated-theta-conditioning-artifact-supported';
  if (trueMaterial < estimatedMaterial) return 'estimated-theta-conditioning-contributes';
  return 'estimated-theta-conditioning-not-sufficient';
}

function buildItemCharacteristics(itemIds, multiplier) {
  const bank = new Map(buildSyntheticBank().map(item => [item.itemId, item]));
  return [...new Set(itemIds)].sort().map(itemId => {
    const item = bank.get(itemId);
    return item ? {
      itemId,
      domain: item.domain,
      baseDiscrimination: item.a,
      effectiveDiscrimination: item.a * multiplier,
      difficultyB: item.b,
      difficulty: item.difficulty,
      controlledDefect: item.defect || null,
      programmedAgeDif: item.ageDif || 0
    } : { itemId, missingFromSyntheticBank: true };
  });
}

function buildDryRun(args) {
  return {
    version: VERSION,
    effectSizeWrapper: EFFECTSIZE_WRAPPER,
    trueThetaDiagnostic: TRUE_THETA_DIAGNOSTIC,
    targetConditionId: TARGET_CONDITION_ID,
    targetSeed: TARGET_SEED,
    targetAnalysisSeed: TARGET_ANALYSIS_SEED,
    protocol: args.protocol,
    outDir: args.outDir,
    governance: {
      postFailureDiagnosticOnly: true,
      confirmatoryVerdictRemains: 'failed-confirmatory',
      changesConfirmatoryVerdict: false,
      thresholdChangesAllowed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.dryRun) {
    const dry = buildDryRun(args);
    console.log(JSON.stringify(dry, null, 2));
    return dry;
  }

  runCommand(process.execPath, [
    EFFECTSIZE_WRAPPER,
    '--protocol', args.protocol,
    '--out', args.outDir
  ]);

  const protocol = loadProtocol(args.protocol);
  const condition = protocol.design.conditions.find(x => x.id === TARGET_CONDITION_ID);
  if (!condition || Number(condition.itemDiscriminationMultiplier) !== 2) {
    throw new Error('Frozen high-information condition drift');
  }
  const generated = generateProfiledSynthetic({
    participants: protocol.design.participantsPerReplicate,
    seed: TARGET_SEED,
    condition
  });

  const replicateRoot = path.join(args.outDir, 'high-information-control', 'replicate-01');
  const input = path.join(replicateRoot, 'private-synthetic', 'calibration-responses.csv');
  const truthPath = path.join(replicateRoot, 'private-synthetic', 'v11-true-domain-theta.csv');
  const estimatedThetaPath = path.join(replicateRoot, 'analysis', 'participant-domain-theta.csv');
  const effectPath = path.join(args.outDir, 'v11-dif-postfailure-effectsize-diagnostic.json');
  const trueThetaPath = path.join(args.outDir, 'v11-dif-true-theta-private-diagnostic.json');
  for (const required of [input, estimatedThetaPath, effectPath]) {
    if (!fs.existsSync(required)) throw new Error(`Missing conditioning diagnostic prerequisite: ${required}`);
  }

  fs.writeFileSync(truthPath, truthRowsToCsv(generated.participantsMeta));
  runCommand('Rscript', [TRUE_THETA_DIAGNOSTIC, input, truthPath, trueThetaPath]);

  const effectReport = JSON.parse(fs.readFileSync(effectPath, 'utf8'));
  const trueThetaReport = JSON.parse(fs.readFileSync(trueThetaPath, 'utf8'));
  const estimatedRows = parseCsv(fs.readFileSync(estimatedThetaPath, 'utf8'));
  const thetaAudit = buildThetaAudit(generated.participantsMeta, estimatedRows);

  const estimatedMaterial = finiteOrNull(effectReport?.effectSizeAudit?.materialByMcFaddenR2);
  const trueMaterial = finiteOrNull(trueThetaReport?.summary?.materialByMcFaddenR2);
  const finding = classifyConditioningFinding(estimatedMaterial, trueMaterial);
  const relevantIds = [
    ...(effectReport?.effectSizeAudit?.materialItems || []).map(x => x.itemId),
    ...(trueThetaReport?.materialItems || []).map(x => x.itemId),
    ...(trueThetaReport?.flaggedItems || []).map(x => x.itemId)
  ];

  const report = {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    status: trueThetaReport?.summary?.extractionComplete === true
      ? 'post-failure-conditioning-diagnostic-complete'
      : 'post-failure-conditioning-diagnostic-incomplete',
    scope: effectReport.scope,
    sourceEvidence: effectReport.sourceEvidence,
    estimatedThetaDif: {
      statisticalFlags: effectReport.effectSizeAudit.statisticalFlags,
      materialByMcFaddenR2: estimatedMaterial,
      statisticalFlagRate: effectReport.effectSizeAudit.statisticalFlagRate,
      materialByMcFaddenR2Rate: effectReport.effectSizeAudit.materialByMcFaddenR2Rate,
      materialItems: effectReport.effectSizeAudit.materialItems
    },
    trueThetaDif: {
      conditioningSource: trueThetaReport?.conditioning?.source || 'synthetic generator true domain theta',
      statisticalFlags: finiteOrNull(trueThetaReport?.summary?.statisticalFlags),
      materialByMcFaddenR2: trueMaterial,
      statisticalFlagRate: finiteOrNull(trueThetaReport?.summary?.statisticalFlagRate),
      materialByMcFaddenR2Rate: finiteOrNull(trueThetaReport?.summary?.materialByMcFaddenR2Rate),
      extractionComplete: trueThetaReport?.summary?.extractionComplete === true,
      flaggedItems: trueThetaReport?.flaggedItems || [],
      materialItems: trueThetaReport?.materialItems || []
    },
    thetaRecoveryAudit: thetaAudit,
    itemCharacteristics: buildItemCharacteristics(relevantIds, Number(condition.itemDiscriminationMultiplier)),
    finding: {
      classification: finding,
      estimatedMaterialFlags: estimatedMaterial,
      trueThetaMaterialFlags: trueMaterial,
      interpretation: finding === 'estimated-theta-conditioning-artifact-supported'
        ? 'Material DIF appears under response-estimated theta but disappears when conditioning on generator-known true domain theta; this supports a theta-estimation/conditioning artifact in the diagnostic pipeline.'
        : finding === 'estimated-theta-conditioning-contributes'
          ? 'Known-truth conditioning reduces material DIF but does not eliminate it; theta estimation contributes but is not the sole source.'
          : finding === 'estimated-theta-conditioning-not-sufficient'
            ? 'Known-truth conditioning does not reduce material DIF; investigate finite-sample behavior, group modeling, missingness, or generator/model mismatch next.'
            : 'Conditioning comparison is incomplete.'
    },
    productionEffectSizeDefect: {
      difDeltaR2AvailableItems: effectReport.effectSizeAudit.productionDifDeltaR2AvailableItems,
      difDeltaR2MissingItems: effectReport.effectSizeAudit.productionDifDeltaR2MissingItems,
      causalForV11Failure: false
    },
    governance: {
      postFailureDiagnosticOnly: true,
      confirmatoryVerdictRemains: 'failed-confirmatory',
      changesConfirmatoryVerdict: false,
      thresholdChangesAllowed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false
    }
  };

  const outputPath = path.join(args.outDir, 'v11-dif-postfailure-conditioning-diagnostic.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    status: report.status,
    estimatedMaterialFlags: report.finding.estimatedMaterialFlags,
    trueThetaMaterialFlags: report.finding.trueThetaMaterialFlags,
    classification: report.finding.classification,
    maxAbsoluteAgeBandBiasZ: report.thetaRecoveryAudit.maxAbsoluteAgeBandBiasZ,
    confirmatoryVerdictRemains: report.governance.confirmatoryVerdictRemains,
    productIqUnlocked: report.governance.productIqUnlocked
  }, null, 2));
  return report;
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
  TARGET_CONDITION_ID,
  TARGET_SEED,
  TARGET_ANALYSIS_SEED,
  parseArgs,
  finiteOrNull,
  mean,
  sd,
  correlation,
  standardize,
  truthRowsToCsv,
  estimatedThetaValue,
  buildThetaAudit,
  classifyConditioningFinding,
  buildItemCharacteristics,
  buildDryRun,
  main
};
