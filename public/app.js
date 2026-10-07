import { BUGS } from '/bugs.mjs';
import { createShop } from '/shop.mjs';
import { TEST_TYPES, runTestType, runAll } from '/testtypes.mjs';

const $ = sel => document.querySelector(sel);
const typeCards = $('#type-cards');
const bugList = $('#bug-list');
const blindSpots = $('#blind-spots');

function currentOptions() {
  const build = document.querySelector('input[name="build"]:checked').value;
  const suite = document.querySelector('input[name="suite"]:checked').value;
  return { bugs: build === 'seeded' ? undefined : [], suite };
}

function renderCards() {
  typeCards.innerHTML = '';
  for (const t of TEST_TYPES) {
    const li = document.createElement('li');
    li.className = 'card';
    li.id = `card-${t.id}`;
    li.innerHTML = `
      <div class="card-head">
        <div><strong>${t.name}</strong><span class="muted"> catches ${t.failureClass.toLowerCase()}</span></div>
        <button type="button" data-run="${t.id}">Run</button>
      </div>
      <p class="card-detail muted" hidden></p>`;
    li.querySelector('button').addEventListener('click', () => runOne(t.id));
    typeCards.appendChild(li);
  }
}

function renderBugs() {
  bugList.innerHTML = '';
  for (const b of BUGS) {
    const li = document.createElement('li');
    li.className = 'bug';
    li.id = `bug-${b.id}`;
    li.innerHTML = `<span class="bug-class">${b.failureClass}</span><strong>${b.title}</strong><span class="muted">seen by ${b.caughtBy}</span>`;
    bugList.appendChild(li);
  }
}

function paint(caughtIds) {
  const caught = new Set(caughtIds);
  for (const b of BUGS) {
    $(`#bug-${b.id}`).classList.toggle('caught', caught.has(b.id));
    $(`#bug-${b.id}`).classList.toggle('dim', !caught.has(b.id));
  }
  const missed = BUGS.filter(b => !caught.has(b.id));
  blindSpots.textContent = missed.length ? `${missed.length} blind spot${missed.length === 1 ? '' : 's'}` : 'no blind spots';
  blindSpots.className = `badge ${missed.length ? 'warn' : 'pass'}`;
}

async function runOne(id) {
  const opts = currentOptions();
  const card = $(`#card-${id}`);
  card.classList.add('running');
  const shop = createShop(opts.bugs === undefined ? {} : { bugs: opts.bugs });
  const r = await runTestType(id, { shop, suite: opts.suite });
  card.classList.remove('running');
  card.classList.toggle('fail', r.status === 'fail');
  card.classList.toggle('pass', r.status === 'pass');
  const detail = card.querySelector('.card-detail');
  detail.hidden = false;
  detail.textContent = r.evidence.join(' · ') || 'nothing caught';
  paint(r.caught);
}

async function runAllCards() {
  const opts = currentOptions();
  const { results, missed } = await runAll({ bugs: opts.bugs, suite: opts.suite });
  const caughtAll = new Set();
  for (const r of results) {
    const card = $(`#card-${r.id}`);
    card.classList.toggle('fail', r.status === 'fail');
    card.classList.toggle('pass', r.status === 'pass');
    const detail = card.querySelector('.card-detail');
    detail.hidden = false;
    detail.textContent = r.evidence.join(' · ') || 'nothing caught';
    r.caught.forEach(id => caughtAll.add(id));
  }
  paint([...caughtAll]);
}

for (const input of document.querySelectorAll('input[name="build"], input[name="suite"]')) {
  input.addEventListener('change', () => {
    for (const card of typeCards.querySelectorAll('.card')) {
      card.classList.remove('fail', 'pass', 'running');
      card.querySelector('.card-detail').hidden = true;
    }
    paint([]);
    blindSpots.textContent = '—';
    blindSpots.className = 'badge';
  });
}

$('#run-all').addEventListener('click', runAllCards);
renderCards();
renderBugs();
paint([]);
