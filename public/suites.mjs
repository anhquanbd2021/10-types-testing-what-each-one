// Two suites for the same functions. The weak one is what "ships" with the
// seeded repo — every assertion checks a shape, never a value. The strong one
// pins exact values at the boundary. The mutation runner asks both of them
// the same question: "did you notice the code changed?"
// Source-mirrored in examples/weak-suite.mjs and examples/strong-suite.mjs.

const check = (cond, msg) => { if (!cond) throw new Error(msg); };

export const WEAK_SUITE = [
  {
    name: 'cartTotal returns a number',
    run: s => check(typeof s.cartTotal([{ price: 60, qty: 1 }, { price: 40, qty: 1 }]) === 'number', 'not a number'),
  },
  {
    name: 'shippingFee is non-negative',
    run: s => check(s.shippingFee(50) >= 0, 'negative fee'),
  },
  {
    name: 'applyDiscount returns something',
    run: s => check(s.applyDiscount(200, 0.1) > 0, 'no value returned'),
  },
];

export const STRONG_SUITE = [
  {
    name: 'cart of exactly $100 ships free',
    run: s => check(s.shippingFee(100) === 0, `shippingFee(100) → ${s.shippingFee(100)}, expected 0`),
  },
  {
    name: 'shippingFee(50) === 5.99',
    run: s => check(s.shippingFee(50) === 5.99, `shippingFee(50) → ${s.shippingFee(50)}, expected 5.99`),
  },
  {
    name: 'applyDiscount(200, 0.1) === 180',
    run: s => check(s.applyDiscount(200, 0.1) === 180, `applyDiscount(200, 0.1) → ${s.applyDiscount(200, 0.1)}, expected 180`),
  },
  {
    name: 'cartTotal([{price:50, qty:2}]) === 100',
    run: s => check(s.cartTotal([{ price: 50, qty: 2 }]) === 100, 'expected 100'),
  },
];

// Runs every assertion, collecting failures instead of stopping at the first.
export function runSuite(suite, shop) {
  const failures = [];
  for (const t of suite) {
    try {
      t.run(shop);
    } catch (err) {
      failures.push(`${t.name}: ${err.message}`);
    }
  }
  return { total: suite.length, passed: suite.length - failures.length, failures };
}
