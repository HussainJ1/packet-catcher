// Packet Catcher: drawing, input and the animation loop.
// All scoring, lives and speed decisions come from rules.js (PacketRules).
(function () {
  'use strict';

  const R = window.PacketRules;
  const W = 480;
  const H = 640;
  const PADDLE_W = 90;
  const PADDLE_H = 14;
  const PADDLE_Y = H - 40;
  const PADDLE_SPEED = 420; // pixels per second
  const PACKET_W = 34;
  const PACKET_H = 22;
  const MAX_FRAME = 0.05;   // seconds; stops packets jumping after a pause

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const startScreen = document.getElementById('start-screen');
  const overScreen = document.getElementById('gameover-screen');
  const finalScoreEl = document.getElementById('final-score');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const bestEl = document.getElementById('best');
  const startBestEl = document.getElementById('start-best');
  const overMsgEl = document.getElementById('gameover-msg');

  // --- High score storage -------------------------------------------------------
  // Storage can be blocked (private windows, disabled site data). If so the
  // game still works and the high score just lasts until the page closes.
  const HIGH_SCORE_KEY = 'packetCatcher.highScore';
  function loadHighScore() {
    try { return R.parseHighScore(localStorage.getItem(HIGH_SCORE_KEY)); }
    catch (e) { return 0; }
  }
  function saveHighScore(value) {
    try { localStorage.setItem(HIGH_SCORE_KEY, String(value)); }
    catch (e) { /* storage unavailable: keep it in memory only */ }
  }
  let highScore = loadHighScore();
  let bestAtStart = highScore; // high score before the current game began

  // Sharp drawing on high-DPI screens while keeping 480x640 game units.
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  let game = R.createGame();
  let running = false;
  let packets = [];
  let flashes = [];
  let spawnTimer = 0;
  let paddleX = (W - PADDLE_W) / 2;
  let lastTime = null;
  const keys = { left: false, right: false };

  // --- Input ------------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
    else if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
    else if (e.key === 'Enter' && !running) { e.preventDefault(); startGame(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    else if (e.key === 'ArrowRight') keys.right = false;
  });
  // Don't leave the paddle sliding if the window loses focus mid-press.
  window.addEventListener('blur', () => { keys.left = keys.right = false; });

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  // --- Game flow --------------------------------------------------------------
  function startGame() {
    game = R.createGame();
    packets = [];
    flashes = [];
    spawnTimer = 0.5;
    paddleX = (W - PADDLE_W) / 2;
    bestAtStart = highScore;
    running = true;
    startScreen.hidden = true;
    overScreen.hidden = true;
    document.activeElement && document.activeElement.blur();
    updateHud();
  }

  function endGame() {
    running = false;
    finalScoreEl.textContent = game.score;
    if (game.score > bestAtStart) {
      overMsgEl.textContent = 'New high score!';
      overMsgEl.className = 'record';
    } else {
      overMsgEl.textContent = 'High score: ' + highScore;
      overMsgEl.className = '';
    }
    overScreen.hidden = false;
    restartBtn.focus();
  }

  function spawnPacket() {
    packets.push({
      x: Math.random() * (W - PACKET_W),
      y: -PACKET_H,
      w: PACKET_W,
      h: PACKET_H,
      type: R.pickPacketType(Math.random()),
    });
  }

  function update(dt) {
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    paddleX = Math.max(0, Math.min(W - PADDLE_W, paddleX + dir * PADDLE_SPEED * dt));
    const paddle = { x: paddleX, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnPacket();
      spawnTimer = R.spawnInterval(game.score);
    }

    const speed = R.fallSpeed(game.score);
    const kept = [];
    for (const p of packets) {
      p.y += speed * dt;
      if (R.overlaps(p, paddle)) {
        game = R.catchPacket(game, p.type);
        flashes.push({ x: p.x + p.w / 2, y: PADDLE_Y, type: p.type, t: 0 });
      } else if (p.y > H) {
        game = R.missPacket(game);
      } else {
        kept.push(p);
      }
    }
    packets = kept;
    updateHud();

    if (game.over) endGame();
  }

  // --- HUD --------------------------------------------------------------------
  let shownScore = -1;
  let shownLives = -1;
  let shownBest = -1;
  function updateHud() {
    if (game.score !== shownScore) {
      scoreEl.textContent = game.score;
      shownScore = game.score;
    }
    const best = R.updateHighScore(highScore, game.score);
    if (best !== highScore) {
      highScore = best;
      saveHighScore(highScore); // saved straight away, so closing mid-game keeps it
    }
    if (highScore !== shownBest) {
      bestEl.textContent = highScore;
      startBestEl.textContent = highScore;
      shownBest = highScore;
    }
    if (game.lives !== shownLives) {
      const lost = R.CONFIG.startingLives - game.lives;
      livesEl.innerHTML = '♥'.repeat(game.lives) + '<span class="lost">' + '♥'.repeat(lost) + '</span>';
      livesEl.setAttribute('aria-label', game.lives + ' lives left');
      shownLives = game.lives;
    }
  }

  // --- Drawing ----------------------------------------------------------------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(56, 89, 140, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 0; y <= H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
  }

  function drawPacket(p) {
    const green = p.type === 'green';
    ctx.fillStyle = green ? '#22c55e' : '#ef4444';
    roundRect(p.x, p.y, p.w, p.h, 4);
    ctx.fill();
    ctx.strokeStyle = green ? '#86efac' : '#fca5a5';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Label as well as colour, so colour-blind players can tell them apart.
    ctx.fillStyle = green ? '#052e14' : '#3b0a0a';
    ctx.font = 'bold 12px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(green ? 'OK' : 'X', p.x + p.w / 2, p.y + p.h / 2 + 1);
  }

  function drawPaddle() {
    // A small brick wall: the firewall.
    const x = paddleX;
    const y = PADDLE_Y;
    ctx.fillStyle = '#f59e0b';
    roundRect(x, y, PADDLE_W, PADDLE_H, 3);
    ctx.fill();
    ctx.strokeStyle = '#7c4a03';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + PADDLE_H / 2);
    ctx.lineTo(x + PADDLE_W, y + PADDLE_H / 2);
    for (let bx = x + 15; bx < x + PADDLE_W; bx += 15) {
      ctx.moveTo(bx, y); ctx.lineTo(bx, y + PADDLE_H / 2);
      ctx.moveTo(bx - 7.5, y + PADDLE_H / 2); ctx.lineTo(bx - 7.5, y + PADDLE_H);
    }
    ctx.stroke();
  }

  function drawFlashes(dt) {
    const kept = [];
    for (const f of flashes) {
      f.t += dt;
      if (f.t > 0.6) continue;
      const a = 1 - f.t / 0.6;
      ctx.globalAlpha = a;
      ctx.fillStyle = f.type === 'green' ? '#86efac' : '#fca5a5';
      ctx.font = 'bold 16px ui-monospace, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.type === 'green' ? '+1' : '-1 ♥', f.x, f.y - 12 - f.t * 40);
      ctx.globalAlpha = 1;
      kept.push(f);
    }
    flashes = kept;
  }

  function render(dt) {
    drawBackground();
    for (const p of packets) drawPacket(p);
    drawPaddle();
    drawFlashes(dt);
  }

  // --- Loop -------------------------------------------------------------------
  function frame(time) {
    const dt = lastTime === null ? 0 : Math.min(MAX_FRAME, (time - lastTime) / 1000);
    lastTime = time;
    if (running) update(dt);
    render(dt);
    requestAnimationFrame(frame);
  }

  updateHud();
  requestAnimationFrame(frame);
})();
