// Guates illustrated scenes on Canvas 2D: flat palette fills, café ink lines, big labels.
// Same API as the earlier three.js scenes (route, terrain, bean, cup): mount(canvas, options) → { update, destroy }.

const P = Object.freeze({
  naranja: '#CD591C', cafe: '#624532', sol: '#F2D139', moriche: '#364831', azul: '#4E71F0', cereza: '#81164B',
  atardecer: '#D6855A', crema: '#F6F3ED', luz: '#F5E380', brote: '#91AD80', cielo: '#9DB5EC', rosa: '#DB92BA',
});
const INK = P.cafe;
const F = { slab: '"Roboto Slab", Georgia, serif', sans: 'Roboto, Arial, sans-serif', brush: '"Caveat Brush", cursive' };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const finite = (x, d) => (Number.isFinite(Number(x)) ? Number(x) : d);
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const dots = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const PALETTE = new Set(Object.values(P));
const ink = (x, d) => (typeof x === 'string' && PALETTE.has(x.toUpperCase()) ? x.toUpperCase() : d);
const same = (a, b, keys) => keys.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
// Fine style: thinner ink and borderless labels, for the editorial layout. Set per frame by each scene.
let LWF = 1, FINE = false;
const setStyle = (o) => { FINE = !!o.fine; LWF = FINE ? 0.55 : 1; };

function runtime(canvas) {
  if (!canvas || canvas.tagName !== 'CANVAS') throw new TypeError('GuatesScenes necesita un elemento <canvas>.');
  const host = canvas.parentElement || canvas;
  const ctx = canvas.getContext('2d');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let W = 1, H = 1, dpr = 1, visible = true, dead = false, started = false, raf = 0, last = 0, time = 0;
  let frame = () => {};
  const cleanups = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn, o)); };
  function paint(dt) {
    if (dead || !started) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    frame(ctx, W, H, time, dt || 0);
  }
  function loop(now) {
    raf = 0;
    if (dead || !visible || document.hidden || motion.matches) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now; time += dt;
    paint(dt);
    raf = requestAnimationFrame(loop);
  }
  function sync() {
    cancelAnimationFrame(raf); raf = 0; last = 0;
    paint(0);
    if (started && visible && !document.hidden && !motion.matches) raf = requestAnimationFrame(loop);
  }
  function resize() {
    if (dead) return;
    const box = host.getBoundingClientRect();
    W = Math.max(1, Math.round(box.width)); H = Math.max(1, Math.round(box.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    paint(0);
  }
  const ro = new ResizeObserver(resize); ro.observe(host);
  const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); sync(); }); io.observe(host);
  on(document, 'visibilitychange', sync);
  if (motion.addEventListener) on(motion, 'change', sync);
  if (document.fonts) {
    document.fonts.ready.then(() => paint(0)).catch(() => {});
    on(document.fonts, 'loadingdone', () => paint(0));
  }
  return {
    ctx, canvas, on,
    get reduced() { return motion.matches; },
    get W() { return W; }, get H() { return H; },
    requestRender: () => paint(0),
    start(fn) { frame = fn; started = true; resize(); sync(); },
    destroy() { if (dead) return; dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); cleanups.splice(0).forEach((f) => f()); },
  };
}
function local(rt, e) {
  const box = rt.canvas.getBoundingClientRect();
  return [e.clientX - box.left, e.clientY - box.top];
}

/* ── drawing kit ── */

