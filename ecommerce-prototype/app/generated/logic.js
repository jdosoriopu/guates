// Generated from Main.dc.html. Do not edit; extend in src/Store.jsx.
import React from "react";

var C = { cafe: '#624532', crema: '#F6F3ED', cereza: '#81164B', moriche: '#364831', brote: '#91AD80', azul: '#4E71F0', cielo: '#9DB5EC', sol: '#F2D139', luz: '#F5E380', naranja: '#CD591C', atardecer: '#D6855A', rosa: '#DB92BA', muted: '#7A6555' };

var PRODUCTS = [
  { key: 'regional', name: 'Regional', idea: 'El café de la casa', scene: 'Una mañana sin afán, la greca en la estufa y alguien que pregunta si queda más.', sceneShort: 'Mañana sin afán, con leche', personality: 'Como el chigüiro: tranquilo y de confianza', emotion: 'Se siente como llegar a casa', traits: ['Tranquilo', 'Generoso', 'De confianza'], milk: true, code: 'REG', producer: 'Tatiana Rincón', place: 'Cubarral, Meta', farm: 'Llanogrande', farmId: 'llanogrande', variety: 'Blend', process: 'Lavado',
    bag: C.crema, label: C.cafe, artToken: 'cafe-de-origen', art: 'mono', bagArt: 'chiguiro', accent: C.naranja,
    alt: 1350, lat: 3.86, lng: -73.98, minAlt: 500, maxAlt: 2300, seed: 11, harvest: 'Mayo de 2026',
    notes: ['Panela', 'Cacao', 'Naranja dulce'], feel: 'Redondo y dulce, para todos los días. Con leche se vuelve postre.',
    trilla: 'Granada, Meta', trillaLat: 3.546, trillaLng: -73.706, trillaKm: 48, roastKm: 87, ferment: '24 h', dry: 9, total: 11, price: 36000 },
  { key: 'lavado', name: 'Lavado', idea: 'Claridad en la taza', scene: 'La primera taza del día, negro, junto a la ventana mientras la ciudad arranca.', sceneShort: 'Primera taza, negro', personality: 'Como la nutria: juguetona y precisa', emotion: 'Despierta sin empujar', traits: ['Claro', 'Brillante', 'Curioso'], milk: false, code: 'LAV', producer: 'Benedicto Puentes', place: 'China Alta, Tolima', farm: 'Palma Roja', farmId: 'palma', variety: 'Castillo', process: 'Lavado',
    bag: C.cielo, label: C.azul, artToken: 'azul-exploracion', art: 'pajaro', bagArt: 'nutria', accent: C.azul,
    alt: 1850, lat: 4.58, lng: -75.16, minAlt: 1000, maxAlt: 2800, seed: 23, harvest: 'Junio de 2026',
    notes: ['Mandarina', 'Caramelo', 'Flor blanca'], feel: 'Limpio y brillante, con algo de mandarina al final. Se luce si lo tomas negro.',
    trilla: 'Ibagué, Tolima', trillaLat: 4.4389, trillaLng: -75.2322, trillaKm: 38, roastKm: 315, ferment: '36 h', dry: 9.5, total: 12, price: 42000 },
  { key: 'natural', name: 'Natural', idea: 'Fruta que se toma despacio', scene: 'Una tarde con tiempo, un filtrado y alguien con quien comparar qué fruta encuentra cada uno.', sceneShort: 'Tarde larga, filtrado', personality: 'Como el colibrí: inquieto, de flor en flor', emotion: 'Sorpresa en cada sorbo', traits: ['Frutal', 'Vivo', 'Explorador'], milk: false, code: 'NAT', producer: 'Benedicto Puentes', place: 'China Alta, Tolima', farm: 'Palma Roja', farmId: 'palma', variety: 'Bourbon Rosado', process: 'Natural',
    bag: C.brote, label: C.moriche, artToken: 'verde-moriche', art: 'erizo', bagArt: 'colibri', accent: C.sol,
    alt: 1850, lat: 4.58, lng: -75.16, minAlt: 1000, maxAlt: 2800, seed: 23, harvest: 'Junio de 2026',
    notes: ['Fresa', 'Guayaba', 'Chocolate'], feel: 'Frutal y jugoso, como mermelada de fresa con chocolate. Para descubrir sin afán.',
    trilla: 'Ibagué, Tolima', trillaLat: 4.4389, trillaLng: -75.2322, trillaKm: 38, roastKm: 315, ferment: '3 días', dry: 22, total: 23, price: 48000 },
  { key: 'honey', name: 'Honey', idea: 'Dulzura sin prisa', scene: 'Media tarde, una prensa francesa y nada urgente en la agenda.', sceneShort: 'Media tarde, prensa', personality: 'Como el perezoso: sin afán, abrazado al grano', emotion: 'Como un abrazo tibio', traits: ['Dulce', 'Suave', 'Paciente'], milk: false, code: 'HON', producer: 'Juan Rengifo', place: 'Pitalito, Huila', farm: 'Rengijo', farmId: 'rengijo', variety: 'Papayo', process: 'Honey',
    bag: C.luz, label: C.sol, artToken: 'cafe-de-origen', art: 'perezoso', bagArt: 'perezoso', accent: C.naranja,
    alt: 1780, lat: 1.86, lng: -76.07, minAlt: 1000, maxAlt: 2700, seed: 41, harvest: 'Mayo de 2026',
    notes: ['Miel de caña', 'Durazno', 'Flor de azahar'], feel: 'Dulce y suave, con cuerpo de miel de caña. Que diga honey no significa que tenga miel.',
    trilla: 'Neiva, Huila', trillaLat: 2.9386, trillaLng: -75.2673, trillaKm: 191, roastKm: 425, ferment: '24 h', dry: 15, total: 17, price: 50000 },
  { key: 'platea', name: 'Platea', idea: 'Una taza para mirar de cerca', scene: 'Después de cenar, en la mejor taza de la casa, para una conversación larga.', sceneShort: 'Sobremesa larga', personality: 'Como la garza: elegante y paciente', emotion: 'Calma con carácter', traits: ['Intenso', 'Profundo', 'Elegante'], milk: false, code: 'PLA', producer: 'Benedicto Puentes', place: 'China Alta, Tolima', farm: 'Palma Roja', farmId: 'palma', variety: 'Moka', process: 'Natural',
    bag: C.rosa, label: C.cereza, artToken: 'cereza-profunda', art: 'garza', bagArt: 'garza', accent: C.cereza,
    alt: 1850, lat: 4.58, lng: -75.16, minAlt: 1000, maxAlt: 2800, seed: 23, harvest: 'Junio de 2026',
    notes: ['Ciruela', 'Cacao', 'Uva morada'], feel: 'Intenso y profundo, de fruta oscura y cacao. Para una taza que se toma despacio.',
    trilla: 'Ibagué, Tolima', trillaLat: 4.4389, trillaLng: -75.2322, trillaKm: 38, roastKm: 315, ferment: '4 días', dry: 24, total: 25, price: 56000 },
];
var PERSONA = {
  regional: { title: 'El anfitrión', animal: 'Chigüiro', line: 'Como el chigüiro, se lleva bien con todo el mundo. Redondo, dulce y sin complicaciones: el que siempre está en la mesa.' },
  lavado: { title: 'El explorador', animal: 'Nutria', line: 'Como la nutria, limpio, ágil y curioso. Brillante en la taza, con un final de mandarina que te invita a otro sorbo.' },
  natural: { title: 'El inquieto', animal: 'Colibrí', line: 'Como el colibrí, va de fruta en fruta. Jugoso y vivo, para cuando quieres que el café te sorprenda.' },
  honey: { title: 'El tranquilo', animal: 'Perezoso', line: 'Como el perezoso, no tiene afán. Suave, dulce y con cuerpo de miel de caña, para tomarlo con calma.' },
  platea: { title: 'El elegante', animal: 'Garza', line: 'Como la garza, quieto y profundo. Fruta oscura y cacao para una taza que se toma despacio.' },
};
var BY = {};
PRODUCTS.forEach((p) => { BY[p.key] = p; });

