#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FORBIDDEN_NORMALIZED = new Set([
  'name','fullname','firstname','lastname','email','emailaddress','phone','phonenumber',
  'address','streetaddress','location','gps','latitude','longitude','ip','ipaddress',
  'accountid','userid','username','dateofbirth','dob','birthday'
]);

const AGE_BANDS = Object.freeze([
  [18, 24, '18–24'],
  [25, 34, '25–34'],
  [35, 44, '35–44'],
  [45, 54, '45–54'],
  [55, 65, '55–65']
]);

function normalizeHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function ageBand(age) {
  const hit = AGE_BANDS.find(([lo, hi]) => age >= lo && age <= hi);
  return hit ? hit[2] : null;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const pushCell = () => { row.push(cell); cell = ''; };
  const pushRow = () => {
    pushCell();
    if (row.some(value => String(value).length)) rows.push(row);
    row = [];
  };
  const input = String(text || '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      pushCell();
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      pushRow();
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) pushRow();
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map(value => String(value).trim());
  const records = rows.slice(1).map(values => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])));
  return { headers, records };
}

function csvCell(value) {
  if (value == null) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function assertNoForbiddenHeaders(headers, mapping) {
  const allowedId = normalizeHeader(mapping.participantIdColumn);
  const forbidden = headers.filter(header => {
    const normalized = normalizeHeader(header);
    if (normalized === allowedId && !FORBIDDEN_NORMALIZED.has(normalized)) return false;
    return FORBIDDEN_NORMALIZED.has(normalized);
  });
  if (forbidden.length) throw new Error(`Direct-identifier-like columns are not allowed: ${forbidden.join(', ')}`);
}

function pseudonym(datasetId, rawId) {
  return `public-${crypto.createHash('sha256').update(`${datasetId}:${rawId}`).digest('hex').slice(0, 20)}`;
}

function binaryValue(value, mapping) {
  const text = String(value).trim().toLowerCase();
  const correct = (mapping.correctValues || ['1','true','correct']).map(v => String(v).trim().toLowerCase());
  const incorrect = (mapping.incorrectValues || ['0','false','incorrect']).map(v => String(v).trim().toLowerCase());
  if (correct.includes(text)) return 1;
  if (incorrect.includes(text)) return 0;
  return null;
}

function normalizePublicDataset(csvText, mapping = {}) {
  if (!mapping.datasetId) throw new Error('mapping.datasetId is required');
  if (!mapping.participantIdColumn) throw new Error('mapping.participantIdColumn is required');
  if (!mapping.ageColumn) throw new Error('mapping.ageColumn is required');
  if (!Array.isArray(mapping.itemColumns) || mapping.itemColumns.length < 1) throw new Error('mapping.itemColumns must be a non-empty array');
  if (mapping.itemContentStored === true || mapping.scoringKeyStored === true) {
    throw new Error('This adapter accepts scored response columns only; item content and scoring keys must not be stored.');
  }

  const { headers, records } = parseCsv(csvText);
  assertNoForbiddenHeaders(headers, mapping);
  const required = [mapping.participantIdColumn, mapping.ageColumn, ...mapping.itemColumns];
  const missing = required.filter(column => !headers.includes(column));
  if (missing.length) throw new Error(`Missing mapped columns: ${missing.join(', ')}`);

  const rows = [];
  const participants = new Map();
  for (const record of records) {
    const rawId = String(record[mapping.participantIdColumn] || '').trim();
    const age = Number(record[mapping.ageColumn]);
    if (!rawId || !Number.isInteger(age) || age < 18 || age > 65) continue;
    const sourceKey = pseudonym(mapping.datasetId, rawId);
    participants.set(sourceKey, { sourceKey, ageYears: age, ageBand: ageBand(age) });
    for (const itemColumn of mapping.itemColumns) {
      const correct = binaryValue(record[itemColumn], mapping);
      if (correct == null) continue;
      rows.push({
        schemaVersion: 1,
        datasetId: mapping.datasetId,
        sourceKind: 'public-external-dataset',
        sourceKey,
        ageYears: age,
        ageBand: ageBand(age),
        externalItemId: `${mapping.datasetId}:${itemColumn}`,
        correct,
        productNormEligible: false,
        cilItem: false
      });
    }
  }

  return {
    rows,
    manifest: {
      schemaVersion: 1,
      adapter: 'public-external-scored-response-v1',
      datasetId: mapping.datasetId,
      licenseReference: mapping.licenseReference || null,
      sourceReference: mapping.sourceReference || null,
      participants: participants.size,
      rows: rows.length,
      sourceKind: 'public-external-dataset',
      containsItemContent: false,
      containsScoringKey: false,
      containsDirectIdentifiers: false,
      participantIdsPseudonymized: true,
      productNormEligible: false,
      productIqUnlocked: false,
      warning: 'External/public data validate methods or convergent evidence only. They must not be merged into Cognitive IQ Lab product norms.'
    }
  };
}

const OUT_COLUMNS = [
  'schemaVersion','datasetId','sourceKind','sourceKey','ageYears','ageBand',
  'externalItemId','correct','productNormEligible','cilItem'
];

function rowsToCsv(rows) {
  const header = OUT_COLUMNS.join(',');
  const body = rows.map(row => OUT_COLUMNS.map(key => csvCell(row[key])).join(',')).join('\n');
  return `${header}\n${body}${body ? '\n' : ''}`;
}

function main(argv = process.argv.slice(2)) {
  const input = argv[0];
  const mappingPath = argv[1];
  const outDir = argv[2] || 'calibration/output/public-external';
  if (!input || !mappingPath) {
    console.error('Usage: node scripts/normalize-public-dataset.js <input.csv> <mapping.json> [output-dir]');
    process.exitCode = 2;
    return;
  }
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  const normalized = normalizePublicDataset(fs.readFileSync(input, 'utf8'), mapping);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'external-scored-responses.csv'), rowsToCsv(normalized.rows));
  fs.writeFileSync(path.join(outDir, 'external-dataset-manifest.json'), JSON.stringify(normalized.manifest, null, 2) + '\n');
  console.log(`Normalized public dataset: ${normalized.manifest.participants} participants, ${normalized.manifest.rows} scored rows.`);
  console.log('Source remains isolated from Cognitive IQ Lab norms.');
}

if (require.main === module) main();

module.exports = {
  FORBIDDEN_NORMALIZED,
  normalizeHeader,
  ageBand,
  parseCsv,
  pseudonym,
  binaryValue,
  normalizePublicDataset,
  rowsToCsv,
  main
};