function paintPath(ctx, fill, stroke = INK, lw = 2) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, lw * LWF); ctx.stroke(); }
}
function circle(ctx, x, y, r, fill, stroke = INK, lw = 2) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); paintPath(ctx, fill, stroke, lw); }
function ellipse(ctx, x, y, rx, ry, rot, fill, stroke = INK, lw = 2) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); paintPath(ctx, fill, stroke, lw); }
function poly(ctx, pts, fill, stroke = INK, lw = 2, closed = true) {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (closed) ctx.closePath();
  paintPath(ctx, fill, stroke, lw);
}
// Catmull-Rom through the points, for soft hand-drawn outlines.
function smooth(ctx, pts, closed) {
  const n = pts.length;
  if (n < 2) return;
  ctx.moveTo(pts[0][0], pts[0][1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const p1 = pts[i], p2 = pts[(i + 1) % n];
    const p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}
function write(ctx, x, y, str, font, color = INK, align = 'center', base = 'middle') {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base; ctx.fillText(str, x, y);
}
// A crema label box with a café border, like the map tags on the labels.
function tagBox(ctx, x, y, text, o = {}) {
  const size = o.size || 14, lines = String(text).split('\n'), pad = o.pad ?? 7, lh = Math.round(size * 1.25);
  const fonts = lines.map((_, i) => `${i === 0 ? (o.weight || 700) : 400} ${i === 0 ? size : size - 1}px ${i === 0 && o.slab ? F.slab : F.sans}`);
  let w = 0;
  lines.forEach((l, i) => { ctx.font = fonts[i]; w = Math.max(w, ctx.measureText(l).width); });
  w = Math.ceil(w + pad * 2);
  const h = Math.ceil(lh * lines.length + pad * 2 - (lh - size));
  let bx = Math.round(x - w * (o.ax ?? 0.5)), by = Math.round(y - h * (o.ay ?? 0));
  if (o.bounds) { bx = clamp(bx, 4, o.bounds[0] - w - 4); by = clamp(by, 4, o.bounds[1] - h - 4); }
  return {
    x: bx, y: by, w, h,
    draw() {
      // radius-sm in the design system, scaled for small canvas labels.
      const r = Math.min(7, h / 2);
      ctx.beginPath(); roundedRect(ctx, this.x, this.y, w, h, r); ctx.fillStyle = o.bg || P.crema; ctx.fill();
      if (FINE) { ctx.fillStyle = o.border && o.border !== INK ? o.border : P.cafe; ctx.fillRect(this.x + r, this.y + h - 2, w - 2 * r, 2); }
      else { ctx.beginPath(); roundedRect(ctx, this.x + 1, this.y + 1, w - 2, h - 2, r - 1); ctx.strokeStyle = o.border || INK; ctx.lineWidth = o.lw || 2; ctx.stroke(); }
      lines.forEach((l, i) => write(ctx, this.x + pad, this.y + pad + i * lh, l, fonts[i], o.fg || INK, 'left', 'top'));
    },
  };
}
function roundedRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
const overlap = (a, b, m = 4) => a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y;

function cherry(ctx, x, y, r, color = P.cereza) {
  circle(ctx, x, y, r, color, INK, Math.max(1.5, r * 0.16));
  circle(ctx, x - r * 0.35, y - r * 0.35, r * 0.24, color === P.cereza ? P.rosa : P.crema, null);
}
function bush(ctx, x, y, s = 1) {
  [[-7, -7, 7], [6, -8, 7.5], [0, -14, 7.5]].forEach(([dx, dy, r]) => circle(ctx, x + dx * s, y + dy * s, r * s, P.moriche, INK, 1.6));
  [[-6, -6], [4, -10], [7, -5]].forEach(([dx, dy]) => circle(ctx, x + dx * s, y + dy * s, 2.2 * s, P.cereza, null));
}
function smoke(ctx, x, y, t, s = 1) {
  for (let k = 0; k < 3; k++) {
    const u = (t * 0.45 + k / 3) % 1;
    ctx.globalAlpha = 1 - u;
    circle(ctx, x + Math.sin(u * 5 + k) * 3 * s, y - u * 26 * s, (3 + u * 6) * s, P.crema, INK, 1.4);
  }
  ctx.globalAlpha = 1;
}
function steam(ctx, x, y, h, t, k, color = P.atardecer, lw = 3) {
  const u = (t * 0.35 + k / 3) % 1;
  ctx.globalAlpha = Math.sin(u * Math.PI);
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const v = i / 20;
    const px = x + Math.sin(v * Math.PI * 2.2 + k * 1.9 + t * 1.5) * 7;
    const py = y - u * 18 - v * h;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
  ctx.globalAlpha = 1;
}

// Map icons, anchored at their bottom centre, about 44 px wide at s = 1.
function iconFarm(ctx, x, y, s, roof = P.cereza) {
  bush(ctx, x - 22 * s, y, s * 0.9); bush(ctx, x + 23 * s, y, s * 0.9);
  poly(ctx, [[x - 13 * s, y], [x - 13 * s, y - 17 * s], [x + 13 * s, y - 17 * s], [x + 13 * s, y]], P.crema, INK, 2);
  poly(ctx, [[x - 17 * s, y - 16 * s], [x, y - 31 * s], [x + 17 * s, y - 16 * s]], roof, INK, 2);
  poly(ctx, [[x - 3.5 * s, y], [x - 3.5 * s, y - 10 * s], [x + 3.5 * s, y - 10 * s], [x + 3.5 * s, y]], P.cafe, null);
}
function iconMill(ctx, x, y, s) {
  poly(ctx, [[x - 18 * s, y], [x - 18 * s, y - 18 * s], [x + 18 * s, y - 18 * s], [x + 18 * s, y]], P.crema, INK, 2);
  poly(ctx, [[x - 21 * s, y - 17 * s], [x - 12 * s, y - 28 * s], [x + 12 * s, y - 28 * s], [x + 21 * s, y - 17 * s]], P.moriche, INK, 2);
  poly(ctx, [[x - 6 * s, y], [x - 6 * s, y - 11 * s], [x + 6 * s, y - 11 * s], [x + 6 * s, y]], P.cafe, null);
  sack(ctx, x + 25 * s, y, s * 0.8, P.atardecer);
}
function sack(ctx, x, y, s, color) {
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, y); ctx.quadraticCurveTo(x - 12 * s, y - 12 * s, x - 5 * s, y - 18 * s);
  ctx.lineTo(x + 5 * s, y - 18 * s); ctx.quadraticCurveTo(x + 12 * s, y - 12 * s, x + 9 * s, y); ctx.closePath();
  paintPath(ctx, color, INK, 1.8);
  poly(ctx, [[x - 5 * s, y - 18 * s], [x, y - 22 * s], [x + 5 * s, y - 18 * s]], color, INK, 1.6, false);
}
function iconRoastery(ctx, x, y, s, t) {
  poly(ctx, [[x + 8 * s, y - 20 * s], [x + 8 * s, y - 40 * s], [x + 15 * s, y - 40 * s], [x + 15 * s, y - 20 * s]], P.cafe, INK, 2);
  smoke(ctx, x + 11.5 * s, y - 44 * s, t, s);
  poly(ctx, [[x - 17 * s, y], [x - 17 * s, y - 20 * s], [x + 17 * s, y - 20 * s], [x + 17 * s, y]], P.crema, INK, 2);
  poly(ctx, [[x - 20 * s, y - 19 * s], [x - 20 * s, y - 25 * s], [x + 20 * s, y - 25 * s], [x + 20 * s, y - 19 * s]], P.naranja, INK, 2);
  circle(ctx, x - 6 * s, y - 10 * s, 4.5 * s, P.luz, INK, 1.6);
  poly(ctx, [[x + 3 * s, y], [x + 3 * s, y - 11 * s], [x + 11 * s, y - 11 * s], [x + 11 * s, y]], P.cafe, null);
}
function iconCity(ctx, x, y, s) {
  [[-17, 24, 12, P.cielo], [-4, 36, 13, P.crema], [10, 20, 12, P.luz]].forEach(([dx, h, w, c]) => {
    poly(ctx, [[x + dx * s, y], [x + dx * s, y - h * s], [x + (dx + w) * s, y - h * s], [x + (dx + w) * s, y]], c, INK, 2);
    for (let r = 6; r < h - 3; r += 7) circle(ctx, x + (dx + w / 2) * s, y - r * s, 1.3 * s, P.cafe, null);
  });
}
function iconCup(ctx, x, y, s, t) {
  steam(ctx, x - 3 * s, y - 15 * s, 10 * s, t, 0, P.atardecer, 2);
  steam(ctx, x + 4 * s, y - 15 * s, 10 * s, t, 1, P.atardecer, 2);
  ctx.beginPath(); ctx.arc(x + 9 * s, y - 9 * s, 4 * s, -Math.PI / 2, Math.PI / 2); paintPath(ctx, null, INK, 2);
  poly(ctx, [[x - 10 * s, y - 15 * s], [x + 10 * s, y - 15 * s], [x + 7 * s, y], [x - 7 * s, y]], P.crema, INK, 2);
}
function badge(ctx, x, y, n) {
  circle(ctx, x, y, 11, P.cafe, P.crema, 2);
  write(ctx, x, y + 0.5, String(n), `700 13px ${F.sans}`, P.crema);
}
function truck(ctx, x, y, dir, body, cargo, t, reduced) {
  ctx.save(); ctx.translate(x, y + (reduced ? 0 : Math.sin(t * 14) * 0.8)); ctx.scale(dir, 1);
  poly(ctx, [[-24, -6], [-24, -9], [6, -9], [6, -6]], P.cafe, INK, 1.5);
  if (cargo === 'box') poly(ctx, [[-23, -9], [-23, -26], [3, -26], [3, -9]], P.crema, INK, 2);
  else { sack(ctx, -16, -9, 0.75, cargo); sack(ctx, -5, -9, 0.75, cargo); }
  poly(ctx, [[5, -6], [5, -21], [14, -21], [21, -12], [21, -6]], body, INK, 2);
  poly(ctx, [[8, -18], [13, -18], [17, -13], [8, -13]], P.cielo, INK, 1.4);
  [-15, 13].forEach((wx) => { circle(ctx, wx, -5, 5, P.cafe, INK, 1.5); circle(ctx, wx, -5, 1.8, P.crema, null); });
  ctx.restore();
}
function peak(ctx, x, y, w, h, snow) {
  poly(ctx, [[x - w / 2, y], [x - w * 0.04, y - h], [x + w / 2, y]], P.moriche, FINE ? null : INK, 1.8);
  poly(ctx, [[x - w / 2 + 2, y - 1], [x - w * 0.04, y - h + 3], [x - w * 0.12, y - 1]], P.brote, null);
  if (snow) poly(ctx, [[x - w * 0.2, y - h * 0.62], [x - w * 0.04, y - h], [x + w * 0.17, y - h * 0.6], [x + w * 0.05, y - h * 0.68], [x - w * 0.07, y - h * 0.58]], P.crema, FINE ? null : INK, 1.6);
}
function palm(ctx, x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3 * s, y - 9 * s, x + 1 * s, y - 18 * s); paintPath(ctx, null, INK, 2);
  [-2.4, -1.7, -1.1, -0.5, 0.2].forEach((a) => {
    ctx.beginPath(); ctx.moveTo(x + s, y - 18 * s);
    ctx.quadraticCurveTo(x + s + Math.cos(a) * 8 * s, y - 18 * s + Math.sin(a) * 8 * s - 3 * s, x + s + Math.cos(a) * 12 * s, y - 18 * s + Math.sin(a) * 12 * s + 3 * s);
    paintPath(ctx, null, P.moriche, 2.4);
  });
}

/* ── Map: El recorrido ── */

const LL = (pairs) => pairs.map(([lat, lng]) => ({ lat, lng }));
// Schematic outlines for an illustration, not official boundaries.
const COLOMBIA = LL([
  [8.67, -77.37], [8.09, -76.73], [8.43, -76.78], [8.85, -76.43], [9.4, -75.68], [10.4, -75.55], [11.02, -74.85],
  [11.0, -74.25], [11.24, -74.2], [11.25, -73.6], [11.54, -72.9], [11.78, -72.45], [12.2, -72.17], [12.46, -71.67],
  [11.85, -71.33], [11.36, -72.13], [10.5, -72.95], [9.6, -73.05], [9.0, -73.35], [8.4, -72.42], [7.9, -72.47],
  [7.35, -72.2], [7.05, -71.9], [7.0, -71.0], [7.08, -70.73], [6.95, -70.1], [6.6, -69.4], [6.2, -69.2], [6.19, -67.48],
  [5.4, -67.8], [4.4, -67.75], [3.5, -67.4], [2.6, -67.6], [1.9, -67.1], [1.2, -66.85], [1.1, -67.5], [1.75, -69.0],
  [1.1, -69.85], [0.6, -70.05], [-0.15, -70.05], [-1.2, -69.45], [-4.22, -69.94], [-3.8, -70.6], [-2.5, -71.4],
  [-2.2, -72.6], [-1.2, -74.0], [-0.1, -75.0], [0.4, -76.2], [0.8, -77.6], [1.25, -78.8], [1.6, -79.0], [2.6, -78.3],
  [3.0, -77.7], [3.88, -77.15], [4.6, -77.35], [5.6, -77.5], [6.2, -77.45], [6.8, -77.7], [7.2, -77.9], [7.6, -77.7],
  [8.2, -77.4],
]);
const LLANOS = LL([
  [7.0, -71.95], [7.0, -71.0], [7.08, -70.73], [6.95, -70.1], [6.6, -69.4], [6.2, -69.2], [6.19, -67.48], [5.4, -67.8],
  [4.4, -67.75], [3.5, -67.4], [2.7, -67.6], [2.2, -70.5], [2.4, -72.6], [3.1, -73.7], [3.9, -73.75], [4.7, -73.25],
  [5.6, -72.6], [6.4, -72.2],
]);
const CARIBBEAN = LL([
  [8.67, -77.37], [8.09, -76.73], [8.43, -76.78], [8.85, -76.43], [9.4, -75.68], [10.4, -75.55], [11.02, -74.85],
  [11.0, -74.25], [11.24, -74.2], [11.25, -73.6], [11.54, -72.9], [11.78, -72.45], [12.2, -72.17], [12.46, -71.67],
  [11.85, -71.33], [11.5, -71.1], [11.9, -70.2], [11.45, -69.6], [10.6, -68.1], [10.6, -66.5], [10.7, -64], [20, -64],
  [20, -85], [9.6, -79.9], [9.4, -78.9], [9.0, -78.0],
]);
const PACIFIC = LL([
  [1.6, -79.0], [2.6, -78.3], [3.0, -77.7], [3.88, -77.15], [4.6, -77.35], [5.6, -77.5], [6.2, -77.45], [6.8, -77.7],
  [7.2, -77.9], [7.55, -78.2], [8.25, -78.45], [8.95, -79.45], [8.3, -80.4], [7.3, -80.9], [7.3, -95], [-8, -95],
  [-6, -81.1], [-4.3, -81.3], [-3.4, -80.3], [-2.2, -80.9], [-1.0, -80.75], [0.0, -80.1], [0.9, -79.7], [1.25, -78.95],
]);
const PEAKS = LL([
  [1.5, -77.4], [3.0, -76.8], [4.5, -76.25], [6.0, -76.0], [7.3, -76.1],
  [2.2, -76.4], [2.93, -76.03], [4.0, -75.65], [4.89, -75.32], [6.0, -75.35], [7.2, -75.15],
  [2.8, -75.2], [3.8, -74.6], [5.3, -73.4], [6.45, -72.3], [7.6, -72.6], [8.8, -73.1],
  [10.85, -73.7], [10.7, -74.0], [10.75, -73.4],
]).map((p, i) => Object.assign(p, { snow: [6, 8, 14, 17].includes(i), big: [6, 8, 14, 17].includes(i) }));
const PALMS = LL([[4.4, -71.9], [3.5, -71.6], [5.2, -70.9], [4.1, -70.4], [3.0, -70.9], [5.9, -69.9], [4.9, -69.1], [3.6, -69.3], [5.6, -71.9], [2.8, -72.4]]);
const WAVES = LL([[12.8, -77.8], [13.4, -74.6], [12.7, -70.6], [10.5, -78.9], [5.2, -79.2], [2.4, -80.3], [7.4, -79.6], [-0.5, -82.0], [14.6, -76.0]]);
const NEIGHBOURS = [['VENEZUELA', 8.3, -69.3], ['ECUADOR', -0.9, -78.3], ['PERÚ', -3.2, -74.3], ['BRASIL', -1.4, -67.9], ['PANAMÁ', 8.55, -79.7]];
const REGIONS = [['Mar Caribe', 12.9, -76.4, P.moriche], ['Océano Pacífico', 3.9, -79.5, P.moriche], ['Llanos Orientales', 5.0, -70.6, INK], ['Amazonía', -0.9, -71.7, INK]];
const LAT0 = 4.5, KX = Math.cos((LAT0 * Math.PI) / 180);

