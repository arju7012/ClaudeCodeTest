// Level progression and between-level upgrades.

// quota: kills needed to clear. interval: seconds between spawns. maxAlive: cap on
// enemies on screen. mix: relative spawn weights. Boss levels clear when the boss dies.
const LEVELS = [
  { quota: 12, interval: 1.3, maxAlive: 8, mix: { grunt: 1 } },
  { quota: 18, interval: 1.1, maxAlive: 10, mix: { grunt: 3, runner: 1 } },
  { quota: 24, interval: 1.0, maxAlive: 12, mix: { grunt: 3, runner: 2, brute: 1 } },
  { quota: 28, interval: 0.9, maxAlive: 14, mix: { grunt: 3, runner: 2, brute: 1, spitter: 1 } },
  { interval: 1.6, maxAlive: 8, mix: { grunt: 2, runner: 1 }, boss: true },
  { quota: 32, interval: 0.8, maxAlive: 16, mix: { grunt: 2, runner: 3, brute: 1, spitter: 1 } },
  { quota: 36, interval: 0.75, maxAlive: 18, mix: { grunt: 2, runner: 2, brute: 2, spitter: 2 } },
  { quota: 40, interval: 0.7, maxAlive: 20, mix: { grunt: 1, runner: 3, brute: 2, spitter: 2 } },
  { quota: 45, interval: 0.65, maxAlive: 22, mix: { grunt: 2, runner: 3, brute: 3, spitter: 3 } },
  { interval: 1.2, maxAlive: 12, mix: { runner: 2, brute: 1, spitter: 2 }, boss: true },
];

function getLevel(n) {
  const scaling = {
    hpMul: 1 + Math.floor((n - 1) / 5) * 0.5,
    bossHp: 100 + n * 30,
  };
  if (n <= LEVELS.length) {
    return { ...LEVELS[n - 1], ...scaling, speedMul: 1 + (n - 1) * 0.03 };
  }
  // Endless mode: keep scaling past the scripted levels, with a boss every 5th level
  const extra = n - LEVELS.length;
  return {
    ...scaling,
    quota: 45 + extra * 4,
    interval: Math.max(0.35, 0.65 - extra * 0.03),
    maxAlive: Math.min(40, 22 + extra * 2),
    mix: { grunt: 2, runner: 3, brute: 3, spitter: 3 },
    boss: n % 5 === 0,
    speedMul: Math.min(1.6, 1.27 + extra * 0.03),
  };
}

function pickWeighted(mix) {
  const entries = Object.entries(mix);
  let r = Math.random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [key, w] of entries) {
    r -= w;
    if (r < 0) return key;
  }
  return entries[0][0];
}

const UPGRADES = [
  { name: 'RAPID FIRE', desc: ['+25% FIRE', 'RATE'], apply: (p) => { p.fireRate *= 1.25; } },
  { name: 'HEAVY ROUNDS', desc: ['+1 BULLET', 'DAMAGE'], apply: (p) => { p.damage += 1; } },
  { name: 'SWIFT BOOTS', desc: ['+15% MOVE', 'SPEED'], apply: (p) => { p.speed *= 1.15; } },
  {
    name: 'EXTRA HEART',
    desc: ['+1 MAX HP', 'AND HEAL 1'],
    apply: (p) => { p.maxHp += 1; p.hp = Math.min(p.maxHp, p.hp + 1); },
  },
  {
    name: 'SPREAD SHOT',
    desc: ['+2 BULLETS', 'PER SHOT'],
    apply: (p) => { p.spread += 1; },
    available: (p) => p.spread < 2,
  },
  {
    name: 'PIERCING',
    desc: ['BULLETS PASS', '+1 ENEMY'],
    apply: (p) => { p.pierce += 1; },
    available: (p) => p.pierce < 3,
  },
  {
    name: 'PATCH UP',
    desc: ['FULLY RESTORE', 'HEALTH'],
    apply: (p) => { p.hp = p.maxHp; },
    available: (p) => p.hp < p.maxHp,
  },
];

function pickUpgrades(player, count) {
  const pool = UPGRADES.filter((u) => !u.available || u.available(player));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
