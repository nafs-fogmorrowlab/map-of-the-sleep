// Where We Leave Ourselves · the paper prototype, played on screen. Two players take turns on one screen: the fortune
// teller gives every move, the map of the sleep carries them through five chapters, and each night stone opens a night
// on the streets, where the Returner's notebook learns where each of them hides.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MAP, STREETS, IMAGES, STATEMENTS, QUESTIONS } from './data.js';
import * as R from './rules.js';
import { MapBoard } from './board_map.js';
import { StreetsBoard } from './board_streets.js';
import { Teller } from './teller.js';
import { Sound } from './sound.js';
import { csv, download } from './log.js';
import { PLAYER_COLOURS, sleep, tween } from './fx.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const KEY = 'wwlo-paper-prototype-v1';
const dbg = (...a) => { if (window.AUTO) console.log('DBG ' + a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(' ')); };
window.addEventListener('unhandledrejection', (e) => console.log('REJECT ' + (e.reason && e.reason.stack || e.reason)));
window.addEventListener('error', (e) => console.log('ERR ' + e.message + ' ' + e.filename + ':' + e.lineno));

// ---- test hooks: ?auto=SEED plays itself quickly (both players), for checking the flow ----------------------------
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

// ---- the game's state, kept in the browser so a refresh can resume ------------------------------------------------
let G = null;
function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { /* private mode: no resume */ } }
function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { /* nothing */ } }

function newGame(names) {
  G = {
    v: 1, started: new Date().toISOString(), current: 0,
    players: names.map((name, i) => ({ name, colour: PLAYER_COLOURS[i], stone: 0, sentBack: 0, notebook: { A: 0, B: 0, C: 0 },
      nightsPlayed: [], lastRefuge: null, done: false, mapTurns: 0 })),
    rec: { mapTurns: [], nights: [], after: [] },
  };
  save();
}

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

function turnBanner(p, text) {
  const b = $('#banner');
  b.innerHTML = `<span class="dot" style="background:${p.colour}"></span><b>${escape(p.name)}</b><span>${text}</span>`;
  b.style.setProperty('--who', p.colour);
}

// ---- the side panel ------------------------------------------------------------------------------------------------
function chapterName(stone) { return MAP.chapter_name[R.chapterOf(stone)]; }

function renderMapPanel() {
  const ps = G.players.map((p, i) => `<div class="pcard ${i === G.current ? 'now' : ''}" style="--who:${p.colour}">
      <div class="prow"><span class="dot"></span><b>${escape(p.name)}</b><span class="where">${p.done ? 'awake · END' : p.stone === 0 ? 'START' : 'stone ' + p.stone}</span></div>
      <div class="pch">${p.done ? 'woke from the sleep' : chapterName(p.stone)}</div>
      <div class="prow small"><span>Sent back</span><span class="boxes">${[0, 1].map((k) => `<i class="box ${k < p.sentBack ? 'x' : ''}"></i>`).join('')}</span>
      <span>Nights ${p.nightsPlayed.length}</span></div>
      <div class="pnights">${p.nightsPlayed.map((n) => `<span class="nt ${n.ended}">${escape(n.name)}</span>`).join('')}</div></div>`).join('');
  $('#panel').innerHTML = `<h3>The map of the sleep</h3>${ps}
    <div class="legend">
      <div><i class="lg night"></i><span><b>★ Night stone</b> (moon, silver ring): you must stop here, even with moves left. A night begins on the streets.</span></div>
      <div><i class="lg up"></i><span><b>Gold ring</b>, a way up: land on it and jump ahead to the stone number on its label.</span></div>
      <div><i class="lg back"></i><span><b>Red ring</b>, a way back: go back to the stone number on its label, the same chapter met more simply.</span></div>
      <div class="muted">Say a word, pick a number, move that many stones. Read the question to yourself.</div>
    </div>`;
}

