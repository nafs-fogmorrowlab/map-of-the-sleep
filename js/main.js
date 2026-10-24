// Where We Leave Ourselves · the paper prototype, played on screen, v2. One player plays the whole sleep: the fortune
// teller gives every move, the map of the sleep carries her through five chapters, and each night stone opens a night
// on the streets, where the ways she knows glow and the Returner walks them.
// v2 (2026-10-23), after the first web playtest (two players taking turns; the Returner "never moved, never affected
// me"): one player a game; lit and dark streets; the Returner out from the second night, walking her lit streets and
// showing its next step; the layers' links said where they happen; the flap's question kept in view.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MAP, STREETS, IMAGES, STATEMENTS, QUESTIONS } from './data.js';
import * as R from './rules.js';
import { MapBoard } from './board_map.js';
import { StreetsBoard } from './board_streets.js';
import { Teller } from './teller.js';
import { Sound } from './sound.js';
import { csv, zip, downloadBlob } from './log.js';
import { PLAYER_COLOURS, sleep } from './fx.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const KEY = 'wwlo-paper-prototype-v2';
const VERSION = 'v2';
const dbg = (...a) => { if (window.AUTO) console.log('DBG ' + a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(' ')); };
window.addEventListener('unhandledrejection', (e) => console.log('REJECT ' + ((e.reason && e.reason.stack) || e.reason)));
window.addEventListener('error', (e) => console.log('ERR ' + e.message + ' ' + e.filename + ':' + e.lineno));

// ---- test hooks: ?auto=SEED plays itself quickly, for checking the flow -------------------------------------------
if (params.has('auto')) {
  let s = Number(params.get('auto')) || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  window.SPEED = Number(params.get('speed') || 0.02);
  window.AUTO = { rnd, pickWord: () => Math.floor(rnd() * 4), pickNumber: (nums) => Math.floor(rnd() * nums.length) };
}

// ---- the renderer and the two boards ------------------------------------------------------------------------------
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.prepend(renderer.domElement);
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const mapBoard = new MapBoard(renderer, stage);
const streets = new StreetsBoard(renderer, stage);
mapBoard.scene.environment = env;
streets.scene.environment = env;
let active = mapBoard;

function resize() {
  const r = stage.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  renderer.domElement.style.width = r.width + 'px';
  renderer.domElement.style.height = r.height + 'px';
  mapBoard.resize(r.width, r.height);
  streets.resize(r.width, r.height);
}
new ResizeObserver(resize).observe(stage);
resize();
let lastFrame = 0;
renderer.setAnimationLoop((now) => {
  if (window.AUTO && now - lastFrame < 1500) return;          // test runs: a frame now and then is enough
  lastFrame = now;
  active.render(now);
});

function setBoard(b) {
  active = b;
  mapBoard.show(b === mapBoard);
  streets.show(b === streets);
  if (b === mapBoard) renderer.toneMappingExposure = 1.1;
  document.body.dataset.board = b === mapBoard ? 'map' : 'streets';
}
setBoard(mapBoard);

async function fade(fn) {
  const f = $('#fade');
  f.classList.add('on');
  await sleep(650);
  await fn();
  await sleep(150);
  f.classList.remove('on');
  await sleep(500);
}

const sound = new Sound();
const teller = new Teller($('#teller'), sound);
$('#sound').addEventListener('click', () => { $('#sound').textContent = sound.toggle() ? 'Sound: on' : 'Sound: off'; });
let streetView = 'street';
$('#view').addEventListener('click', () => {
  streetView = streetView === 'street' ? 'over' : 'street';
  streets.setView(streetView);
  $('#view').textContent = streetView === 'street' ? 'View: street' : 'View: overhead';
});

// ---- the game's state, kept in the browser so a refresh can resume ------------------------------------------------
let G = null;
function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { /* private mode: no resume */ } }
function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { /* nothing */ } }

function newGame(name) {
  G = {
    v: 2, version: VERSION, started: new Date().toISOString(),
    players: [{ name, colour: PLAYER_COLOURS[0], stone: 0, sentBack: 0, notebook: { A: 0, B: 0, C: 0 }, lit: [...R.HOME_LIT],
      nightsPlayed: [], lastRefuge: null, done: false, mapTurns: 0 }],
    rec: { version: VERSION, player: name, mapTurns: [], nights: [], after: [] },
  };
  save();
}
const P = () => G.players[0];

