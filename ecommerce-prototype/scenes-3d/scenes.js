// Guates 3D scenes. Built on Astra's three.js r160 modules (origin-terrain, journey-route,
// bean-morph, cup): same runtime contract, re-rendered as two-tone ink illustrations.
// Each scene draws into a <canvas> owned by the page and returns { update(options), destroy() }.
import * as THREE from 'three';

// Palette HEX values pass through untouched: no colour management, no tone mapping.
THREE.ColorManagement.enabled = false;

const P = Object.freeze({
  naranja: '#CD591C', cafe: '#624532', sol: '#F2D139', moriche: '#364831', azul: '#4E71F0', cereza: '#81164B',
  atardecer: '#D6855A', crema: '#F6F3ED', luz: '#F5E380', brote: '#91AD80', cielo: '#9DB5EC', rosa: '#DB92BA',
});
const PALETTE = new Set(Object.values(P));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const finite = (x, d) => (Number.isFinite(Number(x)) ? Number(x) : d);
const ink = (x, d) => (typeof x === 'string' && PALETTE.has(x.toUpperCase()) ? x.toUpperCase() : d);
const ease = (t) => t * t * (3 - 2 * t);
const flat = (color, side = THREE.FrontSide) => new THREE.MeshBasicMaterial({ color, side });

function disposeTree(root) {
  const geometries = new Set(), materials = new Set();
  root.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
}
function empty(group) { disposeTree(group); group.clear(); }

// Light is fixed in view space, so shading reads like a drawing no matter how the object turns.
const LIGHT = new THREE.Vector3(-0.45, 0.72, 0.53).normalize();
function toon(light, shadow, o = {}) {
  return new THREE.ShaderMaterial({
    side: o.side ?? THREE.FrontSide,
    uniforms: {
      uLight: { value: new THREE.Color(light) },
      uShadow: { value: new THREE.Color(shadow) },
      uHi: { value: new THREE.Color(o.highlight || light) },
      uInner: { value: new THREE.Color(o.inner || shadow) },
      uDir: { value: LIGHT },
      uT: { value: o.threshold ?? 0.1 },
      uHT: { value: o.highlight ? (o.hiThreshold ?? 0.97) : 2.0 },
    },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uLight, uShadow, uHi, uInner, uDir; uniform float uT, uHT; varying vec3 vN; varying vec3 vV;
      void main(){
        if (!gl_FrontFacing) { gl_FragColor = vec4(uInner, 1.0); return; }
        vec3 n = normalize(vN);
        vec3 c = dot(n, uDir) > uT ? uLight : uShadow;
        if (dot(n, normalize(uDir + vV)) > uHT) c = uHi;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
function setToon(mat, light, shadow, hi) {
  mat.uniforms.uLight.value.set(light);
  mat.uniforms.uShadow.value.set(shadow);
  mat.uniforms.uHi.value.set(hi || light);
}
// Inverted hull: the back faces pushed out along the normal draw the ink line.
function outline(mesh, color = P.cafe, thickness = 0.03) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uThick: { value: thickness } },
    vertexShader: `uniform float uThick; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uThick, 1.0); }`,
    fragmentShader: `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }`,
  });
  const hull = new THREE.Mesh(mesh.geometry, mat);
  mesh.add(hull);
  return hull;
}
function line(points, color, closed = false) {
  const g = new THREE.BufferGeometry().setFromPoints(points);
  return new (closed ? THREE.LineLoop : THREE.Line)(g, new THREE.LineBasicMaterial({ color }));
}

// Flat text label drawn on an offscreen canvas; redraws once the brand fonts arrive.
function textSprite(text, o = {}) {
  const lines = String(text).split('\n');
  const size = o.size || 30, weight = o.weight || 500;
  const family = o.family || 'Roboto, Arial, sans-serif';
  const font = `${weight} ${size}px ${family}`;
  const pad = o.box === false ? 4 : Math.round(size * 0.45), lh = Math.round(size * 1.2);
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: o.depthTest ?? false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 10;
  sprite.center.set(o.anchorX ?? 0.5, o.anchorY ?? 0);
  const worldH = o.height || 0.5;
  function draw() {
    g.font = font;
    const w = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width)) + pad * 2);
    const h = Math.ceil(lh * lines.length + pad * 2 - (lh - size) * 0.6);
    c.width = w * 2; c.height = h * 2;
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.clearRect(0, 0, w, h);
    if (o.box !== false) {
      g.fillStyle = o.bg || P.crema; g.fillRect(0, 0, w, h);
      g.strokeStyle = o.border || o.fg || P.cafe; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    }
    g.font = font; g.fillStyle = o.fg || P.cafe; g.textBaseline = 'top'; g.textAlign = 'left';
    lines.forEach((l, i) => g.fillText(l, pad, pad + i * lh));
    tex.needsUpdate = true;
    sprite.scale.set((worldH * w) / h * lines.length, worldH * lines.length, 1);
    if (o.onDraw) o.onDraw();
  }
  draw();
  if (document.fonts && document.fonts.load) document.fonts.load(font).then(draw).catch(() => {});
  return sprite;
}

