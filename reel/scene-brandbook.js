const { seg, eo, eob, eio, lerp, TextFx } = kit;
const BB_COLORS = ['c-naranja', 'c-regional', 'c-honey', 'c-natural', 'c-lavado', 'c-platea'];
// coffee, persona, animal module, tile colour, illustration ink, label ink, x, y
const BB_ANIMALS = [
  ['Regional', 'El anfitrión', 'chiguiro', '#f6f3ed', '#624532', '#624532', 60, 560],
  ['Lavado', 'El explorador', 'nutria', '#9db5ec', '#4e71f0', '#364831', 355, 560],
  ['Natural', 'El inquieto', 'colibri', '#91ad80', '#364831', '#364831', 650, 560],
  ['Honey', 'El tranquilo', 'perezoso', '#f5e380', '#624532', '#624532', 207, 905],
  ['Platea', 'El elegante', 'garza', '#db92ba', '#81164b', '#81164b', 502, 905]];
kit.scene('brandbook', {
  init(kit) {
    kit.css('.bb-ill .illus-svg{width:100%;height:100%;display:block}');
    let sw = '';
    for (const c of BB_COLORS) sw += '<span class="' + c + '" style="width:66px;height:66px;border-radius:16px;outline:2px solid color-mix(in srgb, var(--ground) 20%, transparent)"></span>';
    let tiles = '';
    BB_ANIMALS.forEach(([name, persona, mod, bg, ink, lab, x, y]) => {
      tiles += '<div class="bb-tile" style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:270px;height:330px;border-radius:30px;background:' + bg + ';border:3px solid var(--second);box-sizing:border-box;display:flex;flex-direction:column;align-items:center;transform-origin:50% 100%">' +
        '<div class="bb-ill" style="width:212px;height:212px;margin-top:12px;color:' + ink + ';transform-origin:50% 90%">' + kit.module(mod + '.html') + '</div>' +
        '<p style="margin:2px 0 0;font-family:var(--display, var(--sans, system-ui, sans-serif));font-size:34px;line-height:1.1;font-weight:700;color:' + lab + '">' + name + '</p>' +
        '<p style="margin:0;font-family:var(--serif, cursive);font-size:30px;line-height:1.1;color:' + lab + '">' + persona + '</p></div>';
    });
    kit.stage.append(kit.h('<div class="ground">' + window.GQ.bands(kit, 2, 1) + '<div class="bb-cam" style="position:absolute;inset:0">' +
      '<div class="words" style="left:60px;top:280px;width:860px;gap:18px"><p class="eyebrow">Nuestra marca</p>' +
      '<h2 class="line bb-line" style="font-size:92px">Primero, la marca</h2>' +
      '<p class="hand bb-note" style="font-size:58px">cada café tiene su animal</p></div>' +
      tiles +
      '<div class="card paper bb-a" style="left:60px;top:1258px;width:540px;height:212px;padding:28px 34px;display:flex;flex-direction:column;gap:18px"><p class="eyebrow" style="margin:0;color:var(--main)">Color</p>' +
      '<div style="display:flex;gap:12px">' + sw + '</div></div>' +
      '<div class="card c-natural bb-b" style="left:620px;top:1258px;width:300px;height:212px;padding:22px 28px;display:flex;flex-direction:column;gap:2px;color:var(--second)">' +
      '<p class="line" style="margin:0;font-size:84px;line-height:1;color:var(--accent)">Aa</p>' +
      '<p style="margin:0;font-size:28px;font-weight:700">Roboto Slab</p>' +
      '<p class="hand" style="margin:0;font-size:38px">Caveat Brush</p></div>' +
      '</div></div>'));
    for (const k of ['a', 'b', 'note', 'cam']) this[k] = kit.stage.querySelector('.bb-' + k).style;
    this.line = kit.stage.querySelector('.bb-line');
    this.tiles = [...kit.stage.querySelectorAll('.bb-tile')].map(e => e.style);
    this.ills = [...kit.stage.querySelectorAll('.bb-ill')].map(e => e.style);
    this.bands = window.GQ.bandEls(kit);
  },
  render(t) {
    t = t * 3.6 / 5;
    window.GQ.drift(this.bands, t);
    TextFx.fadeFromRight(this.line, t, -0.2);
    this.cam.transformOrigin = '540px 900px';
    this.cam.transform = 'scale(' + (1 + 0.03 * eio(seg(t, 0, 3.6))) + ')';
    this.tiles.forEach((s, i) => {
      const t0 = 0.25 + i * 0.16;
      const p = seg(t, t0, t0 + 0.45);
      s.opacity = eo(seg(t, t0, t0 + 0.1));
      s.transform = 'translateY(' + lerp(140, 0, eo(p)) + 'px) scale(' + eob(p, 1.8) + ') rotate(' + ((i % 2 ? 2.5 : -2.5) * eo(p)) + 'deg)';
    });
    const a = this.ills, w = Math.max(0, t - 0.6);
    a[0].transform = 'rotate(' + Math.sin(w * 2.2) * 4 + 'deg)';
    a[1].transform = 'translateY(' + Math.sin(w * 5) * 8 + 'px) rotate(' + Math.sin(w * 5 + 1) * 3 + 'deg)';
    a[2].transform = 'translate(' + Math.sin(w * 3) * 10 + 'px,' + Math.sin(w * 9) * 6 + 'px) rotate(' + Math.sin(w * 3) * 6 + 'deg)';
    a[3].transform = 'rotate(' + Math.sin(w * 1.3) * 6 + 'deg)';
    a[4].transform = 'scaleY(' + (1 + Math.sin(w * 3.4) * 0.035) + ') rotate(' + Math.sin(w * 1.7) * 2 + 'deg)';
    const n = eo(seg(t, 1.2, 1.65));
    this.note.opacity = n;
    this.note.transform = 'translateX(' + lerp(28, 0, n) + 'px) rotate(-2deg)';
    const rise = (s, t0) => { const p = seg(t, t0, t0 + 0.5); s.opacity = eo(seg(t, t0, t0 + 0.15)); s.transform = 'translateY(' + lerp(260, 0, eob(p, 1.4)) + 'px)'; };
    rise(this.a, 1.6); rise(this.b, 1.8);
  },
});
