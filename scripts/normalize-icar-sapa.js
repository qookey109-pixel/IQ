#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./normalize-public-dataset.js');

const DATASET_ID = 'icar-sapa-2010-2013';
// The published R object uses labels such as VR.04 / LN.58. Some CSV mirrors
// remove punctuation, so accept both forms and canonicalize before analysis.
const ITEM_RE = /^(LN|MR|VR|R3D)[._-]?(\d+)$/i;
const DOMAIN_COUNTS = Object.freeze({ LN: 9, MR: 11, VR: 16, R3D: 24 });

function canonicalItemId(itemId) {
  const match = String(itemId ?? '').trim().match(ITEM_RE);
  if (!match) return null;
  const domain = match[1].toUpperCase();
  const number = Number(match[2]);
  if (!Number.isInteger(number) || number < 0) return null;
  return `${domain}${String(number).padStart(2, '0')}`;
}

function normalizeDomain(itemId) {
  const canonical = canonicalItemId(itemId);
  if (!canonical) return null;
  if (canonical.startsWith('R3D')) return 'R3D';
  if (canonical.startsWith('LN')) return 'LN';
  if (canonical.startsWith('MR')) return 'MR';
  if (canonical.startsWith('VR')) return 'VR';
  return null;
}

function ageBand(age) {
  if (age >= 18 && age <= 24) return '18–24';
  if (age <= 34) return '25–34';
  if (age <= 44) return '35–44';
  if (age <= 54) return '45–54';
  if (age <= 65) return '55–65';
  return null;
}

function detectAgeColumn(headers) {
  const exact = headers.find(name => /^age$/i.test(String(name).trim()));
  if (exact) return exact;
  return headers.find(name => /^(age[_ .-]?years?)$/i.test(String(name).trim())) || null;
}

function detectItemColumns(headers) {
  return headers.filter(header => ITEM_RE.test(String(header).trim()));
}

function parseBinary(value) {
  const text = String(value ?? '').trim();
  if (text === '1') return 1;
  if (text === '0') return 0;
  return null;
}

function participantKey(rowIndex) {
  return `icar-${crypto.createHash('sha256').update(`${DATASET_ID}:${rowIndex}`).digest('hex').slice(0, 20)}`;
}

function normalizeIcarCsv(csvText) {
  const { headers, records } = parseCsv(csvText);
  if (!headers.length) throw new Error('ICAR CSV is empty.');

  const ageColumn = detectAgeColumn(headers);
  if (!ageColumn) throw new Error('Could not locate ICAR age column.');

  const itemColumns = detectItemColumns(headers);
  if (itemColumns.length !== 60) {
    throw new Error(`Expected 60 scored ICAR item columns; found ${itemColumns.length}.`);
  }

  const canonicalItems = itemColumns.map(canonicalItemId);
  if (new Set(canonicalItems).size !== canonicalItems.length) {
    throw new Error('ICAR item columns collapse to duplicate canonical item IDs.');
  }

  const observedDomainCounts = itemColumns.reduce((acc, column) => {
    const domain = normalizeDomain(column);
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {});
  for (const [domain, expected] of Object.entries(DOMAIN_COUNTS)) {
    if (observedDomainCounts[domain] !== expected) {
      throw new Error(`Unexpected ${domain} item count: ${observedDomainCounts[domain] || 0}; expected ${expected}.`);
    }
  }

  const rows = [];
  const participants = new Set();
  const ageBands = {};
  let sourceRecordsInAdultRange = 0;

  records.forEach((record, index) => {
    const age = Number(record[ageColumn]);
    if (!Number.isInteger(age) || age < 18 || age > 65) return;
    sourceRecordsInAdultRange += 1;
    const sourceKey = participantKey(index + 1);
    const band = ageBand(age);
    let participantHasResponse = false;

    for (const column of itemColumns) {
      const correct = parseBinary(record[column]);
      if (correct == null) continue;
      participantHasResponse = true;
      const canonical = canonicalItemId(column);
      rows.push({
        schemaVersion: 1,
        datasetId: DATASET_ID,
        sourceKind: 'public-external-dataset',
        sourceKey,
        ageYears: age,
        ageBand: band,
        externalItemId: `${DATASET_ID}:${canonical}`,
        externalDomain: normalizeDomain(column),
        correct,
        productNormEligible: false,
        cilItem: false,
        productIqUnlocked: false
      });
    }

    if (participantHasResponse) {
      participants.add(sourceKey);
      ageBands[band] = (ageBands[band] || 0) + 1;
    }
  });

  return {
    rows,
    manifest: {
      schemaVersion: 1,
      adapter: 'icar-sapa-scored-response-v2',
      datasetId: DATASET_ID,
      license: 'CC0 Public Domain Dedication',
      source: 'https://doi.org/10.7910/DVN/AD9RVY',
      article: 'https://doi.org/10.5334/jopd.25',
      adultAgeFilter: [18, 65],
      sourceRecordsInAdultRange,
      participantsWithScoredResponses: participants.size,
      scoredRows: rows.length,
      itemColumns: itemColumns.length,
      canonicalItemColumns: canonicalItems,
      domainCounts: observedDomainCounts,
      ageBands,
      sparseMissingByDesignExpected: true,
      acceptsPublishedDotItemLabels: true,
      containsItemText: false,
      containsScoringKey: false,
      containsDirectIdentifiers: false,
      productNormEligible: false,
      productIqUnlocked: false,
      warning: 'ICAR/SAPA validates psychometric methods and external structure only. It is not a Cognitive IQ Lab population norm.'
    }
  };
}

const OUT_COLUMNS = [
  'schemaVersion','datasetId','sourceKind','sourceKey','ageYears','ageBand',
  'externalItemId','externalDomain','correct','productNormEligible','cilItem','productIqUnlocked'
];

function rowsToCsv(rows) {
  const header = OUT_COLUMNS.join(',');
  const esc = value => {
    if (value == null) return '';
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const body = rows.map(row => OUT_COLUMNS.map(key => esc(row[key])).join(',')).join('\n');
  return `${header}\n${body}${body ? '\n' : ''}`;
}

function main(argv = process.argv.slice(2)) {
  const input = argv[0];
  const outDir = argv[1] || 'calibration/output/external/icar-sapa';
  if (!input) {
    console.error('Usage: node scripts/normalize-icar-sapa.js <sapa-icar-scored.csv> [output-dir]');
    process.exitCode = 2;
    return;
  }
  const normalized = normalizeIcarCsv(fs.readFileSync(input, 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'external-scored-responses.csv'), rowsToCsv(normalized.rows));
  fs.writeFileSync(path.join(outDir, 'external-dataset-manifest.json'), JSON.stringify(normalized.manifest, null, 2) + '\n');
  console.log(`ICAR/SAPA normalized: ${normalized.manifest.participantsWithScoredResponses} participants, ${normalized.manifest.scoredRows} scored rows.`);
  console.log('External source remains isolated from Cognitive IQ Lab product norms.');
}

if (require.main === module) main();

module.exports = {
  DATASET_ID,
  ITEM_RE,
  DOMAIN_COUNTS,
  canonicalItemId,
  normalizeDomain,
  detectAgeColumn,
  detectItemColumns,
  parseBinary,
  participantKey,
  normalizeIcarCsv,
  rowsToCsv,
  main
};
