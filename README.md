# The map of the sleep (web version, v2)

The paper prototype of *Where We Leave Ourselves*, played on screen by **one player, from START to END**. The next player
starts a new game. v1, for two players taking turns, is kept at `v1/`. Why it changed is in
`Docs/BDI712/A1_iteration_notes.md` in the WWLO repo.

1. **The fortune teller** gives every move. Say a word, pick one of the four numbers it opens onto, and lift its flap:
   how far you move, and a question in your own head. The question stays in view in the side panel.
2. **The map of the sleep** carries you through five chapters to END, where you wake.
   - A ★ night stone (moon, silver ring) stops you, even with moves left, and starts a night.
   - A gold ring is a way up: you jump ahead to the stone number on its label.
   - A red ring is a way back: you go back to the stone number on its label, the same chapter met more simply.
3. **The streets of the night**: four turns to reach a refuge.
   - Streets you have walked are **lit** and cost 1 step; new streets are **dark** and cost 3. The three streets out of
     START are lit from the first night.
   - **From the second night the Returner is out.** It starts at the gate of the refuge you hid in most (the
     notebook's circles), and after each of your moves it walks one junction along your lit streets toward you. A red
     ring shows its next step.
   - Walking onto it, or ending your move where it steps next, means you meet it, and the night ends. Any gate it
     isn't standing on is safe. After 4 turns you wake in the street.
   - How the night ends moves you on the map: safe moves you on 1 stone; meeting the Returner sends you back to the
     chapter's first stone, at most twice; waking in the street keeps you where you are.

Every choice is a click; the page moves the pieces. **View: street / overhead** switches the camera on the streets.
Every turn and every night is recorded. At the end come the after-play statements and questions (v1's, plus L7 and Q8),
and **Save answers and download the record** gives one .zip: the JSON and three CSVs (nights, map turns, after play).
A game in progress is kept in the browser, so a refresh can resume it. The title screen can download the last
player's record again.

## Hosting on GitHub Pages

1. Make a new repository, for example `map-of-the-sleep`.
2. Put the contents of this folder at its root: `index.html`, `css/`, `js/`, `img/` (and this README).
3. In the repository: **Settings → Pages → Build and deployment → Deploy from a branch**, branch `main`, folder `/ (root)`.
4. After a minute it is live at `https://<your-user>.github.io/map-of-the-sleep/`.

The page loads three.js (0.160.0) from jsDelivr and the fonts from Google Fonts, so it needs an internet connection.

## Trying it locally

ES modules don't load from `file://`, so serve the folder:

```
cd interactive
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Changing things

- **Pictures:** `img/` holds WWLO's own renders, listed in `IMAGES` in `js/data.js`: the five chapters, the four nights
  and the three refuges. Chapter III is the Maze, Lake and Lane render graded to night, because there is no game-lit
  render of it yet. Replace a file, keeping its name, to change a place.
- **Rules and wording:** `js/data.js` holds the stones, rings, streets, the teller's moves and its questions, taken from
  `Tools/bdi712/build_layers.py` and `build_fortune.py`. `js/rules.js` holds the rules, with the v2 numbers at the top
  (`DARK_COST`, `HOME_LIT`, `NIGHT_TURNS`). `node test_rules.mjs` checks them against the printed boards.
- **Test views** (for checking, not for players): `?view=map`, `?view=teller`, `?view=flap`, `?view=card`,
  `?view=streets`. `?auto=7` plays a whole game by itself, quickly.