// ---- small pieces of interface -------------------------------------------------------------------------------------
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function action(buttons) {
  const bar = $('#actions');
  bar.innerHTML = '';
  return new Promise((resolve) => {
    buttons.forEach(([label, value, cls], i) => {
      const b = document.createElement('button');
      b.className = cls || (i === 0 ? 'primary' : 'secondary');
      b.innerHTML = label;
      b.addEventListener('click', () => { bar.innerHTML = ''; resolve(value); }, { once: true });
      bar.append(b);
      if (i === 0) setTimeout(() => b.focus(), 30);
    });
    if (window.AUTO) setTimeout(() => { const b = bar.querySelector('button'); if (b) b.click(); }, 5);
  });
}

function toast(html, kind = '', ms = 4200) {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = html;
  $('#toasts').append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 600); }, ms * (window.SPEED || 1));
}

function card(html, button, { image, cls = '' } = {}) {
  const c = $('#card');
  c.className = 'overlay ' + cls;
  c.innerHTML = `<div class="card-box">${image ? `<div class="card-img" style="background-image:url('${image}')"></div>` : ''}
    <div class="card-text">${html}<div class="card-actions"><button class="primary">${button}</button></div></div></div>`;
  return new Promise((resolve) => {
    const b = c.querySelector('button');
    b.addEventListener('click', () => { c.className = 'overlay hidden'; resolve(); }, { once: true });
    setTimeout(() => b.focus(), 50);
    if (window.AUTO) setTimeout(() => b.click(), 5);
  });
}

function turnBanner(text) {
  const p = P(), b = $('#banner');
  b.innerHTML = `<span class="dot" style="background:${p.colour}"></span><b>${escape(p.name)}</b><span>${text}</span>`;
}

// the chain the layers make, with where she is in it lit (players in v1 didn't see how they fed each other)
function chain(step) {
  const steps = [['teller', 'Teller', 'The fortune teller gives every move.'], ['map', 'Map', 'The map carries the sleep: reach END to wake.'],
    ['night', 'Night', 'Every ★ stone starts a night on the streets.'], ['back', 'Back to map', 'How the night ended moves you on the map.']];
  const now = steps.find(([k]) => k === step) || steps[1];
  return `<div class="chain">${steps.map(([k, a]) => `<span class="link ${k === step ? 'now' : ''}">${a}</span>`).join('<i>→</i>')}</div>
    <div class="chain-cap">${now[2]}</div>`;
}

let lastQuestion = null;
function questionBox() {
  return lastQuestion ? `<div class="asks"><span>Her subconscious asks</span><i>${escape(lastQuestion)}</i></div>` : '';
}

// ---- the side panel ------------------------------------------------------------------------------------------------
function chapterName(stone) { return MAP.chapter_name[R.chapterOf(stone)]; }

function renderMapPanel(step = 'map') {
  const p = P();
  $('#panel').innerHTML = `<h3>The map of the sleep</h3>${chain(step)}
    <div class="goal">Reach <b>END</b> to wake. ${p.done ? '' : `You are on ${p.stone === 0 ? 'START' : 'stone ' + p.stone}, ${chapterName(p.stone)}.`}</div>
    <div class="pcard now" style="--who:${p.colour}">
      <div class="prow small"><span>Sent back</span><span class="boxes">${[0, 1].map((k) => `<i class="box ${k < p.sentBack ? 'x' : ''}"></i>`).join('')}</span>
      <span>Nights ${p.nightsPlayed.length}</span></div>
      <div class="pnights">${p.nightsPlayed.map((n) => `<span class="nt ${n.ended}">${escape(n.name)}</span>`).join('')}</div></div>
    ${questionBox()}
    <div class="legend">
      <div><i class="lg night"></i><span><b>★ Night stone</b> (moon, silver ring): you must stop here, even with moves left. A night begins on the streets.</span></div>
      <div><i class="lg up"></i><span><b>Gold ring</b>, a way up: land on it and jump ahead to the stone number on its label.</span></div>
      <div><i class="lg back"></i><span><b>Red ring</b>, a way back: go back to the stone number on its label, the same chapter met more simply.</span></div>
    </div>`;
}

