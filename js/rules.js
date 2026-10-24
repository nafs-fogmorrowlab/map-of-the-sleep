// The rules of the paper prototype, with no drawing in them (tested by test_rules.mjs).
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

/** One step on the streets: what it means to arrive at a node, given the watched refuges. */
export function arrive(node, watchedRefuges) {
  const refuge = GATE_OF[node];
  if (!refuge) return { end: null };
  if (watchedRefuges.includes(refuge)) return { end: 'met', refuge };
  return { end: 'safe', refuge };
}

export const NIGHT_TURNS = 4;