function runtime(canvas, opts = {}) {
  if (!canvas || canvas.tagName !== 'CANVAS') throw new TypeError('GuatesScenes necesita un elemento <canvas>.');
  const host = canvas.parentElement || canvas;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov || 36, 1, 0.05, 500);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true, started = false, dead = false, raf = 0, last = 0, frame = () => {};
  const cleanups = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn, o)); };
  const render = () => renderer.render(scene, camera);
  function draw() { if (!dead && started) { frame(0, true); render(); } }
  function loop(now) {
    raf = 0;
    if (dead || !started || !visible || document.hidden || motion.matches) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    frame(dt, false); render();
    raf = requestAnimationFrame(loop);
  }
  function sync() {
    cancelAnimationFrame(raf); raf = 0; last = 0;
    if (dead || !started) return;
    draw();
    if (visible && !document.hidden && !motion.matches) raf = requestAnimationFrame(loop);
  }
  function resize() {
    if (dead) return;
    const box = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(box.width)), h = Math.max(1, Math.round(box.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    draw();
  }
  const ro = new ResizeObserver(resize); ro.observe(host);
  const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); sync(); });
  io.observe(host);
  on(document, 'visibilitychange', sync);
  if (motion.addEventListener) on(motion, 'change', sync);
  return {
    scene, camera, renderer, canvas, on,
    get reduced() { return motion.matches; },
    requestRender: draw,
    start(fn) { frame = fn; started = true; resize(); sync(); },
    destroy() {
      if (dead) return;
      dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      cleanups.splice(0).forEach((f) => f());
      disposeTree(scene); scene.clear(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}

// Drag to orbit; a press that barely moves counts as a click.
function pointer(rt, { move, click } = {}) {
  let active = false, id = null, x = 0, y = 0, travel = 0;
  rt.on(rt.canvas, 'pointerdown', (e) => {
    if (e.button !== 0) return;
    active = true; id = e.pointerId; x = e.clientX; y = e.clientY; travel = 0;
    if (move) rt.canvas.setPointerCapture(id);
  });
  rt.on(rt.canvas, 'pointermove', (e) => {
    if (!active || e.pointerId !== id) return;
    const dx = e.clientX - x, dy = e.clientY - y;
    travel += Math.abs(dx) + Math.abs(dy);
    if (move) { move(dx, dy); rt.requestRender(); }
    x = e.clientX; y = e.clientY;
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    if (active && travel < 6 && click && e.type === 'pointerup') click(e);
    active = false;
    if (rt.canvas.hasPointerCapture && rt.canvas.hasPointerCapture(id)) rt.canvas.releasePointerCapture(id);
    id = null;
  };
  rt.on(rt.canvas, 'pointerup', end);
  rt.on(rt.canvas, 'pointercancel', end);
  return { get dragging() { return active && travel >= 6; } };
}
function ndc(rt, e, out) {
  const box = rt.canvas.getBoundingClientRect();
  return out.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
}
const changed = (a, b, keys) => keys.some((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));

/* ───────────────────────── Altimetría ───────────────────────── */

function hash(x, z, seed) {
  let h = Math.imul(x + seed * 7919, 374761393) ^ Math.imul(z + 11, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z), u = x - ix, v = z - iz, a = ease(u), b = ease(v);
  const l = THREE.MathUtils.lerp;
  return l(l(hash(ix, iz, seed), hash(ix + 1, iz, seed), a), l(hash(ix, iz + 1, seed), hash(ix + 1, iz + 1, seed), a), b);
}
function relief(x, z, seed) {
  let f = 0, amp = 0.55, fr = 0.11;
  for (let k = 0; k < 4; k++) { f += amp * noise(x * fr + 31, z * fr + 17, seed + k * 13); amp *= 0.5; fr *= 2.05; }
  const r = 1 - Math.abs(2 * noise(x * 0.09 + 5, z * 0.09 + 9, seed + 101) - 1);
  const massif = Math.exp(-(x * x + z * z) / 70);
  return f * 0.6 + r * r * 0.45 + massif * 0.35;
}

export function terrain(canvas, options = {}) {
  const rt = runtime(canvas, { fov: 32 });
  let o = {
    seed: 17, farmAltitude: 1850, minAlt: 1000, maxAlt: 2800, contourInterval: 100, accent: P.azul,
    highlight: true, farmName: 'Finca', ...options,
  };
  const N = 120, SIZE = 20, H = 5.6, BASE = -1.1;
  const root = new THREE.Group(); rt.scene.add(root);
  const land = new THREE.Group(), lines = new THREE.Group(), band = new THREE.Group(), walls = new THREE.Group(), pin = new THREE.Group();
  root.add(land, lines, band, walls, pin);
  const hover = new THREE.Group(); root.add(hover);
  const clouds = new THREE.Group(); root.add(clouds);
  let field = [], min = 1000, max = 2800, farm = 1850, surface = null, farmPos = new THREE.Vector3();
  let elapsed = 0, azimuth = 0.75, elevation = 0.78, userMoved = false, pulse = null;
  const yOf = (a) => ((a - min) / (max - min)) * H;
  const idx = (i, j) => j * (N + 1) + i;

  function segmentsAt(level) {
    const out = [], y = yOf(level) + 0.02;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = field[idx(i, j)], b = field[idx(i + 1, j)], c = field[idx(i + 1, j + 1)], d = field[idx(i, j + 1)];
      for (const tri of [[a, b, c], [a, c, d]]) {
        const hits = [];
        for (let k = 0; k < 3; k++) {
          const p = tri[k], q = tri[(k + 1) % 3];
          if ((p.a <= level && q.a > level) || (q.a <= level && p.a > level)) {
            const t = (level - p.a) / (q.a - p.a);
            hits.push(new THREE.Vector3(p.x + (q.x - p.x) * t, y, p.z + (q.z - p.z) * t));
          }
        }
        if (hits.length === 2) out.push(hits);
      }
    }
    return out;
  }
  function ribbon(segs, color, width) {
    const verts = [];
    for (const [a, b] of segs) {
      const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
      if (len < 1e-5) continue;
      const nx = (-dz / len) * width, nz = (dx / len) * width, y = a.y + 0.012;
      verts.push(a.x + nx, y, a.z + nz, a.x - nx, y, a.z - nz, b.x + nx, y, b.z + nz, a.x - nx, y, a.z - nz, b.x - nx, y, b.z - nz, b.x + nx, y, b.z + nz);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return new THREE.Mesh(g, flat(color, THREE.DoubleSide));
  }
  function cloud(x, z, s) {
    const grp = new THREE.Group();
    const mat = toon(P.crema, P.cielo, { threshold: -0.05 });
    [[0, 0, 0, 0.7], [0.65, -0.1, 0.1, 0.5], [-0.6, -0.12, -0.05, 0.48], [0.2, 0.25, -0.1, 0.45]].forEach(([px, py, pz, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat);
      m.position.set(px, py, pz); m.scale.y = 0.72; outline(m, P.cafe, 0.035); grp.add(m);
    });
    grp.position.set(x, H + 1.4, z); grp.scale.setScalar(s);
    return grp;
  }

  function build() {
    [land, lines, band, walls, pin, hover, clouds].forEach(empty);
    min = finite(o.minAlt, 1000); max = Math.max(min + 200, finite(o.maxAlt, 2800));
    farm = clamp(finite(o.farmAltitude, 1850), min + 50, max - 50);
    const seed = Math.trunc(finite(o.seed, 17)), accent = ink(o.accent, P.azul);
    // Normalise the noise field to the altitude range, then put the farm where the land matches its altitude.
    const raw = [];
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const x = (i / N - 0.5) * SIZE, z = (j / N - 0.5) * SIZE, h = relief(x, z, seed);
      raw.push({ x, z, h }); lo = Math.min(lo, h); hi = Math.max(hi, h);
    }
    field = raw.map((p) => ({ x: p.x, z: p.z, a: min + ((p.h - lo) / (hi - lo)) * (max - min) }));
    let best = null, bestScore = Infinity;
    for (const p of field) {
      const r = Math.hypot(p.x, p.z);
      if (r > 5.5) continue;
      const score = Math.abs(p.a - farm) + r * 12;
      if (score < bestScore) { bestScore = score; best = p; }
    }
    farmPos.set(best.x, yOf(farm), best.z);

    const tints = [P.luz, P.brote, P.moriche, P.cafe];
    const pos = [], col = [];
    const tmp = new THREE.Color();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = field[idx(i, j)], b = field[idx(i + 1, j)], c = field[idx(i + 1, j + 1)], d = field[idx(i, j + 1)];
      for (const tri of [[a, b, c], [a, c, d]]) {
        const avg = (tri[0].a + tri[1].a + tri[2].a) / 3;
        const f = (avg - min) / (max - min);
        tmp.set(tints[f < 0.24 ? 0 : f < 0.66 ? 1 : f < 0.88 ? 2 : 3]);
        for (const p of tri) { pos.push(p.x, yOf(p.a), p.z); col.push(tmp.r, tmp.g, tmp.b); }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    surface = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    land.add(surface);
    // The farm's altitude, traced all around the mountain in the coffee's colour.
    band.add(ribbon(segmentsAt(farm), accent, 0.085));
    band.visible = !!o.highlight;

    // Contours: hairlines every interval, a heavier index line every 500 m.
    const interval = Math.max((max - min) / 40, finite(o.contourInterval, 100));
    for (let level = Math.ceil(min / interval) * interval; level < max; level += interval) {
      const segs = segmentsAt(level);
      if (!segs.length) continue;
      const color = (level - min) / (max - min) >= 0.66 ? P.crema : P.cafe;
      if (level % 500 === 0) lines.add(ribbon(segs, color, 0.028));
      else {
        const g = new THREE.BufferGeometry().setFromPoints(segs.flat());
        lines.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color })));
      }
    }
    lines.add(ribbon(segmentsAt(farm), P.cafe, 0.035));

    // Block-diagram skirt: café earth with strata every 500 m.
    const wallPos = [];
    const strata = [];
    const edges = [
      Array.from({ length: N + 1 }, (_, i) => field[idx(i, 0)]),
      Array.from({ length: N + 1 }, (_, j) => field[idx(N, j)]),
      Array.from({ length: N + 1 }, (_, i) => field[idx(N - i, N)]),
      Array.from({ length: N + 1 }, (_, j) => field[idx(0, N - j)]),
    ];
    for (const e of edges) for (let i = 0; i < e.length - 1; i++) {
      const p = e[i], q = e[i + 1], yp = yOf(p.a), yq = yOf(q.a);
      wallPos.push(p.x, BASE, p.z, q.x, BASE, q.z, q.x, yq, q.z, p.x, BASE, p.z, q.x, yq, q.z, p.x, yp, p.z);
      for (let level = Math.ceil(min / 500) * 500; level < max; level += 500) {
        const ly = yOf(level);
        if (yp > ly && yq > ly) strata.push(new THREE.Vector3(p.x, ly, p.z), new THREE.Vector3(q.x, ly, q.z));
      }
      for (let s = 1; s <= 2; s++) {
        const ly = BASE * (s / 3);
        strata.push(new THREE.Vector3(p.x, ly, p.z), new THREE.Vector3(q.x, ly, q.z));
      }
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3));
    wg.computeVertexNormals();
    walls.add(new THREE.Mesh(wg, flat(P.cafe, THREE.DoubleSide)));
    walls.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(strata), new THREE.LineBasicMaterial({ color: P.atardecer })));
    const bottom = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), flat(P.cafe, THREE.DoubleSide));
    bottom.rotation.x = -Math.PI / 2; bottom.position.y = BASE; walls.add(bottom);

    // Farm pin: pole, flag in the coffee's colour, ground pulse and a label.
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 8), flat(P.cafe));
    pole.position.set(farmPos.x, farmPos.y + 1.05, farmPos.z); pin.add(pole);
    const flagShape = new THREE.Shape(); flagShape.moveTo(0, 0); flagShape.lineTo(1.05, -0.28); flagShape.lineTo(0, -0.56); flagShape.closePath();
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), flat(accent, THREE.DoubleSide));
    flag.position.set(farmPos.x + 0.04, farmPos.y + 2.1, farmPos.z); pin.add(flag);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), toon(accent, P.cafe));
    knob.position.set(farmPos.x, farmPos.y + 2.15, farmPos.z); outline(knob, P.cafe, 0.03); pin.add(knob);
    pulse = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 40), new THREE.MeshBasicMaterial({ color: accent, transparent: true, side: THREE.DoubleSide }));
    pulse.rotation.x = -Math.PI / 2; pulse.position.set(farmPos.x, farmPos.y + 0.05, farmPos.z); pin.add(pulse);
    const tag = textSprite(`${o.farmName}\n${Math.round(farm).toLocaleString('es-CO')} m s. n. m.`, { size: 28, height: 0.62, fg: P.cafe, family: '"Roboto Slab", Georgia, serif', weight: 600, anchorX: 0 });
    tag.position.set(farmPos.x + 0.25, farmPos.y + 2.55, farmPos.z); pin.add(tag);

    // Hover needle.
    const needle = line([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.3, 0)], P.cafe);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.18, 28), flat(P.cafe, THREE.DoubleSide));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), flat(P.crema));
    dot.position.y = 1.3; outline(dot, P.cafe, 0.03);
    hover.add(needle, ring, dot); hover.visible = false;

    clouds.add(cloud(-6, -4, 1), cloud(5, 3, 0.8), cloud(1, -7, 0.65));
    elapsed = 0;
  }

  // Compass rose: north is up the screen at the start of the flight.
  const north = new THREE.Group();
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 3), toon(P.naranja, P.cereza));
  arrow.rotation.x = -Math.PI / 2; outline(arrow, P.cafe, 0.03); north.add(arrow);
  const nLabel = textSprite('N', { size: 34, height: 0.42, box: false, fg: P.cafe, family: '"Roboto Slab", Georgia, serif', weight: 700 });
  nLabel.position.set(0, 0.25, -0.75); north.add(nLabel);
  north.position.set(-SIZE / 2 + 1.1, 0.4, -SIZE / 2 - 0.9);
  rt.scene.add(north);

  build();
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let lastSent = null, lastTime = 0;
  const drag = pointer(rt, {
    move: (dx, dy) => { userMoved = true; azimuth -= dx * 0.008; elevation = clamp(elevation + dy * 0.006, 0.28, 1.35); },
  });
  function send(v) {
    const now = performance.now();
    if (v === lastSent || (v !== null && now - lastTime < 90)) return;
    lastSent = v; lastTime = now;
    if (typeof o.onHover === 'function') o.onHover(v);
  }
  rt.on(rt.canvas, 'pointermove', (e) => {
    if (drag.dragging || !surface) return;
    rt.camera.updateMatrixWorld();
    ray.setFromCamera(ndc(rt, e, ptr), rt.camera);
    const hit = ray.intersectObject(surface, false)[0];
    if (hit) {
      const alt = Math.round(min + (hit.point.y / H) * (max - min));
      hover.visible = true; hover.position.copy(hit.point);
      send(Math.round(alt / 10) * 10);
    } else { hover.visible = false; send(null); }
    rt.requestRender();
  });
  rt.on(rt.canvas, 'pointerleave', () => { hover.visible = false; send(null); rt.requestRender(); });

  let t = 0;
  rt.start((dt) => {
    elapsed += dt; t += dt;
    const k = rt.reduced ? 1 : ease(clamp(elapsed / 2.6, 0, 1));
    if (!userMoved && !rt.reduced && k >= 1) azimuth += dt * 0.05;
    const radius = THREE.MathUtils.lerp(48, 34, k), elev = THREE.MathUtils.lerp(1.32, elevation, k);
    const target = new THREE.Vector3(farmPos.x * 0.35, farmPos.y * 0.4, farmPos.z * 0.35);
    const fit = Math.max(1, 1.1 / rt.camera.aspect);
    rt.camera.position.set(
      target.x + Math.sin(azimuth) * Math.cos(elev) * radius * fit,
      target.y + Math.sin(elev) * radius * fit,
      target.z + Math.cos(azimuth) * Math.cos(elev) * radius * fit,
    );
    rt.camera.lookAt(target);
    if (pulse) {
      const p = rt.reduced ? 0.5 : (t * 0.6) % 1;
      pulse.scale.setScalar(1 + p * 5); pulse.material.opacity = 1 - p;
    }
    clouds.children.forEach((c, i) => {
      if (!rt.reduced) c.position.x += dt * (0.25 + i * 0.08);
      if (c.position.x > SIZE * 0.7) c.position.x = -SIZE * 0.7;
    });
  });

  return {
    update(next = {}) {
      const prev = o;
      o = { ...o, ...next };
      if (changed(prev, o, ['seed', 'farmAltitude', 'minAlt', 'maxAlt', 'contourInterval', 'accent', 'farmName'])) build();
      band.visible = !!o.highlight;
      rt.requestRender();
    },
    destroy() { rt.destroy(); },
  };
}

