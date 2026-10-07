// Fixtures mirrored from examples/ for display in the browser lab.
// test/examples.test.mjs asserts these strings match the files on disk.
export const WEAK_SUITE_SOURCE = `// Fixture: the suite that "ships" with the seeded repo.
// Every assertion checks a shape — "a number", "non-negative" — never a
// value. This is what lets mutants survive.
export { WEAK_SUITE as suite } from '../public/suites.mjs';
`;

export const STRONG_SUITE_SOURCE = `// Fixture: the same functions, tested with exact values at the boundary.
// Every mutant dies against this suite.
export { STRONG_SUITE as suite } from '../public/suites.mjs';
`;
