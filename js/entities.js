// Game entities: the player, bullets, enemies, pickups and effects.

const rand = (a, b) => a + Math.random() * (b - a);

function drawShadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), w, w * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 14;
    this.speed = 210;
    this.maxHp = 5;
    this.hp = 5;
    this.fireRate = 5; // shots per second
    this.damage = 1;
    this.spread = 0; // each level adds 2 extra bullets per shot
    this.pierce = 0;
    this.cooldown = 0;
    this.invuln = 0;
    this.walkTime = 0;
    this.moving = false;
    this.aim = 0;
    this.muzzleFlash = 0;
    this.dead = false;
  }

  get facing() {
    return Math.cos(this.aim) < 0 ? -1 : 1;
  }

  get handX() {
    return this.x + this.facing * 4;
  }

  get handY() {
    return this.y + 4;
  }

  aimAt(x, y) {
    this.aim = Math.atan2(y - this.handY, x - this.handX);
  }

  update(dt, game) {
    let dx = 0;
    let dy = 0;
    if (Input.isDown('ArrowLeft', 'KeyA')) dx -= 1;
    if (Input.isDown('ArrowRight', 'KeyD')) dx += 1;
    if (Input.isDown('ArrowUp', 'KeyW')) dy -= 1;
    if (Input.isDown('ArrowDown', 'KeyS')) dy += 1;
    const len = Math.hypot(dx, dy);
    this.moving = len > 0;
    if (this.moving) {
      this.x += (dx / len) * this.speed * dt;
      this.y += (dy / len) * this.speed * dt;
      this.walkTime += dt;
    } else {
      this.walkTime = 0;
    }
    this.x = Math.max(this.r, Math.min(W - this.r, this.x));
    this.y = Math.max(this.r + 10, Math.min(H - this.r - 10, this.y));

    this.aimAt(Input.mouse.x, Input.mouse.y);
    this.cooldown -= dt;
    this.invuln -= dt;
    this.muzzleFlash -= dt;
    if (Input.mouse.down && this.cooldown <= 0) {
      this.shoot(game);
      this.cooldown = 1 / this.fireRate;
    }
  }

  // Tip of the gun barrel in world space (matches the rotated gun sprite).
  muzzle() {
    const a = this.aim;
    const lx = 27;
    const ly = -3 * this.facing;
    return [
      this.handX + Math.cos(a) * lx - Math.sin(a) * ly,
      this.handY + Math.sin(a) * lx + Math.cos(a) * ly,
    ];
  }

  shoot(game) {
    const [tx, ty] = this.muzzle();
    const count = 1 + this.spread * 2;
    for (let i = 0; i < count; i++) {
      const angle = this.aim + (i - (count - 1) / 2) * 0.14;
      game.bullets.push(new Bullet(tx, ty, angle, 650, this.damage, this.pierce, false));
    }
    this.muzzleFlash = 0.05;
    Sound.shoot();
  }

  drawGun(ctx) {
    const gun = SPRITES.gun;
    ctx.save();
    ctx.translate(Math.round(this.handX), Math.round(this.handY));
    ctx.rotate(this.aim);
    if (this.facing < 0) ctx.scale(1, -1);
    ctx.drawImage(gun.img, -9, -8);
    ctx.restore();

    if (this.muzzleFlash > 0) {
      const [mx, my] = this.muzzle();
      ctx.fillStyle = '#ffe66d';
      ctx.fillRect(Math.round(mx) - 6, Math.round(my) - 6, 12, 12);
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.round(mx) - 3, Math.round(my) - 3, 6, 6);
    }
  }

  draw(ctx) {
    if (this.dead) return;
    if (this.invuln > 0 && Math.floor(this.invuln * 16) % 2 === 0) return; // damage blink
    const frames = SPRITES.player;
    const spr = this.moving ? frames.walk[Math.floor(this.walkTime * 10) % 4] : frames.idle;
    drawShadow(ctx, this.x, this.y + spr.h / 2 - 2, 14);
    const gunBehind = Math.sin(this.aim) < -0.3; // aiming upward: gun is behind the body
    if (gunBehind) this.drawGun(ctx);
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    ctx.drawImage(spr.img, -spr.w / 2, -spr.h / 2);
    ctx.restore();
    if (!gunBehind) this.drawGun(ctx);
  }
}

class Bullet {
  constructor(x, y, angle, speed, damage, pierce, hostile) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.pierce = pierce;
    this.hostile = hostile;
    this.r = hostile ? 6 : 4;
    this.life = hostile ? 6 : 1.5;
    this.hits = new Set();
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0 || this.x < -60 || this.x > W + 60 || this.y < -60 || this.y > H + 60) this.dead = true;
  }

  draw(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    if (this.hostile) {
      ctx.fillStyle = 'rgba(168,225,12,0.35)';
      ctx.fillRect(x - 8, y - 8, 16, 16);
      ctx.fillStyle = '#a8e10c';
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.fillStyle = '#f4ffd0';
      ctx.fillRect(x - 2, y - 2, 4, 4);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.angle);
    ctx.fillStyle = '#ff9f1c';
    ctx.fillRect(-12, -2, 10, 4);
    ctx.fillStyle = '#ffe66d';
    ctx.fillRect(-4, -3, 8, 6);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-2, -1, 4, 2);
    ctx.restore();
  }
}