function notebookHTML(nb, startRefuge, flash) {
  return Object.entries(STREETS.refuges).map(([k, r]) => `<div class="nrow ${startRefuge === k ? 'watched' : ''} ${flash === k ? 'flash' : ''}">
      <span><b>${k}</b> · ${r.name}</span><span class="circles">${[0, 1, 2].map((c) => `<i class="ink ${c < nb[k] ? 'on' : ''}"></i>`).join('')}</span></div>`).join('');
}

function renderNightPanel(night, turn, start, stepsLeft) {
  const p = P();
  const known = p.lit.length - R.HOME_LIT.length;
  $('#panel').innerHTML = `<h3>The streets of the night</h3>${chain('night')}
    <div class="nightname">★ ${escape(night)}</div>
    <div class="turns">${[1, 2, 3, 4].map((k) => `<i class="moon ${k < turn ? 'gone' : k === turn ? 'now' : ''}"></i>`).join('')}<span>turn ${Math.min(turn, 4)} of 4</span></div>
    ${stepsLeft != null ? `<div class="steps">Steps left this turn: <b>${stepsLeft}</b></div>` : ''}
    ${questionBox()}
    <h4>The Returner's notebook</h4>
    <div class="notebook">${notebookHTML(p.notebook, start && start.refuge)}
      <div class="nways">The streets you know: <b>${known}</b> of ${STREETS.streets.length - R.HOME_LIT.length}, and your own street</div></div>
    <div class="legend">
      <div><i class="lg litst"></i><span><b>Lit streets</b> are the ways you know: each costs 1 step.</span></div>
      <div><i class="lg darkst"></i><span><b>Dark streets</b> are new to you: each costs 3 steps.</span></div>
      <div class="met"><i class="lg ret"></i><span><b>The Returner</b> ${start ? `started at the gate of ${start.refuge} · ${escape(STREETS.refuges[start.refuge].name)}, where you hid most. It walks only the streets you know, one junction a turn; the red ring is its next step.` : 'is not out tonight. It learns from where you hide and the ways you take.'}</span></div>
      <div class="safe">Reach any gate it isn't standing on: you are safe.</div>
      <div>Walk onto it, or end your move where it steps next: the night ends. After 4 turns you wake in the street.</div>
    </div>`;
}

// ---- a turn on the map ---------------------------------------------------------------------------------------------
async function landOnRing(entry) {
  const p = P();
  const ring = R.ringOf(p.stone);
  if (!ring) return;
  if (ring.kind === 'up') toast(`<b>Gold ring · ${ring.name}</b><br>A way up: on to stone ${ring.to}.`, 'up');
  else toast(`<b>Red ring · ${ring.name}</b><br>A way back: to stone ${ring.to}, the same chapter met more simply.`, 'back');
  await sleep(900);
  await mapBoard.jump(0, ring.to, ring.kind);
  if (entry) entry.ring = `${ring.kind === 'up' ? 'gold' : 'red'}: ${ring.name}, ${p.stone} → ${ring.to}`;
  p.stone = ring.to;
}

async function mapTurn() {
  const p = P();
  turnBanner(`on the map · ${p.stone === 0 ? 'START' : 'stone ' + p.stone}`);
  renderMapPanel('teller');
  mapBoard.focus(p.stone);
  await action([['Ask the fortune teller', 'ask']]);
  const t = await teller.ask({ who: p.name, colour: p.colour, context: 'map' });
  lastQuestion = t.line;
  renderMapPanel('map');
  const from = p.stone;
  const mv = R.mapMove(from, t.move);
  dbg('map', from, t.word, t.number, t.move, mv);
  await mapBoard.hop(0, mv.path);
  p.stone = mv.at;
  p.mapTurns++;
  const entry = { turn: p.mapTurns, from, word: t.word, number: t.number, move: t.move, question: t.line, landed: mv.at, ring: '', night: '', to: null };
  G.rec.mapTurns.push(entry);
  if (mv.stop === 'night' && mv.movesLeft > 0) toast(`<b>★ You must stop on a night stone</b>, even with ${mv.movesLeft} move${mv.movesLeft > 1 ? 's' : ''} left.`, 'night');
  if (mv.stop === 'end') {
    p.done = true;
    entry.ring = 'END';
    toast(`<b>END · awake.</b> ${escape(p.name)} wakes from the sleep.`, 'up', 5000);
    sound.chime();
  } else if (R.kindOf(p.stone) === 'night') {
    entry.night = R.SPECIALS[p.stone][1];
    save();
    await sleep(700);
    await playNight(entry);
  } else {
    await landOnRing(entry);
  }
  entry.to = p.stone;
  mapBoard.place(G.players);
  save();
  renderMapPanel();
}