export function route(canvas, options = {}) {
  const rt = runtime(canvas);
  let o = { mode: 'journey', stage: 0, stops: [], farms: [], hub: null, city: null, highlight: [], speed: 0.6, ...options };
  const cam = { lat: 4.4, lng: -74.5, k: 100 };
  let ready = false, current = clamp(finite(o.stage, 0), 0, 3), target = current, lastArrival = -1, hovered = null, hits = [];
  let W = 1, H = 1;
  const S = (p) => [W / 2 + (p.lng - cam.lng) * KX * cam.k, H / 2 - (p.lat - cam.lat) * cam.k];

  function stops() { return (Array.isArray(o.stops) ? o.stops : []).slice(0, 6); }
  function goal() {
    let pts, pad, minSpan;
    if (o.mode === 'overview') {
      pts = [...(o.farms || []), o.hub, o.city].filter(Boolean);
      pad = { t: 110, r: 110, b: 90, l: 100 }; minSpan = 1.6;
    } else {
      const st = stops();
      if (st.length < 2) return { lat: 4.5, lng: -74, k: 60 };
      const i = Math.min(st.length - 2, Math.floor(clamp(current, 0, st.length - 1)));
      pts = [st[i], st[i + 1]];
      pad = { t: 120, r: 150, b: 110, l: 110 }; minSpan = 1.2;
    }
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    pts.forEach((p) => { a = Math.min(a, p.lat); b = Math.max(b, p.lat); c = Math.min(c, p.lng); d = Math.max(d, p.lng); });
    const spanLat = Math.max(b - a, minSpan), spanLng = Math.max((d - c) * KX, minSpan);
    const k = clamp(Math.min((W - pad.l - pad.r) / spanLng, (H - pad.t - pad.b) / spanLat), 18, 360);
    return { lat: (a + b) / 2 - (pad.b - pad.t) / (2 * k), lng: (c + d) / 2 - (pad.l - pad.r) / (2 * KX * k), k };
  }
  function curve(A, B) {
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const C = [mx + nx * len * 0.22, my + ny * len * 0.22];
    const at = (u) => [(1 - u) * (1 - u) * A[0] + 2 * (1 - u) * u * C[0] + u * u * B[0], (1 - u) * (1 - u) * A[1] + 2 * (1 - u) * u * C[1] + u * u * B[1]];
    return { A, B, C, at };
  }
  function strokeCurve(ctx, cv, u0, u1, color, lw, dash) {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const [x, y] = cv.at(lerp(u0, u1, i / 40)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.setLineDash(dash || []); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, lw * (FINE ? 0.7 : 1)); ctx.stroke(); ctx.setLineDash([]);
  }
  // Push icons apart so nearby places never sit on top of each other.
  function declutter(items, dist) {
    items.forEach((it) => { it.x = it.ax; it.y = it.ay; });
    for (let pass = 0; pass < 8; pass++) {
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= dist) continue;
        if (d < 0.01) { dx = 1; dy = 0; d = 1; }
        const push = (dist - d) / 2;
        a.x -= (dx / d) * push; a.y -= (dy / d) * push; b.x += (dx / d) * push; b.y += (dy / d) * push;
      }
    }
  }

  function base(ctx, t) {
    ctx.fillStyle = P.crema; ctx.fillRect(0, 0, W, H);
    [CARIBBEAN, PACIFIC].forEach((sea) => { ctx.beginPath(); sea.forEach((p, i) => { const [x, y] = S(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fillStyle = P.cielo; ctx.fill(); });
    WAVES.forEach((p, i) => {
      const [x, y] = S(p);
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) return;
      const dx = Math.sin(t * 0.8 + i) * 3;
      ctx.beginPath(); ctx.arc(x - 7 + dx, y, 6, Math.PI * 0.15, Math.PI * 0.85); ctx.arc(x + 7 + dx, y, 6, Math.PI * 0.15, Math.PI * 0.85);
      paintPath(ctx, null, P.crema, 2);
    });
    NEIGHBOURS.forEach(([n, lat, lng]) => { const [x, y] = S({ lat, lng }); write(ctx, x, y, n, `600 12px ${F.sans}`, '#7A6555'); });
    ctx.beginPath(); smooth(ctx, COLOMBIA.map(S), true); paintPath(ctx, P.brote, INK, 2.5);
    ctx.beginPath(); smooth(ctx, LLANOS.map(S), true); paintPath(ctx, P.luz, null);
    ctx.beginPath(); smooth(ctx, COLOMBIA.map(S), true); paintPath(ctx, null, INK, 2.5);
    const ms = clamp(cam.k * 0.2, 18, 40);
    PEAKS.slice().sort((a, b) => b.lat - a.lat).forEach((p) => {
      const [x, y] = S(p);
      if (x < -40 || y < -10 || x > W + 40 || y > H + 60) return;
      const w = ms * (p.big ? 1.25 : 1);
      peak(ctx, x, y, w, w * 0.85, p.snow);
    });
    const ps = clamp(cam.k * 0.012, 0.8, 1.4);
    PALMS.forEach((p) => { const [x, y] = S(p); if (x > -20 && x < W + 20 && y > 0 && y < H + 30) palm(ctx, x, y, ps); });
    const rs = Math.round(clamp(cam.k * 0.14, 18, 28));
    REGIONS.forEach(([n, lat, lng, c]) => { const [x, y] = S({ lat, lng }); write(ctx, x, y, n, `400 ${rs}px ${F.brush}`, c); });
  }

  function inset(ctx) {
    if (cam.k < 60) return;
    const bw = 64, bh = 88, bx = 12, by = H - bh - 12;
    const sc = Math.min(bw / (12.6 * KX), bh / 17.4);
    const m = (p) => [bx + bw / 2 + (p.lng + 73.0) * KX * sc, by + bh / 2 - (p.lat - 4.1) * sc];
    ctx.beginPath(); roundedRect(ctx, bx, by, bw, bh, 10); ctx.fillStyle = P.crema; ctx.fill();
    ctx.beginPath(); roundedRect(ctx, bx + 1, by + 1, bw - 2, bh - 2, 9); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); smooth(ctx, COLOMBIA.map(m), true); paintPath(ctx, P.brote, INK, 1.2);
    const tl = { lat: cam.lat + H / 2 / cam.k, lng: cam.lng - W / 2 / (KX * cam.k) };
    const br = { lat: cam.lat - H / 2 / cam.k, lng: cam.lng + W / 2 / (KX * cam.k) };
    const [x0, y0] = m(tl), [x1, y1] = m(br);
    ctx.save(); ctx.beginPath(); roundedRect(ctx, bx, by, bw, bh, 10); ctx.clip();
    ctx.strokeStyle = P.naranja; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, Math.max(3, x1 - x0), Math.max(3, y1 - y0));
    ctx.restore();
  }

  function overview(ctx, t) {
    const farms = (o.farms || []).filter((f) => Number.isFinite(f.lat));
    const hl = Array.isArray(o.highlight) ? o.highlight : [];
    const dim = !!o.dim && hl.length > 0;
    const items = farms.map((f) => { const [ax, ay] = S(f); return { kind: 'farm', f, ax, ay, on: hl.includes(f.id) || hovered === f.id }; });
    if (o.hub) { const [ax, ay] = S(o.hub); items.push({ kind: 'hub', ax, ay }); }
    if (o.city) { const [ax, ay] = S(o.city); items.push({ kind: 'city', ax, ay }); }
    declutter(items, 108);
    const hub = items.find((i) => i.kind === 'hub'), city = items.find((i) => i.kind === 'city');
    items.filter((i) => i.kind === 'farm').forEach((it, n) => {
      if (!hub) return;
      const faded = dim && !hl.includes(it.f.id);
      const cv = curve([it.x, it.y], [hub.x, hub.y]);
      strokeCurve(ctx, cv, 0, 1, faded ? '#62453260' : INK, 2.5, [8, 7]);
      if (!faded) {
        const u = 0.18 + 0.64 * (rt.reduced ? 0.55 : (t * 0.11 + n * 0.33) % 1);
        const [x, y] = cv.at(u), [x2] = cv.at(Math.min(1, u + 0.01));
        truck(ctx, x, y + 2, x2 >= x ? 1 : -1, P.azul, P.atardecer, t, rt.reduced);
      }
    });
    if (hub && city) {
      const cv = curve([hub.x, hub.y], [city.x, city.y]);
      strokeCurve(ctx, cv, 0, 1, P.azul, 3, [8, 7]);
      const u = 0.2 + 0.6 * (rt.reduced ? 0.5 : (t * 0.16) % 1);
      const [x, y] = cv.at(u), [x2] = cv.at(Math.min(1, u + 0.01));
      truck(ctx, x, y + 2, x2 >= x ? 1 : -1, P.cereza, 'box', t, rt.reduced);
    }
    hits = [];
    const placed = [];
    items.forEach((it) => {
      if (Math.hypot(it.x - it.ax, it.y - it.ay) > 6) {
        ctx.beginPath(); ctx.moveTo(it.ax, it.ay); ctx.lineTo(it.x, it.y); paintPath(ctx, null, INK, 1.4);
        circle(ctx, it.ax, it.ay, 3, INK, null);
      }
      const faded = it.kind === 'farm' && dim && !hl.includes(it.f.id);
      const s = it.kind === 'farm' ? (it.on ? 1.25 : faded ? 0.75 : 1) : 1.1;
      if (it.kind === 'farm') { iconFarm(ctx, it.x, it.y, s, it.f.color || P.cereza); hits.push({ id: it.f.id, x: it.x, y: it.y - 16 * s, r: 34 * s }); }
      if (it.kind === 'hub') iconRoastery(ctx, it.x, it.y, s, t);
      if (it.kind === 'city') { iconCity(ctx, it.x, it.y, s); iconCup(ctx, it.x + 30, it.y - 26, 0.9, t); }
      const tall = it.kind === 'hub' ? 60 : 40;
      placed.push({ x: it.x - 32 * s, y: it.y - tall * s, w: 64 * s, h: (tall + 2) * s });
    });
    const order = { hub: 0, city: 1, farm: 2 };
    items.slice().sort((a, b) => order[a.kind] - order[b.kind]).forEach((it) => {
      const faded = it.kind === 'farm' && dim && !hl.includes(it.f.id);
      if (faded) return;
      const text = it.kind === 'farm' ? `${it.f.name}\n${it.f.place}` : it.kind === 'hub' ? `Tostión\n${(o.hub.name || '').replace(/^Tostión · /, '')}` : `Tu taza\n${o.city.name}`;
      const border = it.kind === 'hub' ? P.naranja : it.kind === 'city' ? P.azul : it.on ? P.naranja : INK;
      const tries = [[it.x + 36, it.y - 16, 0, 0.5], [it.x, it.y + 6, 0.5, 0], [it.x - 36, it.y - 16, 1, 0.5], [it.x, it.y - 64, 0.5, 1], [it.x + 36, it.y + 18, 0, 0], [it.x - 36, it.y + 18, 1, 0], [it.x + 36, it.y - 50, 0, 1], [it.x - 36, it.y - 50, 1, 1]];
      let box = null;
      for (const [x, y, ax, ay] of tries) {
        const b = tagBox(ctx, x, y, text, { ax, ay, border, lw: it.on ? 3 : 2, size: 14, bounds: [W, H] });
        if (!placed.some((p) => overlap(p, b))) { box = b; break; }
        if (!box) box = b;
      }
      placed.push(box);
      // A label pushed away from its icon gets a thin leader line back to it.
      const nx = clamp(it.x, box.x, box.x + box.w), ny = clamp(it.y - 14, box.y, box.y + box.h);
      if (Math.hypot(nx - it.x, ny - (it.y - 14)) > 34) { ctx.beginPath(); ctx.moveTo(it.x, it.y - 14); ctx.lineTo(nx, ny); paintPath(ctx, null, INK, 1.5); }
      box.draw();
    });
  }

  function journey(ctx, t, dt) {
    const st = stops();
    if (st.length < 2) return;
    const prev = current;
    if (rt.reduced || dt === 0 && !ready) current = target;
    else current += Math.sign(target - current) * Math.min(Math.abs(target - current), clamp(finite(o.speed, 0.6), 0.05, 4) * dt);
    if (lastArrival < 0) announce(Math.round(current));
    if (current > prev) for (let i = Math.floor(prev) + 1; i <= Math.floor(current + 1e-6); i++) announce(i);
    else if (current < prev) for (let i = Math.ceil(prev) - 1; i >= Math.ceil(current - 1e-6); i--) announce(i);
    const items = st.map((s) => { const [ax, ay] = S(s); return { s, ax, ay }; });
    declutter(items, 96);
    const legs = [];
    for (let i = 0; i < items.length - 1; i++) legs.push(curve([items[i].x, items[i].y], [items[i + 1].x, items[i + 1].y]));
    legs.forEach((cv, i) => {
      strokeCurve(ctx, cv, 0, 1, INK, 2.5, [8, 7]);
      const f = clamp(current - i, 0, 1);
      if (f > 0) strokeCurve(ctx, cv, 0, f, P.naranja, 6);
    });
    const placed = [];
    const near = Math.round(current);
    items.forEach((it, i) => {
      if (Math.hypot(it.x - it.ax, it.y - it.ay) > 6) {
        ctx.beginPath(); ctx.moveTo(it.ax, it.ay); ctx.lineTo(it.x, it.y); paintPath(ctx, null, INK, 1.4);
        circle(ctx, it.ax, it.ay, 3, INK, null);
      }
      const s = i === near && Math.abs(current - near) < 0.05 ? 1.25 : 1;
      const kind = it.s.kind;
      if (kind === 'finca') iconFarm(ctx, it.x, it.y, s, P.cereza);
      else if (kind === 'trilla') iconMill(ctx, it.x, it.y, s);
      else if (kind === 'tostion') iconRoastery(ctx, it.x, it.y, s, t);
      else { iconCity(ctx, it.x, it.y, s); iconCup(ctx, it.x + 30 * s, it.y - 26 * s, 0.9 * s, t); }
      badge(ctx, it.x - 26 * s, it.y - 34 * s, i + 1);
      placed.push({ x: it.x - 30 * s, y: it.y - 40 * s, w: 60 * s, h: 42 * s });
    });
    items.forEach((it, i) => {
      const on = i === near;
      const tries = [[it.x + 38, it.y - 16, 0, 0.5], [it.x - 38, it.y - 16, 1, 0.5], [it.x, it.y + 8, 0.5, 0], [it.x, it.y - 52, 0.5, 1]];
      let box = null;
      for (const [x, y, ax, ay] of tries) {
        const b = tagBox(ctx, x, y, it.s.name, { ax, ay, border: on ? P.naranja : INK, lw: on ? 3 : 2, size: 15, bg: on ? P.luz : P.crema, bounds: [W, H] });
        if (!placed.some((p) => overlap(p, b))) { box = b; break; }
        if (!box) box = b;
      }
      placed.push(box); box.draw();
    });
    const leg = Math.min(legs.length - 1, Math.floor(current));
    const u = clamp(current - leg, 0, 1);
    const cv = legs[leg];
    const [x, y] = cv.at(u), [x2] = cv.at(Math.min(1, u + 0.02)), [x0] = cv.at(Math.max(0, u - 0.02));
    const parked = Math.abs(current - Math.round(current)) < 0.01;
    const dir = x2 - x0 >= 0 ? 1 : -1;
    // Cargo follows the leg, whichever way the story runs: box to the city, green beans from the mill, parchment from the farm.
    const kinds = [st[leg].kind, st[Math.min(st.length - 1, leg + 1)].kind];
    const cargo = kinds.includes('ciudad') ? 'box' : kinds.includes('finca') ? P.atardecer : P.brote;
    truck(ctx, parked ? x - 44 : x, y + 3, parked ? 1 : dir, st.length === 2 ? P.cereza : P.azul, st.length === 2 ? 'box' : cargo, t, rt.reduced || parked);
  }
  function announce(i) {
    if (i === lastArrival) return;
    lastArrival = i;
    if (typeof o.onStop === 'function') o.onStop({ index: i, stop: { ...stops()[i] } });
  }

  rt.on(rt.canvas, 'pointermove', (e) => {
    if (o.mode !== 'overview') return;
    const [x, y] = local(rt, e);
    const h = hits.find((h) => Math.hypot(h.x - x, h.y - y) < h.r);
    const id = h ? h.id : null;
    rt.canvas.style.cursor = id && typeof o.onPick === 'function' ? 'pointer' : '';
    if (id !== hovered) { hovered = id; rt.requestRender(); if (typeof o.onHover === 'function') o.onHover(id); }
  });
  rt.on(rt.canvas, 'pointerup', (e) => {
    if (o.mode !== 'overview' || typeof o.onPick !== 'function') return;
    const [x, y] = local(rt, e);
    const h = hits.find((h) => Math.hypot(h.x - x, h.y - y) < h.r * 1.2);
    if (h) o.onPick(h.id);
  });

  rt.start((ctx, w, h, t, dt) => {
    W = w; H = h; setStyle(o);
    const time = o.debugTime ?? t;
    if (o.mode !== 'overview') target = clamp(finite(o.stage, 0), 0, Math.max(0, stops().length - 1));
    if (o.debugTime != null) current = target;
    const g = goal();
    if (!ready || rt.reduced || o.debugTime != null) { Object.assign(cam, g); ready = true; }
    else {
      const a = 1 - Math.exp(-2.4 * dt);
      cam.lat = lerp(cam.lat, g.lat, a); cam.lng = lerp(cam.lng, g.lng, a); cam.k = Math.exp(lerp(Math.log(cam.k), Math.log(g.k), a));
    }
    base(ctx, time);
    if (o.mode === 'overview') overview(ctx, time); else journey(ctx, time, dt);
    inset(ctx);
  });

  return {
    update(next = {}) {
      const before = o;
      o = { ...o, ...next };
      if (!same(before, o, ['mode', 'stops'])) { lastArrival = -1; }
      rt.requestRender();
    },
    destroy() { rt.destroy(); },
  };
}

