// Tiny 5x7 bitmap font. Each glyph is 7 rows; each row is a 5-bit mask (MSB = leftmost pixel).

const FONT_GLYPHS = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 17, 25, 21, 19, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14],
  1: [4, 12, 4, 4, 4, 4, 14],
  2: [14, 17, 1, 2, 4, 8, 31],
  3: [31, 2, 4, 2, 1, 17, 14],
  4: [2, 6, 10, 18, 31, 2, 2],
  5: [31, 16, 30, 1, 1, 17, 14],
  6: [6, 8, 16, 30, 17, 17, 14],
  7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14],
  9: [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 4, 8],
  ':': [0, 12, 12, 0, 12, 12, 0],
  '!': [4, 4, 4, 4, 4, 0, 4],
  '?': [14, 17, 1, 2, 4, 0, 4],
  '-': [0, 0, 0, 31, 0, 0, 0],
  '+': [0, 4, 4, 31, 4, 4, 0],
  '/': [1, 1, 2, 4, 8, 16, 16],
  '%': [24, 25, 2, 4, 8, 19, 3],
  '(': [2, 4, 8, 8, 8, 4, 2],
  ')': [8, 4, 2, 2, 2, 4, 8],
  '<': [2, 4, 8, 16, 8, 4, 2],
  '>': [8, 4, 2, 1, 2, 4, 8],
  "'": [4, 4, 8, 0, 0, 0, 0],
  '*': [0, 4, 21, 14, 21, 4, 0],
  '=': [0, 0, 31, 0, 31, 0, 0],
};

function textWidth(text, scale) {
  return Math.max(0, String(text).length * 6 - 1) * scale;
}

function drawGlyphs(ctx, text, x, y, scale, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < text.length; i++) {
    const glyph = FONT_GLYPHS[text[i]] || FONT_GLYPHS['?'];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      if (!bits) continue;
      for (let col = 0; col < 5; col++) {
        if (bits & (16 >> col)) ctx.fillRect(x + (i * 6 + col) * scale, y + row * scale, scale, scale);
      }
    }
  }
}

// Draws pixel text. `y` is the top edge; text is 7 * scale pixels tall.
function drawText(ctx, text, x, y, scale = 2, color = '#fff', align = 'left', shadow = '#000') {
  text = String(text).toUpperCase();
  const w = textWidth(text, scale);
  if (align === 'center') x -= w / 2;
  else if (align === 'right') x -= w;
  x = Math.round(x);
  y = Math.round(y);
  if (shadow) drawGlyphs(ctx, text, x + scale, y + scale, scale, shadow);
  drawGlyphs(ctx, text, x, y, scale, color);
}
