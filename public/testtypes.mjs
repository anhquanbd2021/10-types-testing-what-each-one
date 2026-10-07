// Ten test-type runners. Each one really exercises the shop — no lookup
// tables. Every runner returns the catalog bug ids it actually caught, so
// the board can show not just what each type sees but what it misses.
import { createShop, makeCatalog, makeQueries, delay, SHIPPING_FEE } from './shop.mjs';
import { BUGS } from './bugs.mjs';
import { ORDER_BADGE_SNAPSHOT } from './snapshots.mjs';
import { MUTANTS, makeMutant } from './mutants.mjs';
import { WEAK_SUITE, STRONG_SUITE, runSuite } from './suites.mjs';

export const TEST_TYPES = [
  { id: 'unit', name: 'Unit', failureClass: 'Broken logic' },
  { id: 'integration', name: 'Integration', failureClass: 'Broken interactions' },
  { id: 'e2e', name: 'E2E', failureClass: 'Broken user flows' },
  { id: 'snapshot', name: 'Snapshot', failureClass: 'Unexpected UI changes' },
  { id: 'contract', name: 'Contract', failureClass: 'API mismatches' },
  { id: 'load', name: 'Load', failureClass: 'Performance limits' },
  { id: 'chaos', name: 'Chaos', failureClass: 'Recovery failures' },
  { id: 'mutation', name: 'Mutation', failureClass: 'Weak tests' },
  { id: 'smoke', name: 'Smoke', failureClass: 'Broken builds' },
  { id: 'regression', name: 'Regression', failureClass: 'Old bugs returning' },
];