/* ── Altimetría: the mountain seen from the side ── */

export function terrain(canvas, options = {}) {
  const rt = runtime(canvas);
  let o = { farmAltitude: 1850, farmName: 'Finca', accent: P.azul, highlight: true, seed: 17, city: null, ...options };
  let intro = 0, pointerY = null, lastSent, lastTime = 0, W = 1, H = 1;
  const BANDS = [[0, 1000, P.luz], [1000, 2000, P.brote], [2000, 3000, P.moriche], [3000, 9000, P.cafe]];

  function shape() {
    const seed = Math.trunc(finite(o.seed, 17));
    const r = (k) => { const v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
    const bumps = [[0.46, 0.17, 1], [0.25 + r(1) * 0.06, 0.08, 0.35 + r(2) * 0.15], [0.68 + r(3) * 0.05, 0.09, 0.4 + r(4) * 0.15], [0.56, 0.05, 0.18]];
    const f = (x) => bumps.reduce((n, [c, w, h]) => n + h * Math.exp(-((x - c) ** 2) / (2 * w * w)), 0);
    const N = 120, raw = [];
    for (let i = 0; i <= N; i++) raw.push(f(i / N));
    const lo = Math.min(raw[0], raw[N]), hi = Math.max(...raw);
    return raw.map((v) => clamp((v - lo) / (hi - lo), 0, 1));
  }
  let prof = shape();

  rt.on(rt.canvas, 'pointermove', (e) => { pointerY = local(rt, e)[1]; rt.requestRender(); });
  rt.on(rt.canvas, 'pointerdown', (e) => { pointerY = local(rt, e)[1]; rt.requestRender(); });
  rt.on(rt.canvas, 'pointerleave', () => { pointerY = null; send(null); rt.requestRender(); });
  function send(v) {
    const now = performance.now();
    if (v === lastSent || (v !== null && now - lastTime < 90)) return;
    lastSent = v; lastTime = now;
    if (typeof o.onHover === 'function') o.onHover(v);
  }

  rt.start((ctx, w, h, t, dt) => {
    W = w; H = h; setStyle(o);
    const time = o.debugTime ?? t;
    intro = rt.reduced || o.debugTime != null ? 1 : Math.min(1, intro + dt / 2.4);
    const farm = clamp(finite(o.farmAltitude, 1850), 100, 6000);
    const city = o.city && Number.isFinite(o.city.alt) ? o.city : null;
    const accent = ink(o.accent, P.azul);
    const top = Math.ceil(Math.max(3000, farm + 900, city ? city.alt + 500 : 0) / 500) * 500;
    const L = 74, R = W - 12, T = 22, B = H - 30;
    const y = (a) => B - (a / top) * (B - T);
    const peakAlt = farm + 700;
    const x0 = L + (R - L) * 0.07, x1 = L + (R - L) * 0.7;
    const mx = (i) => lerp(x0, x1, i / (prof.length - 1));
    const land = prof.map((v, i) => [mx(i), y(v * peakAlt)]);
    let fi = prof.length - 1;
    const peakI = prof.indexOf(1);
    for (let i = peakI; i < prof.length; i++) if (prof[i] * peakAlt <= farm) { fi = i; break; }
    const fx = mx(fi), fy = y(farm);
    const cityX = lerp(L, R, 0.9);
    const plateau = city && city.alt >= 150;

    // Sun and clouds.
    const sx = lerp(L, R, 0.08) + 30, sy = T + 34;
    circle(ctx, sx, sy, 20, P.sol, INK, 2);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + time * 0.2;
      ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 26, sy + Math.sin(a) * 26); ctx.lineTo(sx + Math.cos(a) * 33, sy + Math.sin(a) * 33); paintPath(ctx, null, INK, 2);
    }
    [[0.18, 0.09, 1], [0.55, 0.16, 0.8]].forEach(([fx0, fy0, s], k) => {
      const cx = L + (((fx0 + time * 0.012 * (k + 1)) % 1.1) - 0.05) * (R - L), cy = T + (B - T) * fy0;
      [[0, 0, 13], [14, 3, 10], [-14, 3, 9], [6, -8, 10]].forEach(([dx, dy, r]) => circle(ctx, cx + dx * s, cy + dy * s, r * s, P.crema, INK, 1.6));
      [[0, 0, 12], [14, 3, 9], [-14, 3, 8], [6, -8, 9]].forEach(([dx, dy, r]) => circle(ctx, cx + dx * s, cy + dy * s, r * s, P.crema, null));
    });

    // Ruler.
    ctx.beginPath(); ctx.moveTo(L - 10, B); ctx.lineTo(L - 10, T); paintPath(ctx, null, INK, 2);
    for (let a = 0; a <= top; a += 500) {
      ctx.beginPath(); ctx.moveTo(L - 16, y(a)); ctx.lineTo(L - 10, y(a)); paintPath(ctx, null, INK, 2);
      write(ctx, L - 20, y(a), a === 0 ? '0 m' : `${dots(a)} m`, `500 12px ${F.sans}`, INK, 'right');
    }

    // Sea at the left, the zero of the ruler.
    ctx.fillStyle = P.cielo; ctx.fillRect(L - 8, B - 2, x0 - L + 14, 12);
    for (let k = 0; k < 3; k++) {
      const wx = L + 4 + k * 14 + Math.sin(time + k) * 2;
      ctx.beginPath(); ctx.arc(wx, B - 2, 5, Math.PI * 1.15, Math.PI * 1.85); paintPath(ctx, null, P.azul, 2);
    }
    write(ctx, L - 6, B + 15, 'nivel del mar', `400 15px ${F.brush}`, INK, 'left');

    // Land: mountain and the city's ground, banded by altitude.
    const ground = () => {
      ctx.beginPath(); ctx.moveTo(x0 - 6, B);
      smooth(ctx, land, false);
      if (plateau) {
        const foot = lerp(x1, R, 0.02), rise = lerp(x1, R, 0.5);
        ctx.lineTo(x1 + 4, B); ctx.lineTo(foot, B);
        ctx.bezierCurveTo(lerp(foot, rise, 0.55), B, lerp(foot, rise, 0.45), y(city.alt), rise, y(city.alt));
        ctx.lineTo(R + 2, y(city.alt)); ctx.lineTo(R + 2, B);
      } else ctx.lineTo(R + 2, B);
      ctx.closePath();
    };
    ctx.save(); ground(); ctx.clip();
    BANDS.forEach(([a, b, c]) => { ctx.fillStyle = c; ctx.fillRect(0, y(Math.min(b, top + 500)), W, y(a) - y(Math.min(b, top + 500)) + 1); });
    ctx.restore();
    ground(); paintPath(ctx, null, INK, 2.5);
    ctx.beginPath(); ctx.moveTo(x0 - 6, B); ctx.lineTo(R, B); paintPath(ctx, null, INK, 2.5);

    // Coffee bushes where coffee usually grows.
    for (let i = 4; i < prof.length - 4; i += 7) {
      const a = prof[i] * peakAlt;
      if (a < 1200 || a > 2200 || Math.abs(mx(i) - fx) < 34) continue;
      bush(ctx, mx(i), y(a) + 3, 0.7);
    }

    // City for comparison.
    if (city) {
      const cy = plateau ? y(city.alt) : B;
      ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(L - 10, cy); ctx.lineTo(cityX - 30, cy); paintPath(ctx, null, P.azul, 2); ctx.setLineDash([]);
      iconCity(ctx, cityX, cy, 1);
      tagBox(ctx, cityX, cy - 44, `${city.name}\n${dots(city.alt)} m`, { ax: 0.5, ay: 1, border: P.azul, size: 14 }).draw();
    }

    // The farm: a dot climbs from the sea to its altitude, then the house appears.
    const k = ease(intro);
    const ci = Math.round(lerp(prof.length - 1, fi, k));
    const climbA = k >= 1 ? farm : prof[ci] * peakAlt;
    const cx = k >= 1 ? fx : mx(ci), cyy = y(climbA);
    if (o.highlight !== false) {
      ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(L - 10, cyy); ctx.lineTo(cx, cyy); paintPath(ctx, null, accent, 2.5); ctx.setLineDash([]);
      tagBox(ctx, L - 8, cyy, `${dots(climbA)} m`, { ax: 0, ay: 0.5, border: accent, lw: 3, size: 14, bg: P.crema }).draw();
    }
    if (k < 1) cherry(ctx, cx, cyy - 6, 7);
    else {
      iconFarm(ctx, fx, fy + 3, 1.1, accent);
      tagBox(ctx, fx, fy - 40, o.farmName || 'Finca', { ax: 0.5, ay: 1, border: accent, lw: 3, size: 15, slab: true }).draw();
    }

    // Measuring line under the pointer.
    if (pointerY != null && pointerY >= T && pointerY <= B) {
      const a = Math.round((((B - pointerY) / (B - T)) * top) / 10) * 10;
      ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(L - 10, pointerY); ctx.lineTo(R, pointerY); paintPath(ctx, null, INK, 1.6); ctx.setLineDash([]);
      tagBox(ctx, R - 4, pointerY - 4, `${dots(a)} m`, { ax: 1, ay: 1, size: 13, bg: P.luz }).draw();
      send(a);
    }
  });

  return {
    update(next = {}) {
      const before = o;
      o = { ...o, ...next };
      if (!same(before, o, ['seed'])) prof = shape();
      if (!same(before, o, ['seed', 'farmAltitude', 'farmName'])) intro = 0;
      rt.requestRender();
    },
    destroy() { rt.destroy(); },
  };
}