// ---- a night on the streets ----------------------------------------------------------------------------------------
async function playNight(mapEntry) {
  const p = P();
  const night = R.SPECIALS[p.stone][1];
  const lit = new Set(p.lit);                 // the streets she knew when the night began: the Returner's streets tonight
  const before = { ...p.notebook };
  const first = p.nightsPlayed.length === 0;
  const start = first ? null : R.returnerStart(p.notebook, p.lastRefuge);
  dbg('night', night, p.notebook, start);
  await card(`<div class="eyebrow">★ Night stone · stone ${p.stone}</div><h2>${escape(night)}</h2>
    <p>The night begins on the streets. You have four turns to reach one of three refuges.</p>
    ${first ? '<p class="muted">The streets you know are lit; the rest are dark and slow. Tonight only your own street is lit.</p>'
    : start ? `<p class="muted">The Returner is out. It starts at the gate of <b>${start.refuge} · ${escape(STREETS.refuges[start.refuge].name)}</b>, where you hid most, and it walks the streets you know.</p>`
      : '<p class="muted">The notebook is empty tonight: the Returner is not out.</p>'}`,
  'Into the streets', { image: IMAGES.nights[night], cls: 'night' });
  await fade(async () => {
    setBoard(streets);
    streets.setup(p.colour, []);
    streets.setLit(lit);
    streets.setView(streetView);
  });
  document.body.classList.add('night');
  turnBanner(`the streets · ${night}`);
  renderNightPanel(night, 1, start);
  sound.low();
  if (first) {
    toast('<b>Lit streets</b> are the ways you know: each costs 1 step. <b>Dark streets</b> are new: each costs 3. The teller\'s number is your steps for the turn.', 'safe', 9000);
  }
  if (start) {
    await streets.rise(start.gate);
    toast(`<b>The Returner is at the gate of ${start.refuge} · ${STREETS.refuges[start.refuge].name}.</b><br>It walks only the streets you know. The red ring shows where it steps next.`, 'met', 8000);
  }
  let ended = null, refuge = null, retAt = start ? start.gate : null;
  const numbers = [], route = ['S'], retPath = retAt ? [retAt] : [];
  let litSteps = 0, darkSteps = 0;
  for (let turn = 1; turn <= R.NIGHT_TURNS && !ended; turn++) {
    streets.setDarkness((turn - 1) / R.NIGHT_TURNS);
    const retNext = retAt ? R.returnerStep(retAt, streets.at, lit) : null;
    streets.showNext(retNext && retNext !== retAt ? retNext : null);
    renderNightPanel(night, turn, start);
    await action([['Ask the fortune teller', 'ask']]);
    const t = await teller.ask({ who: p.name, colour: p.colour, context: 'streets' });
    lastQuestion = t.line;
    numbers.push(t.number);
    let steps = t.move, taken = 0;
    while (steps > 0 && !ended) {
      renderNightPanel(night, turn, start, steps);
      const options = R.stepOptions(streets.at, lit, steps);
      if (!options.length) { toast(`${steps} step${steps > 1 ? 's' : ''} left: not enough for a dark street (3).`, '', 3000); break; }
      const choice = streets.choose(options);
      let pick;
      if (window.AUTO) {
        autoStep.at = streets.at;
        pick = autoStep(options, retAt, retNext);
        streets.clearChoice();
      } else if (taken > 0) {
        const stop = action([['Stop here', 'stop', 'secondary']]);
        pick = await Promise.race([choice, stop.then(() => 'stop')]);
        streets.clearChoice();
        $('#actions').innerHTML = '';
      } else {
        $('#hint').textContent = 'Click a glowing junction to step there.';
        pick = await choice;
      }
      $('#hint').textContent = '';
      if (pick === 'stop' || pick == null) break;
      const o = options.find((x) => x.node === pick);
      await streets.hopTo(pick);
      route.push(pick);
      steps -= o.cost; taken++;
      if (o.lit) litSteps++; else darkSteps++;
      const a = R.arrive(pick, retAt);
      if (a.end) { ended = a.end; refuge = a.refuge || null; }
    }
    if (!ended && retNext && retNext !== retAt) {
      await streets.walkReturner(retNext);
      retAt = retNext; retPath.push(retNext);
      if (retAt === streets.at) { ended = 'met'; refuge = R.GATE_OF[retAt] || null; }
    }
    streets.showNext(null);
  }
  renderNightPanel(night, 5, start);
  if (!ended) ended = 'woke';
  let summary;
  if (ended === 'safe') {
    await streets.enterRefuge(refuge);
    summary = `You reached <b>${refuge} · ${STREETS.refuges[refuge].name}</b>. You are safe.`;
    sound.chime();
  } else if (ended === 'met') {
    await streets.meet();
    sound.low();
    summary = `You met the Returner${refuge ? ` at the gate of <b>${refuge} · ${STREETS.refuges[refuge].name}</b>` : ''}, on a street you know. The night ends.`;
  } else {
    summary = 'Four turns, and no refuge. You wake in the street.';
  }
  // the notebook learns: a circle where she hid, one rubbed out everywhere else; the streets she walked are hers now
  const reached = ended === 'safe' ? refuge : null;
  const litBefore = p.lit.length;
  p.notebook = R.updateNotebook(p.notebook, reached);
  for (let i = 1; i < route.length; i++) { const k = R.edgeKey(route[i - 1], route[i]); if (!p.lit.includes(k)) p.lit.push(k); }
  $('.notebook').innerHTML = notebookHTML(p.notebook, null, reached) + `<div class="nways">New streets you know: <b>${p.lit.length - litBefore}</b></div>`;
  await sleep(1400);
  const res = R.afterNight(p.stone, ended, p.sentBack);
  dbg('night end', ended, refuge, res, { litSteps, darkSteps, retPath });
  G.rec.nights.push({ night: G.rec.nights.length + 1, name: night, stone: p.stone, notebook_before: `A${before.A} B${before.B} C${before.C}`,
    returner_start: start ? `${start.refuge} (${start.gate})` : '-', returner_path: retPath.join('-') || '-', numbers: numbers.join(' '),
    route: route.join('-'), lit_steps: litSteps, dark_steps: darkSteps, familiar_way_only: darkSteps === 0 ? 'Y' : 'N',
    ended: ended === 'safe' ? `safe ${refuge}` : ended === 'met' ? 'met the Returner' : 'woke in the street',
    same_refuge_as_last_night: reached ? (reached === p.lastRefuge ? 'Y' : 'N') : '-',
    went_to_where_it_started: start && reached ? (reached === start.refuge ? 'Y' : 'N') : '-',
    notebook_after: `A${p.notebook.A} B${p.notebook.B} C${p.notebook.C}`, back_on_map: res.note });
  p.lastRefuge = reached;
  p.nightsPlayed.push({ name: night, ended });
  save();
  const moveText = res.to > p.stone ? `stone ${p.stone} → ${res.to}` : res.to < p.stone ? `back from stone ${p.stone} to ${res.to}` : `you stay on stone ${p.stone}`;
  await card(`<div class="eyebrow">${escape(night)} · the night ends</div><h2>${ended === 'safe' ? 'Safe' : ended === 'met' ? 'You met the Returner' : 'You woke in the street'}</h2>
    <p>${summary}</p><p class="muted">The notebook: ${Object.entries(p.notebook).map(([k, v]) => `${k} ${'●'.repeat(v)}${'○'.repeat(3 - v)}`).join(' &nbsp; ')}</p>
    <div class="because"><b>Because the night ended this way</b>, on the map: ${res.note} (${moveText}).</div>`, 'Back to the map', { cls: 'small' });
  document.body.classList.remove('night');
  await fade(async () => { setBoard(mapBoard); mapBoard.place(G.players); });
  turnBanner('back on the map');
  renderMapPanel('back');
  p.sentBack = res.sentBack;
  if (res.to !== p.stone) {
    if (res.to > p.stone) await mapBoard.hop(0, [res.to]);
    else { toast(`<b>Back to stone ${res.to}</b>, the start of ${chapterName(p.stone)}.`, 'back'); await mapBoard.jump(0, res.to, 'back'); }
    p.stone = res.to;
    if (ended === 'safe') await landOnRing(mapEntry);
  }
}

