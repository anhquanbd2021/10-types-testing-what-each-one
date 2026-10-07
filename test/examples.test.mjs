import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { WEAK_SUITE_SOURCE, STRONG_SUITE_SOURCE } from '../public/examples.mjs';
import { suite as weakSuite } from '../examples/weak-suite.mjs';
import { suite as strongSuite } from '../examples/strong-suite.mjs';
import { WEAK_SUITE, STRONG_SUITE } from '../public/suites.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('embedded example sources match files on disk', async () => {
  const norm = s => s.replace(/\r\n/g, '\n');
  const weak = await readFile(`${root}examples/weak-suite.mjs`, 'utf8');
  const strong = await readFile(`${root}examples/strong-suite.mjs`, 'utf8');
  assert.equal(WEAK_SUITE_SOURCE, norm(weak));
  assert.equal(STRONG_SUITE_SOURCE, norm(strong));
});

test('example suites re-export the canonical suites', () => {
  assert.equal(weakSuite, WEAK_SUITE);
  assert.equal(strongSuite, STRONG_SUITE);
});