function notebookHTML(nb, watchedList, flash) {
  return Object.entries(STREETS.refuges).map(([k, r]) => `<div class="nrow ${watchedList.includes(k) ? 'watched' : ''} ${flash === k ? 'flash' : ''}">
      <span><b>${k}</b> · ${r.name}</span><span class="circles">${[0, 1, 2].map((c) => `<i class="ink ${c < nb[k] ? 'on' : ''}"></i>`).join('')}</span></div>`).join('');
}

function renderNightPanel(p, night, turn, w, stepsLeft) {
  $('#panel').innerHTML = `<h3>The streets of the night</h3>
    <div class="nightname">★ ${escape(night)} · <span style="color:${p.colour}">${escape(p.name)}</span></div>
    <div class="turns">${[1, 2, 3, 4].map((k) => `<i class="moon ${k < turn ? 'gone' : k === turn ? 'now' : ''}"></i>`).join('')}<span>turn ${Math.min(turn, 4)} of 4</span></div>
    ${stepsLeft != null ? `<div class="steps">Steps left this turn: <b>${stepsLeft}</b></div>` : ''}
    <h4>The Returner's notebook</h4><div class="muted">It learns where you hide.</div>
    <div class="notebook">${notebookHTML(p.notebook, w)}</div>
    <div class="legend">
      <div>Each turn, ask the fortune teller, then click up to that many junctions.</div>
      <div class="safe">Reach any refuge: you are safe.</div>
      <div class="met">Pass or stop on the Returner: the night ends.</div>
      <div>The night is short: after 4 turns you wake in the street.</div>
      <div class="muted">Before each night, a refuge with 2 or 3 circles is watched: the Returner stands on its gate.</div>
    </div>`;
}

// ---- a turn on the map ---------------------------------------------------------------------------------------------
async function landOnRing(pi, entry) {
  const p = G.players[pi];
  const ring = R.ringOf(p.stone);
  if (!ring) return;
  if (ring.kind === 'up') toast(`<b>Gold ring · ${ring.name}</b><br>A way up: on to stone ${ring.to}.`, 'up');
  else toast(`<b>Red ring · ${ring.name}</b><br>A way back: to stone ${ring.to}, the same chapter met more simply.`, 'back');
  await sleep(900);
  await mapBoard.jump(pi, ring.to, ring.kind);
  if (entry) entry.ring = `${ring.kind === 'up' ? 'gold' : 'red'}: ${ring.name}, ${p.stone} → ${ring.to}`;
  p.stone = ring.to;
}

async function mapTurn(pi) {
  const p = G.players[pi];
  turnBanner(p, `on the map · ${p.stone === 0 ? 'START' : 'stone ' + p.stone}`);
  renderMapPanel();
  mapBoard.focus(p.stone);
  await action([['Ask the fortune teller', 'ask']]);
  const t = await teller.ask({ who: p.name, colour: p.colour, context: 'map' });
  const from = p.stone;
  const mv = R.mapMove(from, t.move);
  dbg('map', p.name, from, t.word, t.number, t.move, mv);
  await mapBoard.hop(pi, mv.path);
  dbg('hopped');
  p.stone = mv.at;
  p.mapTurns++;
  const entry = { player: p.name, turn: p.mapTurns, from, word: t.word, number: t.number, move: t.move, question: t.line,
    landed: mv.at, ring: '', night: '', to: null };
  G.rec.mapTurns.push(entry);
  if (mv.stop === 'night' && mv.movesLeft > 0) toast(`<b>★ You must stop on a night stone</b>, even with ${mv.movesLeft} move${mv.movesLeft > 1 ? 's' : ''} left.`, 'night');
  if (mv.stop === 'end') {
    p.done = true;
    entry.ring = 'END';
    toast(`<b>END · awake.</b> ${escape(p.name)} wakes from the sleep.`, 'up', 5000);
    sound.chime();
  } else if (R.kindOf(p.stone) === 'night') {
    entry.night = R.SPECIALS[p.stone][1];
    dbg('night stone');
    save();
    dbg('saved');
    await sleep(700);
    dbg('slept');
    await playNight(pi);
  } else {
    await landOnRing(pi, entry);
  }
  entry.to = p.stone;
  mapBoard.place(G.players);
  save();
  renderMapPanel();
}