/* ───────────────────────── El recorrido ───────────────────────── */

const LAT0 = 4.5, LNG0 = -73.5, KM = 0.02;
const project = (p, y = 0) => new THREE.Vector3((p.lng - LNG0) * 111.32 * Math.cos((LAT0 * Math.PI) / 180) * KM, y, -(p.lat - LAT0) * 111.32 * KM);
const LL = (pairs) => pairs.map(([lat, lng]) => ({ lat, lng }));
// Schematic Colombia, drawn for this illustration: not an official boundary.
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
const CORDILLERAS = [
  LL([[1.0, -77.7], [2.0, -77.1], [3.0, -76.75], [4.0, -76.45], [5.0, -76.15], [6.0, -76.0], [7.0, -76.15], [7.8, -75.9]]),
  LL([[1.3, -76.8], [2.2, -76.35], [2.93, -76.03], [3.8, -75.75], [4.5, -75.45], [4.89, -75.32], [5.7, -75.35], [6.6, -75.3], [7.6, -75.05]]),
  LL([[1.6, -76.1], [2.4, -75.6], [3.3, -74.85], [4.1, -74.25], [4.9, -73.75], [5.6, -73.2], [6.45, -72.3], [7.3, -72.6], [8.3, -73.0], [9.4, -73.1], [10.2, -72.95]]),
];
const SNOW = LL([[4.89, -75.32], [2.93, -76.03], [6.45, -72.3], [10.85, -73.7]]);
const RIVERS = [
  LL([[1.9, -76.4], [2.93, -75.3], [3.9, -74.95], [4.3, -74.8], [5.2, -74.73], [6.5, -74.4], [7.07, -73.85], [8.3, -73.9], [9.24, -74.4], [10.3, -74.85], [11.05, -74.85]]),
  LL([[2.4, -76.62], [3.5, -76.4], [4.8, -75.9], [6.0, -75.8], [7.5, -75.3], [8.6, -74.6], [9.1, -74.5]]),
  LL([[4.1, -73.45], [4.5, -72.9], [5.0, -71.8], [5.6, -70.6], [6.19, -67.5]]),
  LL([[2.6, -73.0], [2.8, -71.5], [3.5, -69.7], [4.0, -67.75]]),
];

