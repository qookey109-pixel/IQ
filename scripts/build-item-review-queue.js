#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildReviewQueue } = require('../calibration/item-review-engine');

function parseCsv(text) {
  const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const parseLine = line => {
    const out = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        out.push(cell);
        cell = '';
      } else cell += ch;
    }
    out.push(cell);
    return out;
  };
  const headers = parseLine(lines[0]).map(x => x.trim());
  return lines.slice(1).map(line => {
    const cells = parseLine(line);
    return Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? '']));
  });
}

function readRows(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  if (filePath.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.items)) return parsed.items;
    if (Array.isArray(parsed.rows)) return parsed.rows;
    throw new Error('JSON input must be an array or contain items/rows array');
  }
  if (filePath.toLowerCase().endsWith('.csv')) return parseCsv(text);
  throw new Error('Input must be .json or .csv');
}

function main(argv = process.argv.slice(2)) {
  const input = argv[0];
  const output = argv[1] || path.join('calibration', 'output', 'item-review-queue.json');
  if (!input) {
    console.error('Usage: node scripts/build-item-review-queue.js <item-stats.json|csv> [output.json]');
    process.exitCode = 2;
    return;
  }

  const rows = readRows(input);
  const report = buildReviewQueue(rows);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(`Item review queue written: ${output}`);
  console.log(`KEEP=${report.counts.KEEP} WATCH=${report.counts.WATCH} REVIEW=${report.counts.REVIEW} REWRITE=${report.counts.REWRITE} RETIRE=${report.counts.RETIRE}`);
}

if (require.main === module) main();

module.exports = { parseCsv, readRows, main };