/* ── De cereza a taza: the cherry opens, the parchment falls, the bean roasts ── */

const ROAST = [[P.atardecer, P.naranja], [P.naranja, P.cafe], [P.cafe, P.cafe], [P.cafe, P.moriche], [P.moriche, P.moriche]];
const VW = 400, VH = 260;
function fit(ctx, W, H) {
  const s = Math.min(W / VW, H / VH);
  ctx.translate((W - VW * s) / 2, (H - VH * s) / 2); ctx.scale(s, s);
}
function blob(ctx, cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const rr = r * (1 + Math.sin(i * 2.3) * 0.06); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9]); }
  ctx.beginPath(); smooth(ctx, pts, true); paintPath(ctx, color, null);
}
function beanShape(ctx, x, y, rx, ry, fill, creaseColor) {
  ellipse(ctx, x, y, rx, ry, 0, fill, INK, 2.5);
  ctx.beginPath(); ctx.moveTo(x, y - ry * 0.82);
  ctx.bezierCurveTo(x + rx * 0.45, y - ry * 0.3, x - rx * 0.45, y + ry * 0.3, x, y + ry * 0.82);
  paintPath(ctx, null, creaseColor, 3);
  ellipse(ctx, x - rx * 0.42, y - ry * 0.45, rx * 0.14, ry * 0.12, -0.5, P.crema, null);
}

