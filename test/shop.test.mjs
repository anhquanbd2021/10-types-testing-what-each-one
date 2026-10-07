import test from 'node:test';
import assert from 'node:assert/strict';
import { createShop, makeCatalog, makeQueries, delay } from '../public/shop.mjs';
import { BUGS } from '../public/bugs.mjs';

const seeded = () => createShop();
const fixed = () => createShop({ bugs: [] });

test('catalog has exactly 10 bugs, one per test type', () => {
  assert.equal(BUGS.length, 10);
  assert.equal(new Set(BUGS.map(b => b.caughtBy)).size, 10);
});

test('unit bug: shippingFee(100) charges on seeded, free on fixed', () => {
  assert.equal(seeded().shippingFee(100), 5.99);
  assert.equal(fixed().shippingFee(100), 0);
  assert.equal(seeded().shippingFee(50), 5.99);
  assert.equal(fixed().shippingFee(50), 5.99);
});

test('integration bug: seeded checkout sees an empty cart', () => {
  const state = {};
  seeded().addToCart(state, { price: 60, qty: 1 });
  seeded().addToCart(state, { price: 40, qty: 1 });
  assert.equal(seeded().checkout(state).itemCount, 0);
  assert.ok(Array.isArray(state.basket), 'buggy cart wrote to basket');

  const state2 = {};
  fixed().addToCart(state2, { price: 60, qty: 1 });
  fixed().addToCart(state2, { price: 40, qty: 1 });
  const order = fixed().checkout(state2);
  assert.equal(order.itemCount, 2);
  assert.equal(order.subtotal, 100);
});

test('e2e bug: confirm page dead-ends on seeded build', () => {
  const session = {};
  seeded().signup(session, { email: 'dev@example.com' });
  seeded().pay(session);
  assert.equal(seeded().confirmPage(session), null);

  const ok = {};
  fixed().signup(ok, { email: 'dev@example.com' });
  fixed().pay(ok);
  assert.equal(fixed().confirmPage(ok), 'Confirmed: ORD-1001');
});

test('snapshot bug: seeded badge markup differs from baseline', () => {
  assert.match(seeded().renderOrderBadge('paid'), /badge-ok/);
  assert.match(fixed().renderOrderBadge('paid'), /badge-success/);
});

test('contract bug: provider renamed the field; consumer reads undefined', () => {
  const resp = seeded().paymentsApiCharge(1099);
  assert.ok('total_cents' in resp);
  assert.equal(seeded().readChargedTotal(resp), undefined);
  assert.equal(fixed().readChargedTotal(fixed().paymentsApiCharge(1099)), 1099);
});

test('load bug: seeded search is quadratic, fixed is linear-ish', () => {
  const catalog = makeCatalog(200);
  const queries = makeQueries(400);
  const bad = seeded().searchAll(catalog, queries);
  const good = fixed().searchAll(catalog, queries);
  assert.ok(bad.ops > 20_000, `seeded ops ${bad.ops}`);
  assert.ok(good.ops <= 20_000, `fixed ops ${good.ops}`);
  assert.ok(bad.ops > good.ops * 10);
});

test('chaos bug: seeded call hangs when the dependency dies', async () => {
  const deadPod = () => new Promise(() => {});
  const outcome = await Promise.race([
    seeded().getRecommendations('u-1', deadPod).then(() => 'settled', () => 'settled'),
    delay(80).then(() => 'hung'),
  ]);
  assert.equal(outcome, 'hung');

  const ok = await fixed().getRecommendations('u-1', deadPod);
  assert.deepEqual(ok, ['staff-pick-1', 'staff-pick-2']);
});

test('smoke bug: seeded build throws at boot', () => {
  assert.throws(() => seeded().boot(), /FEATURE_FLAGS/);
  assert.equal(fixed().boot().status, 'up');
  assert.equal(fixed().health(), 'ok');
});

test('regression bug: seeded cartTotal([]) is NaN', () => {
  assert.ok(Number.isNaN(seeded().cartTotal([])));
  assert.equal(fixed().cartTotal([]), 0);
});

test('weak-assertion is a suite property, not a shop flag', () => {
  // The shop carries nine code faults; the tenth lives in the shipped suite.
  const codeFaults = BUGS.filter(b => b.id !== 'weak-assertion');
  assert.equal(codeFaults.length, 9);
});
