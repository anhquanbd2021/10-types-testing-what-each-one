# Failure-Class Board — companion demo

Interactive lab for the article *10 Types of Testing — and What Each One
Actually Catches*. A tiny checkout shop ships ten seeded faults — one per
failure class — and ten test-type cards each catch only their own.

Zero dependencies — Node 20+ only. The shop, the runners, the mutant engine,
and both suites are plain ES modules shared by the browser UI, the CLI, and
the test suite.

## What it proves

Run all ten cards on the seeded build: every card fails on exactly its own
failure class while the other nine stay invisible. Coverage counts how much
code ran; the board shows which failures can still hide.

| Card | Seeded fault only it sees |
|---|---|
| Unit | `shippingFee(100)` — `>` flipped for `>=` on the free-shipping boundary |
| Integration | `addToCart` writes `basket`, `checkout` reads `cart` — each side mocks its own state |
| E2E | payment stores `orderId`, confirm page reads `confirmationId` — the flow dead-ends |
| Snapshot | `badge-success` renamed to `badge-ok` — same text, same logic, different markup |
| Contract | provider sends `total_cents`, consumer reads `totalCents` — the stale mock hides it |
| Load | `searchAll` scans the catalog per query — O(q×n) invisible at 20 items |
| Chaos | recommendations call has no timeout or fallback — a dead pod hangs the request |
| Mutation | the shipped suite asserts shapes, not values — all three mutants survive |
| Smoke | the app throws at module init — unit tests never boot it |
| Regression | `cartTotal([])` returns NaN — incident #4821, fixed once, un-pinned, back |

The mutation card is the meta-case: its subject is the suite itself. Flip the
**suite** toggle from *weak* to *strong* and it is the only card whose verdict
changes.

## Run it

```text
npm start        # serve the lab on :3000
npm test         # bug manifestation + runner matrix + server
npm run board    # CLI: 10 types × 10 bugs caught/missed matrix
npm run check    # both
```

`node scripts/board.mjs --fixed` runs the fixed build with the strong suite —
every card goes green.

## Layout

- `public/shop.mjs` — `createShop({ bugs })`; each flag seeds one fault
- `public/bugs.mjs` — the catalog: id, failure class, which type catches it
- `public/testtypes.mjs` — ten real runners; each returns caught bug ids
- `public/suites.mjs` — the weak shipped suite vs. the strong suite
- `public/mutants.mjs` — three mutation operators as single-fault shops
- `public/snapshots.mjs` — the recorded UI baseline
- `examples/` — readable fixture wrappers re-exporting the suites
- `scripts/board.mjs` — the CLI matrix
- `test/` — `node --test "test/*.test.mjs"`

## Honest limits

- Seeded faults are clean and orthogonal — real bugs overlap failure classes,
  which is exactly why no single type is enough.
- "Load" measures operation counts against a linear budget, not wall-clock
  latency or tail percentiles.
- "Chaos" simulates one dependency that dies mid-call — not a fault-injection
  platform.
- Three mutants demonstrate the idea; real mutation testing generates
  hundreds and reports a mutation score.
- A pass means "this failure class is covered" — never "the system is
  correct".

This is an educational demo, not production infrastructure.