export function bean(canvas, options = {}) {
  const rt = runtime(canvas);
  let o = { stage: 0, roast: 3, dried: false, honey: false, ...options };
  let p = clamp(finite(o.stage, 0), 0, 3), pop = 0;
  rt.start((ctx, W, H, t, dt) => {
    setStyle(o);
    const time = o.debugTime ?? t;
    const target = clamp(finite(o.stage, 0), 0, 3);
    const before = p;
    p = rt.reduced || o.debugTime != null ? target : p + Math.sign(target - p) * Math.min(Math.abs(target - p), dt * 1.4);
    if (before < 2.5 && p >= 2.5) pop = 1;
    pop = Math.max(0, pop - dt * 1.5);
    const roast = clamp(Math.round(finite(o.roast, 3)), 1, 5);
    ctx.save(); fit(ctx, W, H);
    blob(ctx, 200, 132, 112, P.luz);
    const bob = rt.reduced ? 0 : Math.sin(time * 1.6) * 3;
    const cx = 200, cy = 136 + bob;
    const peel = ease(clamp(p, 0, 1)), husk = ease(clamp(p - 1, 0, 1)), toast = clamp(p - 2, 0, 1);

    // Beans: green, then roasted.
    if (peel > 0.35) {
      const gap = 33 + husk * 14;
      const fill = toast >= 0.5 ? ROAST[roast - 1][0] : P.brote;
      const crease = toast >= 0.5 ? P.luz : P.moriche;
      const sc = 1 + (toast >= 0.5 ? 0.06 : 0) + pop * 0.08;
      [-1, 1].forEach((side) => beanShape(ctx, cx + side * gap * 0.5 * sc + side * 4, cy, 30 * sc, 44 * sc, fill, crease));
      if (toast >= 0.5 && roast >= 4) [-1, 1].forEach((side) => ellipse(ctx, cx + side * (gap * 0.5 + 4) + 10, cy + 18, 6, 8, 0, ROAST[roast - 1][1], null));
    }
    // Parchment: one shell around both beans that splits in two.
    if (peel > 0.2 && husk < 0.01) {
      ellipse(ctx, cx, cy, 76, 58, 0, o.honey ? P.sol : P.crema, INK, 2.5);
      ctx.beginPath(); ctx.moveTo(cx, cy - 56); ctx.bezierCurveTo(cx + 10, cy - 20, cx - 10, cy + 20, cx, cy + 56); paintPath(ctx, null, o.honey ? P.atardecer : P.luz, 3);
    } else if (peel > 0.2 && husk < 0.99) {
      const shell = o.honey ? P.sol : P.crema, inner = o.honey ? P.atardecer : P.luz;
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.translate(cx + side * husk * 120, cy + husk * 30);
        ctx.rotate(side * husk * 0.6);
        ctx.globalAlpha = 1 - husk * 0.6;
        ctx.beginPath(); ctx.ellipse(0, 0, 76, 58, 0, side < 0 ? Math.PI / 2 : -Math.PI / 2, side < 0 ? (Math.PI * 3) / 2 : Math.PI / 2);
        ctx.closePath(); paintPath(ctx, shell, INK, 2.5);
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 52, 0, side < 0 ? -Math.PI / 2 : Math.PI / 2, side < 0 ? Math.PI / 2 : (Math.PI * 3) / 2); paintPath(ctx, inner, null);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      if (o.honey && husk < 0.3) for (let k = 0; k < 3; k++) { const u = (time * 0.5 + k / 3) % 1; circle(ctx, cx - 20 + k * 20, cy + 58 + u * 18, 4 * (1 - u), P.sol, INK, 1.5); }
    }
    // Cherry: two halves that slide apart.
    if (peel < 0.01) {
      ellipse(ctx, cx, cy, 86, 92, 0, o.dried ? P.cafe : P.cereza, INK, 3);
      ellipse(ctx, cx - 40, cy - 40, 14, 10, -0.6, o.dried ? P.atardecer : P.rosa, null);
      if (o.dried) [[-30, -30], [26, -8], [-12, 30], [30, 34]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 16, 3.6, 5.0); paintPath(ctx, null, P.moriche, 2); });
    }
    if (peel >= 0.01 && peel < 0.99) {
      const skin = o.dried ? P.cafe : P.cereza, flesh = o.dried ? P.atardecer : P.luz;
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.translate(cx + side * peel * 140, cy + peel * 36);
        ctx.rotate(side * peel * 0.7);
        ctx.beginPath(); ctx.ellipse(0, 0, 86, 92, 0, side < 0 ? Math.PI / 2 : -Math.PI / 2, side < 0 ? (Math.PI * 3) / 2 : Math.PI / 2);
        ctx.closePath(); paintPath(ctx, skin, INK, 3);
        if (peel > 0.01) { ctx.beginPath(); ctx.ellipse(0, 0, 10, 84, 0, side < 0 ? -Math.PI / 2 : Math.PI / 2, side < 0 ? Math.PI / 2 : (Math.PI * 3) / 2); paintPath(ctx, flesh, null); }
        if (side < 0) ellipse(ctx, -40, -40, 14, 10, -0.6, o.dried ? P.atardecer : P.rosa, null);
        if (o.dried) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(side * 30, -30 + k * 26, 16, side < 0 ? 4.2 : -1.1, side < 0 ? 5.2 : -0.1); paintPath(ctx, null, P.moriche, 2); }
        ctx.restore();
      });
      if (peel < 0.15) {
        ctx.beginPath(); ctx.moveTo(cx, cy - 90); ctx.quadraticCurveTo(cx + 4, cy - 110, cx + 14, cy - 122); paintPath(ctx, null, P.moriche, 5);
        [[1, -0.4], [-1, 0.5]].forEach(([d, r]) => {
          ctx.save(); ctx.translate(cx + 12, cy - 118); ctx.rotate(r);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(d * 24, -18, d * 52, -4); ctx.quadraticCurveTo(d * 24, 10, 0, 0);
          paintPath(ctx, P.brote, INK, 2.2);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(d * 46, -4); paintPath(ctx, null, P.moriche, 1.6);
          ctx.restore();
        });
      }
    }
    // Chaff flies off at the first crack.
    if (pop > 0) for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, d = (1 - pop) * 110;
      ctx.globalAlpha = pop;
      ellipse(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, 6, 3, a, P.luz, INK, 1.2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  });
  return { update(next = {}) { o = { ...o, ...next }; rt.requestRender(); }, destroy() { rt.destroy(); } };
}

