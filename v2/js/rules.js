// The rules of the prototype, with no drawing in them (tested by test_rules.mjs).
// v2 (2026-10-23), after the first web playtest, where the Returner "never moved, never affected me" and a player
// who varied every choice found it "never learned my habit":
// - streets she has walked on an earlier night are lit and cost 1 step; streets she has never walked are dark and
//   cost 3, so the teller's number goes three times as far on the ways she knows. The three streets out of START
//   are lit from the first night (the street outside her door);
// - from her second night the Returner is out: it starts at the gate of the refuge she hid in most (the notebook's
//   circles; a tie goes to the latest), and after each of her moves it walks one junction along her lit streets
//   toward her. Where it will step next is shown before she moves;
// - each turn it shows the junction it will step to; after her move it steps there. Meeting it (walking onto it, or
//   it stepping onto her) ends the night; any gate it isn't standing on is safe.
// Tuned by simulating whole games (2026-10-23): a player who keeps the same refuge and ignores it meets it on about
// half their nights; one who watches it meets it on 5-12% but wakes in the street on 14-23% (the cost of the dark
// way); night 1 is safe about 60% of the time.
// The way you trust is the way that gives you away: the familiar way is fast, for her and for it.
import { MAP, STREETS, TELLER } from './data.js';

export const END = MAP.stones.length - 1;
export const SPECIALS = Object.fromEntries(Object.entries(MAP.specials).map(([k, v]) => [Number(k), v]));
export const NIGHT_STONES = Object.keys(SPECIALS).map(Number).filter((s) => SPECIALS[s][0] === 'night');

export function kindOf(stone) {
  return SPECIALS[stone] ? SPECIALS[stone][0] : null;
}

/** The four numbers a spelled word opens onto: one open-and-close per letter. */
export function numbersFor(word) {
  return word.length % 2 ? TELLER.odd : TELLER.even;
}

/** A move on the map: n stones forward, but stopping on the first night stone ahead, and at END. */
export function mapMove(from, n) {
  const path = [];
  let stop = null;
  for (let s = from + 1; s <= Math.min(from + n, END); s++) {
    path.push(s);
    if (kindOf(s) === 'night') { stop = 'night'; break; }
  }
  const at = path.length ? path[path.length - 1] : from;
  if (at === END) stop = 'end';
  return { path, at, stop, movesLeft: n - path.length };
}

/** What landing on a stone does: a gold ring (up) or a red ring (back) sends you to the stone it names. */
export function ringOf(stone) {
  const sp = SPECIALS[stone];
  if (!sp || sp[0] === 'night') return null;
  return { kind: sp[0], name: sp[1], to: sp[2] };
}

export function chapterOf(stone) {
  return MAP.chapter_of[stone];
}

/** Back on the map after a night. Returns the stone to move to and what happened. */
export function afterNight(stone, outcome, sentBack) {
  if (outcome === 'safe') return { to: Math.min(stone + 1, END), sentBack, note: 'safe in a refuge: move on 1 stone' };
  if (outcome === 'met') {
    if (sentBack < 2) {
      return { to: MAP.first[chapterOf(stone)], sentBack: sentBack + 1, note: "met the Returner: back to this chapter's first stone" };
    }
    return { to: stone, sentBack, note: 'met the Returner: after two times sent back, the night only ends' };
  }
  return { to: stone, sentBack, note: 'woke in the street: stay where you are' };
}

// ---- the streets of the night ------------------------------------------------------------------------------------
export const GATE_OF = Object.fromEntries(Object.entries(STREETS.refuges).map(([k, r]) => [r.gate, k]));
const ADJ = {};
for (const [a, b] of STREETS.streets) {
  (ADJ[a] = ADJ[a] || []).push(b);
  (ADJ[b] = ADJ[b] || []).push(a);
}
export function neighbours(node) {
  return ADJ[node] || [];
}
export const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Refuges the Returner watches before a night: 2 or 3 circles in the notebook. */
export function watched(notebook) {
  return Object.keys(notebook).filter((k) => notebook[k] >= 2);
}

/** After a night: a circle filled at the refuge reached, one rubbed out at each refuge not reached. */
export function updateNotebook(notebook, reached) {
  const out = {};
  for (const k of Object.keys(notebook)) out[k] = k === reached ? Math.min(3, notebook[k] + 1) : Math.max(0, notebook[k] - 1);
  return out;
}

/** Arriving at a junction: a refuge's gate is safe unless the Returner stands on it. */
export function arrive(node, returnerAt) {
  if (returnerAt && node === returnerAt) return { end: 'met', refuge: GATE_OF[node] || null };
  const refuge = GATE_OF[node];
  return refuge ? { end: 'safe', refuge } : { end: null };
}

export const LIT_COST = 1, DARK_COST = 3;
export const HOME_LIT = [['S', 'J1'], ['S', 'J2'], ['S', 'J3']].map(([a, b]) => edgeKey(a, b));

/** The steps she can take from a junction with this many steps left: lit streets cost 1, dark ones 2. */
export function stepOptions(at, lit, steps) {
  return neighbours(at).map((n) => ({ node: n, lit: lit.has(edgeKey(at, n)) }))
    .map((o) => ({ ...o, cost: o.lit ? LIT_COST : DARK_COST }))
    .filter((o) => o.cost <= steps);
}

/** Where the Returner starts a night: the gate of the refuge with the most circles (a tie: the latest); none if all 0. */
export function returnerStart(notebook, lastRefuge) {
  const top = Math.max(...Object.values(notebook));
  if (top <= 0) return null;
  const ks = Object.keys(notebook).filter((k) => notebook[k] === top);
  const k = ks.includes(lastRefuge) ? lastRefuge : ks[0];
  return { refuge: k, gate: STREETS.refuges[k].gate };
}

function bfs(from, ok) {
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const n = q.shift();
    for (const m of neighbours(n)) if (!(m in prev) && ok(n, m)) { prev[m] = n; q.push(m); }
  }
  return prev;
}

function firstStep(prev, from, to) {
  if (!(to in prev) || to === from) return null;
  let n = to;
  while (prev[n] !== from) n = prev[n];
  return n;
}

/**
 * The Returner's next junction: one step along her lit streets toward her. If no lit street leads to her, it walks
 * toward the lit junction nearest her. It never steps off her lit streets; with none, it waits at its gate.
 */
export function returnerStep(at, herAt, lit) {
  const litOk = (a, b) => lit.has(edgeKey(a, b));
  const prev = bfs(at, litOk);
  if (herAt in prev) return firstStep(prev, at, herAt) || at;
  // the lit junction (reachable by it) nearest to her, by any streets
  const dist = {}, q = [herAt];
  dist[herAt] = 0;
  while (q.length) { const n = q.shift(); for (const m of neighbours(n)) if (!(m in dist)) { dist[m] = dist[n] + 1; q.push(m); } }
  let best = at;
  for (const n of Object.keys(prev)) if (dist[n] < dist[best] || (dist[n] === dist[best] && n < best)) best = n;
  return firstStep(prev, at, best) || at;
}

export const NIGHT_TURNS = 4;
