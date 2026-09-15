#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DOMAINS = Object.freeze([
  'verbal-comprehension',
  'fluid-reasoning',
  'visual-spatial',
  'working-memory',
  'processing-speed',
  'quantitative-reasoning'
]);

const AGE_BANDS = Object.freeze([
  [18, 24, '18–24'],
  [25, 34, '25–34'],
  [35, 44, '35–44'],
  [45, 54, '45–54'],
  [55, 65, '55–65']
]);

function ageBand(age) {
  const hit = AGE_BANDS.find(([lo, hi]) => age >= lo && age <= hi);
  return hit ? hit[2] : null;
}

function hashSeed(input) {
  let h = 2166136261 >>> 0;
  for (const ch of String(input)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function logistic(x) {
  return 1 / (1 + Math.exp(-x));
}

function csvCell(value) {
  if (value == null) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildSyntheticBank() {
  const items = [];
  for (let d = 0; d < DOMAINS.length; d++) {
    const domain = DOMAINS[d];
    for (let i = 0; i < 49; i++) {
      const tier = i % 7;
      const b = [-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5][tier];
      let a = 0.85 + ((i * 17 + d * 11) % 70) / 100;
      let defect = null;
      let ageDif = 0;

      if (i === 0) {
        a = 0.08;
        defect = 'low-discrimination-control';
      } else if (i === 1) {
        ageDif = 0.70;
        defect = 'age-dif-control';
      } else if (i === 2) {
        a = -0.15;
        defect = 'negative-discrimination-control';
      }

      items.push({
        itemId: `SYN-${String(d + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
        domain,
        family: `synthetic-family-${(i % 7) + 1}`,
        semanticKey: `synthetic:${domain}:${Math.floor(i / 7) + 1}`,
        difficulty: b <= -0.75 ? 'easy' : b >= 0.75 ? 'hard' : 'medium',
        a,
        b,
        ageDif,
        defect
      });
    }
  }
  return items;
}

function chooseItemsForParticipant(bank, participantIndex) {
  const rows = [];
  for (const domain of DOMAINS) {
    const pool = bank.filter(item => item.domain === domain);
    for (let j = 0; j < 7; j++) {
      const index = (participantIndex * 7 + j * 8) % pool.length;
      rows.push(pool[index]);
    }
  }
  return rows;
}

function generateSynthetic(options = {}) {
  const participants = Math.max(10, Number(options.participants) || 600);
  const seed = String(options.seed || 'cil-offline-v1');
  const rand = mulberry32(hashSeed(seed));
  const bank = buildSyntheticBank();
  const rows = [];
  const participantsMeta = [];

  for (let p = 0; p < participants; p++) {
    const age = 18 + (p * 13 + Math.floor(rand() * 7)) % 48;
    const band = ageBand(age);
    const g = normal(rand);
    const sourceKey = `synthetic-${String(p + 1).padStart(6, '0')}`;
    const sessionId = `synthetic-session-${String(p + 1).padStart(6, '0')}`;
    const chosen = chooseItemsForParticipant(bank, p);
    let correctCount = 0;
    const personRows = [];

    const domainTheta = Object.fromEntries(DOMAINS.map(domain => [domain, 0.75 * g + 0.66 * normal(rand)]));

    for (const item of chosen) {
      const older = age >= 45 ? 1 : 0;
      const difShift = item.ageDif ? item.ageDif * older : 0;
      const pCorrect = logistic(item.a * (domainTheta[item.domain] - item.b) + difShift);
      const correct = rand() < pCorrect ? 1 : 0;
      const timeoutChance = item.domain === 'processing-speed' ? 0.035 : 0.006;
      const timeout = rand() < timeoutChance ? 1 : 0;
      const skipped = timeout ? 1 : (rand() < 0.006 ? 1 : 0);
      const finalCorrect = skipped ? 0 : correct;
      correctCount += finalCorrect;
      const correctOption = (hashSeed(item.itemId) + p) % 4;
      const selectedOption = skipped ? '' : (finalCorrect ? correctOption : (correctOption + 1 + (p % 3)) % 4);
      const secondsBase = item.domain === 'processing-speed' ? 8 : 28;
      const seconds = Math.max(1.0, Math.round((secondsBase + Math.abs(normal(rand)) * secondsBase * 0.45) * 10) / 10);

      personRows.push({
        schemaVersion: 1,
        sourceKey,
        sessionId,
        ageYears: age,
        ageBand: band,
        bankVersion: 'synthetic-v1',
        bankRevision: seed,
        scoringVersion: 'synthetic-method-validation-only',
        formId: `synthetic-matrix-${String(p % 56).padStart(2, '0')}`,
        itemId: item.itemId,
        domain: item.domain,
        family: item.family,
        semanticKey: item.semanticKey,
        difficulty: item.difficulty,
        selectedOption,
        correctOption,
        correct: finalCorrect,
        skipped,
        timeout,
        seconds,
        cpi: '',
        iqEstimate: ''
      });
    }

    const cpi = Math.round((correctCount / 42) * 100);
    personRows.forEach(row => { row.cpi = cpi; });
    rows.push(...personRows);
    participantsMeta.push({ sourceKey, ageYears: age, ageBand: band, syntheticG: g, cpi });
  }

  return {
    rows,
    manifest: {
      schemaVersion: 1,
      generator: 'Cognitive IQ Lab Offline Validation Lab',
      generatedAt: new Date().toISOString(),
      seed,
      participants,
      rows: rows.length,
      items: bank.length,
      domains: DOMAINS,
      sourceKind: 'synthetic',
      productNormEligible: false,
      productIqUnlocked: false,
      containsRealParticipants: false,
      containsDirectIdentifiers: false,
      controlledDefects: bank.filter(item => item.defect).map(({ itemId, domain, defect }) => ({ itemId, domain, defect })),
      warning: 'Synthetic responses validate software behavior only. They are not reliability, validity, fairness, norming, or IQ evidence.'
    },
    participantsMeta
  };
}

const CSV_COLUMNS = [
  'schemaVersion','sourceKey','sessionId','ageYears','ageBand','bankVersion','bankRevision',
  'scoringVersion','formId','itemId','domain','family','semanticKey','difficulty',
  'selectedOption','correctOption','correct','skipped','timeout','seconds','cpi','iqEstimate'
];

function rowsToCsv(rows) {
  const header = CSV_COLUMNS.join(',');
  const body = rows.map(row => CSV_COLUMNS.map(key => csvCell(row[key])).join(',')).join('\n');
  return `${header}\n${body}${body ? '\n' : ''}`;
}

function parseArgs(argv) {
  const options = { participants: 600, seed: 'cil-offline-v1', outDir: 'calibration/output/synthetic' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--participants') options.participants = Number(argv[++i]);
    else if (argv[i] === '--seed') options.seed = argv[++i];
    else if (argv[i] === '--out') options.outDir = argv[++i];
  }
  return options;
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const generated = generateSynthetic(options);
  fs.mkdirSync(options.outDir, { recursive: true });
  fs.writeFileSync(path.join(options.outDir, 'calibration-responses.csv'), rowsToCsv(generated.rows));
  fs.writeFileSync(path.join(options.outDir, 'synthetic-manifest.json'), JSON.stringify(generated.manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(options.outDir, 'synthetic-participants.json'), JSON.stringify(generated.participantsMeta, null, 2) + '\n');
  console.log(`Synthetic calibration dataset written: ${generated.manifest.participants} participants, ${generated.manifest.rows} rows.`);
  console.log('Method validation only. Product norms and IQ remain locked.');
}

if (require.main === module) main();

module.exports = {
  DOMAINS,
  AGE_BANDS,
  ageBand,
  hashSeed,
  mulberry32,
  buildSyntheticBank,
  chooseItemsForParticipant,
  generateSynthetic,
  rowsToCsv,
  parseArgs,
  main
};
