const { seg, eo, eob, eio, lerp, TextFx } = kit;
// home 0-0.9, scroll to Honey 0.9-1.4, notes 1.6-2.2, tap 2.65, cart response 2.8-3.8
const SC_VIEW = 720;
kit.scene('screens', {
  init(kit) {
    kit.css('.screens-ill .illus-svg{width:100%;height:100%;display:block} .screens-logo .logo-svg{width:100%;height:auto;display:block} .screens-win p{margin:0}');
    const chip = (n, bg, ink) => '<span class="pill screens-chip" style="padding:10px 22px;background:' + bg + ';border:3px solid #624532;font-size:30px;font-weight:700;color:' + ink + '">' + n + '</span>';
    const home = '<div style="height:' + SC_VIEW + 'px;padding:44px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:26px">' +
      '<p class="eyebrow" style="font-size:26px;color:#7a6555">La idea</p>' +
      '<p style="font-family:var(--display, var(--sans, system-ui, sans-serif));font-size:82px;line-height:1.04;font-weight:300">Donde empieza otro mapa del café</p>' +
      '<p class="hand" style="font-size:48px;color:#81164b">Descubrimiento, cercanía y disfrute.</p>' +
      '<span class="pill" style="align-self:flex-start;padding:20px 36px;background:#81164b;color:#f6f3ed;font-size:34px;font-weight:700">Explora los cafés</span></div>';
    const prod = '<div style="height:' + SC_VIEW + 'px;display:flex;flex-direction:column">' +
      '<div class="c-luz" style="height:360px;flex:none;position:relative"><span class="pill" style="position:absolute;left:28px;top:26px;padding:10px 24px;background:#f6f3ed;font-size:32px;font-weight:700;transform:rotate(-4deg)">El tranquilo</span>' +
      '<div class="screens-ill" style="position:absolute;left:250px;top:20px;width:330px;height:330px;color:#624532">' + kit.module('perezoso.html') + '</div></div>' +
      '<div style="padding:28px 48px;display:flex;flex-direction:column;gap:20px">' +
      '<div style="display:flex;align-items:baseline;gap:20px"><p style="font-family:var(--display, var(--sans, system-ui, sans-serif));font-size:76px;line-height:1;font-weight:700">Honey</p><p class="hand" style="font-size:40px;color:#81164b">Dulzura sin prisa</p></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px">' + chip('Miel de caña', '#f2d139', '#624532') + chip('Durazno', '#f6f3ed', '#624532') + chip('Flor de azahar', '#db92ba', '#81164b') + '</div>' +
      '<span class="pill screens-btn" style="align-self:flex-start;padding:20px 36px;background:#81164b;color:#f6f3ed;font-size:34px;font-weight:700">Agregar 250 g</span></div></div>';
    kit.stage.append(kit.h('<div class="ground" style="--ground:#81164b">' + window.GQ.bands(kit, 1, 4) + '<div class="screens-cam" style="position:absolute;inset:0">' +
      '<div class="words" style="left:60px;top:280px;width:860px;gap:16px"><p class="eyebrow">Pantallazos</p>' +
      '<h2 class="line screens-line" style="font-size:96px">Un vistazo a la tienda</h2>' +
      '<p class="sub screens-note" style="font-size:34px">Prototipo · datos de muestra</p></div>' +
      '<div class="card paper screens-win" style="left:60px;top:640px;width:860px;height:830px;border:4px solid var(--second);display:flex;flex-direction:column;color:#624532">' +
      '<div style="height:110px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 40px;border-bottom:2px solid color-mix(in srgb, #624532 25%, transparent)"><div class="screens-logo" style="width:190px;color:#81164b">' + kit.module('logo.html') + '</div>' +
      '<span class="pill screens-cart" style="display:flex;align-items:center;gap:12px;padding:12px 26px;border:3px solid #624532;font-size:30px;font-weight:700">Carrito<b class="pill screens-count" style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;background:#81164b;color:#f6f3ed;font-size:26px">1</b></span></div>' +
      '<div style="position:relative;height:' + SC_VIEW + 'px;overflow:hidden"><div class="screens-scroll">' + home + prod + '</div>' +
      '<div class="screens-ring pill" style="position:absolute;left:150px;top:550px;width:120px;height:120px;border:6px solid #cd591c;box-sizing:border-box"></div>' +
      '<div class="screens-toast pill" style="position:absolute;left:40px;right:40px;top:24px;padding:24px 34px;background:#364831;color:#f6f3ed;font-size:34px;font-weight:700;display:flex;gap:18px;align-items:center"><span class="pill" style="width:22px;height:22px;background:#f2d139;flex:none"></span><span>Honey agregado al carrito</span></div>' +
      '</div></div></div></div>'));
    const q = (s) => kit.stage.querySelector(s);
    for (const k of ['cam', 'win', 'scroll', 'btn', 'count', 'ring', 'toast', 'note', 'ill']) this[k] = q('.screens-' + k).style;
    this.line = q('.screens-line');
    this.chips = [...kit.stage.querySelectorAll('.screens-chip')].map(e => e.style);
    this.bands = window.GQ.bandEls(kit);
  },
  render(t) {
    t = t * 3.8 / 5.4;
    window.GQ.drift(this.bands, t);
    TextFx.fadeFromRight(this.line, t, -0.1);
    this.note.opacity = eo(seg(t, 0.4, 0.8));
    this.cam.transformOrigin = '540px 1050px';
    this.cam.transform = 'scale(' + (1 + 0.03 * eio(seg(t, 0.4, 3.8))) + ')';
    const w = seg(t, 0, 0.5);
    this.win.opacity = eo(seg(t, 0, 0.15));
    this.win.transform = 'translateY(' + lerp(220, 0, eo(w)) + 'px)';
    this.scroll.transform = 'translateY(' + (-SC_VIEW * eio(seg(t, 0.9, 1.4))) + 'px)';
    this.ill.transform = 'scale(' + lerp(0.7, 1, eob(seg(t, 1.2, 1.6), 1.7)) + ') rotate(' + Math.sin(t * 1.5) * 4 + 'deg)';
    this.chips.forEach((s, i) => { const p = seg(t, 1.6 + i * 0.15, 1.95 + i * 0.15); s.transform = 'scale(' + eob(p, 1.9) + ')'; });
    const press = seg(t, 2.6, 2.8);
    this.btn.transform = 'scale(' + (1 - 0.06 * Math.sin(press * Math.PI)) + ')';
    this.btn.background = t > 2.7 ? '#364831' : '#81164b';
    const r = seg(t, 2.65, 3.0);
    this.ring.opacity = r > 0 && r < 1 ? 1 - r : 0;
    this.ring.transform = 'scale(' + lerp(0.4, 1.6, eo(r)) + ')';
    this.count.transform = 'scale(' + eob(seg(t, 2.75, 3.05), 1.9) + ')';
    const ts = eo(seg(t, 2.85, 3.2));
    this.toast.opacity = ts;
    this.toast.transform = 'translateY(' + lerp(40, 0, ts) + 'px)';
  },
});