const ENEMY_TYPES = {
  grunt: { sprite: 'zombie', r: 15, hp: 1, speed: 70, score: 10, color: '#7fb069' },
  runner: { sprite: 'imp', r: 12, hp: 1, speed: 155, score: 15, color: '#d64045' },
  brute: { sprite: 'brute', r: 24, hp: 5, speed: 48, score: 40, color: '#c07a3a', knock: 0.3 },
  spitter: { sprite: 'spitter', r: 16, hp: 2, speed: 85, score: 25, color: '#9b5de5', ranged: true },
  boss: { sprite: 'boss', r: 40, hp: 40, speed: 45, score: 500, color: '#b5172a', boss: true, knock: 0.05 },
};

class Enemy {
  constructor(type, x, y, cfg) {
    const t = ENEMY_TYPES[type];
    this.type = type;
    this.t = t;
    this.x = x;
    this.y = y;
    this.r = t.r;
    this.maxHp = t.boss ? cfg.bossHp : Math.ceil(t.hp * cfg.hpMul);
    this.hp = this.maxHp;
    this.speed = t.speed * cfg.speedMul;
    this.anim = Math.random();
    this.wobble = Math.random() * Math.PI * 2;
    this.flash = 0;
    this.kx = 0;
    this.ky = 0;
    this.facing = 1;
    this.shotTimer = rand(1.5, 2.5);
    this.pattern = 0;
    this.entered = false;
    this.dead = false;
  }

  update(dt, game) {
    const p = game.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    let mx = dx / d;
    let my = dy / d;

    if (this.t.ranged) {
      // Keep a comfortable distance and strafe around the player
      if (d < 220) {
        mx = -mx;
        my = -my;
      } else if (d < 320) {
        mx = (-dy / d) * 0.6;
        my = (dx / d) * 0.6;
      }
    } else if (this.type === 'runner') {
      // Zig-zag approach
      const w = Math.sin(this.anim * 5 + this.wobble) * 0.8;
      const px = -my;
      const py = mx;
      mx += px * w;
      my += py * w;
    }

    this.x += (mx * this.speed + this.kx) * dt;
    this.y += (my * this.speed + this.ky) * dt;
    const decay = Math.min(1, dt * 10);
    this.kx -= this.kx * decay;
    this.ky -= this.ky * decay;

    // Once inside the arena, stay inside it
    if (!this.entered && this.x > this.r && this.x < W - this.r && this.y > this.r && this.y < H - this.r) {
      this.entered = true;
    }
    if (this.entered) {
      this.x = Math.max(this.r, Math.min(W - this.r, this.x));
      this.y = Math.max(this.r, Math.min(H - this.r, this.y));
    }

    this.anim += dt;
    this.flash -= dt;
    this.facing = dx < 0 ? -1 : 1;

    if ((this.t.ranged || this.t.boss) && this.entered) {
      this.shotTimer -= dt;
      if (this.shotTimer <= 0) this.fire(game, Math.atan2(dy, dx));
    }
  }

  fire(game, angle) {
    if (this.t.boss) {
      if (this.pattern++ % 2 === 0) {
        const n = 16;
        const offset = Math.random() * Math.PI;
        for (let i = 0; i < n; i++) {
          game.bullets.push(new Bullet(this.x, this.y, offset + (i / n) * Math.PI * 2, 170, 1, 0, true));
        }
      } else {
        for (let i = -2; i <= 2; i++) {
          game.bullets.push(new Bullet(this.x, this.y, angle + i * 0.18, 270, 1, 0, true));
        }
      }
      this.shotTimer = this.hp < this.maxHp / 2 ? 1.1 : 1.7;
    } else {
      game.bullets.push(new Bullet(this.x, this.y, angle, 230, 1, 0, true));
      this.shotTimer = rand(1.8, 2.8);
    }
    Sound.enemyShot();
  }

  hit(damage, angle) {
    this.hp -= damage;
    this.flash = 0.08;
    const k = 260 * (this.t.knock ?? 1);
    this.kx += Math.cos(angle) * k;
    this.ky += Math.sin(angle) * k;
  }

  draw(ctx) {
    const frames = SPRITES[this.t.sprite];
    const fr = frames[Math.floor(this.anim * (this.t.boss ? 4 : 6)) % 2];
    drawShadow(ctx, this.x, this.y + fr.h / 2 - 4, this.r);
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    ctx.drawImage(this.flash > 0 ? fr.flash : fr.img, -fr.w / 2, -fr.h / 2);
    ctx.restore();
  }
}

class Pickup {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 12;
    this.life = 8;
    this.t = 0;
    this.dead = false;
  }

  update(dt) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    if (this.life < 2 && Math.floor(this.life * 8) % 2 === 0) return; // blink before vanishing
    const spr = SPRITES.heart;
    const bob = Math.round(Math.sin(this.t * 5) * 3);
    drawShadow(ctx, this.x, this.y + 12, 8);
    ctx.drawImage(spr.img, Math.round(this.x - spr.w / 2), Math.round(this.y - spr.h / 2) + bob);
  }
}

class Particle {
  constructor(x, y, vx, vy, life, color, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const drag = Math.min(1, dt * 4);
    this.vx -= this.vx * drag;
    this.vy -= this.vy * drag;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const s = Math.max(1, Math.round(this.size * (0.4 + 0.6 * (this.life / this.maxLife))));
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x - s / 2), Math.round(this.y - s / 2), s, s);
  }
}

// Floating score popups like "+10".
class FloatText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 0.8;
    this.dead = false;
  }

  update(dt) {
    this.y -= 40 * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.globalAlpha = Math.min(1, this.life * 2);
    drawText(ctx, this.text, this.x, this.y, 2, this.color, 'center');
    ctx.globalAlpha = 1;
  }
}
