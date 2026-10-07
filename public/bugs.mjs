// The seeded build ships exactly ten faults — one per failure class.
// `caughtBy` is the test type that can see it; every other type is blind to it.
export const BUGS = [
  {
    id: 'discount-boundary',
    caughtBy: 'unit',
    failureClass: 'Broken logic',
    title: 'Free-shipping boundary is off by one',
    detail: 'shippingFee() uses subtotal > 100 instead of >= 100 — a $100.00 cart pays $5.99 shipping.',
  },
  {
    id: 'cart-key-mismatch',
    caughtBy: 'integration',
    failureClass: 'Broken interactions',
    title: 'Cart writes `basket`, checkout reads `cart`',
    detail: 'Each service passes its own unit test against its own mock state — wired together, checkout sees an empty cart.',
  },
  {
    id: 'orphan-confirm',
    caughtBy: 'e2e',
    failureClass: 'Broken user flows',
    title: 'Payment stores orderId, confirm page reads confirmationId',
    detail: 'Every screen works in isolation; the end-to-end flow dead-ends on "order not found".',
  },
  {
    id: 'badge-class-rename',
    caughtBy: 'snapshot',
    failureClass: 'Unexpected UI changes',
    title: 'badge-success renamed to badge-ok',
    detail: 'Same text, same logic, different markup — only a recorded snapshot sees the diff.',
  },
  {
    id: 'cents-field-rename',
    caughtBy: 'contract',
    failureClass: 'API mismatches',
    title: 'Provider renamed totalCents to total_cents',
    detail: 'The consumer reads resp.totalCents → undefined. The stale mock in the unit test still returns the old shape.',
  },
  {
    id: 'quadratic-search',
    caughtBy: 'load',
    failureClass: 'Performance limits',
    title: 'searchAll scans the whole catalog per query',
    detail: 'O(queries × catalog) — instant at 20 items, an outage at 2,000.',
  },
  {
    id: 'hanging-dependency',
    caughtBy: 'chaos',
    failureClass: 'Recovery failures',
    title: 'Recommendations call has no timeout or fallback',
    detail: 'When the recommendation pod dies mid-call, the request hangs forever instead of degrading.',
  },
  {
    id: 'weak-assertion',
    caughtBy: 'mutation',
    failureClass: 'Weak tests',
    title: 'The shipped suite asserts shapes, not values',
    detail: 'Mutants flip operators and skip code — the suite stays green. The bug is in the tests themselves.',
  },
  {
    id: 'boot-crash',
    caughtBy: 'smoke',
    failureClass: 'Broken builds',
    title: 'App throws during startup config validation',
    detail: 'Unit tests import pure functions and never boot the app — only a boot+health smoke check sees it.',
  },
  {
    id: 'empty-cart-nan',
    caughtBy: 'regression',
    failureClass: 'Old bugs returning',
    title: 'cartTotal([]) returns NaN — incident #4821 is back',
    detail: 'A "price adjustment" derived from the average line price divides by items.length. Fixed once, un-pinned, reintroduced.',
  },
];

export const BUG_IDS = BUGS.map(b => b.id);
export const bugById = id => BUGS.find(b => b.id === id);
