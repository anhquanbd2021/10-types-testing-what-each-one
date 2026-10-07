// Fixture: the suite that "ships" with the seeded repo.
// Every assertion checks a shape — "a number", "non-negative" — never a
// value. This is what lets mutants survive.
export { WEAK_SUITE as suite } from '../public/suites.mjs';
