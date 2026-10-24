// node test_rules.mjs : checks the web rules against the printed boards' rules
import assert from 'node:assert/strict';
import * as R from './js/rules.js';
import { TELLER } from './js/data.js';
assert.equal(R.END, 33);
assert.deepEqual(R.NIGHT_STONES, [1, 3, 21, 24]);
for (const w of TELLER.words) assert.deepEqual(R.numbersFor(w.word).map((n) => TELLER.moves[n]).sort(), [1, 2, 3, 4]);
assert.deepEqual(R.mapMove(0, 4).path, [1]);                 // stops on the first night stone
assert.equal(R.mapMove(0, 4).stop, 'night');
assert.deepEqual(R.mapMove(1, 2).path, [2, 3]);              // from a night stone you leave freely, stop on the next
assert.deepEqual(R.mapMove(3, 1), { path: [4], at: 4, stop: null, movesLeft: 0 });
assert.deepEqual(R.ringOf(4), { kind: 'up', name: 'the tower stairs', to: 7 });
assert.deepEqual(R.ringOf(16), { kind: 'back', name: 'a wrong portal', to: 14 });
assert.equal(R.ringOf(1), null);
assert.equal(R.mapMove(31, 4).at, 33); assert.equal(R.mapMove(31, 4).stop, 'end');
assert.deepEqual(R.afterNight(21, 'met', 0), { to: 20, sentBack: 1, note: "met the Returner: back to this chapter's first stone" });
assert.equal(R.afterNight(21, 'met', 2).to, 21);
assert.equal(R.afterNight(3, 'safe', 0).to, 4);
assert.equal(R.afterNight(3, 'woke', 0).to, 3);
assert.deepEqual(R.updateNotebook({ A: 1, B: 0, C: 2 }, 'A'), { A: 2, B: 0, C: 1 });
assert.deepEqual(R.watched({ A: 2, B: 0, C: 1 }), ['A']);
assert.deepEqual(R.arrive('GA', ['A']), { end: 'met', refuge: 'A' });
assert.deepEqual(R.arrive('GB', ['A']), { end: 'safe', refuge: 'B' });
assert.deepEqual(R.arrive('J5', ['A']), { end: null });
assert.deepEqual(R.neighbours('S').sort(), ['J1', 'J2', 'J3']);
// every ring lands on a plain stone or a ring, never past END; ways up never skip a night stone
for (const [s, v] of Object.entries(R.SPECIALS)) if (v[0] === 'up') for (let k = Number(s) + 1; k < v[2]; k++) assert.notEqual(R.kindOf(k), 'night');
console.log('rules ok');
