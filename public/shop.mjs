// A tiny checkout shop with ten seedable faults — one per failure class.
// createShop() ships the seeded build (all bugs on).
// createShop({ bugs: [] }) is the fixed build.
// createShop({ bugs: ['discount-boundary'] }) is a single-fault mutant —
// the mutation runner uses these to ask "would the suite have caught this?"
import { BUG_IDS } from './bugs.mjs';

export const FREE_SHIPPING_THRESHOLD = 100;
export const SHIPPING_FEE = 5.99;

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export function createShop({ bugs = BUG_IDS } = {}) {
  const has = id => bugs.includes(id);

  // ---- pricing (pure functions — unit-test domain) ----

  function cartTotal(items) {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    if (has('empty-cart-nan')) {
      // Regression, incident #4821: a "price adjustment" term derived from the
      // average line price. An empty cart makes items.length === 0 → 0/0 → NaN,
      // and Math.max(NaN, 0) is NaN — the poison leaks into the total.
      const avgLine = items.reduce((sum, i) => sum + i.price, 0) / items.length;
      return subtotal + Math.max(avgLine * 0, 0);
    }
    return subtotal;
  }

  function applyDiscount(subtotal, pct) {
    if (has('discount-skipped')) return subtotal; // mutant: early return
    return Math.round(subtotal * (1 - pct) * 100) / 100;
  }

  function shippingFee(subtotal) {
    // Seeded bug: `>` instead of `>=` — exactly $100.00 wrongly pays shipping.
    const qualifies = has('discount-boundary')
      ? subtotal > FREE_SHIPPING_THRESHOLD
      : subtotal >= FREE_SHIPPING_THRESHOLD;
    const fee = qualifies ? 0 : SHIPPING_FEE;
    return has('shipping-doubled') ? fee * 2 : fee; // mutant: arithmetic
  }

  // ---- cart + checkout services (integration domain) ----

  function addToCart(state, item) {
    // Seeded bug: writes `basket` while checkout() reads `cart`. Each side is
    // "correct" against the mock state its own unit test assumes.
    const key = has('cart-key-mismatch') ? 'basket' : 'cart';
    (state[key] ??= []).push(item);
    return state[key].length;
  }

  function checkout(state) {
    const items = state.cart ?? [];
    const subtotal = cartTotal(items);
    const total = applyDiscount(subtotal, state.couponPct ?? 0) + shippingFee(subtotal);
    return { itemCount: items.length, subtotal, total };
  }

  // ---- user flow (e2e domain) ----

  function signup(session, creds) {
    session.user = creds.email;
    return true;
  }

  function pay(session) {
    session.orderId = 'ORD-1001';
    return { ok: true };
  }

  function confirmPage(session) {
    // Seeded bug: payment stored `orderId`; this page reads `confirmationId`.
    const id = has('orphan-confirm') ? session.confirmationId : session.orderId;
    return id ? `Confirmed: ${id}` : null; // null = the flow dead-ends
  }

  // ---- rendering (snapshot domain) ----

  function renderOrderBadge(status) {
    // Seeded bug: class renamed badge-success → badge-ok. Same text, same logic.
    const cls = has('badge-class-rename') ? 'badge-ok' : 'badge-success';
    return `<span class="badge ${cls}">${status}</span>`;
  }

  // ---- payments provider + consumer (contract domain) ----

  function paymentsApiCharge(amountCents) {
    // Seeded bug: provider shipped { total_cents }; consumer still reads camelCase.
    return has('cents-field-rename')
      ? { total_cents: amountCents, currency: 'usd' }
      : { totalCents: amountCents, currency: 'usd' };
  }

  // What the consumer does with the provider payload — unit-tested against a
  // stale mock that still returns the OLD shape, so the drift is invisible.
  function readChargedTotal(response) {
    return response.totalCents;
  }

  // ---- catalog search (load domain) ----

  function searchAll(catalog, queries) {
    let ops = 0;
    if (has('quadratic-search')) {
      // Seeded bug: full catalog scan per query — O(queries × catalog).
      const results = [];
      for (const q of queries) {
        for (const p of catalog) {
          ops += 1;
          if (p.tags.some(tag => (ops += 1, tag.includes(q)))) results.push(p);
        }
      }
      return { results, ops };
    }
    // Fixed: index once — O(catalog + queries). ops counts search work
    // (index build + probes); emitting matches is output, not search.
    const index = new Map();
    for (const p of catalog) {
      ops += 1;
      for (const tag of p.tags) {
        if (!index.has(tag)) index.set(tag, []);
        index.get(tag).push(p);
      }
    }
    const results = [];
    for (const q of queries) {
      ops += 1;
      for (const [tag, products] of index) {
        if (tag.includes(q)) results.push(...products);
      }
    }
    return { results, ops };
  }

  // ---- recommendations (chaos domain) ----

  async function getRecommendations(userId, recommend, { timeoutMs = 50 } = {}) {
    if (has('hanging-dependency')) {
      // Seeded bug: no timeout, no fallback. If the pod dies mid-call, this
      // promise never settles — the request hangs until the proxy gives up.
      return recommend(userId);
    }
    const fallback = ['staff-pick-1', 'staff-pick-2'];
    return Promise.race([
      Promise.resolve().then(() => recommend(userId)).catch(() => fallback),
      delay(timeoutMs).then(() => fallback),
    ]);
  }

  // ---- startup (smoke domain) ----

  function boot() {
    if (has('boot-crash')) {
      throw new Error('boot: FEATURE_FLAGS table missing — module init aborted');
    }
    return { status: 'up', version: '1.0.0' };
  }

  function health() {
    return 'ok';
  }

  return {
    cartTotal, applyDiscount, shippingFee,
    addToCart, checkout,
    signup, pay, confirmPage,
    renderOrderBadge,
    paymentsApiCharge, readChargedTotal,
    searchAll, getRecommendations,
    boot, health,
  };
}

// Realistic fixtures for the load runner.
export function makeCatalog(size = 200) {
  const tags = ['shoes', 'shirt', 'sale', 'new', 'kids', 'sale-2026', 'winter', 'clearance'];
  return Array.from({ length: size }, (_, i) => ({
    sku: `SKU-${i}`,
    tags: [tags[i % tags.length], tags[(i * 3) % tags.length]],
  }));
}

export function makeQueries(count = 400) {
  const pool = ['sale', 'shoes', 'new', 'win', 'kids'];
  return Array.from({ length: count }, (_, i) => pool[i % pool.length]);
}
