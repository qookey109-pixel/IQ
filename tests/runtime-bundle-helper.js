'use strict';

const fs = require('fs');
const assert = require('assert');

const INCLUDE_RE = /{%\s*include_relative\s+([^\s%]+)\s*%}/g;

function readIncludeSources(path) {
  const source = fs.readFileSync(path, 'utf8');
  return Array.from(source.matchAll(INCLUDE_RE), match => match[1]);
}

function stripFrontMatter(source) {
  return source.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
}

function renderJekyllIncludes(path) {
  const source = stripFrontMatter(fs.readFileSync(path, 'utf8'));
  return source.replace(INCLUDE_RE, (_match, file) => fs.readFileSync(file, 'utf8'));
}

function getProductionRuntimeSources(html) {
  const tags = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
  assert.strictEqual(tags.length, 1, 'production page must load exactly one JavaScript bundle');
  assert.strictEqual(tags[0][1].split('?')[0], 'runtime.bundle.js', 'production JavaScript must load runtime.bundle.js');
  assert.ok(/\bdefer\b/.test(tags[0][0]), 'production runtime bundle must use defer');

  const sources = readIncludeSources('runtime.bundle.js');
  assert.strictEqual(sources.length, 43, 'runtime bundle must preserve all 43 source modules');
  assert.strictEqual(new Set(sources).size, 43, 'runtime bundle source modules must be unique');
  return sources;
}

function getProductionStyleSources(html) {
  const links = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g)];
  assert.strictEqual(links.length, 1, 'production page must load exactly one stylesheet bundle');
  assert.strictEqual(links[0][1].split('?')[0], 'styles.bundle.css', 'production CSS must load styles.bundle.css');

  const sources = readIncludeSources('styles.bundle.css');
  assert.strictEqual(sources.length, 6, 'stylesheet bundle must preserve all 6 source stylesheets');
  assert.strictEqual(new Set(sources).size, 6, 'stylesheet bundle source files must be unique');
  return sources;
}

module.exports = {
  readIncludeSources,
  renderJekyllIncludes,
  getProductionRuntimeSources,
  getProductionStyleSources
};