// ---- a night on the streets ----------------------------------------------------------------------------------------
function pathTo(from, goal, blocked) {
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const n = q.shift();
    if (n === goal) break;
    for (const m of R.neighbours(n)) if (!(m in prev) && !blocked.includes(m)) { prev[m] = n; q.push(m); }
  }
  if (!(goal in prev)) return null;
  const path = [];
  for (let n = goal; n !== from; n = prev[n]) path.unshift(n);
  return path;
}

async function playNight(pi) {
  const p = G.players[pi];
  const night = R.SPECIALS[p.stone][1];
  const w = R.watched(p.notebook);
  const before = { ...p.notebook };
  const watchedGates = w.map((k) => STREETS.refuges[k].gate);
  dbg('night', night, p.notebook);
  await card(`<div class="eyebrow">★ Night stone · stone ${p.stone}</div><h2>${escape(night)}</h2>
    <p>${escape(p.name)}, the night begins on the streets. You have four turns to reach one of three places to hide.</p>
    <p class="muted">${w.length ? 'The Returner\'s notebook remembers where you hid.' : 'The Returner\'s notebook is still learning where you hide.'}</p>`,
  'Into the streets', { image: IMAGES.nights[night], cls: 'night' });
  dbg('card done');
  await fade(async () => { setBoard(streets); streets.setup(p.colour, watchedGates); });
  dbg('in streets');
  turnBanner(p, `the streets · ${night}`);
  renderNightPanel(p, night, 1, w);
  sound.low();
  if (w.length) {
    for (const g of watchedGates) await streets.rise(g);
    toast(`<b>The Returner is standing on the gate of ${w.map((k) => `${k} · ${STREETS.refuges[k].name}`).join(' and ')}.</b><br>It learned that you hide there.`, 'met', 6500);
  } else {
    toast('No gate is watched tonight. Every refuge is open.', 'safe', 4500);
  }
  let ended = null, refuge = null;
  const numbers = [], route = ['S'];
  for (let turn = 1; turn <= R.NIGHT_TURNS && !ended; turn++) {
    streets.setDarkness((turn - 1) / R.NIGHT_TURNS);
    renderNightPanel(p, night, turn, w);
    await action([['Ask the fortune teller', 'ask']]);
    const t = await teller.ask({ who: p.name, colour: p.colour, context: 'streets' });
    numbers.push(t.number);
    let steps = t.move, taken = 0;
    while (steps > 0 && !ended) {
      renderNightPanel(p, night, turn, w, steps);
      const options = R.neighbours(streets.at);
      const choice = streets.choose(options);
      let pick;
      if (window.AUTO) {
        const goal = STREETS.refuges[p.autoRefuge || 'B'].gate;
        const path = pathTo(streets.at, goal, []) || [options[0]];
        pick = path[0];
        streets.clearChoice();
      } else if (taken > 0) {
        const stop = action([['Stop here', 'stop', 'secondary']]);
        pick = await Promise.race([choice, stop.then(() => 'stop')]);
        streets.clearChoice();
        $('#actions').innerHTML = '';
      } else {
        $('#hint').textContent = 'Click a lit junction to step there.';
        pick = await choice;
      }
      $('#hint').textContent = '';
      if (pick === 'stop' || pick == null) break;
      await streets.hopTo(pick);
      dbg('step', pick);
      route.push(pick);
      steps--; taken++;
      const a = R.arrive(pick, w);
      if (a.end) { ended = a.end; refuge = a.refuge; }
    }
  }
  renderNightPanel(p, night, 5, w);
  if (!ended) ended = 'woke';
  let summary;
  if (ended === 'safe') {
    await streets.enterRefuge(refuge);
    summary = `You reached <b>${refuge} · ${STREETS.refuges[refuge].name}</b>. You are safe.`;
    sound.chime();
  } else if (ended === 'met') {
    await streets.meet();
    sound.low();
    summary = `You met the Returner at the gate of <b>${refuge} · ${STREETS.refuges[refuge].name}</b>. The night ends.`;
  } else {
    summary = 'Four turns, and no refuge. You wake in the street.';
  }
  // the notebook learns: a circle where she hid, one rubbed out everywhere else
  const reached = ended === 'safe' ? refuge : null;
  p.notebook = R.updateNotebook(p.notebook, reached);
  $('.notebook').innerHTML = notebookHTML(p.notebook, [], reached);
  await sleep(1400);
  const res = R.afterNight(p.stone, ended, p.sentBack);
  dbg('night end', ended, refuge, res);
  G.rec.nights.push({ player: p.name, night, stone: p.stone, notebook_before: `A${before.A} B${before.B} C${before.C}`, watched: w.join(' ') || '-',
    numbers: numbers.join(' '), route: route.join('-'), ended: ended === 'safe' ? `safe ${refuge}` : ended === 'met' ? `met the Returner (${refuge})` : 'woke in the street',
    same_refuge_as_last_night: reached ? (reached === p.lastRefuge ? 'Y' : 'N') : '-', avoided_watched_gate: w.length ? (ended === 'met' ? 'N' : 'Y') : '-',
    notebook_after: `A${p.notebook.A} B${p.notebook.B} C${p.notebook.C}`, back_on_map: res.note });
  p.lastRefuge = reached;
  p.nightsPlayed.push({ name: night, ended });
  save();
  await card(`<div class="eyebrow">${escape(night)} · the night ends</div><h2>${ended === 'safe' ? 'Safe' : ended === 'met' ? 'You met the Returner' : 'You woke in the street'}</h2>
    <p>${summary}</p><p class="muted">The notebook: ${Object.entries(p.notebook).map(([k, v]) => `${k} ${'●'.repeat(v)}${'○'.repeat(3 - v)}`).join(' &nbsp; ')}</p>
    <p><b>Back to the map:</b> ${res.note}.</p>`, 'Back to the map', { cls: 'small' });
  await fade(async () => { setBoard(mapBoard); mapBoard.place(G.players); });
  turnBanner(p, 'back on the map');
  renderMapPanel();
  p.sentBack = res.sentBack;
  if (res.to !== p.stone) {
    if (res.to > p.stone) await mapBoard.hop(pi, [res.to]);
    else { toast(`<b>Back to stone ${res.to}</b>, the start of ${chapterName(p.stone)}.`, 'back'); await mapBoard.jump(pi, res.to, 'back'); }
    p.stone = res.to;
    if (ended === 'safe') await landOnRing(pi, G.rec.mapTurns[G.rec.mapTurns.length - 1]);
  }
}

