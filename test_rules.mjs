// node test_rules.mjs : checks the web rules against the printed boards' rules, and v2's streets
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
for (const [s, v] of Object.entries(R.SPECIALS)) if (v[0] === 'up') for (let k = Number(s) + 1; k < v[2]; k++) assert.notEqual(R.kindOf(k), 'night');
// v2: lit streets cost 1, dark 2; the Returner starts where she hid most and walks her lit streets toward her
const lit = new Set([R.edgeKey('S', 'J1'), R.edgeKey('J1', 'J4'), R.edgeKey('J4', 'GA')]);
assert.deepEqual(R.stepOptions('S', lit, 1).map((o) => o.node), ['J1']);
assert.deepEqual(R.stepOptions('S', lit, 2).map((o) => o.node), ['J1']);
assert.deepEqual(R.stepOptions('S', lit, 3).map((o) => o.node).sort(), ['J1', 'J2', 'J3']);
assert.equal(R.HOME_LIT.length, 3);
assert.deepEqual(R.returnerStart({ A: 1, B: 1, C: 0 }, 'B'), { refuge: 'B', gate: 'GB' });
assert.deepEqual(R.returnerStart({ A: 2, B: 1, C: 0 }, 'B'), { refuge: 'A', gate: 'GA' });
assert.equal(R.returnerStart({ A: 0, B: 0, C: 0 }, 'A'), null);
assert.equal(R.returnerStep('GA', 'S', lit), 'J4');            // along her lit way, toward her
assert.equal(R.returnerStep('GA', 'J2', lit), 'J4');           // off its streets: toward the lit junction nearest her
assert.equal(R.returnerStep('J1', 'J2', lit), 'J1');           // J1 is already as near as its streets go: it waits
assert.equal(R.returnerStep('GB', 'S', lit), 'GB');            // no lit street from its gate: it waits
assert.deepEqual(R.arrive('GA', 'GA'), { end: 'met', refuge: 'A' });
assert.deepEqual(R.arrive('GA', 'J4'), { end: 'safe', refuge: 'A' });
assert.deepEqual(R.arrive('J4', 'J4'), { end: 'met', refuge: null });
console.log('rules ok');