function bean(scale = 1) {
  const g = new THREE.SphereGeometry(1, 28, 18);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let x = v.x * 0.62, y = v.y * 0.86, z = v.z * 0.46;
    if (z < 0) {
      z *= 0.45;
      const cx = 0.08 * Math.sin(v.y * Math.PI * 1.1);
      const d = x - cx;
      z += Math.exp(-(d * d) / (2 * 0.045 * 0.045)) * 0.17 * (1 - v.y * v.y);
    }
    p.setXYZ(i, x * scale, y * scale, z * scale);
  }
  g.computeVertexNormals();
  return g;
}

export function route(canvas, options = {}) {
  const rt = runtime(canvas, { fov: 30 });
  let o = { mode: 'journey', stage: 0, stops: [], farms: [], hub: null, city: null, highlight: [], speed: 0.6, ...options };
  const base = new THREE.Group(), overlay = new THREE.Group(), labels = new THREE.Group();
  rt.scene.add(base, overlay, labels);

  // Base map, built once.
  const shape = new THREE.Shape(COLOMBIA.map((p) => { const v = project(p); return new THREE.Vector2(v.x, -v.z); }));
  const plateGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false });
  const plate = new THREE.Mesh(plateGeo, [flat(P.brote), flat(P.cafe)]);
  plate.rotation.x = -Math.PI / 2; plate.position.y = -0.5; base.add(plate);
  const llanos = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(LLANOS.map((p) => { const v = project(p); return new THREE.Vector2(v.x, -v.z); }))), flat(P.luz));
  llanos.rotation.x = -Math.PI / 2; llanos.position.y = 0.006; base.add(llanos);
  base.add(line(COLOMBIA.map((p) => project(p, 0.012)), P.moriche, true));
  RIVERS.forEach((r) => {
    const curve = new THREE.CatmullRomCurve3(r.map((p) => project(p, 0.02)));
    base.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.05, 4, false), flat(P.azul)));
  });
  const coneGeo = new THREE.ConeGeometry(1, 1, 5);
  const coneMat = toon(P.moriche, P.cafe, { threshold: 0.0 });
  CORDILLERAS.forEach((c, ci) => {
    const curve = new THREE.CatmullRomCurve3(c.map((p) => project(p)));
    const count = Math.round(curve.getLength() / 0.55);
    for (let i = 0; i <= count; i++) {
      const pt = curve.getPointAt(i / count);
      const h = 0.45 + hash(i, ci, 7) * 0.55;
      for (const side of [-1, 1]) {
        if (hash(i, ci + side, 3) < 0.35) continue;
        const m = new THREE.Mesh(coneGeo, coneMat);
        m.scale.set(0.32 + hash(i, ci, 9) * 0.18, h * (0.75 + hash(i, side, 2) * 0.4), 0.32);
        m.position.set(pt.x + side * 0.22 + (hash(i, ci, 5) - 0.5) * 0.25, m.scale.y / 2, pt.z + (hash(ci, i, 4) - 0.5) * 0.25);
        m.rotation.y = hash(i, ci, 11) * Math.PI;
        base.add(m);
      }
    }
  });
  const snowGeo = new THREE.ConeGeometry(1, 1, 5);
  SNOW.forEach((s, i) => {
    const pt = project(s);
    const m = new THREE.Mesh(coneGeo, coneMat); m.scale.set(0.45, 1.25, 0.45); m.position.set(pt.x, 0.62, pt.z); base.add(m);
    const cap = new THREE.Mesh(snowGeo, toon(P.crema, P.cielo)); cap.scale.set(0.2, 0.42, 0.2); cap.position.set(pt.x, 1.04, pt.z); base.add(cap);
  });
  const region = (text, lat, lng, fg, size = 26) => {
    const s = textSprite(text, { box: false, fg, size, weight: 500, height: 0.6 });
    s.position.copy(project({ lat, lng }, 0.05)); s.center.set(0.5, 0.5); base.add(s);
  };
  region('MAR CARIBE', 12.3, -76.2, P.moriche);
  region('OCÉANO\nPACÍFICO', 4.5, -79.6, P.moriche);
  region('LLANOS ORIENTALES', 4.6, -70.6, P.cafe);
  region('AMAZONÍA', -0.6, -71.6, P.cafe);

  let stops = [], paths = [], tubes = [], current = 0, target = 0, lastArrival = -1;
  let traveller = null, travellerMat = null, pins = [], pulses = [];
  const focus = new THREE.Vector3(), mapCenter = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  let fitDistance = 40, wantDistance = 40, distance = 40, sway = 0;

  function arc(a, b, lift = 0.25) {
    const pa = project(a, 0.25), pb = project(b, 0.25);
    const mid = pa.clone().lerp(pb, 0.5);
    mid.y = 0.6 + pa.distanceTo(pb) * lift;
    return new THREE.QuadraticBezierCurve3(pa, mid, pb);
  }
  function marker(color, size = 1) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * size, 0.035 * size, 0.7 * size, 6), flat(P.cafe));
    stem.position.y = 0.35 * size; g.add(stem);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2 * size, 18, 12), toon(color, P.cafe, { highlight: P.crema }));
    head.position.y = 0.78 * size; outline(head, P.cafe, 0.035); g.add(head);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.16 * size, 20), flat(P.cafe, THREE.DoubleSide));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.025; g.add(disc);
    g.userData.head = head;
    return g;
  }
  function fitTo(points) {
    const box = new THREE.Box3().setFromPoints(points);
    box.getCenter(mapCenter);
    const size = box.getSize(new THREE.Vector3());
    return Math.max(12, Math.max(size.x * 1.25, size.z * 1.1) + 6);
  }

  function build() {
    empty(overlay); empty(labels);
    stops = []; paths = []; tubes = []; pins = []; pulses = []; traveller = null;
    if (o.mode === 'overview') {
      const farms = (o.farms || []).filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lng));
      const pts = [];
      const hub = o.hub;
      farms.forEach((f) => {
        const on = !o.highlight || !o.highlight.length || o.highlight.includes(f.id);
        const m = marker(ink(f.color, P.cereza), on ? 1.15 : 0.8);
        m.position.copy(project(f)); m.userData.id = f.id; overlay.add(m); pins.push(m);
        const tag = textSprite(`${f.name}\n${f.place}`, { size: 24, height: 0.5, anchorX: 1, anchorY: 0, fg: P.cafe });
        tag.position.copy(project(f, 1.15)).add(new THREE.Vector3(-0.28, 0, 0)); labels.add(tag);
        pts.push(project(f));
        if (hub) {
          const c = arc(f, hub, 0.18);
          overlay.add(new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.045, 5, false), flat(on ? P.naranja : P.atardecer)));
          for (let k = 0; k < 3; k++) {
            const b = new THREE.Mesh(bean(0.17), toon(P.cafe, P.moriche)); outline(b, P.crema, 0.02);
            overlay.add(b); pulses.push({ mesh: b, curve: c, offset: k / 3 + hash(pts.length, k, 1) * 0.1, speed: 0.16 });
          }
        }
      });
      if (hub) {
        const m = marker(P.naranja, 1.3); m.position.copy(project(hub)); overlay.add(m);
        const tag = textSprite(`${hub.name}`, { size: 24, height: 0.5, anchorX: 0, anchorY: 1, bg: P.naranja, fg: P.crema, border: P.cafe });
        tag.position.copy(project(hub, 0.2)).add(new THREE.Vector3(0.35, 0, 0.2)); labels.add(tag);
        pts.push(project(hub));
      }
      if (hub && o.city) {
        const c = arc(hub, o.city, 0.22);
        overlay.add(new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.05, 5, false), flat(P.azul)));
        for (let k = 0; k < 2; k++) {
          const b = new THREE.Mesh(bean(0.17), toon(P.cafe, P.moriche)); outline(b, P.crema, 0.02);
          overlay.add(b); pulses.push({ mesh: b, curve: c, offset: k / 2, speed: 0.22 });
        }
        const m = marker(P.azul, 1.1); m.position.copy(project(o.city)); overlay.add(m);
        const tag = textSprite(`Tu taza · ${o.city.name}`, { size: 24, height: 0.5, anchorX: 0, bg: P.azul, fg: P.crema, border: P.cafe });
        tag.position.copy(project(o.city, 1.3)).add(new THREE.Vector3(0.3, 0, 0)); labels.add(tag);
        pts.push(project(o.city));
      }
      fitDistance = Math.max(22, fitTo(pts.length ? pts : COLOMBIA.map((p) => project(p))));
      wantDistance = fitDistance;
      return;
    }
    stops = (Array.isArray(o.stops) && o.stops.length >= 2 ? o.stops : []).slice(0, 8);
    if (stops.length < 2) return;
    const colors = { finca: P.cereza, trilla: P.moriche, tostion: P.naranja, ciudad: P.azul };
    stops.forEach((s, i) => {
      const m = marker(ink(s.color, colors[s.kind] || P.cafe), 1); m.position.copy(project(s)); overlay.add(m);
      // Alternate label sides so neighbouring stops don't collide.
      const left = i % 2 === 1;
      const tag = textSprite(s.name, { size: 24, height: 0.55, anchorX: left ? 1 : 0, fg: s.kind === 'ciudad' ? P.crema : P.cafe, bg: s.kind === 'ciudad' ? P.azul : P.crema, border: P.cafe });
      tag.position.copy(project(s, 1.05)).add(new THREE.Vector3(left ? -0.26 : 0.26, 0, 0)); labels.add(tag);
      if (!i) return;
      const c = arc(stops[i - 1], s, 0.22);
      paths.push(c);
      const dashed = new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(60)), new THREE.LineDashedMaterial({ color: P.cafe, dashSize: 0.18, gapSize: 0.14 }));
      dashed.computeLineDistances(); overlay.add(dashed);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(c, 64, 0.07, 6, false), flat(P.naranja));
      tube.geometry.setDrawRange(0, 0); overlay.add(tube); tubes.push(tube);
    });
    travellerMat = toon(P.crema, P.luz);
    traveller = new THREE.Mesh(bean(0.36), travellerMat); outline(traveller, P.cafe, 0.035); overlay.add(traveller);
    fitDistance = fitTo(stops.map((s) => project(s)));
    current = clamp(finite(o.stage, 0), 0, stops.length - 1); target = current; lastArrival = -1;
  }
  function pointAt(v) {
    const i = Math.min(paths.length - 1, Math.max(0, Math.floor(v)));
    return paths[i].getPoint(clamp(v - i, 0, 1));
  }
  function announce(i) {
    if (i === lastArrival) return;
    lastArrival = i;
    if (typeof o.onStop === 'function') o.onStop({ index: i, stop: { ...stops[i] } });
  }

  build();
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let hovered = null;
  function pick(e) {
    if (!pins.length) return null;
    rt.camera.updateMatrixWorld();
    ray.setFromCamera(ndc(rt, e, ptr), rt.camera);
    const heads = pins.map((p) => p.userData.head);
    const hit = ray.intersectObjects(heads, false)[0];
    if (hit) return pins.find((p) => p.userData.head === hit.object);
    // Generous touch target: nearest pin within ~36px.
    let best = null, bestD = 36;
    const box = rt.canvas.getBoundingClientRect();
    pins.forEach((p) => {
      const v = p.userData.head.getWorldPosition(new THREE.Vector3()).project(rt.camera);
      const d = Math.hypot(((v.x + 1) / 2) * box.width - (e.clientX - box.left), ((1 - v.y) / 2) * box.height - (e.clientY - box.top));
      if (d < bestD) { bestD = d; best = p; }
    });
    return best;
  }
  pointer(rt, {
    click: (e) => {
      const p = pick(e);
      if (p && typeof o.onPick === 'function') o.onPick(p.userData.id);
    },
  });
  rt.on(rt.canvas, 'pointermove', (e) => {
    const p = pick(e);
    const id = p ? p.userData.id : null;
    rt.canvas.style.cursor = id ? 'pointer' : '';
    if (id !== hovered) { hovered = id; if (typeof o.onHover === 'function') o.onHover(id); }
  });

  let time = 0;
  rt.start((dt) => {
    time += dt;
    sway += dt;
    if (o.mode === 'overview') {
      pulses.forEach((p) => {
        const u = rt.reduced ? p.offset % 1 : (time * p.speed + p.offset) % 1;
        p.mesh.position.copy(p.curve.getPoint(u)); p.mesh.position.y += 0.05;
        p.mesh.rotation.set(0.6, time * 2 + p.offset * 6, 0.3);
      });
      pins.forEach((m) => {
        const s = m.userData.id === hovered ? 1.25 : 1;
        m.scale.lerp(new THREE.Vector3(s, s, s), rt.reduced ? 1 : 1 - Math.exp(-10 * dt));
      });
      focus.copy(mapCenter);
      distance = fitDistance;
    } else if (paths.length) {
      const prev = current;
      if (rt.reduced) current = target;
      else {
        const step = clamp(finite(o.speed, 0.6), 0.05, 4) * dt;
        current += Math.sign(target - current) * Math.min(Math.abs(target - current), step);
      }
      if (lastArrival < 0) announce(Math.round(current));
      if (current > prev) for (let i = Math.floor(prev) + 1; i <= Math.floor(current + 1e-6); i++) announce(i);
      else if (current < prev) for (let i = Math.ceil(prev) - 1; i >= Math.ceil(current - 1e-6); i--) announce(i);
      tubes.forEach((tube, i) => {
        const f = clamp(current - i, 0, 1);
        tube.geometry.setDrawRange(0, Math.floor(tube.geometry.index.count * f / 36) * 36);
      });
      const p = current >= paths.length ? paths[paths.length - 1].getPoint(1) : pointAt(current);
      traveller.position.copy(p); traveller.position.y += 0.12 + (rt.reduced ? 0 : Math.sin(time * 5) * 0.04);
      traveller.rotation.set(0.5, time * 1.6, 0.25);
      // The bean changes as it travels: parchment to the mill, green to the roaster, roasted after.
      if (current < 1) setToon(travellerMat, P.crema, P.luz);
      else if (current < 2) setToon(travellerMat, P.brote, P.moriche);
      else setToon(travellerMat, P.cafe, P.moriche);
      const seg = Math.min(paths.length - 1, Math.floor(current));
      const a = project(stops[seg]), b = project(stops[Math.min(stops.length - 1, seg + 1)]);
      const segSize = a.distanceTo(b);
      wantDistance = clamp(segSize * 1.5 + 9, 11, fitDistance);
      const desired = mapCenter.clone().lerp(p, 0.65);
      if (rt.reduced || dt === 0) { focus.copy(desired); distance = wantDistance; }
      else { focus.lerp(desired, 1 - Math.exp(-2.5 * dt)); distance += (wantDistance - distance) * (1 - Math.exp(-1.8 * dt)); }
    } else {
      focus.copy(mapCenter); distance = fitDistance;
    }
    const fit = distance * Math.max(1, 1.25 / rt.camera.aspect);
    const az = rt.reduced ? 0.12 : 0.12 + Math.sin(sway * 0.15) * 0.08;
    lookTarget.copy(focus);
    rt.camera.position.set(focus.x + Math.sin(az) * fit * 0.55, focus.y + fit * 0.95, focus.z + Math.cos(az) * fit * 0.55);
    rt.camera.lookAt(lookTarget);
  });

  return {
    update(next = {}) {
      const prev = o;
      o = { ...o, ...next };
      if (changed(prev, o, ['mode', 'stops', 'farms', 'hub', 'city', 'highlight'])) build();
      if (o.mode !== 'overview' && stops.length) target = clamp(finite(o.stage, 0), 0, stops.length - 1);
      rt.requestRender();
    },
    destroy() { rt.destroy(); },
  };
}

