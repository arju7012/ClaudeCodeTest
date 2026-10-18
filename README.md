# Retro Rampage

A small retro-style top-down shooter that runs in the browser. Survive waves of
zombies, imps, brutes and spitters coming from every side, pick upgrades between
levels, and take down the Demon Eye boss every 5th level.

## Play

Open `index.html` in any modern browser (double-click it). No install, build step,
server or internet connection needed.

## Controls

| Action | Keys |
| --- | --- |
| Move | Arrow keys or WASD |
| Aim | Mouse |
| Shoot | Left click (hold for auto-fire) |
| Pause | P or Esc (Q from pause quits to menu) |
| Mute | M |

## How it works

- Plain HTML5 Canvas and vanilla JavaScript, loaded as classic scripts so it works from `file://`.
- Sprites are pixel art written as character grids in `js/sprites.js` and rendered once to offscreen canvases. To change one, edit its grid.
- Sound effects are synthesized with WebAudio (`js/audio.js`).
- Levels and upgrades are defined in `js/levels.js`. Past level 10 the game continues endlessly with rising difficulty.
- The high score is saved in the browser's `localStorage`.

| File | Purpose |
| --- | --- |
| `js/game.js` | State machine (menu, playing, paused, level clear, game over), main loop, rendering, HUD |
| `js/entities.js` | Player, bullets, enemy types, pickups, particles |
| `js/levels.js` | Level table, endless scaling, upgrade cards |
| `js/sprites.js` | Pixel-art sprites and the floor tiles |
| `js/font.js` | 5x7 bitmap font |
| `js/input.js` | Keyboard and mouse state |
| `js/audio.js` | Synthesized sound effects |
