# The map of the sleep (web version)

The paper prototype of *Where We Leave Ourselves*, played on screen: the fortune teller, the map of the sleep and the
streets of the night, for two players taking turns on one screen. It is live at
https://nafs-fogmorrowlab.github.io/map-of-the-sleep/v1/ (the main address forwards there).

A v2 (one player, lit and dark streets, a Returner that walked the player's streets) was built on 23 October 2026,
froze during play, and was discarded. It is still in this repository's history (commits c3739d7 and 7d05ec1). What comes
next is in the revision plan, `Docs/BDI712/A1_Revision_Plan.pdf` in the WWLO repo.

## v1

1. **The fortune teller** gives every move. Say a word, pick one of the four numbers it opens onto, and lift its flap:
   how far you move, and a question in your own head.
2. **The map of the sleep** carries you through five chapters.
   - A ★ night stone (moon, silver ring) stops you, even with moves left, and starts a night.
   - A gold ring is a way up: you jump ahead to the stone number on its label.
   - A red ring is a way back: you go back to the stone number on its label, the same chapter met more simply.
3. **The streets of the night**: four turns to reach a refuge.
   - Each player has their own Returner's notebook. It fills a circle where you hid and rubs one out everywhere else.
   - A refuge with 2 or 3 circles is watched, and the Returner stands on its gate.
   - How the night ends moves you on the map: safe moves you on 1 stone; meeting the Returner sends you back to the
     chapter's first stone, at most twice; waking in the street keeps you where you are.

Every choice is a click; the page moves the pieces. Every turn and every night is recorded. At the end come the
after-play statements and questions from the printed turn logs, and **Save answers and download the record** gives one
.zip: the JSON and three CSVs (nights, map turns, after play). The title screen can download the last playtest's record
again.

## Hosting and trying it locally

GitHub Pages serves this repository's root (Settings → Pages → Deploy from a branch, `main`, `/ (root)`). The page loads
three.js (0.160.0) from jsDelivr and the fonts from Google Fonts, so it needs an internet connection. To try it locally,
serve the folder (`python3 -m http.server 8000`) and open http://localhost:8000/v1/.

The pictures in `img/` are WWLO's own renders, listed in `IMAGES` in `v1/js/data.js`. Chapter III is the Maze, Lake and
Lane render graded to night.