/* ───────────────────────── De cereza a taza ───────────────────────── */

const ROAST = [
  [P.atardecer, P.naranja, P.cafe],
  [P.naranja, P.cafe, P.cafe],
  [P.cafe, P.cereza, P.moriche],
  [P.cafe, P.moriche, P.moriche],
  [P.moriche, P.cafe, P.moriche],
];

export function beanMorph(canvas, options = {}) {
  const rt = runtime(canvas, { fov: 32 });
  let o = { stage: 0, roast: 3, dried: false, honey: false, ...options };
  let progress = clamp(finite(o.stage, 0), 0, 3), turn = 0.4, tilt = 0.18, userMoved = false, time = 0, popped = 0;
  const model = new THREE.Group(); rt.scene.add(model);

  const beanGeo = bean(1);
  const beanMat = toon(P.brote, P.moriche, { highlight: P.crema, hiThreshold: 0.985 });
  const beans = [];
  [-1, 1].forEach((side) => {
    // Flat faces meet in the middle, as the two seeds sit inside the cherry.
    const b = new THREE.Mesh(beanGeo, beanMat);
    b.position.x = side * 0.2; b.rotation.y = side * -Math.PI / 2; b.userData.side = side;
    b.scale.setScalar(0.62);
    outline(b, P.cafe, 0.05);
    model.add(b); beans.push(b);
  });
  const crease = [];
  beans.forEach((b) => {
    const pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24, y = -0.78 + t * 1.56; pts.push(new THREE.Vector3(0.08 * Math.sin(y * Math.PI * 1.1 / 0.86), y, -0.06)); }
    const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 5, false), flat(P.cafe));
    b.add(c); crease.push(c);
  });

  // Parchment and cherry are split shells that open sideways.
  function shell(rx, ry, rz, light, shadow, inner, hi) {
    const halves = [];
    const mat = toon(light, shadow, { side: THREE.DoubleSide, inner, highlight: hi });
    [-1, 1].forEach((side) => {
      const g = new THREE.SphereGeometry(1, 32, 20, side < 0 ? Math.PI : 0, Math.PI);
      const m = new THREE.Mesh(g, mat); m.scale.set(rx, ry, rz);
      model.add(m); halves.push({ mesh: m, side });
    });
    // Closed silhouette drawn only as an ink hull while the shell is shut.
    const whole = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    whole.scale.set(rx, ry, rz); whole.visible = false;
    outline(whole, P.cafe, 0.035);
    model.add(whole);
    return { halves, mat, whole };
  }
  const parchment = shell(0.8, 0.9, 0.58, P.crema, P.luz, P.luz);
  const cherry = shell(1.02, 1.08, 0.98, P.cereza, P.cafe, P.luz, P.rosa);
  const stem = new THREE.Group();
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.45, 6), flat(P.moriche));
  stalk.position.y = 1.25; stalk.rotation.z = 0.25; stem.add(stalk);
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.35, 0.28, 0.9, 0); leafShape.quadraticCurveTo(0.35, -0.28, 0, 0);
  [[0.05, 1.42, 0.4], [-0.05, 1.36, Math.PI - 0.5]].forEach(([x, y, r]) => {
    const leaf = new THREE.Mesh(new THREE.ShapeGeometry(leafShape), toon(P.brote, P.moriche, { side: THREE.DoubleSide, inner: P.moriche }));
    leaf.position.set(x, y, 0); leaf.rotation.set(0.5, 0, r); stem.add(leaf);
    leaf.add(line([new THREE.Vector3(0.02, 0, 0.001), new THREE.Vector3(0.85, 0, 0.001)], P.moriche));
  });
  model.add(stem);

  // Little roast flecks fly off at first crack.
  const chaff = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.05, 5), flat(P.luz, THREE.DoubleSide));
    m.visible = false; model.add(m);
    chaff.push({ mesh: m, dir: new THREE.Vector3(hash(i, 1, 2) - 0.5, hash(i, 2, 3) * 0.8 + 0.2, hash(i, 3, 4) - 0.5).normalize() });
  }

  pointer(rt, { move: (dx, dy) => { userMoved = true; turn += dx * 0.01; tilt = clamp(tilt + dy * 0.008, -1.1, 1.1); } });

  function paint() {
    const dried = !!o.dried, honey = !!o.honey;
    if (dried) setToon(cherry.mat, P.cafe, P.moriche, P.atardecer);
    else setToon(cherry.mat, P.cereza, P.cafe, P.rosa);
    cherry.mat.uniforms.uInner.value.set(dried ? P.atardecer : P.luz);
    if (honey) setToon(parchment.mat, P.sol, P.atardecer);
    else setToon(parchment.mat, P.crema, P.luz);
  }
  paint();

  rt.start((dt) => {
    time += dt;
    const target = clamp(finite(o.stage, 0), 0, 3);
    const before = progress;
    if (rt.reduced) progress = target;
    else progress += Math.sign(target - progress) * Math.min(Math.abs(target - progress), dt * 1.3);
    if (before < 2.6 && progress >= 2.6) popped = 1;
    const peel = ease(clamp(progress, 0, 1)), husk = ease(clamp(progress - 1, 0, 1)), toast = clamp(progress - 2, 0, 1);
    cherry.halves.forEach(({ mesh, side }) => {
      const s = 1 - 0.55 * peel;
      mesh.position.set(side * peel * 1.9, -peel * 0.5, -peel * 0.3);
      mesh.rotation.set(0, side * peel * 0.9, side * peel * -0.5);
      mesh.scale.set(1.02 * s, 1.08 * s, 0.98 * s);
      mesh.visible = peel < 0.98;
    });
    cherry.whole.visible = peel < 0.01;
    stem.visible = peel < 0.25; stem.position.y = -peel * 0.6;
    parchment.halves.forEach(({ mesh, side }) => {
      const s = 1 - 0.6 * husk;
      mesh.position.set(side * husk * 1.6, -husk * 0.35, 0);
      mesh.rotation.set(0, side * husk * 0.8, side * husk * -0.6);
      mesh.scale.set(0.8 * s, 0.9 * s, 0.58 * s);
      mesh.visible = husk < 0.98 && peel > 0.02;
    });
    parchment.whole.visible = peel >= 0.98 && husk < 0.01;
    const roast = clamp(Math.round(finite(o.roast, 3)), 1, 5);
    if (progress < 2) setToon(beanMat, P.brote, P.moriche, P.crema);
    else if (toast < 0.5) setToon(beanMat, P.brote, P.moriche, P.crema);
    else setToon(beanMat, ROAST[roast - 1][0], ROAST[roast - 1][1], P.atardecer);
    // Roasted beans keep a pale line of silverskin in the crease.
    crease.forEach((c) => { c.material.color.set(progress >= 2.5 ? P.luz : P.moriche); });
    const visibleBeans = peel > 0.3;
    beans.forEach((b) => {
      const side = b.userData.side;
      b.visible = visibleBeans;
      const puff = 1 + (progress >= 2.5 ? 0.08 * (roast / 5) : 0);
      b.scale.setScalar(0.62 * puff);
      b.position.x = side * (0.2 + husk * 0.38);
      b.rotation.y = side * -(Math.PI / 2 - husk * 0.75);
    });
    if (popped > 0 && !rt.reduced) {
      popped = Math.max(0, popped - dt * 0.9);
      chaff.forEach((c) => { c.mesh.visible = popped > 0; c.mesh.position.copy(c.dir).multiplyScalar((1 - popped) * 2.2); c.mesh.rotation.z += dt * 6; });
    } else chaff.forEach((c) => { c.mesh.visible = false; });
    if (!userMoved && !rt.reduced) turn += dt * 0.35;
    model.rotation.set(tilt, turn, 0);
    model.position.y = rt.reduced ? 0 : Math.sin(time * 1.4) * 0.05;
    const fit = Math.max(1, 1.0 / rt.camera.aspect);
    rt.camera.position.set(0, 0.35, 6.4 * fit); rt.camera.lookAt(0, 0.1, 0);
  });

  return {
    update(next = {}) { o = { ...o, ...next }; paint(); rt.requestRender(); },
    destroy() { rt.destroy(); },
  };
}