// ---- the game ------------------------------------------------------------------------------------------------------
async function play() {
  $('#title').classList.add('hidden');
  document.body.classList.add('playing');
  mapBoard.setPlayers(G.players);
  renderMapPanel();
  let guard = 0;
  while (!G.players.every((p) => p.done) && !G.ended && guard++ < 400) {
    const pi = G.current;
    if (!G.players[pi].done) {
      if (window.AUTO && !G.players[pi].autoRefuge) G.players[pi].autoRefuge = ['A', 'B', 'C'][Math.floor(window.AUTO.rnd() * 3)];
      await mapTurn(pi);
    }
    G.current = (pi + 1) % G.players.length;
    save();
  }
  await afterPlay();
}

async function afterPlay() {
  G.ended = true;
  save();
  $('#banner').innerHTML = '<b>After play</b>';
  $('#actions').innerHTML = '';
  const box = $('#after');
  box.classList.remove('hidden');
  box.innerHTML = `<div class="after-box"><h2>After play</h2><p class="muted">Ask each player, in order. 1 = strongly disagree, 5 = strongly agree.</p>
    ${G.players.map((p, i) => `<section style="--who:${p.colour}"><h3><span class="dot"></span>${escape(p.name)}</h3>
      ${STATEMENTS.map((s, k) => `<div class="rate"><span>L${k + 1} · ${escape(s)}</span><span>${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="p${i}L${k}" value="${v}"><i>${v}</i></label>`).join('')}</span></div>`).join('')}
      ${QUESTIONS.map((q, k) => `<label class="q">Q${k + 1} · ${escape(q)}<textarea name="p${i}Q${k}" rows="2"></textarea></label>`).join('')}
    </section>`).join('')}
    <div class="after-actions"><button class="primary" id="dl">Save answers and download the record</button><button class="secondary" id="again">New playtest</button></div></div>`;
  const collect = () => {
    G.rec.after = G.players.map((p, i) => {
      const o = { player: p.name };
      STATEMENTS.forEach((s, k) => { const v = box.querySelector(`input[name=p${i}L${k}]:checked`); o['L' + (k + 1)] = v ? Number(v.value) : ''; });
      QUESTIONS.forEach((q, k) => { o['Q' + (k + 1)] = box.querySelector(`textarea[name=p${i}Q${k}]`).value; });
      o.map_turns_to_end = p.mapTurns; o.sent_back = p.sentBack; o.nights = p.nightsPlayed.length;
      return o;
    });
    save();
  };
  $('#dl').addEventListener('click', () => {
    collect();
    const stamp = G.started.slice(0, 16).replace(/[:T]/g, '-');
    download(`wwlo_playtest_${stamp}.json`, JSON.stringify(G.rec, null, 1), 'application/json');
    download(`wwlo_playtest_${stamp}_nights.csv`, csv(G.rec.nights), 'text/csv');
    download(`wwlo_playtest_${stamp}_map_turns.csv`, csv(G.rec.mapTurns), 'text/csv');
    download(`wwlo_playtest_${stamp}_after_play.csv`, csv(G.rec.after), 'text/csv');
  });
  $('#again').addEventListener('click', () => { clearSave(); location.reload(); });
  if (window.AUTO) console.log('AUTO_DONE ' + JSON.stringify({ nights: G.rec.nights.length, turns: G.rec.mapTurns.length, players: G.players.map((p) => [p.name, p.stone, p.done, p.sentBack, p.notebook]) }));
}

// ---- the title screen ----------------------------------------------------------------------------------------------
const saved = load();
if (saved && !saved.ended) {
  $('#resume').classList.remove('hidden');
  $('#resume').textContent = `Resume: ${saved.players.map((p) => p.name).join(' and ')}`;
  $('#resume').addEventListener('click', () => { G = saved; play(); });
}
$('#begin').addEventListener('click', () => {
  const names = [$('#p1').value.trim() || 'Player 1', $('#p2').value.trim() || 'Player 2'];
  newGame(names);
  play();
});
$('#end').addEventListener('click', async () => {
  if (!G || G.ended) return;
  G.ended = true;
  location.hash = '';
  await afterPlay();
});
if (window.AUTO) { newGame(['Auto 1', 'Auto 2']); play(); }
// views for checking single screens: ?view=map | teller | streets
const view = params.get('view');
if (view && !window.AUTO) {
  newGame(['Player 1', 'Player 2']);
  if (view === 'map') { G.players[0].stone = 3; G.players[1].stone = 9; play(); }
  if (view === 'teller') { play(); setTimeout(() => $('#actions button').click(), 400); }
  if (view === 'flap') {
    const when = (sel, i, fn) => { const e = document.querySelectorAll(sel)[i]; if (e && !e.disabled) fn(e); else setTimeout(() => when(sel, i, fn), 100); };
    play();
    when('#actions button', 0, (b) => b.click());
    when('.teller .q', 0, (b) => { b.click(); when('.teller .num', 1, (n) => n.click()); });
  }
  if (view === 'card') { const p = G.players[0]; p.stone = 3; $('#title').classList.add('hidden'); document.body.classList.add('playing'); mapBoard.setPlayers(G.players); playNight(0); }
  if (view === 'streets') {
    const p = G.players[0]; p.stone = 21; p.notebook = { A: 2, B: 0, C: 1 };
    $('#title').classList.add('hidden'); document.body.classList.add('playing'); mapBoard.setPlayers(G.players);
    const click = () => { const b = document.querySelector('#card:not(.hidden) button'); if (b) b.click(); else setTimeout(click, 100); };
    setTimeout(click, 300);
    playNight(0);
  }
}