const runners = {
  // Exact-value asserts on pure functions, populated carts only — the way a
  // real unit suite is written before anyone ships an empty-cart incident.
  unit(shop) {
    const caught = [];
    const evidence = [];
    if (shop.shippingFee(100) !== 0) {
      caught.push('discount-boundary');
      evidence.push(`shippingFee(100) → ${shop.shippingFee(100)}, expected 0`);
    }
    if (shop.shippingFee(50) !== SHIPPING_FEE) {
      evidence.push(`shippingFee(50) → ${shop.shippingFee(50)}, expected ${SHIPPING_FEE}`);
    }
    if (shop.cartTotal([{ price: 50, qty: 2 }]) !== 100) {
      evidence.push('cartTotal(2×$50) ≠ 100');
    }
    return { caught, evidence };
  },

  // Wires the real services together — no mocks. The state key mismatch only
  // exists between the two implementations, so only the wired path sees it.
  integration(shop) {
    const caught = [];
    const evidence = [];
    const state = {};
    shop.addToCart(state, { price: 60, qty: 1 });
    shop.addToCart(state, { price: 40, qty: 1 });
    const order = shop.checkout(state);
    if (order.itemCount !== 2) {
      caught.push('cart-key-mismatch');
      evidence.push(`checkout saw ${order.itemCount} items after adding 2`);
    }
    return { caught, evidence };
  },

  // Drives the composed journey a user takes — buy-now: signup → pay →
  // confirm — and asserts on what the last screen renders.
  e2e(shop) {
    const caught = [];
    const evidence = [];
    const session = {};
    shop.signup(session, { email: 'dev@example.com' });
    shop.pay(session);
    const page = shop.confirmPage(session);
    if (page === null) {
      caught.push('orphan-confirm');
      evidence.push('confirm page rendered "order not found" — flow dead-ends');
    }
    return { caught, evidence };
  },

  // Diffs rendered markup against the recorded baseline. Logic and text are
  // identical; only the markup moved — the diff is the whole point.
  snapshot(shop) {
    const caught = [];
    const evidence = [];
    const actual = shop.renderOrderBadge('paid');
    if (actual !== ORDER_BADGE_SNAPSHOT) {
      caught.push('badge-class-rename');
      evidence.push(`rendered ${actual}, recorded ${ORDER_BADGE_SNAPSHOT}`);
    }
    return { caught, evidence };
  },

  // Compares the keys the consumer reads against the payload the provider
  // actually sends — the recorded contract, not a stale mock.
  contract(shop) {
    const caught = [];
    const evidence = [];
    const resp = shop.paymentsApiCharge(1099);
    const expected = ['totalCents', 'currency'];
    const missing = expected.filter(k => !(k in resp));
    const seen = shop.readChargedTotal(resp);
    if (missing.length || seen === undefined) {
      caught.push('cents-field-rename');
      evidence.push(`provider sends [${Object.keys(resp).join(', ')}]; consumer reads totalCents → ${seen}`);
    }
    return { caught, evidence };
  },

  // Counts work at a realistic scale. The seeded scan is fine at 20 items;
  // at 200 products × 400 queries the ops counter exposes the quadratic.
  load(shop) {
    const caught = [];
    const evidence = [];
    const { ops } = shop.searchAll(makeCatalog(200), makeQueries(400));
    const LINEAR_BUDGET = 20_000;
    if (ops > LINEAR_BUDGET) {
      caught.push('quadratic-search');
      evidence.push(`${ops.toLocaleString('en-US')} ops vs a linear budget of ${LINEAR_BUDGET.toLocaleString('en-US')}`);
    }
    return { caught, evidence };
  },

  // Kills the dependency mid-call (a promise that never settles) and races
  // the app against a watchdog. No timeout + no fallback = hung request.
  async chaos(shop) {
    const caught = [];
    const evidence = [];
    const deadPod = () => new Promise(() => {}); // the pod died — never resolves
    const outcome = await Promise.race([
      Promise.resolve(shop.getRecommendations('u-1', deadPod)).then(() => 'settled', () => 'settled'),
      delay(80).then(() => 'hung'),
    ]);
    if (outcome === 'hung') {
      caught.push('hanging-dependency');
      evidence.push('request still unsettled 80 ms after the dependency died');
    }
    return { caught, evidence };
  },

  // The meta-type: subjects are the suite, not the app. Runs the suite
  // against real single-fault mutants; survivors prove the tests can't see.
  mutation(_shop, { suite }) {
    const s = suite === 'strong' ? STRONG_SUITE : WEAK_SUITE;
    const killed = [];
    const survived = [];
    for (const m of MUTANTS) {
      const r = runSuite(s, makeMutant(m.bug));
      (r.failures.length ? killed : survived).push(m.name);
    }
    const caught = survived.length ? ['weak-assertion'] : [];
    const evidence = survived.length
      ? [`${survived.length}/${MUTANTS.length} mutants survived: ${survived.join('; ')}`]
      : [`all ${MUTANTS.length} mutants killed — the suite can see behavior change`];
    return { caught, evidence, survived, killed };
  },

  // Cold-boots the app and pings health — the cheapest check there is, and
  // the only one that can see a crash at module init.
  smoke(shop) {
    const caught = [];
    const evidence = [];
    try {
      shop.boot();
      shop.health();
    } catch (err) {
      caught.push('boot-crash');
      evidence.push(err.message);
    }
    return { caught, evidence };
  },

  // The pinned test written when incident #4821 was fixed. It lives outside
  // the current unit suite precisely because the bug once shipped.
  regression(shop) {
    const caught = [];
    const evidence = [];
    const total = shop.cartTotal([]);
    if (!Number.isFinite(total) || total !== 0) {
      caught.push('empty-cart-nan');
      evidence.push(`cartTotal([]) → ${total}, expected 0 (incident #4821)`);
    }
    return { caught, evidence };
  },
};

export async function runTestType(id, { shop = createShop(), suite = 'weak' } = {}) {
  const meta = TEST_TYPES.find(t => t.id === id);
  if (!meta) throw new Error(`unknown test type: ${id}`);
  const r = await runners[id](shop, { suite });
  return {
    ...meta,
    status: r.caught.length ? 'fail' : 'pass',
    caught: r.caught,
    evidence: r.evidence,
    survived: r.survived ?? [],
  };
}

export async function runAll({ bugs, suite = 'weak' } = {}) {
  // `weak-assertion` lives in the shipped suite, not the shop — it only
  // exists as a shipped fault while the weak suite is in place.
  const enabled = (bugs === undefined ? BUGS.map(b => b.id) : bugs)
    .filter(id => id !== 'weak-assertion' || suite === 'weak');
  const shop = createShop({ bugs: enabled });
  const results = [];
  for (const t of TEST_TYPES) {
    results.push(await runTestType(t.id, { shop, suite }));
  }
  const caughtSet = new Set(results.flatMap(r => r.caught));
  const missed = BUGS.filter(b => enabled.includes(b.id) && !caughtSet.has(b.id));
  return { results, missed };
}
