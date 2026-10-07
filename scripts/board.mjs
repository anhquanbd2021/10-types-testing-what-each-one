// CLI side of the Failure-Class Board: runs all ten test types against the
// seeded build and prints the caught/missed matrix.
//   node scripts/board.mjs            — seeded build, weak shipped suite
//   node scripts/board.mjs --fixed    — fixed build, strong suite
import { BUGS } from '../public/bugs.mjs';
import { TEST_TYPES, runAll } from '../public/testtypes.mjs';

const fixed = process.argv.includes('--fixed');
const { results, missed } = fixed
  ? await runAll({ bugs: [], suite: 'strong' })
  : await runAll();

const buildLabel = fixed ? 'fixed build + strong suite' : 'seeded build + weak shipped suite';
console.log(`Failure-Class Board — ${buildLabel}\n`);

const COL = 24;
const header = ' '.repeat(COL) + BUGS.map(b => b.caughtBy.slice(0, 4).padEnd(6)).join('');
console.log('caught →          ' + BUGS.map(b => b.id.padEnd(22)).join(''));
console.log('-'.repeat(COL + BUGS.length * 22));

for (const r of results) {
  const row = BUGS.map(b => (r.caught.includes(b.id) ? 'CAUGHT' : '·').padEnd(22)).join('');
  const status = r.status === 'fail' ? 'FAIL' : 'pass';
  console.log(`${r.name.padEnd(10)} ${status.padEnd(7)} ${row}`);
}

console.log('-'.repeat(COL + BUGS.length * 22));
for (const r of results) {
  for (const line of r.evidence) {
    console.log(`  ${r.name}: ${line}`);
  }
}
console.log('');
if (missed.length) {
  console.log(`Blind spots: ${missed.map(b => `${b.id} (needs ${b.caughtBy})`).join(', ')}`);
} else {
  console.log('No blind spots — every failure class is covered.');
}
console.log('\nSame suite count either way. The map is what changed.');