/* ── Tu taza ── */

export function cup(canvas, options = {}) {
  const rt = runtime(canvas);
  let o = { roast: 3, milk: false, ...options };
  rt.start((ctx, W, H, t) => {
    setStyle(o);
    const time = o.debugTime ?? t;
    const roast = clamp(Math.round(finite(o.roast, 3)), 1, 5);
    const brew = o.milk ? P.atardecer : [P.atardecer, P.naranja, P.cafe, P.cafe, P.moriche][roast - 1];
    ctx.save(); fit(ctx, W, H);
    blob(ctx, 200, 140, 112, P.luz);
    ctx.beginPath(); ctx.moveTo(40, 228); ctx.lineTo(360, 228); paintPath(ctx, null, INK, 2.5);
    ellipse(ctx, 196, 222, 108, 18, 0, P.crema, INK, 2.5);
    ellipse(ctx, 196, 218, 62, 9, 0, P.cielo, null);
    ctx.beginPath(); ctx.arc(266, 150, 24, -Math.PI / 2.4, Math.PI / 2.4); paintPath(ctx, null, INK, 9);
    ctx.beginPath(); ctx.arc(266, 150, 24, -Math.PI / 2.4, Math.PI / 2.4); paintPath(ctx, null, P.crema, 4);
    ctx.beginPath(); ctx.moveTo(122, 112); ctx.lineTo(270, 112); ctx.bezierCurveTo(266, 180, 246, 214, 196, 216); ctx.bezierCurveTo(146, 214, 126, 180, 122, 112); ctx.closePath();
    paintPath(ctx, P.crema, INK, 3);
    ctx.save(); ctx.clip(); ctx.fillStyle = P.cereza; ctx.fillRect(100, 140, 200, 14); ctx.restore();
    ctx.beginPath(); ctx.moveTo(122, 112); ctx.lineTo(270, 112); ctx.bezierCurveTo(266, 180, 246, 214, 196, 216); ctx.bezierCurveTo(146, 214, 126, 180, 122, 112); ctx.closePath();
    paintPath(ctx, null, INK, 3);
    ellipse(ctx, 196, 112, 74, 15, 0, P.crema, INK, 3);
    ellipse(ctx, 196, 113, 64, 11, 0, brew, null);
    ellipse(ctx, 196, 113, 24, 5, 0, o.milk ? P.crema : P.atardecer, null);
    [0, 1, 2].forEach((k) => steam(ctx, 170 + k * 26, 96, 52, rt.reduced ? 0.6 : time, k, P.atardecer, 4));
    ctx.restore();
  });
  return { update(next = {}) { o = { ...o, ...next }; rt.requestRender(); }, destroy() { rt.destroy(); } };
}


/* ── De tu taza a la finca: a line that draws itself, with stops to hover ── */

function iconBag(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x - 11 * s, y); ctx.lineTo(x - 12 * s, y - 24 * s);
  for (let i = 0; i <= 6; i++) ctx.lineTo(x - 12 * s + i * 4 * s, y - 24 * s - (i % 2 ? 2 * s : 0));
  ctx.lineTo(x + 11 * s, y); ctx.closePath();
  paintPath(ctx, P.cielo, INK, 1.8);
  poly(ctx, [[x - 6 * s, y - 16 * s], [x + 7 * s, y - 16 * s], [x + 7 * s, y - 6 * s], [x - 6 * s, y - 6 * s]], P.azul, null);
}
function iconSun(ctx, x, y, s, t) {
  circle(ctx, x + 8 * s, y - 30 * s, 6 * s, P.sol, INK, 1.6);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + t * 0.4;
    ctx.beginPath(); ctx.moveTo(x + 8 * s + Math.cos(a) * 9 * s, y - 30 * s + Math.sin(a) * 9 * s); ctx.lineTo(x + 8 * s + Math.cos(a) * 12 * s, y - 30 * s + Math.sin(a) * 12 * s); paintPath(ctx, null, INK, 1.4);
  }
  ctx.beginPath(); ctx.moveTo(x - 16 * s, y - 10 * s); ctx.lineTo(x + 16 * s, y - 10 * s); paintPath(ctx, null, INK, 2.2);
  [[-12, 0], [12, 0]].forEach(([dx]) => { ctx.beginPath(); ctx.moveTo(x + dx * s, y - 10 * s); ctx.lineTo(x + dx * s, y); paintPath(ctx, null, INK, 1.6); });
  for (let k = -3; k <= 3; k++) ellipse(ctx, x + k * 4.4 * s, y - 13 * s, 2 * s, 1.5 * s, 0, P.crema, INK, 1);
}
function iconTank(ctx, x, y, s, t) {
  poly(ctx, [[x - 12 * s, y], [x - 12 * s, y - 22 * s], [x + 12 * s, y - 22 * s], [x + 12 * s, y]], P.crema, INK, 1.8);
  poly(ctx, [[x - 11 * s, y - 1], [x - 11 * s, y - 12 * s], [x + 11 * s, y - 12 * s], [x + 11 * s, y - 1]], P.luz, null);
  for (let k = 0; k < 3; k++) { const u = (t * 0.6 + k / 3) % 1; circle(ctx, x - 6 * s + k * 6 * s, y - 4 * s - u * 22 * s, 1.8 * s, P.crema, INK, 1); }
}
function iconSplit(ctx, x, y, s) {
  ellipse(ctx, x, y - 12 * s, 6 * s, 8 * s, 0, P.crema, INK, 1.6);
  [-1, 1].forEach((d) => { ctx.beginPath(); ctx.arc(x + d * 11 * s, y - 12 * s, 9 * s, d < 0 ? Math.PI / 2 : -Math.PI / 2, d < 0 ? Math.PI * 1.5 : Math.PI / 2); ctx.closePath(); paintPath(ctx, P.cereza, INK, 1.6); });
}
function catmull(pts, perSeg) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}


