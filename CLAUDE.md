# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Retro Rampage: a 2D pixel-art top-down shooter written in plain HTML5 Canvas and vanilla JavaScript. It has no dependencies, no package.json, no build step, no linter and no test suite.

## Git workflow

Commit and push regularly as you work, so no progress is ever lost:

- Commit each logical change as soon as it works, without waiting to be asked. Keep commits small and focused.
- Write clean commit messages: a short imperative subject line (e.g. "Add spitter enemy type") and, when useful, a brief body explaining why.
- Push to GitHub (`origin`, https://github.com/arju7012/ClaudeCodeTest, branch `main`) after each commit.
- Never force-push, rewrite history or delete branches without asking first.

## Running and checking

- **Play:** open `index.html` directly in a browser (`file://` works; no server needed).
- **Syntax check:** `for f in js/*.js; do node --check "$f"; done`
- **Headless verification:** Edge is installed at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. To exercise gameplay without a human:
  1. Write a throwaway harness HTML page in the scratchpad, not the repo. It should load the `js/*.js` files by absolute `file:///` URL in the same order as `index.html`.
  2. In a script after them, call `Game.newGame()` and loop `Game.update(1/60); Input.endFrame();` while setting `Input.mouse` and `Input.keys` to simulate the player.
  3. Freeze the frame with `Game.update = () => {}`, then call `Game.render()`.
  4. Record any errors via `window.onerror`.
  5. Run Edge with `--headless=new --allow-file-access-from-files --virtual-time-budget=N`. Add `--dump-dom` to read a log element, or `--screenshot=... --window-size=960,640` to capture the canvas.

## Architecture

**Script loading.** The files are classic `<script>` tags, not ES modules, so the game runs from `file://`. Every top-level `const`, `class` and `function` lives in one shared global scope. Load order in `index.html` matters only for code that runs at load time: `font` → `sprites` → `input` → `audio` → `entities` → `levels` → `game`. `game.js` must stay last, because it calls `Game.init()` and starts the `requestAnimationFrame` loop. Cross-file references inside functions are fine as long as they run after load. For example, `entities.js` uses `W`/`H`, which are defined in `game.js`.

**Coordinates.** All game logic uses a fixed 960×640 logical canvas. `fitCanvas()` only changes the CSS size. `Input` maps mouse events back into logical coordinates, so never use CSS pixels in game code.

**Game singleton** (`js/game.js`). One object is both the state machine and the world container. Its `state` is one of `menu`, `playing`, `paused`, `clear`, `dying` or `gameover`. `update(dt)` and `render()` dispatch on `state`. The main loop caps `dt` at 0.05 and calls `Input.endFrame()` after rendering. World arrays (`enemies`, `bullets`, `pickups`, `particles`, `texts`) live on `Game` and are reset in `startLevel()`/`newGame()`.

**Entity convention** (`js/entities.js`):
- Every entity has `update(dt, game)` and `draw(ctx)`, and sets `dead = true` to be removed. `updateAll()` in `game.js` updates a list and filters out dead entries.
- Entities spawn things by pushing onto `game.bullets`, `game.particles` and so on.
- Player and enemy bullets share `game.bullets` and are told apart by `bullet.hostile`.
- Collision is circle vs circle using each entity's `r`, all handled in `Game.handleCollisions()`.

**Enemies** are data-driven through `ENEMY_TYPES`, which sets sprite key, radius, HP, speed, score, particle color and the `knock`/`ranged`/`boss` flags. Behavior branches on those flags in `Enemy.update`. HP and speed scale with the current level config (`cfg.hpMul`, `cfg.speedMul`, `cfg.bossHp`). Enemies spawn just outside a random edge. Once inside the arena (`entered`), they are clamped to it.

**Levels** (`js/levels.js`):
- `getLevel(n)` returns a config object, either from the `LEVELS` table or, past level 10, from the endless-scaling formula.
- Normal levels clear when `kills >= quota`. Spawning stops once enough enemies to fill the quota are alive.
- Levels with `boss: true` have no quota. They clear when the boss dies, and the boss is spawned by `updateSpawning`.
- `UPGRADES` entries have `apply(player)` and an optional `available(player)` filter.

**Sprites** (`js/sprites.js`):
- Art is written as string grids plus a palette map; `.` and unmapped characters are transparent.
- `makeSprite(rows, palette, scale)` bakes the scale in and returns `{img, flash, w, h}`, where `flash` is a white silhouette used for the hit flash.
- Animation frames are built from a base grid with `withRows(base, {rowIndex: '...'})`.
- All grids face right; entities flip with `ctx.scale(facing, 1)`.
- `buildSprites()` fills the global `SPRITES` object at init.

**Gun geometry.** The gun sprite rotates around a hand pivot. `Player.muzzle()` hard-codes offsets (27, -3) that must match the pivot used in `Player.drawGun()` (`drawImage(gun.img, -9, -8)`). If you change the gun grid or its scale, update both.

**Text.** All on-screen text goes through `drawText()` (`js/font.js`), which draws a 5×7 bitmap font and uppercases its input. A character missing from `FONT_GLYPHS` renders as `?`, so add a glyph before using a new symbol.

**Audio.** `Sound` synthesizes every effect with WebAudio, so there are no audio files. The AudioContext is created only on the first user gesture (`Sound.unlock()`), and every effect method is a silent no-op before that.

**Persistence.** Only the high score is stored, in `localStorage` under the key `retroRampage.highScore`, with access wrapped in try/catch.
