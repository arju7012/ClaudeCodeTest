// Keyboard and mouse state. Mouse coordinates are converted to canvas space.

const Input = {
  keys: new Set(),
  pressed: new Set(),
  mouse: { x: 480, y: 320, down: false, clicked: false },

  init(canvas) {
    const blocked = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
    window.addEventListener('keydown', (e) => {
      if (blocked.has(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });

    const track = (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      this.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    };
    window.addEventListener('mousemove', track);
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      track(e);
      this.mouse.down = true;
      this.mouse.clicked = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  isDown(...codes) {
    return codes.some((c) => this.keys.has(c));
  },

  wasPressed(...codes) {
    return codes.some((c) => this.pressed.has(c));
  },

  // Clears one-frame edge events; call once at the end of every frame.
  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  },
};