const hash1 = (a, b) => {
  let h = Math.imul(a + 0x9e37, 2654435761) ^ Math.imul(b + 0x85eb, 1597334677);
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13;
  return (h >>> 0) / 4294967295;
};
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const d = Math.hypot(bx - ax, by - ay);
    let t = step - carry;
    while (t <= d) { out.push([ax + ((bx - ax) * t) / d, ay + ((by - ay) * t) / d]); t += step; }
    carry = d - (t - step);
  }
  return out;
}
// Wax crayon: a few uneven passes of the same colour, then paper grain showing through.
// Jitter is hashed by point index, so the stroke stays still between frames.
function crayon(ctx, pts, color, width, paper = P.crema) {
  if (pts.length < 2) return;
  const line = resample(pts, 3);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  [[0, 0, 1, 0.92], [1, 0.9, 0.62, 0.6], [2, -0.8, 0.5, 0.55], [3, 0.3, 0.38, 0.75]].forEach(([k, off, wm, alpha]) => {
    ctx.beginPath();
    line.forEach(([x, y], i) => {
      const j = Math.floor(i / 2);
      const px = x + off + (hash1(j, k) - 0.5) * width * 0.35, py = y + off * 0.6 + (hash1(j + 991, k) - 0.5) * width * 0.35;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width * wm; ctx.stroke();
  });
  ctx.globalAlpha = 1; ctx.fillStyle = paper;
  line.forEach(([x, y], i) => {
    for (let g = 0; g < 3; g++) {
      const r = hash1(i * 3 + g, 7);
      if (r < 0.7) continue;
      const sz = 0.7 + r * 1.1;
      ctx.fillRect(x + (hash1(i, g + 11) - 0.5) * width * 1.05, y + (hash1(i + 5, g + 13) - 0.5) * width * 1.05, sz, sz);
    }
  });
  ctx.restore();
}
function crayonRing(ctx, x, y, r, fill, color, width, seed) {
  if (fill) circle(ctx, x, y, r, fill, null);
  const pts = [];
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2.08 + seed; const rr = r * (1 + (hash1(i, seed * 7) - 0.5) * 0.08); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  crayon(ctx, pts, color, width, fill || P.crema);
}

export function trail(canvas, options = {}) {
  const rt = runtime(canvas);
  let o = { steps: [], active: 0, fine: true, ...options };
  let prog = 0, hovered = null, pts = [], W = 1, H = 1, vertical = false, lastSent = null;
  const ICONS = ['cup', 'truck', 'bag', 'roastery', 'mill', 'sun', 'tank', 'split', 'farm'];
  function layout() {
    const n = Math.max(2, (o.steps || []).length || 9);
    vertical = W < 560;
    pts = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      if (vertical) pts.push([W * 0.3 + Math.sin(u * Math.PI * 2.5) * W * 0.12, lerp(56, H - 40, u)]);
      else pts.push([lerp(Math.min(110, W * 0.07), W - Math.min(120, W * 0.08), u), lerp(H * 0.78, H * 0.3, u) + Math.sin(u * Math.PI * 3) * H * 0.08]);
    }
  }
  function drawIcon(ctx, kind, x, y, s, t) {
    if (kind === 'cup') iconCup(ctx, x, y, s * 1.1, t);
    else if (kind === 'truck') truck(ctx, x, y, -1, P.cereza, 'box', t, rt.reduced);
    else if (kind === 'bag') iconBag(ctx, x, y, s);
    else if (kind === 'roastery') iconRoastery(ctx, x, y, s * 0.75, t);
    else if (kind === 'mill') { sack(ctx, x - 8 * s, y, s * 0.85, P.atardecer); sack(ctx, x + 8 * s, y, s * 0.85, P.atardecer); [-4, 0, 4].forEach((d) => ellipse(ctx, x + d * s, y - 22 * s, 2 * s, 1.5 * s, 0.4, P.brote, INK, 1)); }
    else if (kind === 'sun') iconSun(ctx, x, y, s, t);
    else if (kind === 'tank') iconTank(ctx, x, y, s, t);
    else if (kind === 'split') iconSplit(ctx, x, y, s);
    else iconFarm(ctx, x, y, s * 0.8, P.cereza);
  }
  function nearest(x, y) {
    let best = null, bd = 34;
    pts.forEach(([px, py], i) => { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  rt.on(rt.canvas, 'pointermove', (e) => {
    const [x, y] = local(rt, e);
    const i = nearest(x, y);
    rt.canvas.style.cursor = i != null ? 'pointer' : '';
    if (i !== hovered) { hovered = i; rt.requestRender(); }
    if (i != null && i !== lastSent) { lastSent = i; if (typeof o.onHover === 'function') o.onHover(i); }
  });
  rt.on(rt.canvas, 'pointerleave', () => { hovered = null; rt.requestRender(); });
  rt.on(rt.canvas, 'pointerup', (e) => {
    const [x, y] = local(rt, e);
    const i = nearest(x, y);
    if (i == null) return;
    lastSent = i;
    if (typeof o.onHover === 'function') o.onHover(i);
    if (e.pointerType !== 'touch' && typeof o.onPick === 'function') o.onPick(i);
  });

  rt.start((ctx, w, h, t, dt) => {
    W = w; H = h; setStyle(o);
    const time = o.debugTime ?? t;
    // run: false holds the line back so the page can start (or restart) the drawing when it scrolls into view.
    if (o.run === false) prog = 0;
    else prog = rt.reduced || o.debugTime != null ? 1 : Math.min(1, prog + dt / 3.6);
    layout();
    const line = catmull(pts, 24);
    const lens = [0];
    for (let i = 1; i < line.length; i++) lens.push(lens[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
    const total = lens[lens.length - 1], reach = ease(prog) * total;
    const atPoint = pts.map((_, i) => lens[Math.min(lens.length - 1, i * 24)]);

    // Landscape: the line climbs from the city to the farm's mountain.
    if (!vertical) {
      ctx.beginPath(); ctx.moveTo(W * 0.42, H); ctx.quadraticCurveTo(W * 0.7, H * 0.55, W * 0.86, H * 0.32); ctx.quadraticCurveTo(W * 0.95, H * 0.42, W + 4, H * 0.5); ctx.lineTo(W + 4, H); ctx.closePath();
      paintPath(ctx, P.brote, null);
      ctx.beginPath(); ctx.moveTo(-4, H); ctx.lineTo(-4, H * 0.9); ctx.quadraticCurveTo(W * 0.2, H * 0.8, W * 0.45, H * 0.92); ctx.lineTo(W * 0.5, H); ctx.closePath();
      paintPath(ctx, P.luz, null);
    } else {
      ctx.fillStyle = P.brote; ctx.fillRect(0, H * 0.72, W, H * 0.28);
    }
    // Guide first, then the traced line on top.
    ctx.beginPath(); line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.setLineDash([2, 9]); ctx.globalAlpha = 0.55; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    const drawn = [];
    for (let i = 0; i < line.length && lens[i] <= reach; i++) drawn.push(line[i]);
    const tip = drawn.length ? drawn[drawn.length - 1] : line[0];
    crayon(ctx, drawn, P.naranja, vertical ? 7 : 9);
    if (prog >= 1 && !rt.reduced) {
      const u = (time * 0.07) % 1, k = Math.min(line.length - 1, Math.floor(u * (line.length - 1)));
      cherry(ctx, line[k][0], line[k][1], 5);
    } else if (prog < 1) cherry(ctx, tip[0], tip[1], 6);

    const steps = o.steps || [];
    const active = hovered != null ? hovered : clamp(Math.round(finite(o.active, 0)), 0, pts.length - 1);
    const placed = [];
    pts.forEach(([x, y], i) => {
      const shown = atPoint[i] <= reach + 1;
      if (!shown) return;
      const pop = Math.min(1, (reach - atPoint[i]) / 40 + (prog >= 1 ? 1 : 0));
      const s = ease(clamp(pop, 0, 1));
      const on = i === active;
      const ix = vertical ? x - 46 : x, iy = vertical ? y + 14 : y - 24;
      const big = vertical ? 1 : clamp(W / 900, 1, 1.4);
      ctx.save(); ctx.translate(ix, iy - (big - 1) * 10); ctx.scale(s * big, s * big); drawIcon(ctx, ICONS[i] || 'cup', 0, 0, 1, time); ctx.restore();
      const r = (on ? 18 : 14) * s * Math.sqrt(big);
      crayonRing(ctx, x, y, r, on ? P.naranja : P.crema, on ? P.cereza : INK, 3, i + 1);
      write(ctx, x, y + 0.5, String(i + 1).padStart(2, '0'), `700 ${on ? 13 : 11}px ${F.sans}`, on ? P.crema : INK);
      const label = steps[i] ? steps[i].title : '';
      if (label && s > 0.6) {
        const b = vertical
          ? tagBox(ctx, x + 22, y, label, { ax: 0, ay: 0.5, size: 13, border: on ? P.naranja : INK, bg: on ? P.luz : P.crema, bounds: [W, H] })
          : tagBox(ctx, x, y + 22, label, { ax: 0.5, ay: 0, size: 13, border: on ? P.naranja : INK, bg: on ? P.luz : P.crema, bounds: [W, H] });
        if (!placed.some((q) => overlap(q, b, 2)) || on) { placed.push(b); b.draw(); }
      }
    });
    if (prog >= 1 && hovered == null && !rt.reduced) {
      const [x, y] = pts[active];
      ctx.globalAlpha = 0.6 - ((time * 0.8) % 1) * 0.6;
      circle(ctx, x, y, 17 + ((time * 0.8) % 1) * 14, null, P.naranja, 2);
      ctx.globalAlpha = 1;
    }
    if (!vertical) {
      write(ctx, pts[0][0] - 30, pts[0][1] - 104, 'Empieza aquí', `400 22px ${F.brush}`, P.cereza, 'left');
      write(ctx, pts[pts.length - 1][0] - 52, pts[pts.length - 1][1] - 46, 'el origen', `400 22px ${F.brush}`, P.moriche, 'right');
    }
  });
  return { update(next = {}) { o = { ...o, ...next }; rt.requestRender(); }, destroy() { rt.destroy(); } };
}

const api = { route, terrain, bean, cup, trail, version: '2.1.0' };
if (typeof window !== 'undefined') window.GuatesScenes = api;
export default api;
