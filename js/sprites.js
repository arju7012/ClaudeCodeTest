// Pixel-art sprites defined as character grids. Each character maps to a palette
// color ('.' is transparent). Grids are rendered once to offscreen canvases, along
// with an all-white copy used for the hit flash.

const SPRITES = {};

function makeSprite(rows, palette, scale) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const img = document.createElement('canvas');
  const flash = document.createElement('canvas');
  img.width = flash.width = w * scale;
  img.height = flash.height = h * scale;
  const c = img.getContext('2d');
  const f = flash.getContext('2d');
  f.fillStyle = '#fff';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      c.fillStyle = color;
      c.fillRect(x * scale, y * scale, scale, scale);
      f.fillRect(x * scale, y * scale, scale, scale);
    }
  });
  return { img, flash, w: img.width, h: img.height };
}

// Copy of `rows` with some rows replaced, used to derive animation frames.
function withRows(rows, overrides) {
  const out = rows.slice();
  for (const [i, row] of Object.entries(overrides)) out[i] = row;
  return out;
}

const OUTLINE = '#14141f';

const PLAYER_PALETTE = {
  k: OUTLINE, e: OUTLINE, h: '#5a3420', s: '#f0c090',
  G: '#2d5e2a', g: '#4c9a42', B: '#7a4a26', p: '#34406b', b: '#3b2a20',
};
const PLAYER_IDLE = [
  '.....kkkkk......',
  '....khhhhhk.....',
  '....khhhhhhk....',
  '....khsssssk....',
  '....kssssesk....',
  '....kssssssk....',
  '.....kssssk.....',
  '....kGggggGk....',
  '...kGggggggGk...',
  '...ksggggggsk...',
  '....kBBBBBBk....',
  '....kppppppk....',
  '....kppkkppk....',
  '....kpk..kpk....',
  '....kbk..kbk....',
  '....kkk..kkk....',
];
const PLAYER_STEP_A = withRows(PLAYER_IDLE, {
  13: '...kppk..kpk....',
  14: '...kbbk..kkk....',
  15: '...kkk..........',
});
const PLAYER_STEP_B = withRows(PLAYER_IDLE, {
  13: '....kpk..kppk...',
  14: '....kkk..kbbk...',
  15: '..........kkk...',
});

const GUN_PALETTE = { k: OUTLINE, m: '#aab0bd', M: '#5f6675', w: '#7a4a26' };
const GUN = [
  '.kkkkkkkkkk.',
  'kMmmmmmmmmmk',
  'kMMMMMMMkkk.',
  '.kwwk.......',
  '.kwwk.......',
  '.kkkk.......',
];

const ZOMBIE_PALETTE = {
  k: OUTLINE, z: '#7fb069', Z: '#4e7a3e', r: '#e63946', c: '#6b5b95', C: '#453a63',
};
const ZOMBIE = [
  '................',
  '.....kkkkk......',
  '....kzzzzzk.....',
  '....kzrzrzk.....',
  '....kzzzzzk.....',
  '....kzkkkzk.....',
  '.....kzzzk......',
  '....kccccckzzk..',
  '....kccccckkkk..',
  '....kCcccck.....',
  '....kcCccck.....',
  '....kCCCCCk.....',
  '....kCk.kCk.....',
  '....kZk.kZk.....',
  '....kkk.kkk.....',
  '................',
];
const ZOMBIE_B = withRows(ZOMBIE, {
  12: '.....kCkCk......',
  13: '.....kZkZk......',
  14: '.....kkkkk......',
});

const IMP_PALETTE = { k: OUTLINE, r: '#d64045', R: '#8e2c33', y: '#ffd23f', w: '#f1f1f1' };
const IMP = [
  'k..........k',
  'kk........kk',
  '.krkkkkkkrk.',
  '.krrrrrrrrk.',
  'krryrrrryrrk',
  'krrrrrrrrrrk',
  'krRwRwRwRrrk',
  '.krrrrrrrrk.',
  '..kRrrrrRk..',
  '..kRk..kRk..',
  '..kk....kk..',
  '............',
];
const IMP_B = withRows(IMP, {
  9: '...kRkkRk...',
  10: '...kk..kk...',
});

const BRUTE_PALETTE = {
  k: OUTLINE, o: '#c07a3a', O: '#7a4a1e', y: '#ffd23f', m: '#9aa0a6', M: '#5f656d',
};
const BRUTE = [
  '....kkkkkkkk....',
  '...kmmmmmmmmk...',
  '...kmMmmmmMmk...',
  '...kkkkkkkkkk...',
  '...koyoooyook...',
  '...kooooooook...',
  '..kkoOOOOOOokk..',
  '.kookooooookook.',
  '.kOOkooooookOOk.',
  '.kOOkooooookOOk.',
  '.kkkkMMMMMMkkkk.',
  '....kOOOOOOk....',
  '....kOOkkOOk....',
  '...kOOk..kOOk...',
  '...kkkk..kkkk...',
  '................',
];
const BRUTE_B = withRows(BRUTE, {
  13: '....kOOkkOOk....',
  14: '....kkkkkkkk....',
});