// a test player: keeps to the refuge it reached last, but steps around the Returner when it sees it
function autoStep(options, retAt, retNext) {
  const goal = STREETS.refuges[P().lastRefuge || P().autoRefuge || 'B'].gate;
  const avoid = [retAt, retNext].filter(Boolean);
  const safe = options.filter((o) => !avoid.includes(o.node));
  const pool = safe.length ? safe : options;
  const dist = (n) => {                                   // streets from n to the goal
    const d = { [n]: 0 }, q = [n];
    while (q.length) { const x = q.shift(); if (x === goal) return d[x]; for (const m of R.neighbours(x)) if (!(m in d)) { d[m] = d[x] + 1; q.push(m); } }
    return 99;
  };
  pool.sort((a, b) => dist(a.node) - dist(b.node) || a.cost - b.cost);
  const here = (o) => o;
  return dist(pool[0].node) < dist(autoStep.at) ? here(pool[0].node) : 'stop';
}

// ---- the game ------------------------------------------------------------------------------------------------------
async function play() {
  $('#title').classList.add('hidden');
  document.body.classList.add('playing');
  mapBoard.setPlayers(G.players);
  renderMapPanel();
  if (window.AUTO) P().autoRefuge = ['A', 'B', 'C'][Math.floor(window.AUTO.rnd() * 3)];
  let guard = 0;
  while (!P().done && !G.ended && guard++ < 300) await mapTurn();
  await afterPlay();
}