var CITIES = [
  { key: 'bogota', name: 'Bogotá', lat: 4.711, lng: -74.0721, alt: 2640, ship: 9000, days: '2 a 3 días' },
  { key: 'medellin', name: 'Medellín', lat: 6.2442, lng: -75.5812, alt: 1495, ship: 12000, days: '2 a 4 días' },
  { key: 'cali', name: 'Cali', lat: 3.4516, lng: -76.532, alt: 1018, ship: 12000, days: '2 a 4 días' },
  { key: 'barranquilla', name: 'Barranquilla', lat: 10.9639, lng: -74.7964, alt: 18, ship: 15000, days: '3 a 5 días' },
  { key: 'bucaramanga', name: 'Bucaramanga', lat: 7.1193, lng: -73.1227, alt: 959, ship: 12000, days: '2 a 4 días' },
  { key: 'villavicencio', name: 'Villavicencio', lat: 4.142, lng: -73.627, alt: 467, ship: 6000, days: '1 día' },
];
var ROASTERY = { name: 'Tostión · Villavicencio', lat: 4.142, lng: -73.627 };
var FARMS = [
  { id: 'palma', name: 'Palma Roja', place: 'China Alta, Tolima', lat: 4.58, lng: -75.16, color: C.cereza, products: ['lavado', 'natural', 'platea'] },
  { id: 'llanogrande', name: 'Llanogrande', place: 'Cubarral, Meta', lat: 3.86, lng: -73.98, color: C.cafe, products: ['regional'] },
  { id: 'rengijo', name: 'Rengijo', place: 'Pitalito, Huila', lat: 1.86, lng: -76.07, color: C.sol, products: ['honey'] },
];
var SIZES = [{ label: '250 g', mult: 1 }, { label: '500 g', mult: 1.85 }, { label: '1 kg', mult: 3.4 }];
var GRINDS = [
  { key: 'grano', label: 'En grano', hint: 'Para moler en casa' },
  { key: 'fina', label: 'Fina', hint: 'Greca y espresso' },
  { key: 'media', label: 'Media', hint: 'Filtrado' },
  { key: 'gruesa', label: 'Gruesa', hint: 'Prensa francesa' },
];
var STAGE_MAP = [0, 0.5, 1, 1, 2, 3, 3, 3, 3];
var TONES = [['sol-de-sabana', 'cafe-de-origen', -3], ['cereza-profunda', 'crema-de-papel', 2], ['verde-moriche', 'crema-de-papel', -1]];
var CURIOUS = {
  regional: 'Es el café que nace más cerca de la tostión: Cubarral está en el piedemonte llanero, en el mismo Meta.',
  lavado: 'Castillo es una variedad colombiana, desarrollada para resistir la roya, una enfermedad de la hoja del café.',
  natural: 'Bourbon Rosado es una variedad poco común: sus cerezas maduran rosadas en vez de rojas.',
  honey: 'Se llama honey por el mucílago pegajoso que se seca con el grano, no porque tenga miel.',
  platea: 'Moka es una variedad de grano pequeño y redondo, que suele dar tazas intensas.',
};
var MOODS = [
  { key: 'despertar', label: 'Quiero despertar', product: 'lavado', why: 'Limpio y brillante, con mandarina al final. Una taza que te abre los ojos sin pelear contigo.' },
  { key: 'abrazo', label: 'Necesito un abrazo', product: 'regional', why: 'Redondo y dulce, con panela y cacao. Sabe a casa, solo o con leche.' },
  { key: 'sorpresa', label: 'Quiero sorprenderme', product: 'natural', why: 'Fresa, guayaba y chocolate. Para cuando quieres que el café te cuente algo nuevo.' },
  { key: 'calma', label: 'Voy sin afán', product: 'honey', why: 'Suave, con cuerpo de miel de caña y algo de durazno. Para una tarde lenta.' },
  { key: 'pensar', label: 'Para pensar despacio', product: 'platea', why: 'Intenso, de fruta oscura y cacao. Una taza para sentarse con ella.' },
];
var TASTES = [
  { key: 'leche', label: 'Con leche', product: 'regional', why: 'Redondo y dulce, con notas de panela y cacao: con leche se vuelve postre.' },
  { key: 'greca', label: 'Negro, en greca', product: 'platea', why: 'Intenso, de fruta oscura y cacao. Aguanta bien la greca y no se pierde.' },
  { key: 'filtrado', label: 'Filtrado, sin afán', product: 'lavado', why: 'Limpio y brillante: en un filtro se notan la mandarina y el caramelo.' },
  { key: 'frutal', label: 'Quiero algo frutal', product: 'natural', why: 'Se seca con la fruta puesta y se nota: fresa, guayaba y chocolate.' },
  { key: 'suave', label: 'Suave y dulce', product: 'honey', why: 'Cuerpo de miel de caña y algo de durazno. Que diga honey no significa que tenga miel.' },
];
var METHODS = {
  filtrado: { label: 'Filtrado', title: 'Filtrado (V60 o Chemex)', coffee: 15, water: 250, grind: 'Media', time: '2:30 a 3:00 min', hot: true,
    steps: ['Enjuaga el filtro con agua caliente y bota esa agua.', 'Agrega el café y un chorrito de agua; espera 30 segundos a que suelte el gas.', 'Vierte el resto en círculos lentos hasta completar el agua.'] },
  prensa: { label: 'Prensa francesa', title: 'Prensa francesa', coffee: 16, water: 250, grind: 'Gruesa', time: '4 min', hot: true,
    steps: ['Agrega el café y toda el agua.', 'Revuelve suave y tapa sin bajar el émbolo.', 'A los 4 minutos baja el émbolo despacio y sirve de una vez.'] },
  greca: { label: 'Greca', title: 'Greca', coffee: 15, water: 150, grind: 'Fina', time: '4 a 5 min al fuego', hot: false,
    steps: ['Llena la base con agua hasta la válvula.', 'Pon el café en el filtro sin compactarlo.', 'A fuego medio; retírala apenas empiece a borbotear.'] },
};

