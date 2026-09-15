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
const INCLUDED_SOURCE_AGE_BANDS = Object.freeze({
  '19to24': '19–24',
  '25to29': '25–29',
  '30to34': '30–34',
  '35to39': '35–39',
  '40to49': '40–49',
  '50to59': '50–59'
});
const EXCLUDED_AMBIGUOUS_SOURCE_AGE_BANDS = Object.freeze(['18andUnder', '60andOver']);
const KNOWN_SOURCE_AGE_BANDS = Object.freeze([
  '18andUnder',
  ...Object.keys(INCLUDED_SOURCE_AGE_BANDS),
  '60andOver'
]);
const REAL_RUN_MIN_PARTICIPANTS = 500;
const REAL_RUN_MIN_SCORED_ROWS = 500;

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

function canonicalSourceAgeBand(value) {
  const token = String(value ?? '').trim();
  if (!token) return null;
  return KNOWN_SOURCE_AGE_BANDS.find(candidate => candidate.toLowerCase() === token.toLowerCase()) || null;
}

function parseSourceAgeBand(value) {
  const sourceBand = canonicalSourceAgeBand(value);
  if (!sourceBand) return null;
  if (Object.prototype.hasOwnProperty.call(INCLUDED_SOURCE_AGE_BANDS, sourceBand)) {
    return {
      sourceBand,
      ageBand: INCLUDED_SOURCE_AGE_BANDS[sourceBand],
      included: true
    };
  }
  return { sourceBand, ageBand: null, included: false };
}

function participantKey(rowIndex) {
  return `icar-${crypto.createHash('sha256').update(`${DATASET_ID}:${rowIndex}`).digest('hex').slice(0, 20)}`;
}

function assertRealRunMinimums(normalized, minParticipants = REAL_RUN_MIN_PARTICIPANTS, minScoredRows = REAL_RUN_MIN_SCORED_ROWS) {
  const manifest = normalized?.manifest || {};
  if (!Number.isInteger(manifest.participantsWithScoredResponses) || manifest.participantsWithScoredResponses < minParticipants) {
    throw new Error(`Too few scored ICAR participants for real validation: ${manifest.participantsWithScoredResponses ?? 'missing'} < ${minParticipants}.`);
  }
  if (!Number.isInteger(manifest.scoredRows) || manifest.scoredRows < minScoredRows) {
    throw new Error(`Too few scored ICAR rows for real validation: ${manifest.scoredRows ?? 'missing'} < ${minScoredRows}.`);
  }
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

  const observedAgeTokens = [...new Set(records
    .map(record => String(record[ageColumn] ?? '').trim())
    .filter(Boolean))];
  const unknownAgeTokens = observedAgeTokens.filter(token => !canonicalSourceAgeBand(token));
  if (unknownAgeTokens.length) {
    throw new Error(`Unexpected ICAR source age categories: ${unknownAgeTokens.join(', ')}.`);
  }

  const rows = [];
  const participants = new Set();
  const ageBands = {};
  let sourceRecordsInIncludedAgeBands = 0;
  let sourceRecordsExcludedAmbiguousAgeBands = 0;

  records.forEach((record, index) => {
    const age = parseSourceAgeBand(record[ageColumn]);
    if (!age) return;
    if (!age.included) {
      sourceRecordsExcludedAmbiguousAgeBands += 1;
      return;
    }
    sourceRecordsInIncludedAgeBands += 1;
    const sourceKey = participantKey(index + 1);
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
        sourceAgeBand: age.sourceBand,
        ageBand: age.ageBand,
        externalItemId: `${DATASET_ID}:${canonical}`,
        externalDomain: normalizeDomain(column),
        correct,
        productNormEligible: false,
        cilItem: false,
        productIqUnlocked: false,
        autoCpiToIq: false
      });
    }

    if (participantHasResponse) {
      participants.add(sourceKey);
      ageBands[age.ageBand] = (ageBands[age.ageBand] || 0) + 1;
    }
  });

  return {
    rows,
    manifest: {
      schemaVersion: 1,
      adapter: 'icar-sapa-scored-response-v3',
      datasetId: DATASET_ID,
      license: 'CC0 Public Domain Dedication',
      source: 'https://doi.org/10.7910/DVN/AD9RVY',
      article: 'https://doi.org/10.5334/jopd.25',
      requestedAdultAgeBoundary: [18, 65],
      publishedAgeEncoding: 'categorical-bands',
      includedSourceAgeBands: Object.keys(INCLUDED_SOURCE_AGE_BANDS),
      normalizedAgeBands: Object.values(INCLUDED_SOURCE_AGE_BANDS),
      excludedAmbiguousSourceAgeBands: [...EXCLUDED_AMBIGUOUS_SOURCE_AGE_BANDS],
      ageCoverage: {
        minimumKnownAge: 19,
        maximumKnownAge: 59,
        exactAgeImputed: false,
        rationale: 'Only published age bands fully contained within the requested 18–65 boundary are included.'
      },
      sourceRecordsInIncludedAgeBands,
      sourceRecordsExcludedAmbiguousAgeBands,
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
      exactAgeImputed: false,
      productNormEligible: false,
      productIqUnlocked: false,
      autoCpiToIq: false,
      warning: 'ICAR/SAPA validates psychometric methods and external structure only. It is not a Cognitive IQ Lab population norm.'
    }
  };
}

const OUT_COLUMNS = [
  'schemaVersion','datasetId','sourceKind','sourceKey','sourceAgeBand','ageBand',
  'externalItemId','externalDomain','correct','productNormEligible','cilItem','productIqUnlocked','autoCpiToIq'
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
  assertRealRunMinimums(normalized);
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
  INCLUDED_SOURCE_AGE_BANDS,
  EXCLUDED_AMBIGUOUS_SOURCE_AGE_BANDS,
  KNOWN_SOURCE_AGE_BANDS,
  REAL_RUN_MIN_PARTICIPANTS,
  REAL_RUN_MIN_SCORED_ROWS,
  canonicalItemId,
  normalizeDomain,
  detectAgeColumn,
  detectItemColumns,
  parseBinary,
  canonicalSourceAgeBand,
  parseSourceAgeBand,
  participantKey,
  assertRealRunMinimums,
  normalizeIcarCsv,
  rowsToCsv,
  main
};
