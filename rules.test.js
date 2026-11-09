// Tests for rules.js. Run by opening tests.html in a browser.
/* global PacketRules, test, assertEqual, assert */

(function () {
  const R = PacketRules;
  const C = R.CONFIG;

  // --- Starting state -------------------------------------------------------
  test('new game starts with score 0, 5 lives, not over', () => {
    const g = R.createGame();
    assertEqual(g.score, 0);
    assertEqual(g.lives, 5);
    assertEqual(g.over, false);
  });

  test('starting lives comes from CONFIG.startingLives', () => {
    assertEqual(C.startingLives, 5);
    assertEqual(R.createGame().lives, C.startingLives);
  });

  // --- Catching -------------------------------------------------------------
  test('catching green adds one point and keeps lives', () => {
    const g = R.catchPacket(R.createGame(), 'green');
    assertEqual(g.score, 1);
    assertEqual(g.lives, 5);
  });

  test('catching red costs one life and keeps score', () => {
    const start = R.catchPacket(R.createGame(), 'green');
    const g = R.catchPacket(start, 'red');
    assertEqual(g.score, 1);
    assertEqual(g.lives, 4);
    assertEqual(g.over, false);
  });

  test('catchPacket does not modify the game passed in', () => {
    const g = R.createGame();
    R.catchPacket(g, 'green');
    R.catchPacket(g, 'red');
    assertEqual(g.score, 0);
    assertEqual(g.lives, 5);
  });

  test('fourth red catch leaves one life; fifth ends the game', () => {
    let g = R.createGame();
    for (let i = 0; i < 4; i++) g = R.catchPacket(g, 'red');
    assertEqual(g.lives, 1);
    assertEqual(g.over, false);
    g = R.catchPacket(g, 'red');
    assertEqual(g.lives, 0);
    assertEqual(g.over, true);
  });

  test('catches after game over are ignored', () => {
    let g = R.createGame();
    for (let i = 0; i < 5; i++) g = R.catchPacket(g, 'red');
    const after = R.catchPacket(R.catchPacket(g, 'green'), 'red');
    assertEqual(after.score, g.score);
    assertEqual(after.lives, 0);
    assertEqual(after.over, true);
  });

  // --- Missing --------------------------------------------------------------
  test('missing a packet changes nothing', () => {
    let g = R.catchPacket(R.catchPacket(R.createGame(), 'green'), 'red');
    const m = R.missPacket(g);
    assertEqual(m.score, g.score);
    assertEqual(m.lives, g.lives);
    assertEqual(m.over, g.over);
  });

  // --- Speed ----------------------------------------------------------------
  test('fall speed starts at the base speed', () => {
    assertEqual(R.fallSpeed(0), C.baseFallSpeed);
  });

  test('fall speed never decreases as score rises', () => {
    let prev = R.fallSpeed(0);
    for (let s = 1; s <= 200; s++) {
      const v = R.fallSpeed(s);
      assert(v >= prev, `speed dropped at score ${s}: ${prev} -> ${v}`);
      prev = v;
    }
  });

  test('fall speed actually increases with score', () => {
    assert(R.fallSpeed(10) > R.fallSpeed(0), 'speed at 10 should exceed speed at 0');
  });

  test('fall speed is capped', () => {
    assertEqual(R.fallSpeed(100000), C.maxFallSpeed);
  });

  test('spawn interval shrinks with score and has a floor', () => {
    assertEqual(R.spawnInterval(0), C.baseSpawnInterval);
    assert(R.spawnInterval(10) < R.spawnInterval(0), 'interval should shrink');
    assertEqual(R.spawnInterval(100000), C.minSpawnInterval);
  });

  // --- Packet type ----------------------------------------------------------
  test('pickPacketType returns red below the red chance, green otherwise', () => {
    assertEqual(R.pickPacketType(0), 'red');
    assertEqual(R.pickPacketType(C.redChance - 0.0001), 'red');
    assertEqual(R.pickPacketType(C.redChance), 'green');
    assertEqual(R.pickPacketType(0.9999), 'green');
  });

  test('red chance is about 30%', () => {
    assertEqual(C.redChance, 0.3);
  });

  // --- Collision ------------------------------------------------------------
  const paddle = { x: 100, y: 600, w: 80, h: 14 };

  test('packet sitting on the paddle overlaps', () => {
    assertEqual(R.overlaps({ x: 120, y: 590, w: 20, h: 20 }, paddle), true);
  });

  test('packet above the paddle does not overlap', () => {
    assertEqual(R.overlaps({ x: 120, y: 500, w: 20, h: 20 }, paddle), false);
  });

  test('packet beside the paddle does not overlap', () => {
    assertEqual(R.overlaps({ x: 40, y: 600, w: 20, h: 20 }, paddle), false);
    assertEqual(R.overlaps({ x: 200, y: 600, w: 20, h: 20 }, paddle), false);
  });

  test('packet just touching an edge does not count; one pixel in does', () => {
    assertEqual(R.overlaps({ x: 80, y: 600, w: 20, h: 20 }, paddle), false);
    assertEqual(R.overlaps({ x: 81, y: 600, w: 20, h: 20 }, paddle), true);
  });

  // --- High score -----------------------------------------------------------
  test('high score is replaced when the score beats it', () => {
    assertEqual(R.updateHighScore(10, 11), 11);
  });

  test('high score is kept when the score is lower or equal', () => {
    assertEqual(R.updateHighScore(10, 4), 10);
    assertEqual(R.updateHighScore(10, 10), 10);
  });

  test('first game sets the high score from zero', () => {
    assertEqual(R.updateHighScore(0, 3), 3);
    assertEqual(R.updateHighScore(0, 0), 0);
  });

  test('stored high score is read back as a number', () => {
    assertEqual(R.parseHighScore('42'), 42);
    assertEqual(R.parseHighScore('0'), 0);
  });

  test('nothing stored yet gives 0', () => {
    assertEqual(R.parseHighScore(null), 0);
    assertEqual(R.parseHighScore(undefined), 0);
    assertEqual(R.parseHighScore(''), 0);
  });

  test('garbled stored value gives 0', () => {
    assertEqual(R.parseHighScore('abc'), 0);
    assertEqual(R.parseHighScore('12abc'), 0);
    assertEqual(R.parseHighScore('Infinity'), 0);
  });

  test('negative stored value gives 0', () => {
    assertEqual(R.parseHighScore('-5'), 0);
  });

  test('fractional stored value is rounded down', () => {
    assertEqual(R.parseHighScore('7.9'), 7);
  });
})();
