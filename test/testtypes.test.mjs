import test from 'node:test';
import assert from 'node:assert/strict';
import { createShop } from '../public/shop.mjs';
import { BUGS } from '../public/bugs.mjs';
import { TEST_TYPES, runTestType, runAll } from '../public/testtypes.mjs';
import { MUTANTS } from '../public/mutants.mjs';
import { WEAK_SUITE, STRONG_SUITE } from '../public/suites.mjs';

const seededShop = () => createShop();
const fixedShop = () => createShop({ bugs: [] });

test('ten runners exist, one per failure class', () => {
  assert.equal(TEST_TYPES.length, 10);
  assert.deepEqual(
    TEST_TYPES.map(t => t.id).sort(),
    BUGS.map(b => b.caughtBy).sort(),
  );
});

for (const bug of BUGS) {
  if (bug.id === 'weak-assertion') continue; // suite property — covered below
  test(`${bug.caughtBy} catches ${bug.id} on the seeded build`, async () => {
    const r = await runTestType(bug.caughtBy, { shop: seededShop() });
    assert.equal(r.status, 'fail');
    assert.deepEqual(r.caught, [bug.id]);
  });
}

test('on the seeded build each code-fault runner catches only its own class', async () => {
  const { results } = await runAll();
  for (const r of results) {
    if (r.id === 'mutation') continue;
    const expected = BUGS.filter(b => b.caughtBy === r.id).map(b => b.id);
    assert.deepEqual(r.caught, expected, `${r.id} caught ${r.caught}`);
  }
});

test('mutation runner: weak suite lets every mutant survive', async () => {
  const r = await runTestType('mutation', { shop: seededShop(), suite: 'weak' });
  assert.equal(r.status, 'fail');
  assert.deepEqual(r.caught, ['weak-assertion']);
  assert.equal(r.survived.length, MUTANTS.length);
});

test('mutation runner: strong suite kills every mutant', async () => {
  const r = await runTestType('mutation', { shop: seededShop(), suite: 'strong' });
  assert.equal(r.status, 'pass');
  assert.deepEqual(r.caught, []);
  assert.equal(r.survived.length, 0);
});

test('weak suite passes on the seeded build — the whole point', async () => {
  // Nine seeded code faults, and the shipped suite is still green.
  for (const t of WEAK_SUITE) t.run(seededShop());
});

test('strong suite fails on the seeded build', () => {
  const failures = STRONG_SUITE.filter(t => {
    try { t.run(seededShop()); return false; } catch { return true; }
  });
  assert.ok(failures.length >= 1);
});

test('fixed build + strong suite: every runner passes, zero blind spots', async () => {
  const { results, missed } = await runAll({ bugs: [], suite: 'strong' });
  for (const r of results) {
    assert.equal(r.status, 'pass', `${r.id}: ${r.evidence.join('; ')}`);
    assert.deepEqual(r.caught, []);
  }
  assert.deepEqual(missed, []);
});

test('seeded build + strong suite: nine code faults caught, mutation card green', async () => {
  const { results, missed } = await runAll({ suite: 'strong' });
  const mutation = results.find(r => r.id === 'mutation');
  assert.equal(mutation.status, 'pass', 'strong suite means the weakness does not exist');
  assert.deepEqual(missed, []);
});

test('runAll on seeded build misses nothing but reports a diagonal map', async () => {
  const { results, missed } = await runAll({ suite: 'weak' });
  assert.equal(results.length, 10);
  assert.equal(missed.length, 0, 'all ten classes get caught by their type');
});
