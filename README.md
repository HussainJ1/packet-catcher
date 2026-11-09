# packet-catcher
Game Packet-Catcher

A small browser game. Packets fall from the top of the screen; move the
firewall paddle with the left and right arrow keys.

- Green packet (OK) caught: +1 point
- Red packet (X) caught: lose one of 5 lives
- Packets that fall past: no effect
- Packets fall faster, and appear more often, as your score rises
- Your high score is remembered by the browser between visits

## Play
Open `index.html` in a browser. No server, install or internet needed.

## Files
- `index.html`: the page, styles, score/lives display and game-over screen
- `game.js`: drawing, keyboard input and the animation loop
- `rules.js`: the game rules (scoring, lives, speed, collision); all tunable
  numbers are in its `CONFIG` object
- `rules.test.js`, `tests.html`: tests for the rules

## Tests
Run `./run-tests.sh` (uses headless Chrome, Chromium or Edge; exits non-zero
if any test fails), or open `tests.html` in a browser.
