// Main game: state machine, update loop and rendering.
// States: menu -> playing <-> paused -> clear (pick upgrade) -> playing ... -> dying -> gameover -> menu

const W = 960;
const H = 640;
const HIGH_SCORE_KEY = 'retroRampage.highScore';
const START_BUTTON = { x: W / 2 - 120, y: 200, w: 240, h: 56 };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function loadHighScore() {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Storage unavailable (private mode etc.); the high score just won't persist.
  }
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function updateAll(list, dt, game) {
  for (const item of list) item.update(dt, game);
  return list.filter((item) => !item.dead);
}

const Game = {
  state: 'menu',
  time: 0,

  init() {
    buildSprites();
    this.floor = buildFloor(W, H);
    this.stains = document.createElement('canvas');
    this.stains.width = W;
    this.stains.height = H;
    this.highScore = loadHighScore();
    this.particles = [];
    this.texts = [];
    this.shake = { mag: 0, time: 0 };
    this.hurtFlash = 0;
    this.menuPlayer = new Player(W / 2, 345);
    this.menuWalkers = [];

    Input.init(canvas);
    const unlockAudio = () => Sound.unlock();
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('blur', () => {
      if (this.state === 'playing') this.state = 'paused';
    });
    window.addEventListener('resize', fitCanvas);
    fitCanvas();
  },

  // ---------------------------------------------------------------- flow

  newGame() {
    this.player = new Player(W / 2, H / 2);
    this.score = 0;
    this.newHighScore = false;
    this.particles = [];
    this.texts = [];
    this.startLevel(1);
  },

  startLevel(n) {
    this.level = n;
    this.cfg = getLevel(n);
    this.kills = 0;
    this.levelTime = 0;
    this.spawnTimer = 0;
    this.enemies = [];
    this.bullets = [];
    this.pickups = [];
    this.boss = null;
    this.bossDefeated = false;
    this.stains.getContext('2d').clearRect(0, 0, W, H);
    this.banner = {
      title: `LEVEL ${n}`,
      sub: this.cfg.boss ? 'BOSS INCOMING!' : `DEFEAT ${this.cfg.quota} ENEMIES`,
      time: 2.2,
    };
    this.state = 'playing';
  },

  levelComplete() {
    for (const e of this.enemies) this.burst(e.x, e.y, e.t.color, 12);
    this.enemies = [];
    this.bullets = [];
    const bonus = this.level * 100;
    this.score += bonus;
    this.clearBonus = bonus;
    this.choices = pickUpgrades(this.player, 3);
    this.stateTimer = 1.2;
    this.state = 'clear';
    Sound.levelUp();
  },

  chooseUpgrade(i) {
    const choice = this.choices[i];
    if (!choice) return;
    choice.apply(this.player);
    Sound.select();
    this.startLevel(this.level + 1);
  },

  playerDied() {
    const p = this.player;
    p.dead = true;
    this.burst(p.x, p.y, '#e63946', 40);
    this.burst(p.x, p.y, '#4c9a42', 20);
    this.addShake(12, 0.6);
    this.recordScore();
    Sound.gameOver();
    this.stateTimer = 1.5;
    this.state = 'dying';
  },

  recordScore() {
    if (this.score <= this.highScore) return;
    this.highScore = this.score;
    this.newHighScore = true;
    saveHighScore(this.score);
  },

  // ---------------------------------------------------------------- update

  update(dt) {
    this.time += dt;
    if (Input.wasPressed('KeyM')) Sound.toggleMute();
    switch (this.state) {
      case 'menu': this.updateMenu(dt); break;
      case 'playing': this.updatePlaying(dt); break;
      case 'paused': this.updatePaused(); break;
      case 'clear': this.updateClear(dt); break;
      case 'dying': this.updateDying(dt); break;
      case 'gameover': this.updateGameOver(dt); break;
    }
  },

  updateMenu(dt) {
    this.menuPlayer.aimAt(Input.mouse.x, Input.mouse.y);
    if (Math.random() < dt * 0.9) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const sprite = ['zombie', 'zombie', 'imp', 'brute', 'spitter'][Math.floor(Math.random() * 5)];
      this.menuWalkers.push({ sprite, dir, x: dir > 0 ? -50 : W + 50, y: rand(540, 600), speed: rand(40, 90), anim: 0 });
    }
    for (const w of this.menuWalkers) {
      w.x += w.dir * w.speed * dt;
      w.anim += dt;
    }
    this.menuWalkers = this.menuWalkers.filter((w) => w.x > -80 && w.x < W + 80);

    if ((Input.mouse.clicked && inRect(Input.mouse.x, Input.mouse.y, START_BUTTON)) || Input.wasPressed('Enter', 'Space')) {
      Sound.select();
      this.newGame();
    }
  },

  updatePlaying(dt) {
    if (Input.wasPressed('KeyP', 'Escape')) {
      this.state = 'paused';
      return;
    }
    this.levelTime += dt;
    if (this.banner.time > 0) this.banner.time -= dt;

    const p = this.player;
    p.update(dt, this);
    this.updateSpawning(dt);
    for (const e of this.enemies) e.update(dt, this);
    this.separateEnemies();
    this.bullets = updateAll(this.bullets, dt, this);
    this.pickups = updateAll(this.pickups, dt, this);
    this.handleCollisions();
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.updateEffects(dt);

    if (p.hp <= 0) {
      this.playerDied();
      return;
    }
    const done = this.cfg.boss ? this.bossDefeated : this.kills >= this.cfg.quota;
    if (done) this.levelComplete();
  },

  updateSpawning(dt) {
    const c = this.cfg;
    if (this.levelTime < 1) return; // short grace period at level start
    if (c.boss && !this.boss && !this.bossDefeated && this.levelTime > 3) {
      this.boss = new Enemy('boss', W / 2, -60, c);
      this.enemies.push(this.boss);
      this.addShake(6, 0.8);
      Sound.bossRoar();
    }
    this.spawnTimer -= dt;
    // Never spawn more than the quota still needs
    const needed = c.boss ? Infinity : c.quota - this.kills - this.enemies.length;
    if (this.spawnTimer <= 0 && this.enemies.length < c.maxAlive && needed > 0) {
      this.spawnEnemy(pickWeighted(c.mix));
      this.spawnTimer = c.interval * rand(0.7, 1.3);
    }
  },

  // Spawns just outside a random edge of the arena so enemies come from every side.
  spawnEnemy(type) {
    const m = 40;
    let x;
    let y;
    switch (Math.floor(Math.random() * 4)) {
      case 0: x = rand(0, W); y = -m; break;
      case 1: x = W + m; y = rand(0, H); break;
      case 2: x = rand(0, W); y = H + m; break;
      default: x = -m; y = rand(0, H);
    }
    this.enemies.push(new Enemy(type, x, y, this.cfg));
  },

  // Soft push so enemies don't stack into a single blob.
  separateEnemies() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.5;
        const wa = a.t.boss ? 0 : b.t.boss ? 1 : 0.5;
        const wb = 1 - wa;
        a.x -= (dx / d) * push * wa;
        a.y -= (dy / d) * push * wa;
        b.x += (dx / d) * push * wb;
        b.y += (dy / d) * push * wb;
      }
    }
  },

  handleCollisions() {
    const p = this.player;
    for (const b of this.bullets) {
      if (b.dead) continue;
      if (b.hostile) {
        if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r * 0.7 && p.invuln <= 0) {
          b.dead = true;
          this.hurtPlayer();
        }
        continue;
      }
      for (const e of this.enemies) {
        if (e.dead || b.hits.has(e)) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) >= b.r + e.r) continue;
        b.hits.add(e);
        e.hit(b.damage, b.angle);
        this.sparks(b.x, b.y, e.t.color);
        Sound.hit();
        if (e.hp <= 0) this.killEnemy(e);
        if (b.pierce-- <= 0) {
          b.dead = true;
          break;
        }
      }
    }

    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < e.r + p.r * 0.6 && p.invuln <= 0) {
        this.hurtPlayer();
        e.kx += (dx / d) * 300;
        e.ky += (dy / d) * 300;
      }
    }

    for (const h of this.pickups) {
      if (Math.hypot(h.x - p.x, h.y - p.y) < h.r + p.r) {
        h.dead = true;
        if (p.hp < p.maxHp) {
          p.hp += 1;
          this.texts.push(new FloatText(h.x, h.y - 20, '+1 HP', '#ff6b81'));
        } else {
          this.score += 50;
          this.texts.push(new FloatText(h.x, h.y - 20, '+50', '#ffe66d'));
        }
        Sound.pickup();
      }
    }
    this.pickups = this.pickups.filter((h) => !h.dead);
  },

  hurtPlayer() {
    const p = this.player;
    p.hp -= 1;
    p.invuln = 1.2;
    this.hurtFlash = 0.25;
    this.addShake(8, 0.3);
    this.burst(p.x, p.y, '#e63946', 10);
    Sound.hurt();
  },

  killEnemy(e) {
    e.dead = true;
    this.score += e.t.score;
    if (e.t.boss) {
      this.bossDefeated = true;
      this.burst(e.x, e.y, e.t.color, 80);
      this.burst(e.x, e.y, '#ffd23f', 40);
      this.addShake(14, 0.7);
    } else {
      this.kills += 1;
      this.burst(e.x, e.y, e.t.color, 18);
      this.addShake(2, 0.08);
      if (Math.random() < 0.06) this.pickups.push(new Pickup(e.x, e.y));
    }
    this.splat(e.x, e.y, e.t.color, e.r);
    this.texts.push(new FloatText(e.x, e.y - e.r - 10, `+${e.t.score}`, '#ffe66d'));
    Sound.kill();
  },

  updatePaused() {
    if (Input.wasPressed('KeyP', 'Escape')) this.state = 'playing';
    else if (Input.wasPressed('KeyQ')) {
      this.recordScore();
      this.state = 'menu';
    }
  },

  updateClear(dt) {
    this.stateTimer -= dt;
    this.updateEffects(dt);
    if (this.stateTimer > 0) return;
    const keys = ['Digit1', 'Digit2', 'Digit3'];
    for (let i = 0; i < this.choices.length; i++) {
      if (Input.wasPressed(keys[i]) || (Input.mouse.clicked && inRect(Input.mouse.x, Input.mouse.y, this.cardRect(i)))) {
        this.chooseUpgrade(i);
        return;
      }
    }
  },

  updateDying(dt) {
    this.stateTimer -= dt;
    this.updateEffects(dt);
    if (this.stateTimer <= 0) {
      this.stateTimer = 0.6; // brief delay so a held click doesn't skip the screen
      this.state = 'gameover';
    }
  },

  updateGameOver(dt) {
    this.stateTimer -= dt;
    this.updateEffects(dt);
    if (this.stateTimer <= 0 && (Input.mouse.clicked || Input.wasPressed('Enter', 'Space'))) {
      Sound.select();
      this.state = 'menu';
    }
  },

  updateEffects(dt) {
    this.particles = updateAll(this.particles, dt, this);
    this.texts = updateAll(this.texts, dt, this);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.shake.time > 0) this.shake.time -= dt;
    else this.shake.mag = 0;
  },

  // ---------------------------------------------------------------- effects

  addShake(mag, time) {
    this.shake.mag = Math.max(this.shake.mag, mag);
    this.shake.time = Math.max(this.shake.time, time);
  },

  burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(60, 320);
      const c = Math.random() < 0.3 ? '#14141f' : color;
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.3, 0.8), c, rand(3, 7)));
    }
  },

  sparks(x, y, color) {
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(80, 200);
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.2, i % 2 ? '#fff' : color, 3));
    }
  },

  // Leaves a pixel stain on the floor that lasts until the level ends.
  splat(x, y, color, r) {
    const g = this.stains.getContext('2d');
    g.globalAlpha = 0.45;
    g.fillStyle = color;
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r;
      const s = Math.floor(rand(2, 5)) * 2;
      g.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d * 0.6), s, s);
    }
    g.globalAlpha = 1;
  },

  // ---------------------------------------------------------------- render

  render() {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (this.state === 'menu') {
      this.renderMenu();
    } else {
      this.renderWorld();
      this.renderHud();
      if (this.state === 'playing' && this.banner.time > 0) this.renderBanner();
      if (this.state === 'paused') this.renderPaused();
      if (this.state === 'clear') this.renderClear();
      if (this.state === 'gameover') this.renderGameOver();
    }
    if (Sound.muted) drawText(ctx, 'MUTED', W - 16, H - 24, 2, '#888', 'right');
    this.renderCrosshair();
  },

  renderWorld() {
    ctx.save();
    if (this.shake.mag > 0) {
      ctx.translate(Math.round(rand(-1, 1) * this.shake.mag), Math.round(rand(-1, 1) * this.shake.mag));
    }
    ctx.drawImage(this.floor, 0, 0);
    ctx.drawImage(this.stains, 0, 0);
    for (const h of this.pickups) h.draw(ctx);
    // Draw back-to-front so lower sprites overlap higher ones
    const actors = [...this.enemies, this.player].sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw(ctx);
    for (const b of this.bullets) b.draw(ctx);
    for (const pt of this.particles) pt.draw(ctx);
    for (const t of this.texts) t.draw(ctx);
    ctx.restore();

    if (this.hurtFlash > 0) {
      ctx.fillStyle = `rgba(230,57,70,${this.hurtFlash})`;
      ctx.fillRect(0, 0, W, H);
    }
  },

  renderHud() {
    const p = this.player;
    for (let i = 0; i < p.maxHp; i++) {
      const spr = i < p.hp ? SPRITES.heart : SPRITES.heartEmpty;
      ctx.drawImage(spr.img, 16 + i * 26, 16);
    }

    drawText(ctx, `LEVEL ${this.level}`, W / 2, 14, 3, '#fff', 'center');
    if (this.cfg.boss) {
      drawText(ctx, this.bossDefeated ? 'BOSS DOWN!' : 'BOSS FIGHT', W / 2, 44, 2, '#ff6b6b', 'center');
    } else {
      const bw = 200;
      const bx = W / 2 - bw / 2;
      const progress = Math.min(1, this.kills / this.cfg.quota);
      ctx.fillStyle = '#14141f';
      ctx.fillRect(bx - 2, 42, bw + 4, 12);
      ctx.fillStyle = '#3a3a4a';
      ctx.fillRect(bx, 44, bw, 8);
      ctx.fillStyle = '#7fb069';
      ctx.fillRect(bx, 44, Math.round(bw * progress), 8);
      drawText(ctx, `${this.kills}/${this.cfg.quota}`, W / 2, 60, 2, '#aaa', 'center');
    }

    drawText(ctx, `SCORE ${String(this.score).padStart(6, '0')}`, W - 16, 16, 2, '#ffe66d', 'right');
    drawText(ctx, `HI ${String(Math.max(this.highScore, this.score)).padStart(6, '0')}`, W - 16, 38, 2, '#888', 'right');

    const boss = this.boss;
    if (boss && !boss.dead) {
      const bw = 400;
      const bx = W / 2 - bw / 2;
      const by = H - 36;
      drawText(ctx, 'DEMON EYE', W / 2, by - 22, 2, '#ff6b6b', 'center');
      ctx.fillStyle = '#14141f';
      ctx.fillRect(bx - 3, by - 3, bw + 6, 18);
      ctx.fillStyle = '#3a1a1f';
      ctx.fillRect(bx, by, bw, 12);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(bx, by, Math.round(bw * Math.max(0, boss.hp / boss.maxHp)), 12);
    }
  },

  renderBanner() {
    const t = this.banner.time;
    ctx.globalAlpha = Math.min(1, t * 2);
    drawText(ctx, this.banner.title, W / 2, H / 2 - 70, 6, '#ffe66d', 'center');
    drawText(ctx, this.banner.sub, W / 2, H / 2 + 0, 2, '#fff', 'center');
    ctx.globalAlpha = 1;
  },

  dim(alpha) {
    ctx.fillStyle = `rgba(5,5,12,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  },

  renderPaused() {
    this.dim(0.65);
    drawText(ctx, 'PAUSED', W / 2, H / 2 - 60, 6, '#fff', 'center');
    drawText(ctx, 'P / ESC TO RESUME', W / 2, H / 2 + 10, 2, '#ccc', 'center');
    drawText(ctx, 'Q TO QUIT TO MENU', W / 2, H / 2 + 36, 2, '#ccc', 'center');
  },

  cardRect(i) {
    const w = 230;
    const gap = 30;
    const total = this.choices.length * w + (this.choices.length - 1) * gap;
    return { x: W / 2 - total / 2 + i * (w + gap), y: 290, w, h: 150 };
  },

  renderClear() {
    this.dim(0.6);
    drawText(ctx, `LEVEL ${this.level} CLEAR!`, W / 2, 120, 5, '#7fb069', 'center');
    drawText(ctx, `+${this.clearBonus} BONUS`, W / 2, 175, 2, '#ffe66d', 'center');
    if (this.stateTimer > 0) return;

    drawText(ctx, 'CHOOSE AN UPGRADE', W / 2, 240, 3, '#fff', 'center');
    this.choices.forEach((u, i) => {
      const r = this.cardRect(i);
      const hover = inRect(Input.mouse.x, Input.mouse.y, r);
      ctx.fillStyle = hover ? '#ffe66d' : '#4a4a5a';
      ctx.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
      ctx.fillStyle = hover ? '#2a2a3c' : '#1c1c28';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      drawText(ctx, String(i + 1), r.x + 10, r.y + 10, 2, '#888', 'left');
      drawText(ctx, u.name, r.x + r.w / 2, r.y + 38, 2, hover ? '#ffe66d' : '#fff', 'center');
      u.desc.forEach((line, j) => drawText(ctx, line, r.x + r.w / 2, r.y + 80 + j * 24, 2, '#aaa', 'center'));
    });
    drawText(ctx, 'CLICK A CARD OR PRESS 1-3', W / 2, 470, 2, '#888', 'center');
  },

  renderGameOver() {
    this.dim(0.7);
    drawText(ctx, 'GAME OVER', W / 2, 160, 7, '#e63946', 'center');
    drawText(ctx, `REACHED LEVEL ${this.level}`, W / 2, 260, 3, '#fff', 'center');
    drawText(ctx, `SCORE ${this.score}`, W / 2, 300, 3, '#ffe66d', 'center');
    if (this.newHighScore) {
      if (Math.floor(this.time * 3) % 2 === 0) drawText(ctx, 'NEW HIGH SCORE!', W / 2, 345, 3, '#7fb069', 'center');
    } else {
      drawText(ctx, `HIGH SCORE ${this.highScore}`, W / 2, 345, 2, '#888', 'center');
    }
    if (this.stateTimer <= 0) drawText(ctx, 'CLICK OR PRESS ENTER', W / 2, 430, 2, '#ccc', 'center');
  },

  renderMenu() {
    ctx.drawImage(this.floor, 0, 0);
    this.dim(0.35);

    const bob = Math.round(Math.sin(this.time * 2) * 4);
    drawText(ctx, 'RETRO RAMPAGE', W / 2 + 4, 64 + bob + 4, 7, '#8e2c33', 'center', null);
    drawText(ctx, 'RETRO RAMPAGE', W / 2, 64 + bob, 7, '#ffe66d', 'center', null);
    drawText(ctx, 'SURVIVE THE HORDE', W / 2, 140, 2, '#ccc', 'center');

    const b = START_BUTTON;
    const hover = inRect(Input.mouse.x, Input.mouse.y, b);
    ctx.fillStyle = '#14141f';
    ctx.fillRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
    ctx.fillStyle = hover ? '#ffe66d' : '#4c9a42';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = hover ? '#d4b84a' : '#2d5e2a';
    ctx.fillRect(b.x, b.y + b.h - 6, b.w, 6);
    drawText(ctx, 'START', W / 2, b.y + 14, 4, hover ? '#14141f' : '#fff', 'center', null);

    drawText(ctx, `HIGH SCORE ${this.highScore}`, W / 2, 278, 2, '#888', 'center');

    this.menuPlayer.draw(ctx);

    drawText(ctx, 'ARROWS / WASD  MOVE', W / 2, 410, 2, '#fff', 'center');
    drawText(ctx, 'MOUSE  AIM      CLICK  SHOOT', W / 2, 436, 2, '#fff', 'center');
    drawText(ctx, 'P  PAUSE        M  MUTE', W / 2, 462, 2, '#fff', 'center');

    for (const w of this.menuWalkers) {
      const fr = SPRITES[w.sprite][Math.floor(w.anim * 6) % 2];
      drawShadow(ctx, w.x, w.y + fr.h / 2 - 4, fr.w * 0.3);
      ctx.save();
      ctx.translate(Math.round(w.x), Math.round(w.y));
      ctx.scale(w.dir, 1);
      ctx.drawImage(fr.img, -fr.w / 2, -fr.h / 2);
      ctx.restore();
    }
  },

  renderCrosshair() {
    const x = Math.round(Input.mouse.x);
    const y = Math.round(Input.mouse.y);
    const arms = [[-12, -2, 7, 4], [5, -2, 7, 4], [-2, -12, 4, 7], [-2, 5, 4, 7]];
    ctx.fillStyle = '#14141f';
    for (const [ax, ay, aw, ah] of arms) ctx.fillRect(x + ax - 1, y + ay - 1, aw + 2, ah + 2);
    ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.fillStyle = '#fff';
    for (const [ax, ay, aw, ah] of arms) ctx.fillRect(x + ax, y + ay, aw, ah);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(x - 1, y - 1, 2, 2);
  },
};

Game.init();

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  Game.update(dt);
  Game.render();
  Input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