var dots = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
var money = (n) => '$' + dots(n);
var priceOf = (key, size) => Math.round((BY[key].price * SIZES[size].mult) / 1000) * 1000;
var boil = (alt) => Math.round(100 - alt / 300);
function haversine(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function dms(v, pos, neg) {
  const a = Math.abs(v);
  let d = Math.floor(a), m = Math.floor((a - d) * 60), s = Math.round(((a - d) * 60 - m) * 60);
  if (s === 60) { s = 0; m += 1; }
  if (m === 60) { m = 0; d += 1; }
  return d + '°' + String(m).padStart(2, '0') + '′' + String(s).padStart(2, '0') + '″ ' + (v >= 0 ? pos : neg);
}
var coords = (p) => dms(p.lat, 'N', 'S') + ' · ' + dms(p.lng, 'E', 'O');
var pill = (on, dark) => (dark
  ? { bg: on ? C.luz : 'transparent', fg: on ? C.cafe : C.crema }
  : { bg: on ? C.cafe : 'transparent', fg: on ? C.crema : C.cafe });

export class CanvasLogic extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      screen: props.startScreen || 'home', product: props.startProduct || 'lavado', size: 0, grind: 'grano', qty: 1,
      cart: [], city: 'bogota', stage: 0, playing: false, roast: 3, hoverAlt: null, highlight: true,
      filter: 'todos', sort: 'altura', taste: null, moodMode: 'animo', moodAnimo: 'despertar', moodCostumbre: 'leche', walkProg: 0, carPlaying: true, carHold: false, mapFarm: null, slide: 0, trail: 0, trailOn: false, method: 'filtrado', cups: 1,
      sub: { mode: 'fijo', product: 'lavado', freq: 2, size: 0, grind: 'media' },
      form: { name: '', email: '', phone: '', address: '', detail: '' }, delivery: 'envio', pay: 'pse', tried: false,
      order: null, orderStage: 0, stamps: {}, toast: null,
    };
    this._sc = {};
    this._refs = {};
    this.pickFarm = (id) => this.setState({ mapFarm: id });
    this.onAlt = (v) => { if (v !== this.state.hoverAlt) this.setState({ hoverAlt: v }); };
    this.setTop = (el) => { this._top = el; };
    this.setJourney = (el) => { this._journey = el; };
    this._carEl = 0;
    this.setCar = (el) => {
      clearInterval(this._carT); this._carT = null;
      if (!el) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { if (this.state.carPlaying) setTimeout(() => this.setState({ carPlaying: false }), 0); return; }
      this._carT = setInterval(() => {
        const st = this.state;
        if (!st.carPlaying || st.carHold || document.hidden) return;
        this._carEl += 200;
        if (this._carEl >= 5500) { this._carEl = 0; this.setState({ slide: (st.slide + 1) % PRODUCTS.length }); }
      }, 200);
    };
    this.setWalk = (el) => {
      if (this._walkOff) { this._walkOff(); this._walkOff = null; }
      if (!el) return;
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let raf = 0;
      const measure = () => {
        raf = 0;
        const r = el.getBoundingClientRect(), vh = window.innerHeight || 800;
        let p = reduce ? 1 : (vh * 0.6 - r.top) / Math.max(1, r.height);
        p = Math.max(0, Math.min(1, p));
        p = Math.round(p * 200) / 200;
        if (p !== this.state.walkProg) this.setState({ walkProg: p });
      };
      const on = () => { if (!raf) raf = requestAnimationFrame(measure); };
      window.addEventListener('scroll', on, { passive: true });
      window.addEventListener('resize', on);
      on();
      this._walkOff = () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
    };
    this.onTrail = (i) => { if (i !== this.state.trail) this.setState({ trail: i }); };
    this.pickTrail = (i) => { this.open('lavado', true); this.setState({ stage: i }); };
    this.setTrail = (el) => {
      if (this._trailObs) { this._trailObs.disconnect(); this._trailObs = null; }
      if (!el || this.state.trailOn) return;
      if (typeof IntersectionObserver === 'undefined') { setTimeout(() => this.setState({ trailOn: true }), 0); return; }
      this._trailObs = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { this._trailObs.disconnect(); this._trailObs = null; this.setState({ trailOn: true }); }
      }, { threshold: 0.35 });
      this._trailObs.observe(el);
    };
  }

  componentDidUpdate(prevProps, prevState) {
    Object.keys(this._sc).forEach((k) => { try { this._sc[k].api.update(this.sceneOpts(k)); } catch (e) { /* scene keeps last state */ } });
    const moved = this._wantTop || (prevState && prevState.screen !== this.state.screen);
    this._wantTop = false;
    if (this._wantJourney && this._journey) {
      this._wantJourney = false;
      this._journey.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else if (moved && this._top && this._top.getBoundingClientRect().top < 0) {
      this._top.scrollIntoView({ block: 'start' });
    }
  }

  componentWillUnmount() {
    Object.keys(this._sc).forEach((k) => { try { this._sc[k].api.destroy(); } catch (e) { /* already gone */ } });
    this._sc = {};
    clearInterval(this._play);
    clearInterval(this._carT);
    if (this._walkOff) this._walkOff();
    if (this._trailObs) this._trailObs.disconnect();
    clearTimeout(this._trailT);
    clearTimeout(this._toastT);
    clearTimeout(this._orderT);
  }

  // Each <canvas> gets a stable ref: mount its scene when it appears, destroy it when it leaves.
  sceneRef(key, kind) {
    if (!this._refs[key]) {
      this._refs[key] = (el) => {
        const cur = this._sc[key];
        if (cur && cur.el === el) return;
        if (cur) { try { cur.api.destroy(); } catch (e) { /* already gone */ } delete this._sc[key]; }
        if (!el) return;
        const S = window.GuatesScenes;
        if (!S || !S[kind]) return;
        try { this._sc[key] = { el, api: S[kind](el, this.sceneOpts(key)) }; } catch (e) { console.warn('Guates 3D', e); }
      };
    }
    return this._refs[key];
  }

  city() { return CITIES.find((c) => c.key === this.state.city) || CITIES[0]; }
  cityPin() { const c = this.city(); return { name: c.name, lat: c.lat, lng: c.lng }; }
  stops(p) {
    const c = this.city();
    return [
      { name: 'Tu taza · ' + c.name, kind: 'ciudad', lat: c.lat, lng: c.lng },
      { name: 'Tostión · Villavicencio', kind: 'tostion', lat: ROASTERY.lat, lng: ROASTERY.lng },
      { name: 'Trilla · ' + p.trilla.split(',')[0], kind: 'trilla', lat: p.trillaLat, lng: p.trillaLng },
      { name: 'Finca ' + p.farm, kind: 'finca', lat: p.lat, lng: p.lng },
    ];
  }

  sceneOpts(key) {
    const s = this.state, p = BY[s.product];
    if (key === 'hero') return { mode: 'overview', farms: FARMS, hub: ROASTERY, city: this.cityPin(), highlight: s.mapFarm ? [s.mapFarm] : [], onPick: this.pickFarm };
    if (key === 'terrain') return { seed: p.seed, farmAltitude: p.alt, accent: p.accent, farmName: 'Finca ' + p.farm, highlight: s.highlight, city: { name: this.city().name, alt: this.city().alt }, onHover: this.onAlt };
    if (key === 'route') return { mode: 'journey', stops: this.stops(p), stage: STAGE_MAP[s.stage] };
    if (key === 'bean') { const b = this.stageList(p)[s.stage].bean; return { stage: b.stage, dried: !!b.dried, honey: !!b.honey, roast: s.roast }; }
    if (key === 'cup') return { roast: s.roast };
    if (key === 'cupIdea') return { roast: 3, milk: !!p.milk };
    if (key === 'trailCanvas') return { fine: true, steps: this.stageList(BY.lavado).map((x) => ({ title: x.title })), active: s.trail || 0, run: !!s.trailOn, onHover: this.onTrail, onPick: this.pickTrail };
    if (key === 'cartMap') {
      const ids = [];
      s.cart.forEach((it) => { const k = it.sub ? (it.sub.mode === 'fijo' ? it.sub.product : null) : it.key; if (k && ids.indexOf(BY[k].farmId) < 0) ids.push(BY[k].farmId); });
      return { mode: 'overview', farms: FARMS, hub: ROASTERY, city: this.cityPin(), highlight: ids, onPick: null };
    }
    if (key === 'orderRoute') {
      const c = s.order ? s.order.city : this.city();
      return { mode: 'journey', speed: 0.35, stops: [{ name: 'Tostión · Villavicencio', kind: 'tostion', lat: ROASTERY.lat, lng: ROASTERY.lng }, { name: 'Tu taza · ' + c.name, kind: 'ciudad', lat: c.lat, lng: c.lng }], stage: s.orderStage };
    }
    return {};
  }

  stageList(p) {
    const s = this.state, c = this.city();
    const nat = p.process === 'Natural', honey = p.process === 'Honey';
    const straight = Math.round(haversine(ROASTERY, c));
    const total = p.trillaKm + p.roastKm + straight, b = boil(c.alt);
    const dry = String(p.dry).replace('.', ',');
    const born = p.total + 44;
    const ago = (n) => (n <= 0 ? 'Hoy' : 'Hace ≈ ' + n + ' días');
    const where = dms(p.lat, 'N', 'S') + ' · ' + dms(p.lng, 'E', 'O');
    return [
      { title: 'Tu taza', cup: true, bean: { stage: 3 }, map: 0, km: 0, day: ago(0),
        text: 'Empieza por aquí, por lo que sientes al primer sorbo. ' + p.feel + ' Ahora vamos hacia atrás, a ver cómo llegó hasta ' + c.name + '.',
        facts: [['El agua en ' + c.name, 'hierve a ≈ ' + b + ' °C'], ['Receta sugerida', METHODS[s.method].title]] },
      { title: 'Envío', bean: { stage: 3 }, map: 0.5, km: Math.round(straight / 2), day: ago(3),
        text: 'Antes de llegar a tus manos viajó sellado desde los Llanos hasta ' + c.name + ', para que llegara fresco.',
        facts: [['En línea recta', dots(straight) + ' km'], ['Entrega estimada', c.days]] },
      { title: 'Empaque', bean: { stage: 3 }, map: 1, km: straight, day: ago(4),
        text: 'Antes del viaje lo empacamos con la fecha de tostión y el número de lote, para que sepas qué bolsa tienes en las manos.',
        facts: [['Lote', 'GUA-' + p.code + '-2607'], ['Presentación', SIZES[s.size].label]] },
      { title: 'Tostión', roast: true, bean: { stage: 3 }, map: 1, km: straight, day: ago(4),
        text: 'Antes de empacarlo lo tostamos en Villavicencio. El calor le dio el color y los aromas que sientes ahora.',
        facts: [['Dónde', 'Villavicencio, Meta'], ['Tiempo de tostión', '10 min']] },
      { title: 'Trilla', bean: { stage: 2 }, map: 2, km: straight + p.roastKm, day: ago(14),
        text: 'Antes de la tostión era café verde. En ' + p.trilla + ' le quitaron las capas secas que lo protegían' + (nat ? ', incluida la fruta seca' : '') + '.',
        facts: [['Lugar', p.trilla + ' (propuesto)'], ['Hasta la tostión', p.roastKm + ' km']] },
      { title: nat ? 'Secado en fruta' : honey ? 'Secado con miel' : 'Secado', bean: { stage: nat ? 0 : 1, dried: nat, honey }, map: 3, km: total, day: ago(44),
        text: nat ? 'Antes de la trilla, la cereza entera se secó ' + dry + ' días hasta quedar oscura y arrugada, como una uva pasa.'
          : honey ? 'Antes de la trilla se secó ' + dry + ' días con el mucílago pegado; lo movían seguido para que quedara parejo.'
          : 'Antes de la trilla se secó ' + dry + ' días al sol y al aire, hasta quedar con cerca de 11 % de humedad.',
        facts: [['Días de secado', dry], ['Humedad final', '11 %']] },
      { title: 'Fermentación', bean: { stage: nat ? 0 : 1, honey }, map: 3, km: total, day: ago(born - (nat ? 3 : 1)),
        text: nat ? 'Mientras se secaba, la fruta fermentó despacio. El tiempo y el cuidado influyen, pero por sí solos no prometen un sabor.'
          : honey ? 'Antes de secarse tuvo una fermentación corta, porque el mucílago se quedó con el grano.'
          : 'Antes de secarse fermentó: los microorganismos transformaron parte de los azúcares del mucílago, y luego se lavó con agua limpia.',
        facts: [['Tiempo de referencia', p.ferment], ['Método', 'Por confirmar con el productor']] },
      nat
        ? { title: 'Selección', bean: { stage: 0 }, map: 3, km: total, day: ago(born),
            text: 'Antes de todo eso se escogieron las cerezas enteras para secarlas con su fruta. En un natural no se despulpa.',
            facts: [['Qué se seca', 'La cereza entera']] }
        : { title: 'Despulpado', bean: { stage: 1, honey }, map: 3, km: total, day: ago(born),
            text: honey ? 'Antes de todo eso, a la cereza le quitaron la piel pero no todo el mucílago. De ahí viene el nombre honey: no lleva miel.'
              : 'Antes de todo eso, a la cereza le quitaron la piel y casi toda la pulpa, el mismo día de la cosecha.',
            facts: [['Cuándo', 'El día de la cosecha']] },
      { title: 'Cosecha', bean: { stage: 0 }, map: 3, km: total, day: ago(born),
        text: 'Y aquí empezó todo: en la finca ' + p.farm + ', a ' + dots(p.alt) + ' metros, ' + p.producer + ' y su equipo recogieron a mano solo las cerezas maduras. Antes de ser tu taza, fue una fruta roja.',
        facts: [['Altitud', dots(p.alt) + ' m s. n. m.'], ['Coordenadas', where], ['Cosecha', p.harvest]] },
    ];
  }

  go(screen, extra) {
    if (screen !== 'producto') this.stopPlay();
    this.setState(Object.assign({ screen }, extra || {}));
  }
  open(key, journey) {
    this.stopPlay();
    this._wantJourney = !!journey;
    this._wantTop = true;
    this.setState({ screen: 'producto', product: key, stage: 0, size: 0, grind: 'grano', qty: 1, hoverAlt: null });
  }
  stopPlay() { clearInterval(this._play); this._play = null; if (this.state.playing) this.setState({ playing: false }); }
  togglePlay() {
    if (this.state.playing) { this.stopPlay(); return; }
    this.setState({ playing: true, stage: this.state.stage >= 8 ? 0 : this.state.stage });
    this._play = setInterval(() => {
      if (this.state.stage >= 8) { this.stopPlay(); return; }
      this.setState({ stage: this.state.stage + 1 });
    }, 3600);
  }
  toast(msg) {
    clearTimeout(this._toastT);
    this.setState({ toast: msg });
    this._toastT = setTimeout(() => this.setState({ toast: null }), 4000);
  }
  add(item, msg) {
    const cart = this.state.cart.slice();
    const i = cart.findIndex((x) => x.id === item.id);
    if (i >= 0) cart[i] = Object.assign({}, cart[i], { qty: cart[i].qty + item.qty });
    else cart.push(item);
    this.setState({ cart });
    this.toast(msg);
  }
  addProduct(key, size, grind, qty) {
    this.add({ id: key + '|' + size + '|' + grind, key, size, grind, qty }, 'Agregaste ' + qty + ' × ' + BY[key].name + ' de ' + SIZES[size].label + ' al carrito.');
  }
  subPrice(sub) { return sub.mode === 'fijo' ? priceOf(sub.product, sub.size) : Math.round((46000 * SIZES[sub.size].mult) / 1000) * 1000; }
  setQty(id, d) {
    const cart = this.state.cart.map((x) => (x.id === id ? Object.assign({}, x, { qty: Math.max(1, x.qty + d) }) : x));
    this.setState({ cart });
  }
  remove(id) { this.setState({ cart: this.state.cart.filter((x) => x.id !== id) }); }
  field(key) { return (e) => this.setState({ form: Object.assign({}, this.state.form, { [key]: e.target.value }) }); }
  errors() {
    const f = this.state.form, e = {};
    if (!f.name.trim()) e.name = 'Escribe tu nombre.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
    if (this.state.delivery === 'envio' && !f.address.trim()) e.address = 'Escribe la dirección de entrega.';
    return e;
  }
  confirm(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    const e = this.errors();
    if (Object.keys(e).length || !this.state.cart.length) { this.setState({ tried: true }); return; }
    const c = this.city(), t = this.totals();
    const order = { no: 'GUA-' + String(Date.now()).slice(-5), items: this.state.cart.slice(), city: c, email: this.state.form.email.trim(), name: this.state.form.name.trim(), total: t.total, delivery: this.state.delivery };
    this.setState({ order, cart: [], screen: 'confirmacion', orderStage: 0, tried: false });
    clearTimeout(this._orderT);
    this._orderT = setTimeout(() => this.setState({ orderStage: 1 }), 900);
  }
  totals() {
    const s = this.state, c = this.city();
    const sub = s.cart.reduce((n, it) => n + (it.sub ? this.subPrice(it.sub) : priceOf(it.key, it.size)) * it.qty, 0);
    const ship = !s.cart.length || s.delivery === 'recoger' ? 0 : c.ship;
    return { sub, ship, total: sub + ship };
  }

  renderVals() {
    const s = this.state, p = BY[s.product], c = this.city();
    const is = { home: s.screen === 'home', catalogo: s.screen === 'catalogo', producto: s.screen === 'producto', carrito: s.screen === 'carrito', checkout: s.screen === 'checkout', confirmacion: s.screen === 'confirmacion', suscripcion: s.screen === 'suscripcion' };
    const navDefs = [['Cafés', 'catalogo', () => this.go('catalogo')], ['El recorrido', 'producto', () => this.open('lavado', true)], ['Suscripción', 'suscripcion', () => this.go('suscripcion')]];
    const nav = navDefs.map(([label, scr, fn]) => ({ label, go: fn, current: s.screen === scr ? 'page' : undefined, line: s.screen === scr ? C.cereza : 'transparent' }));
    const cartCount = s.cart.reduce((n, it) => n + it.qty, 0);
    const straight = Math.round(haversine(ROASTERY, c));

    const farm = s.mapFarm ? FARMS.find((f) => f.id === s.mapFarm) : null;
    const heroFarm = farm
      ? { has: true, none: false, name: farm.name, place: farm.place,
          line: farm.products.length > 1 ? 'De aquí salen ' + farm.products.length + ' cafés con procesos distintos.' : 'De aquí sale el ' + BY[farm.products[0]].name + '.',
          coffees: farm.products.map((k) => ({ name: BY[k].name, open: () => this.open(k) })) }
      : { has: false, none: true, coffees: [] };
    const farms = FARMS.map((f) => Object.assign({ name: f.name, on: s.mapFarm === f.id, pick: () => this.setState({ mapFarm: s.mapFarm === f.id ? null : f.id }) }, pill(s.mapFarm === f.id)));

    const isAnimo = s.moodMode !== 'costumbre';
    const moodList = isAnimo ? MOODS : TASTES;
    const moodKey = isAnimo ? s.moodAnimo : s.moodCostumbre;
    const moodPick = moodList.find((m) => m.key === moodKey) || moodList[0];
    const mp = BY[moodPick.product], mper = PERSONA[mp.key] || { title: '', animal: '', line: '' };
    const LINE = { regional: [C.cafe, C.crema], lavado: [C.azul, '#000'], natural: [C.moriche, C.crema], honey: [C.naranja, '#000'], platea: [C.cereza, C.crema] };
    const [mLine, mOn] = LINE[mp.key] || [C.cafe, C.crema];
    const emoIsAnimo = s.moodMode !== 'costumbre';
    const emoList = emoIsAnimo ? MOODS : TASTES;
    const emoSel = emoList.find((m) => m.key === (emoIsAnimo ? s.moodAnimo : s.moodCostumbre)) || emoList[0];
    const ep = BY[emoSel.product], eper = PERSONA[ep.key] || { title: '', animal: '', line: '' };
    const emoChosen = emoIsAnimo ? s.chosenAnimo === emoSel.key : s.chosenCostumbre === emoSel.key;
    const WLINE = { regional: [C.cafe, C.crema], lavado: [C.azul, '#000'], natural: [C.moriche, C.crema], honey: [C.naranja, '#000'], platea: [C.cereza, C.crema] };
    const [wLine, wOn] = WLINE[ep.key] || [C.cafe, C.crema];
    const wc = this.city(), wNat = ep.process === 'Natural', wHoney = ep.process === 'Honey', wDry = String(ep.dry).replace('.', ',');
    const fwdText = (t, fallback) => {
      if (t === 'Cosecha') return 'En la finca ' + ep.farm + ', en ' + ep.place + ', recogen a mano solo las cerezas maduras, a unos ' + dots(ep.alt) + ' m de altura.';
      if (t === 'Selección') return 'Se escogen las cerezas enteras y maduras. En un natural la fruta no se quita: se seca con el grano adentro.';
      if (t === 'Despulpado') return wHoney ? 'Se le quita la piel a la cereza, pero se deja parte del mucílago pegado al grano. De ahí el nombre honey.' : 'Se le quitan la piel y la pulpa a la cereza; queda el grano cubierto de mucílago.';
      if (t === 'Fermentación') return wNat ? 'La fruta fermenta despacio mientras se seca, unos ' + ep.ferment + '.' : wHoney ? 'Una fermentación corta, de unos ' + ep.ferment + ', con el mucílago todavía pegado.' : 'Reposa unos ' + ep.ferment + ' para fermentar y luego se lava con agua limpia.';
      if (t.indexOf('Secado') === 0) return 'Se seca ' + wDry + ' días al sol y al aire, moviéndolo seguido, hasta quedar con cerca de 11 % de humedad.';
      if (t === 'Trilla') return 'En ' + ep.trilla + ' le quitan las capas secas y queda el café verde, listo para viajar ' + ep.roastKm + ' km hasta la tostión.';
      if (t === 'Tostión') return 'En Villavicencio lo tostamos en lotes pequeños. Ahí aparecen el color y los aromas que vas a sentir.';
      if (t === 'Empaque') return 'Lo empacamos con la fecha de tostión y el número de lote, para que sepas qué bolsa tienes en las manos.';
      if (t === 'Envío') return 'Viaja sellado desde los Llanos hasta ' + wc.name + '. Llega en ' + wc.days + '.';
      return fallback;
    };
    const wAll = this.stageList(ep).slice().reverse();
    const wSteps = wAll.filter((x) => !x.cup);
    const wN = wSteps.length, wp = s.walkProg || 0;
    const brand = { strong: wLine, on: wOn, light: ep.bag === C.crema ? C.luz : ep.bag, band: ep.bag };
    nav.forEach((n) => { n.bg = n.current ? brand.light : 'transparent'; n.weight = n.current ? '700' : '500'; });
    const walk = {
      line: wLine, soft: ep.bag === C.crema ? C.luz : ep.bag, cupBg: wLine,
      intro: 'Desde la finca ' + ep.farm + ', en ' + ep.place + ', hasta ' + wc.name + '. Así se hizo el ' + ep.name + ' que elegiste: baja y míralo llegar.',
      listLabel: 'Los pasos del ' + ep.name + ', de la finca a tu taza',
      d: (() => { let d = 'M50 0'; for (let i = 1; i <= 40; i++) { const y = i * 25; d += ' L' + (50 + Math.sin((y / 1000) * wN * Math.PI * 2) * 10).toFixed(1) + ' ' + y; } return d; })(),
      offset: String(1 - wp),
      steps: wSteps.map((x, i) => {
        const on = wp >= (i + 0.5) / wN - 0.06;
        const t = x.title, kind = t === 'Cosecha' ? 'cosecha' : t === 'Selección' ? 'seleccion' : t === 'Despulpado' ? 'despulpado' : t === 'Fermentación' ? 'ferm' : t.indexOf('Secado') === 0 ? 'secado' : t === 'Trilla' ? 'trilla' : t === 'Tostión' ? 'tostion' : t === 'Empaque' ? 'empaque' : 'envio';
        const is = { cosecha: false, seleccion: false, despulpado: false, ferm: false, secado: false, trilla: false, tostion: false, empaque: false, envio: false };
        is[kind] = true;
        const artLabel = { cosecha: 'Una rama de café con cerezas maduras y una mano que las recoge', seleccion: 'Un canasto con cerezas enteras', despulpado: 'Una cereza abierta con sus dos granos', ferm: 'Un tanque con agua y granos fermentando', secado: 'Granos secándose al sol sobre una cama', trilla: 'Un costal de café verde con granos y cascarilla', tostion: 'La tostadora con su llama y granos tostados', empaque: 'Una bolsa de café con su etiqueta', envio: 'Un camión llevando una bolsa de café' }[kind];
        return { is, artLabel, num: String(i + 1).padStart(2, '0'), title: x.title, day: x.day, text: fwdText(x.title, x.text), side: i % 2 ? 'is-right' : 'is-left',
          facts: (x.facts || []).map(([k, v]) => ({ k, v })), op: on ? '1' : '0.3', ty: on ? '0px' : '18px', dotBg: on ? wLine : C.crema, dotFg: on ? wOn : C.cafe };
      }),
      cupOp: wp >= 0.97 ? '1' : '0.35', cupTy: wp >= 0.97 ? '0px' : '24px',
      cupLine: 'Del árbol de ' + ep.producer + ' a tu mesa: ' + dots(Math.round(haversine(ROASTERY, wc)) + ep.roastKm + ep.trillaKm) + ' km de camino, más o menos.',
    };
    const emo = {
      band: ep.bag,
      modes: [['animo', 'Por ánimo'], ['costumbre', 'Por costumbre']].map(([k, label]) => { const on = (k === 'animo') === emoIsAnimo; return { label, sel: on ? 'true' : 'false', bg: on ? C.cafe : C.crema, fg: on ? C.crema : C.cafe, pick: () => this.setState({ moodMode: k }) }; }),
      groupLabel: emoIsAnimo ? 'Cómo te sientes' : 'Tu costumbre',
      options: emoList.map((m) => { const on = m === emoSel, x = BY[m.product]; return { label: m.label, coffee: x.name, dot: x.bag, sel: on ? 'true' : 'false', bg: on ? C.cafe : C.crema, fg: on ? C.crema : C.cafe, pick: () => this.setState(emoIsAnimo ? { moodAnimo: m.key, chosenAnimo: m.key } : { moodCostumbre: m.key, chosenCostumbre: m.key }) }; }),
      over: emoChosen ? 'Elegiste «' + emoSel.label.toLowerCase() + '»' : 'Una taza para empezar',
      name: ep.name, idea: ep.idea, why: emoChosen ? emoSel.why : ep.feel, bag: ep.bag, art: ep.bagArt, artToken: ep.artToken,
      persona: eper.title, animal: eper.animal, line: eper.line, personality: ep.personality,
      traits: ep.traits.map((label, i) => ({ label, tone: TONES[i][0], ink: TONES[i][1], tilt: TONES[i][2] })),
      feel: ep.feel, notes: ep.notes.map((n) => ({ n, dot: ep.label })),
      facts: [{ k: 'Origen', v: ep.place }, { k: 'Finca', v: ep.farm }, { k: 'Productor', v: ep.producer }, { k: 'Variedad', v: ep.variety }, { k: 'Proceso', v: ep.process }, { k: 'Altitud', v: dots(ep.alt) + ' m' }, { k: 'Cosecha', v: ep.harvest }],
      curious: CURIOUS[ep.key], price: money(priceOf(ep.key, 0)),
      open: () => this.open(ep.key),
      customizing: s.quickProduct === ep.key,
      quick: () => this.setState({ quickProduct: s.quickProduct === ep.key ? null : ep.key, quickSize: 0, quickGrind: null }),
      sizes: SIZES.map((x, i) => ({ label: x.label, on: (s.quickSize || 0) === i, pick: () => this.setState({ quickSize: i }) })),
      grinds: GRINDS.map((g) => ({ ...g, on: s.quickGrind === g.key, pick: () => this.setState({ quickGrind: g.key }) })),
      needsGrind: !GRINDS.some((g) => g.key === s.quickGrind),
      selectedPrice: money(priceOf(ep.key, s.quickSize || 0)),
      selection: GRINDS.some((g) => g.key === s.quickGrind) ? ep.name + ' · ' + SIZES[s.quickSize || 0].label + ' · ' + GRINDS.find((g) => g.key === s.quickGrind).label : 'Elige si lo quieres en grano o molido antes de agregarlo.',
      addSelected: () => {
        if (s.quickProduct !== ep.key || !GRINDS.some((g) => g.key === s.quickGrind)) return;
        this.addProduct(ep.key, s.quickSize || 0, s.quickGrind, 1);
        this.setState({ quickProduct: null });
      },
    };
    const moodTabs = [['animo', 'Por ánimo'], ['costumbre', 'Por costumbre']].map(([k, label]) => {
      const sel = (k === 'animo') === isAnimo;
      return { label, sel: sel ? 'true' : 'false', bg: sel ? mLine : 'transparent', fg: sel ? mOn : C.cafe, pick: () => this.setState({ moodMode: k }) };
    });
    const moodOpts = moodList.map((m) => {
      const on = m.key === moodPick.key;
      return { label: m.label, coffee: BY[m.product].name, on, bg: on ? mLine : 'transparent', fg: on ? mOn : '#000',
        pick: () => this.setState(isAnimo ? { moodAnimo: m.key } : { moodCostumbre: m.key }) };
    });
    
    const mood = {
      band: mp.bag, bag: mp.bag, line: mLine, lineSoft: mLine + '40', art: mp.bagArt, artToken: mp.artToken, name: mp.name, why: moodPick.why, pickLabel: moodPick.label,
      persona: mper.title, animal: mper.animal, line: mper.line, feel: mp.feel, notes: mp.notes,
      panelLabel: isAnimo ? 'Cafés por ánimo' : 'Cafés por costumbre', groupLabel: isAnimo ? 'Tu ánimo' : 'Tu forma de tomar café',
      facts: [['Productor', mp.producer], ['Origen', mp.place], ['Finca', mp.farm], ['Variedad', mp.variety], ['Proceso', mp.process],
        ['Altitud', dots(mp.alt) + ' m'], ['Fermentación', mp.ferment], ['Secado', String(mp.dry).replace('.', ',') + ' días'], ['Cosecha', mp.harvest]].map(([k, v]) => ({ k, v })),
      open: () => this.open(mp.key), quick: () => this.addProduct(mp.key, 0, 'grano', 1), quickAria: 'Agregar ' + mp.name + ' de 250 g en grano al carrito',
    };
    const tastes = TASTES.map((t) => Object.assign({ label: t.label, on: s.taste === t.key, pick: () => this.setState({ taste: t.key }) }, pill(s.taste === t.key)));
    const tasteSel = TASTES.find((t) => t.key === s.taste);
    const rec = tasteSel
      ? { has: true, none: false, name: BY[tasteSel.product].name, why: tasteSel.why, bag: BY[tasteSel.product].bag, art: BY[tasteSel.product].bagArt, artToken: BY[tasteSel.product].artToken, open: () => this.open(tasteSel.product) }
      : { has: false, none: true };

    const top = Math.max(2500, Math.ceil((c.alt + 300) / 500) * 500);
    const H = 260;
    const px = (alt) => Math.round((alt / top) * H) + 'px';
    const profile = {
      items: PRODUCTS.slice().sort((a, b) => a.alt - b.alt || a.name.localeCompare(b.name)).map((x) => ({
        name: x.name, alt: dots(x.alt) + ' m', height: px(x.alt), color: x.label, open: () => this.open(x.key),
        aria: x.name + ', ' + dots(x.alt) + ' metros sobre el nivel del mar. Ver su recorrido.' })),
      guides: [500, 1000, 1500, 2000, 2500, 3000].filter((g) => g < top).map((g) => ({ label: dots(g) + ' m', bottom: px(g) })),
      cityBottom: px(c.alt),
      cityTag: 'Tu ciudad · ' + c.name + ' · ' + dots(c.alt) + ' m',
      cityLine: c.alt > 1900
        ? c.name + ' está más alto que todas nuestras fincas: allá arriba el agua hierve a unos ' + boil(c.alt) + ' °C.'
        : 'Todas nuestras fincas están más arriba que ' + c.name + '. Toca una montaña para ver su recorrido.',
    };

    const nP = PRODUCTS.length;
    const cp = PRODUCTS[((s.slide % nP) + nP) % nP];
    const go = (i) => { this._carEl = 0; this.setState({ slide: ((i % nP) + nP) % nP }); };
    const carRun = !!s.carPlaying && !s.carHold;
    const car = {
      isColibri: cp.bagArt === 'colibri', is_chiguiro: cp.bagArt === 'chiguiro', is_nutria: cp.bagArt === 'nutria', is_perezoso: cp.bagArt === 'perezoso', is_garza: cp.bagArt === 'garza', isOther: ['colibri', 'chiguiro', 'nutria', 'perezoso', 'garza'].indexOf(cp.bagArt) < 0,
      parity: s.slide % 2 ? 'b' : 'a', playState: carRun ? 'running' : 'paused', playing: !!s.carPlaying, stopped: !s.carPlaying,
      live: s.carPlaying ? 'off' : 'polite', barColor: cp.key === 'honey' ? C.naranja : cp.label,
      toggleLabel: s.carPlaying ? 'Pausar el carrusel' : 'Reanudar el carrusel',
      toggle: () => this.setState({ carPlaying: !this.state.carPlaying }),
      hold: () => { if (!this.state.carHold) this.setState({ carHold: true }); },
      release: () => { if (this.state.carHold) this.setState({ carHold: false }); },
      name: cp.name, persona: PERSONA[cp.key].title, animal: PERSONA[cp.key].animal, line: PERSONA[cp.key].line, notes: cp.notes,
      bag: cp.bag, art: cp.bagArt, artToken: cp.artToken, count: (s.slide + 1) + ' de ' + nP,
      open: () => this.open(cp.key), prev: () => go(s.slide - 1), next: () => go(s.slide + 1),
      dots: PRODUCTS.map((x, i) => ({ label: 'Ver ' + x.name, current: i === s.slide ? 'true' : undefined, bg: i === s.slide ? C.cafe : 'transparent', pick: () => go(i) })),
    };

    const PTS = [[7, 18], [27, 10], [47, 20], [67, 10], [90, 24], [76, 52], [52, 46], [26, 64], [54, 86]];
    const tr = this.stageList(BY.lavado);
    const ti = Math.min(s.trail || 0, tr.length - 1);
    const num2 = (i) => String(i + 1).padStart(2, '0');
    const trailPts = tr.map((x, i) => {
      const pt = PTS[Math.min(i, PTS.length - 1)], on = i === ti;
      return { num: num2(i), title: x.title, x: pt[0] + '%', y: pt[1] + '%', delay: (0.2 + i * 0.36).toFixed(2) + 's',
        size: on ? '24px' : '18px', fill: on ? C.luz : C.moriche, ring: on ? C.luz : C.crema, label: on ? C.luz : C.crema,
        aria: 'Paso ' + num2(i) + ': ' + x.title, current: on ? 'step' : undefined, btnBg: on ? C.luz : 'transparent', btnFg: on ? C.cafe : C.crema,
        show: () => { if (this.state.trail !== i) this.setState({ trail: i }); } };
    });
    const tsel = tr[ti];
    const trailSel = { num: num2(ti), title: tsel.title, text: tsel.text, day: tsel.day, facts: (tsel.facts || []).map(([k, v]) => ({ k, v })) };
    const trailCls = s.trailOn ? 'is-on' : '';
    const replayTrail = () => { clearTimeout(this._trailT); this.setState({ trailOn: false }); this._trailT = setTimeout(() => this.setState({ trailOn: true }), 60); };

    const stepsPreview = this.stageList(BY.lavado).map((x, i) => ({ num: String(i + 1).padStart(2, '0'), title: x.title }));

    const filterDefs = [['todos', 'Todos'], ['Lavado', 'Lavado'], ['Natural', 'Natural'], ['Honey', 'Honey']];
    const filters = filterDefs.map(([k, label]) => Object.assign({ label, on: s.filter === k, pick: () => this.setState({ filter: k }) }, pill(s.filter === k)));
    const sorts = [['altura', 'Altura'], ['precio', 'Precio']].map(([k, label]) => Object.assign({ label, on: s.sort === k, pick: () => this.setState({ sort: k }) }, pill(s.sort === k)));
    const list = PRODUCTS.filter((x) => s.filter === 'todos' || x.process === s.filter).sort((a, b) => (s.sort === 'precio' ? a.price - b.price : b.alt - a.alt));
    const cards = list.map((x) => ({
      name: x.name, producer: x.producer, place: x.place, altLabel: dots(x.alt) + ' m s. n. m.', feel: x.feel, notes: x.notes,
      process: x.process, bag: x.bag, bagArt: x.bagArt, artToken: x.artToken, price: money(x.price),
      open: () => this.open(x.key), quick: () => this.addProduct(x.key, 0, 'grano', 1), quickAria: 'Agregar ' + x.name + ' de 250 g en grano al carrito',
    }));
    const help = {
      todos: 'Lavado, natural y honey son formas de quitarle la fruta al grano. Cambian mucho lo que sientes en la taza.',
      Lavado: 'Lavado: se quita la pulpa, se fermenta y se lava con agua antes de secar. Suele dar tazas limpias y brillantes.',
      Natural: 'Natural: la cereza se seca entera, con la fruta puesta. Por eso suele saber más a fruta.',
      Honey: 'Honey: se quita la piel pero se seca con parte del mucílago, la capa dulce que rodea el grano. No lleva miel.',
    };

    const helpFor = { Lavado: help.Lavado, Natural: help.Natural, Honey: help.Honey };
    const siblings = PRODUCTS.filter((x) => x.farmId === p.farmId && x.key !== p.key).map((x) => ({ name: x.name, open: () => this.open(x.key) }));
    const pv = {
      key: p.key, name: p.name, producer: p.producer, farm: p.farm, feel: p.feel, notes: p.notes, bag: p.bag, art: p.art, artToken: p.artToken,
      overline: p.idea, processHelp: helpFor[p.process],
      idea: p.idea, scene: p.scene, sceneShort: p.sceneShort, personality: p.personality, emotion: p.emotion, bagArt: p.bagArt,
      traits: p.traits.map((label, i) => ({ label, tone: TONES[i][0], ink: TONES[i][1], tilt: TONES[i][2] })),
      cupAria: 'Tu taza de ' + p.name + ' servida' + (p.milk ? ' con leche' : '') + '.',
      labelGrind: s.grind === 'grano' ? undefined : s.grind,
      farmTitle: 'La finca ' + p.farm + ' está a ' + dots(p.alt) + ' metros sobre el nivel del mar',
      terrainAria: 'Relieve ilustrado alrededor de la finca ' + p.farm + ', con curvas de nivel cada 100 metros y la altura de la finca marcada.',
      facts: [{ k: 'Altitud', v: dots(p.alt) + ' m s. n. m.' }, { k: 'Coordenadas', v: coords(p) }, { k: 'Cosecha', v: p.harvest }, { k: 'Variedad', v: p.variety }],
      altFacts: [{ k: 'Altitud de la finca', v: dots(p.alt) + ' m' }, { k: 'Coordenadas', v: coords(p) }, { k: 'El agua hierve allá a', v: '≈ ' + boil(p.alt) + ' °C' }, { k: 'Comparado con ' + c.name, v: (p.alt >= c.alt ? dots(p.alt - c.alt) + ' m más arriba' : dots(c.alt - p.alt) + ' m más abajo') }],
      siblings, hasSiblings: siblings.length > 0,
    };
    const sizes = SIZES.map((x, i) => Object.assign({ label: x.label, price: money(priceOf(p.key, i)), on: s.size === i, pick: () => this.setState({ size: i }) }, pill(s.size === i)));
    const grinds = GRINDS.map((g) => Object.assign({ label: g.label, hint: g.hint, on: s.grind === g.key, pick: () => this.setState({ grind: g.key }) }, pill(s.grind === g.key)));
    const legend = [{ color: C.luz, label: 'Menos de 1.000 m' }, { color: C.brote, label: '1.000 a 2.000 m' }, { color: C.moriche, label: '2.000 a 3.000 m' }, { color: p.accent, label: 'Altura de la finca' }];

    const stagesAll = this.stageList(p);
    const cur = stagesAll[s.stage];
    const stages = stagesAll.map((x, i) => Object.assign({ num: String(i + 1).padStart(2, '0'), title: x.title, current: i === s.stage ? 'step' : undefined, pick: () => { this.stopPlay(); this.setState({ stage: i }); } }, pill(i === s.stage, true)));
    const mapStop = Math.round(cur.map);
    const stopChips = this.stops(p).map((x, i) => ({ label: x.name, bg: i === mapStop ? C.luz : i < mapStop ? C.crema : C.crema, fg: C.cafe }));
    const beanStage = cur.bean.stage;
    const beanCaption = cur.cup ? 'Tu taza: aquí empieza la historia.'
      : beanStage === 0 ? (cur.bean.dried ? 'Cereza seca: la fruta entera, oscura y arrugada.' : 'Cereza: la fruta que guarda dos semillas.')
      : beanStage === 1 ? (cur.bean.honey ? 'Pergamino con miel: el mucílago se seca pegado al grano.' : 'Pergamino: la capa que protege el grano.')
      : beanStage === 2 ? 'Café verde: sin capas, listo para tostar.'
      : 'Café tostado: el calor le cambió el color.';
    const roastWords = ['', 'Clara', 'Media clara', 'Media', 'Media oscura', 'Oscura'];
    const st = {
      over: 'Paso ' + String(s.stage + 1).padStart(2, '0') + ' de 09 · ' + cur.day,
      title: cur.title, text: cur.text, facts: cur.facts.map(([k, v]) => ({ k, v })), km: dots(cur.km),
      isCup: !!cur.cup, isBean: !cur.cup, isRoast: !!cur.roast, beanCaption, first: s.stage === 0, last: s.stage === 8,
    };

    const m = METHODS[s.method];
    const cupsN = s.cups;
    const b = boil(c.alt);
    const recipe = {
      title: m.title + ' · ' + (cupsN === 1 ? '1 taza' : '2 tazas'),
      facts: [{ k: 'Café', v: m.coffee * cupsN + ' g' }, { k: 'Agua', v: m.water * cupsN + ' g' }, { k: 'Molienda', v: m.grind }, { k: 'Tiempo', v: m.time }, { k: 'Proporción', v: '1:' + Math.round(m.water / m.coffee) }],
      steps: m.steps,
      water: m.hot
        ? (b <= 93 ? 'En ' + c.name + ' el agua hierve a unos ' + b + ' °C: úsala recién hervida.' : 'Usa agua a unos 93 °C: déjala reposar 30 segundos después de hervir.')
        : 'En greca el agua hace el trabajo: usa agua fresca y fuego medio.',
    };
    const methods = Object.keys(METHODS).map((k) => Object.assign({ label: METHODS[k].label, on: s.method === k, pick: () => this.setState({ method: k }) }, pill(s.method === k)));
    const cupsOpts = [1, 2].map((n) => Object.assign({ label: n === 1 ? '1 taza' : '2 tazas', on: cupsN === n, pick: () => this.setState({ cups: n }) }, pill(cupsN === n)));

    const t = this.totals();
    const farmIds = [];
    let km = 0;
    const items = s.cart.map((it) => {
      if (it.sub) {
        const x = it.sub.mode === 'fijo' ? BY[it.sub.product] : null;
        const name = x ? 'Suscripción ' + x.name : 'Suscripción exploradora';
        return { name, qty: it.qty, bag: x ? x.bag : C.luz, art: x ? x.bagArt : 'pajaro', artToken: x ? x.artToken : 'cafe-de-origen',
          detail: SIZES[it.sub.size].label + ' · ' + GRINDS.find((g) => g.key === it.sub.grind).label + ' · cada ' + it.sub.freq + ' semanas',
          short: 'cada ' + it.sub.freq + ' sem.', total: money(this.subPrice(it.sub) * it.qty), link: x ? 'Ver su recorrido' : 'Cambiar suscripción',
          open: () => (x ? this.open(x.key, true) : this.go('suscripcion')), up: () => this.setQty(it.id, 1), down: () => this.setQty(it.id, -1), remove: () => this.remove(it.id),
          qtyAria: 'Cantidad de ' + name, removeAria: 'Quitar ' + name + ' del carrito' };
      }
      const x = BY[it.key];
      if (farmIds.indexOf(x.farmId) < 0) { farmIds.push(x.farmId); km += x.trillaKm + x.roastKm; }
      return { name: x.name, qty: it.qty, bag: x.bag, art: x.bagArt, artToken: x.artToken,
        detail: SIZES[it.size].label + ' · ' + GRINDS.find((g) => g.key === it.grind).label + ' · ' + money(priceOf(it.key, it.size)) + ' c/u',
        short: SIZES[it.size].label, total: money(priceOf(it.key, it.size) * it.qty), link: 'Así llegó hasta aquí',
        open: () => this.open(x.key, true), up: () => this.setQty(it.id, 1), down: () => this.setQty(it.id, -1), remove: () => this.remove(it.id),
        qtyAria: 'Cantidad de ' + x.name, removeAria: 'Quitar ' + x.name + ' del carrito' };
    });
    const nFarms = farmIds.length;
    const cart = {
      items, empty: !s.cart.length, has: s.cart.length > 0,
      subtotal: money(t.sub), ship: s.delivery === 'recoger' ? 'Gratis' : money(t.ship), total: money(t.total),
      shipLabel: s.delivery === 'recoger' ? 'Recoges en Villavicencio' : 'Envío a ' + c.name + ' (' + c.days + ')',
      trip: nFarms
        ? 'Tus cafés vienen de ' + (nFarms === 1 ? '1 finca' : nFarms + ' fincas') + ', pasan por la tostión en Villavicencio y suman unos ' + dots(km + straight * nFarms) + ' km hasta ' + c.name + '.'
        : 'Tu suscripción sale de la tostión en Villavicencio y recorre unos ' + dots(straight) + ' km hasta ' + c.name + '.',
      passport: nFarms ? 'Con este pedido sumas ' + (nFarms === 1 ? '1 origen' : nFarms + ' orígenes') + ' por probar. Los marcas cuando los pruebes.' : 'Cada origen que pruebes queda en tu pasaporte.',
    };

    const err = s.tried ? this.errors() : {};
    const mk = (key, label, type, auto) => ({ key, label, type, auto, value: s.form[key], change: this.field(key), invalid: !!err[key], error: err[key] || '', border: err[key] ? C.cereza : C.cafe });
    const fields = {
      contact: [mk('name', 'Nombre', 'text', 'name'), mk('email', 'Correo', 'email', 'email'), mk('phone', 'Celular (opcional)', 'tel', 'tel')],
      address: s.delivery === 'envio' ? [mk('address', 'Dirección', 'text', 'street-address'), mk('detail', 'Apartamento, barrio o indicaciones (opcional)', 'text', 'address-line2')] : [],
    };
    const deliveries = [
      { key: 'envio', label: 'Envío a ' + c.name, hint: c.days, price: money(c.ship) },
      { key: 'recoger', label: 'Recoger en la tostión', hint: 'Villavicencio, Meta', price: 'Gratis' },
    ].map((d) => Object.assign(d, { on: s.delivery === d.key, pick: () => this.setState({ delivery: d.key }), border: s.delivery === d.key ? C.cafe : '#62453240' }));
    const pays = [{ key: 'pse', label: 'PSE, desde tu banco' }, { key: 'tarjeta', label: 'Tarjeta, en la pasarela de pago' }, { key: 'contraentrega', label: 'Contraentrega' }]
      .map((d) => Object.assign(d, { on: s.pay === d.key, pick: () => this.setState({ pay: d.key }), border: s.pay === d.key ? C.cafe : '#62453240' }));
    const formError = s.tried && (Object.keys(err).length || !s.cart.length)
      ? (!s.cart.length ? 'Tu carrito está vacío.' : 'Revisa los campos marcados para poder confirmar.')
      : '';

    const o = s.order;
    const orderKeys = [];
    if (o) o.items.forEach((it) => { const k = it.sub ? (it.sub.mode === 'fijo' ? it.sub.product : null) : it.key; if (k && orderKeys.indexOf(k) < 0) orderKeys.push(k); });
    const order = o
      ? { no: o.no,
          line: (o.name ? o.name + ', tu' : 'Tu') + ' pedido por ' + money(o.total) + (o.delivery === 'recoger' ? ' te espera en la tostión de Villavicencio.' : ' va camino a ' + o.city.name + '.') + (o.email ? ' Te escribimos a ' + o.email + ' en cada paso.' : ''),
          routeAria: 'Ruta ilustrada desde la tostión en Villavicencio hasta ' + o.city.name + '.',
          steps: [{ title: 'Tostión', when: 'Próximo martes (fecha de muestra)' }, { title: 'Empaque con fecha y lote', when: 'El mismo día' }, { title: 'Sale de Villavicencio', when: o.delivery === 'recoger' ? 'Te avisamos para recoger' : 'Al día siguiente' }, { title: o.delivery === 'recoger' ? 'Listo para recoger' : 'Llega a ' + o.city.name, when: o.delivery === 'recoger' ? 'Villavicencio, Meta' : o.city.days }],
          stamps: orderKeys.map((k) => { const x = BY[k], on = !!s.stamps[k]; return { name: x.name, place: x.farm + ' · ' + x.place, art: x.art, artToken: x.artToken, ring: x.label, fill: on ? x.bag : C.crema, on, label: on ? 'Lo probé' : 'Ya lo probé', toggle: () => this.setState({ stamps: Object.assign({}, s.stamps, { [k]: !on }) }) }; }),
          recipe: () => this.open(orderKeys[0] || 'lavado') }
      : { steps: [], stamps: [], recipe: () => this.go('catalogo') };

    const sb = s.sub;
    const subView = {
      fixed: sb.mode === 'fijo', explore: sb.mode === 'explora',
      modes: [['fijo', 'Siempre el mismo café'], ['explora', 'Explorador: un origen distinto cada vez']].map(([k, label]) => Object.assign({ label, on: sb.mode === k, pick: () => this.setState({ sub: Object.assign({}, sb, { mode: k }) }) }, pill(sb.mode === k))),
      products: PRODUCTS.map((x) => ({ name: x.name, bag: x.bag, art: x.bagArt, artToken: x.artToken, on: sb.product === x.key, border: sb.product === x.key ? C.cafe : 'transparent', pick: () => this.setState({ sub: Object.assign({}, sb, { product: x.key }) }) })),
      freqs: [2, 4].map((n) => Object.assign({ label: 'Cada ' + n + ' semanas', on: sb.freq === n, pick: () => this.setState({ sub: Object.assign({}, sb, { freq: n }) }) }, pill(sb.freq === n))),
      sizes: SIZES.map((x, i) => Object.assign({ label: x.label, on: sb.size === i, pick: () => this.setState({ sub: Object.assign({}, sb, { size: i }) }) }, pill(sb.size === i))),
      grinds: GRINDS.map((g) => Object.assign({ label: g.label, on: sb.grind === g.key, pick: () => this.setState({ sub: Object.assign({}, sb, { grind: g.key }) }) }, pill(sb.grind === g.key))),
      route: ['Lavado · Tolima', 'Honey · Huila', 'Regional · Meta', 'Natural · Tolima'],
      summary: 'Recibirás ' + SIZES[sb.size].label + ' de ' + (sb.mode === 'fijo' ? BY[sb.product].name : 'un origen distinto') + ', ' + GRINDS.find((g) => g.key === sb.grind).label.toLowerCase() + ', cada ' + sb.freq + ' semanas en ' + c.name + '.',
      price: money(this.subPrice(sb)),
    };

    return {
      is, nav, cities: CITIES, city: c, cartCount, cartAria: 'Carrito, ' + cartCount + (cartCount === 1 ? ' bolsa' : ' bolsas'), toast: s.toast,
      heroKm: dots(straight), emo, walk, brand, car, trailPts, trailSel, trailCls, replayTrail, heroFarm, farms, tastes, rec, moodTabs, moodOpts, mood, profile, stepsPreview,
      filters, sorts, cards, cardsEmpty: cards.length === 0, cardsCount: cards.length === 1 ? '1 café' : cards.length + ' cafés', filterHelp: help[s.filter],
      p: pv, sizes, grinds, qty: s.qty, lineTotal: money(priceOf(p.key, s.size) * s.qty), legend,
      hoverLine: s.hoverAlt == null ? dots(p.alt) + ' m' : dots(s.hoverAlt) + ' m s. n. m.',
      hoverHint: s.hoverAlt == null ? 'Es la altura de la finca. Pasa el cursor o el dedo por el relieve para medir otros puntos.' : (s.hoverAlt > p.alt ? dots(s.hoverAlt - p.alt) + ' m por encima de la finca.' : s.hoverAlt < p.alt ? dots(p.alt - s.hoverAlt) + ' m por debajo de la finca.' : 'Justo a la altura de la finca.'),
      highlight: s.highlight, bandLabel: s.highlight ? 'Ocultar la altura de la finca' : 'Marcar la altura de la finca',
      journeyIntro: 'Nueve pasos hacia atrás, de tu taza en ' + c.name + ' a la finca ' + p.farm + ': unos ' + dots(stagesAll[8].km) + ' km. Rebobina a tu ritmo o deja que se cuente solo.',
      stages, stopChips, st, routeAria: 'Mapa del recorrido hacia atrás: tu taza en ' + c.name + ', tostión en Villavicencio, trilla en ' + p.trilla + ' y finca ' + p.farm + '.',
      roast: s.roast, roastText: 'Tostión ' + roastWords[s.roast].toLowerCase() + ', nivel ' + s.roast + ' de 5',
      playing: s.playing, playLabel: s.playing ? 'Pausar' : 'Rebobinar hasta la finca',
      recipe, methods, cupsOpts,
      cart, fields, deliveries, pays, formError, hasFormError: !!formError, hasToast: !!s.toast,
      order, sub: subView,
      refs: { top: this.setTop, car: this.setCar, journey: this.setJourney, walk: this.setWalk, trail: this.setTrail, trailCanvas: this.sceneRef('trailCanvas', 'trail'), hero: this.sceneRef('hero', 'route'), cupIdea: this.sceneRef('cupIdea', 'cup'), terrain: this.sceneRef('terrain', 'terrain'), route: this.sceneRef('route', 'route'), bean: this.sceneRef('bean', 'bean'), cup: this.sceneRef('cup', 'cup'), cartMap: this.sceneRef('cartMap', 'route'), orderRoute: this.sceneRef('orderRoute', 'route') },
      sz: { cupArt: 220, wallpaperArt: 120, moodArt2: 220, moodArt: 200, portrait: 240, heroArt: 240, logo: 48, footerLogo: 56, tilt: -3, recArt: 140, cardArt: 168, label: 360, marker: 88, bean: 20, disc: 150, cartArt: 80, stamp: 96, subArt: 72, seal: 96, pattern: 56 },
      goHome: () => this.go('home'), goCatalog: () => this.go('catalogo'), goCart: () => this.go('carrito'), goCheckout: () => this.go('checkout'), goSub: () => this.go('suscripcion'),
      followCup: () => this.open('lavado', true),
      onCity: (e) => this.setState({ city: e.target.value }),
      qtyUp: () => this.setState({ qty: Math.min(20, s.qty + 1) }), qtyDown: () => this.setState({ qty: Math.max(1, s.qty - 1) }),
      addCurrent: () => this.addProduct(p.key, s.size, s.grind, s.qty),
      subThis: () => this.go('suscripcion', { sub: Object.assign({}, s.sub, { mode: 'fijo', product: p.key }) }),
      toggleBand: () => this.setState({ highlight: !s.highlight }),
      prevStage: () => { this.stopPlay(); this.setState({ stage: Math.max(0, s.stage - 1) }); },
      nextStage: () => { this.stopPlay(); this.setState({ stage: Math.min(8, s.stage + 1) }); },
      togglePlay: () => this.togglePlay(),
      toJourney: () => { this._wantJourney = true; this.forceUpdate(); },
      onRoast: (e) => this.setState({ roast: Number(e.target.value) }),
      confirm: (e) => this.confirm(e),
      addSub: () => this.add({ id: 'sub|' + JSON.stringify(sb), sub: Object.assign({}, sb), qty: 1 }, 'Agregaste una suscripción cada ' + sb.freq + ' semanas al carrito.'),
    };
  }
}

export { C, PRODUCTS, PERSONA, BY, CITIES, FARMS, ROASTERY, SIZES, GRINDS, STAGE_MAP, MOODS, TASTES, priceOf, money };
