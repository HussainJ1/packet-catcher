// Packet Catcher game rules: scoring, lives, speed, packet type and collision.
// No page, canvas or randomness in here, so everything can be tested directly.
(function (root) {
  'use strict';

  const CONFIG = Object.freeze({
    startingLives: 5,
    baseFallSpeed: 150,      // pixels per second at score 0
    fallSpeedPerPoint: 8,    // extra pixels per second for each point
    maxFallSpeed: 550,
    baseSpawnInterval: 1.2,  // seconds between packets at score 0
    spawnIntervalPerPoint: 0.02,
    minSpawnInterval: 0.4,
    redChance: 0.3,          // share of packets that are red
  });

  function createGame() {
    return { score: 0, lives: CONFIG.startingLives, over: false };
  }

  // Returns a new game state after a packet of the given type hits the paddle.
  function catchPacket(game, type) {
    if (game.over) return game;
    if (type === 'green') {
      return { ...game, score: game.score + 1 };
    }
    if (type === 'red') {
      const lives = Math.max(0, game.lives - 1);
      return { ...game, lives, over: lives === 0 };
    }
    return game;
  }

  // Packets that fall past the paddle have no effect.
  function missPacket(game) {
    return game;
  }

  function fallSpeed(score) {
    return Math.min(CONFIG.maxFallSpeed, CONFIG.baseFallSpeed + score * CONFIG.fallSpeedPerPoint);
  }

  function spawnInterval(score) {
    return Math.max(CONFIG.minSpawnInterval, CONFIG.baseSpawnInterval - score * CONFIG.spawnIntervalPerPoint);
  }

  // rand is a number in [0, 1), e.g. from Math.random().
  function pickPacketType(rand) {
    return rand < CONFIG.redChance ? 'red' : 'green';
  }

  // Axis-aligned rectangle overlap; touching edges do not count.
  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  const PacketRules = {
    CONFIG, createGame, catchPacket, missPacket,
    fallSpeed, spawnInterval, pickPacketType, overlaps,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PacketRules;
  root.PacketRules = PacketRules;
})(typeof window !== 'undefined' ? window : globalThis);