async function afterPlay() {
  G.ended = true;
  save();
  const p = P();
  $('#banner').innerHTML = '<b>After play</b>';
  $('#actions').innerHTML = '';
  const box = $('#after');
  box.classList.remove('hidden');
  const met = p.nightsPlayed.filter((n) => n.ended === 'met').length;
  box.innerHTML = `<div class="after-box"><h2>After play</h2><p class="muted">Ask the player, in order. 1 = strongly disagree, 5 = strongly agree.</p>
    <section style="--who:${p.colour}"><h3><span class="dot"></span>${escape(p.name)}</h3>
      <p class="muted">${p.nightsPlayed.length} nights · ${p.mapTurns} map turns · met the Returner ${met} time${met === 1 ? '' : 's'} · sent back ${p.sentBack} time${p.sentBack === 1 ? '' : 's'}</p>
      ${STATEMENTS.map((s, k) => `<div class="rate"><span>L${k + 1} · ${escape(s)}</span><span>${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="L${k}" value="${v}"><i>${v}</i></label>`).join('')}</span></div>`).join('')}
      ${QUESTIONS.map((q, k) => `<label class="q">Q${k + 1} · ${escape(q)}<textarea name="Q${k}" rows="2"></textarea></label>`).join('')}
    </section>
    <div class="after-actions"><button class="primary" id="dl">Save answers and download the record</button><button class="secondary" id="again">Next player</button></div>
    <p class="muted" id="dlnote">One .zip file: the whole record, and the nights, map turns and after-play answers as CSV.</p></div>`;
  const collect = () => {
    const o = { version: VERSION, player: p.name };
    STATEMENTS.forEach((s, k) => { const v = box.querySelector(`input[name=L${k}]:checked`); o['L' + (k + 1)] = v ? Number(v.value) : ''; });
    QUESTIONS.forEach((q, k) => { o['Q' + (k + 1)] = box.querySelector(`textarea[name=Q${k}]`).value; });
    Object.assign(o, { map_turns_to_end: p.mapTurns, sent_back: p.sentBack, nights: p.nightsPlayed.length, met_the_returner: met,
      woke: p.nightsPlayed.filter((n) => n.ended === 'woke').length });
    G.rec.after = [o];
    save();
  };
  $('#dl').addEventListener('click', () => {
    collect();
    const name = downloadRecord(G);
    $('#dl').textContent = 'Download again';
    $('#dlnote').textContent = `Saved as ${name}: the whole record (JSON) and the nights, map turns and after play (CSV).`;
  });
  $('#again').addEventListener('click', () => { collect(); clearSave(); location.reload(); });
  if (window.AUTO) console.log('AUTO_DONE ' + JSON.stringify({ nights: G.rec.nights.map((n) => n.ended), turns: G.rec.mapTurns.length, stone: p.stone, sentBack: p.sentBack, notebook: p.notebook, lit: p.lit.length }));
}

/** The record of a game as one .zip: the JSON and the three CSV tables. */
function downloadRecord(g) {
  const stamp = g.started.slice(0, 16).replace(/[:T]/g, '-');
  const who = (g.players[0].name || 'player').replace(/[^\w-]+/g, '_');
  const base = `wwlo_playtest_${VERSION}_${who}_${stamp}`;
  const files = { [`${base}.json`]: JSON.stringify(g.rec, null, 1) };
  if (g.rec.nights.length) files[`${base}_nights.csv`] = csv(g.rec.nights);
  if (g.rec.mapTurns.length) files[`${base}_map_turns.csv`] = csv(g.rec.mapTurns);
  if (g.rec.after.length) files[`${base}_after_play.csv`] = csv(g.rec.after);
  downloadBlob(`${base}.zip`, zip(files));
  return `${base}.zip`;
}

// ---- the title screen ----------------------------------------------------------------------------------------------
const saved = load();
if (saved && saved.ended && saved.rec) {
  const b = $('#lastrec');
  b.classList.remove('hidden');
  b.textContent = `Download the last player's record (${saved.players[0].name})`;
  b.addEventListener('click', () => downloadRecord(saved));
}
if (saved && !saved.ended) {
  $('#resume').classList.remove('hidden');
  $('#resume').textContent = `Resume: ${saved.players[0].name}`;
  $('#resume').addEventListener('click', () => { G = saved; play(); });
}
$('#begin').addEventListener('click', () => {
  newGame($('#p1').value.trim() || 'Player');
  play();
});
$('#end').addEventListener('click', async () => {
  if (!G || G.ended) return;
  G.ended = true;
  await afterPlay();
});
if (window.AUTO) { newGame('Auto'); play(); }
// views for checking single screens: ?view=map | teller | flap | card | streets
const view = params.get('view');
if (view && !window.AUTO) {
  newGame('Player');
  const p = P();
  const when = (sel, i, fn) => { const e = document.querySelectorAll(sel)[i]; if (e && !e.disabled) fn(e); else setTimeout(() => when(sel, i, fn), 100); };
  if (view === 'map') { p.stone = 3; play(); }
  if (view === 'teller') { play(); when('#actions button', 0, (b) => b.click()); }
  if (view === 'flap') { play(); when('#actions button', 0, (b) => b.click()); when('.teller .q', 0, (b) => { b.click(); when('.teller .num', 1, (n) => n.click()); }); }
  if (view === 'card' || view === 'streets') {
    p.stone = 21; p.notebook = { A: 2, B: 0, C: 1 }; p.lastRefuge = 'A'; p.nightsPlayed = [{ name: 'the town at night', ended: 'safe' }, { name: 'the town in the storm', ended: 'safe' }];
    p.lit.push(R.edgeKey('J1', 'J4'), R.edgeKey('J4', 'GA'), R.edgeKey('J2', 'J5'), R.edgeKey('J5', 'GA'));
    $('#title').classList.add('hidden'); document.body.classList.add('playing'); mapBoard.setPlayers(G.players);
    if (view === 'streets') when('#card:not(.hidden) button', 0, (b) => b.click());
    playNight(null);
  }
}
