// The fortune teller on screen: say a word, watch it spelled (the paper opens and closes once a letter), pick one of
// the four numbers it opens onto, and lift its flap: how far you move, and a question in your own head.
import { TELLER } from './data.js';
import { numbersFor } from './rules.js';
import { sleep } from './fx.js';

const el = (tag, cls, html) => { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; };

export class Teller {
  constructor(root, sound) {
    this.root = root;
    this.sound = sound;
  }

  /** Resolves with { word, number, move, line }. */
  ask({ who, colour, context }) {
    const R = this.root;
    R.innerHTML = '';
    R.classList.remove('hidden');
    const card = el('div', 'teller-card');
    card.style.setProperty('--who', colour);
    card.append(el('div', 'teller-who', `<span class="dot"></span>${who}`));
    card.append(el('h2', null, 'The fortune teller'));
    const hint = el('p', 'hint', 'Say a word.');
    card.append(hint);
    const teller = el('div', 'teller');
    const quads = TELLER.words.map((w, i) => {
      const q = el('button', `q q${i}`, `<span>${w.word}</span>`);
      q.style.setProperty('--bg', w.bg); q.style.setProperty('--fg', w.fg);
      q.setAttribute('aria-label', `Say ${w.word}`);
      teller.append(q);
      return q;
    });
    const mouth = el('div', 'mouth');
    teller.append(mouth);
    const wrap = el('div', 'teller-wrap');
    wrap.append(teller);
    const flapBox = el('div', 'flapbox');
    wrap.append(flapBox);
    card.append(wrap);
    const spell = el('div', 'spell');
    card.append(spell);
    const go = el('button', 'go primary hidden');
    card.append(go);
    R.append(card);

    return new Promise((resolve) => {
      let busy = false;
      quads.forEach((q, i) => q.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        const word = TELLER.words[i].word;
        quads.forEach((b) => (b.disabled = true));
        q.classList.add('said');
        hint.textContent = `“${word}”`;
        spell.innerHTML = '';
        for (let k = 0; k < word.length; k++) {
          const l = el('span', 'letter', word[k]);
          spell.append(l);
          teller.classList.remove('open-a', 'open-b');
          void teller.offsetWidth;
          teller.classList.add(k % 2 ? 'open-b' : 'open-a');
          this.sound && this.sound.tick();
          await sleep(420);
        }
        const nums = numbersFor(word);
        hint.textContent = 'Pick a number.';
        mouth.innerHTML = '';
        const btns = nums.map((n) => {
          const b = el('button', 'num', String(n));
          b.setAttribute('aria-label', `Pick ${n}`);
          mouth.append(b);
          return b;
        });
        teller.classList.add('showing');
        btns.forEach((b, j) => b.addEventListener('click', async () => {
          const number = nums[j];
          btns.forEach((x) => (x.disabled = true));
          b.classList.add('picked');
          const move = TELLER.moves[number], line = TELLER.lines[number];
          flapBox.innerHTML = `<div class="flap"><div class="flap-inner">
            <div class="face front">flap ${number}</div>
            <div class="face back"><b>MOVE ${move}</b><i>${line}</i></div></div></div>`;
          this.sound && this.sound.chime();
          await sleep(60);
          flapBox.querySelector('.flap').classList.add('lifted');
          hint.textContent = 'Read the question to yourself.';
          await sleep(700);
          go.textContent = context === 'streets' ? `Move up to ${move} junction${move > 1 ? 's' : ''}` : `Move ${move} stone${move > 1 ? 's' : ''}`;
          go.classList.remove('hidden');
          go.focus();
          go.addEventListener('click', () => { R.classList.add('hidden'); resolve({ word, number, move, line }); }, { once: true });
          if (window.AUTO) setTimeout(() => go.click(), 10);
        }));
        if (window.AUTO) setTimeout(() => btns[window.AUTO.pickNumber(nums)].click(), 10);
      }));
      if (window.AUTO) setTimeout(() => quads[window.AUTO.pickWord()].click(), 10);
    });
  }
}