const SPITTER_PALETTE = {
  k: OUTLINE, p: '#9b5de5', P: '#6a3fa0', w: '#f1f1f1', e: OUTLINE, g: '#a8e10c',
};
const SPITTER = [
  '....kkkkkk....',
  '..kkppppppkk..',
  '.kppppppppppk.',
  '.kppkkkkkkppk.',
  'kppkwwwwwwkppk',
  'kppkwweewwkppk',
  'kppkwweewwkppk',
  'kppkwwwwwwkppk',
  '.kppkkkkkkppk.',
  '.kpppkggkpppk.',
  '.kPpppppppPPk.',
  'kPkPPkPPkPPkPk',
  'k.kk.kk.kk.k.k',
  '..............',
];
const SPITTER_B = withRows(SPITTER, {
  11: '.kPkPPkPPkPPk.',
  12: '.k.kk.kk.kk.k.',
});

const BOSS_PALETTE = {
  k: OUTLINE, h: '#e8e2d0', r: '#b5172a', R: '#6e0b16', w: '#f1f1f1', y: '#ffd23f', e: OUTLINE,
};
const BOSS = [
  'kh............hk',
  'khh..........hhk',
  '.khhkkkkkkkkhhk.',
  '..krrrrrrrrrrk..',
  '.krrrkkkkkkrrrk.',
  '.krrkwwwwwwkrrk.',
  'krrrkwwyywwkrrrk',
  'krrrkwyeeywkrrrk',
  'krrrkwwyywwkrrrk',
  'krrrrkkkkkkrrrrk',
  'kRrrrrrrrrrrrrRk',
  'kRrkwkwkwkwkwrRk',
  '.kRrkkkkkkkkrRk.',
  '.kRRrrrrrrrrRRk.',
  '..kRRk....kRRk..',
  '..kkkk....kkkk..',
];
const BOSS_B = withRows(BOSS, {
  14: '...kRRk..kRRk...',
  15: '...kkkk..kkkk...',
});

const HEART = [
  '.kk.kk.',
  'krrkrrk',
  'krwrrrk',
  '.krrrk.',
  '..krk..',
  '...k...',
];

function buildSprites() {
  const idle = makeSprite(PLAYER_IDLE, PLAYER_PALETTE, 3);
  SPRITES.player = {
    idle,
    walk: [makeSprite(PLAYER_STEP_A, PLAYER_PALETTE, 3), idle, makeSprite(PLAYER_STEP_B, PLAYER_PALETTE, 3), idle],
  };
  SPRITES.gun = makeSprite(GUN, GUN_PALETTE, 3);
  SPRITES.zombie = [makeSprite(ZOMBIE, ZOMBIE_PALETTE, 3), makeSprite(ZOMBIE_B, ZOMBIE_PALETTE, 3)];
  SPRITES.imp = [makeSprite(IMP, IMP_PALETTE, 3), makeSprite(IMP_B, IMP_PALETTE, 3)];
  SPRITES.brute = [makeSprite(BRUTE, BRUTE_PALETTE, 4), makeSprite(BRUTE_B, BRUTE_PALETTE, 4)];
  SPRITES.spitter = [makeSprite(SPITTER, SPITTER_PALETTE, 3), makeSprite(SPITTER_B, SPITTER_PALETTE, 3)];
  SPRITES.boss = [makeSprite(BOSS, BOSS_PALETTE, 6), makeSprite(BOSS_B, BOSS_PALETTE, 6)];
  SPRITES.heart = makeSprite(HEART, { k: OUTLINE, r: '#e63946', w: '#ffd6d6' }, 3);
  SPRITES.heartEmpty = makeSprite(HEART, { k: OUTLINE, r: '#3a3a4a', w: '#4a4a5a' }, 3);
}

// Dark checkered dungeon floor with specks and cracks, plus a vignette.
function buildFloor(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  let seed = 1337;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const T = 32;
  for (let ty = 0; ty < h / T; ty++) {
    for (let tx = 0; tx < w / T; tx++) {
      const x = tx * T;
      const y = ty * T;
      g.fillStyle = (tx + ty) % 2 ? '#23232f' : '#272735';
      g.fillRect(x, y, T, T);
      g.fillStyle = '#1b1b25';
      g.fillRect(x, y, T, 2);
      g.fillRect(x, y, 2, T);
      g.fillStyle = '#2f2f40';
      for (let i = 0; i < 3; i++) {
        if (rand() < 0.5) g.fillRect(x + 4 + Math.floor(rand() * 12) * 2, y + 4 + Math.floor(rand() * 12) * 2, 2, 2);
      }
      if (rand() < 0.08) {
        // Diagonal pixel crack
        g.fillStyle = '#18181f';
        let cx = x + 6 + Math.floor(rand() * 10) * 2;
        let cy = y + 6;
        for (let i = 0; i < 8; i++) {
          g.fillRect(cx, cy, 2, 2);
          cx += rand() < 0.5 ? 2 : -2;
          cy += 2;
        }
      }
    }
  }
  const vignette = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = vignette;
  g.fillRect(0, 0, w, h);
  return c;
}