/* ───────────────────────── Tu taza ───────────────────────── */

export function cup(canvas, options = {}) {
  const rt = runtime(canvas, { fov: 30 });
  let o = { roast: 3, milk: false, ...options };
  let time = 0, turn = 0.5, userMoved = false;
  const g = new THREE.Group(); rt.scene.add(g);
  const profile = [[0, 0], [0.55, 0], [0.62, 0.04], [0.78, 0.35], [0.92, 0.85], [0.96, 1.05], [0.9, 1.05], [0.86, 0.88], [0.72, 0.4], [0.5, 0.12], [0, 0.12]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), toon(P.crema, P.luz, { side: THREE.DoubleSide, inner: P.crema }));
  outline(body, P.cafe, 0.03); g.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.885, 0.84, 0.16, 48, 1, true), toon(P.cereza, P.cafe, { side: THREE.DoubleSide }));
  band.position.y = 0.66; g.add(band);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 10, 28, Math.PI * 1.3), toon(P.crema, P.luz));
  handle.position.set(0.98, 0.62, 0); handle.rotation.z = -Math.PI * 0.62; outline(handle, P.cafe, 0.025); g.add(handle);
  const saucerProfile = [[0, 0], [1.45, 0], [1.55, 0.1], [1.5, 0.13], [0.7, 0.06], [0, 0.06]].map(([x, y]) => new THREE.Vector2(x, y));
  const saucer = new THREE.Mesh(new THREE.LatheGeometry(saucerProfile, 56), toon(P.crema, P.cielo, { side: THREE.DoubleSide, inner: P.crema }));
  saucer.position.y = -0.06; outline(saucer, P.cafe, 0.025); g.add(saucer);
  const liquid = new THREE.Mesh(new THREE.CircleGeometry(0.87, 48), flat(P.cafe));
  liquid.rotation.x = -Math.PI / 2; liquid.position.y = 0.92; g.add(liquid);
  const crema = new THREE.Mesh(new THREE.RingGeometry(0.0, 0.35, 32), flat(P.atardecer));
  crema.rotation.x = -Math.PI / 2; crema.position.y = 0.925; g.add(crema);
  const steam = [];
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(new THREE.Vector3(Math.sin(t * Math.PI * 2.2 + k * 1.7) * 0.12, t * 1.3, 0)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.028, 5, false), new THREE.MeshBasicMaterial({ color: P.atardecer, transparent: true }));
    m.position.set((k - 1) * 0.32, 1.05, (k % 2) * 0.12);
    g.add(m); steam.push(m);
  }
  pointer(rt, { move: (dx) => { userMoved = true; turn += dx * 0.01; } });
  function paint() {
    const r = clamp(Math.round(finite(o.roast, 3)), 1, 5);
    const brew = [P.atardecer, P.naranja, P.cafe, P.cafe, P.moriche][r - 1];
    liquid.material.color.set(o.milk ? P.atardecer : brew);
    crema.material.color.set(o.milk ? P.crema : r >= 3 ? P.atardecer : P.luz);
  }
  paint();
  rt.start((dt) => {
    time += dt;
    if (!userMoved && !rt.reduced) turn += dt * 0.25;
    g.rotation.y = turn;
    steam.forEach((s, i) => {
      const u = rt.reduced ? 0.4 : (time * 0.35 + i / 3) % 1;
      s.position.y = 1.0 + u * 0.5; s.material.opacity = Math.sin(u * Math.PI);
      s.scale.y = 0.7 + u * 0.4;
      s.rotation.y = -turn;
    });
    const fit = Math.max(1, 1.0 / rt.camera.aspect);
    rt.camera.position.set(0, 3.4 * fit, 5.2 * fit); rt.camera.lookAt(0, 0.45, 0);
  });
  return {
    update(next = {}) { o = { ...o, ...next }; paint(); rt.requestRender(); },
    destroy() { rt.destroy(); },
  };
}

const api = { terrain, route, bean: beanMorph, cup, version: '1.0.0' };
if (typeof window !== 'undefined') window.GuatesScenes = api;
export default api;
