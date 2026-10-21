const { seg, eo, eob, eio, lerp, TextFx } = kit;
kit.scene('hook', {
  init(kit) {
    kit.css('.hook-ill .illus-svg{width:100%;height:100%;display:block}');
    const chip = (n) => '<span class="pill hook-chip" style="padding:10px 22px;border:3px solid #624532;font-size:28px;font-weight:700;color:#624532">' + n + '</span>';
    kit.stage.append(kit.h('<div class="ground">' + window.GQ.bands(kit, 4, 2) +
      '<div class="hook-cam" style="position:absolute;inset:0">' +
      '<div class="words" style="left:60px;top:270px;width:860px;gap:22px">' +
      '<h1 class="line hook-line">Tu próximo café empieza aquí</h1>' +
      '<p class="sub hook-sub" style="font-size:48px;line-height:1.2;color:var(--second)">Acompáñame a crear nuestra tienda en línea</p></div>' +
      '<div class="card paper hook-card" style="left:60px;top:720px;width:860px;height:700px;display:flex;border:4px solid var(--second)">' +
      '<div class="c-luz" style="width:380px;flex:none;position:relative"><span class="pill hook-voice" style="position:absolute;left:24px;top:24px;padding:10px 22px;background:#f6f3ed;font-size:30px;font-weight:700;color:#624532">El tranquilo</span>' +
      '<div class="hook-ill" style="position:absolute;left:20px;top:150px;width:340px;height:340px;color:#624532">' + kit.module('perezoso.html') + '</div></div>' +
      '<div style="flex:1;min-width:0;padding:44px 36px;display:flex;flex-direction:column;gap:20px;color:#624532">' +
      '<p class="eyebrow" style="margin:0;font-size:24px;color:#7a6555">Nuestros cafés</p>' +
      '<p style="margin:0;font-family:var(--display, var(--sans, system-ui, sans-serif));font-size:100px;line-height:1;font-weight:700">Honey</p>' +
      '<p style="margin:0;font-size:34px;line-height:1.25;color:#000000">Dulzura sin prisa</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px">' + chip('Miel de caña') + chip('Durazno') + '</div>' +
      '<span class="pill hook-btn" style="align-self:flex-start;margin-top:auto;padding:20px 34px;background:#81164b;color:#f6f3ed;font-size:32px;font-weight:700">Agregar 250 g</span>' +
      '<p style="margin:0;font-size:22px;color:#7a6555">Notas de muestra</p></div></div>' +
      '<div class="hook-sticker pill" style="position:absolute;left:400px;top:665px;padding:12px 30px;background:#81164b;transform-origin:50% 50%"><p class="hand" style="margin:0;font-size:60px;color:#f5e380">Del grano al código</p></div>' +
      '</div></div>'));
    const q = (s) => kit.stage.querySelector(s);
    for (const k of ['cam', 'sub', 'card', 'voice', 'ill', 'sticker', 'btn']) this[k] = q('.hook-' + k).style;
    this.line = q('.hook-line');
    this.chips = [...kit.stage.querySelectorAll('.hook-chip')].map(e => e.style);
    this.bands = window.GQ.bandEls(kit);
  },
  render(t) {
    t = t * 2.8 / 3.6;
    window.GQ.drift(this.bands, t);
    TextFx.fadeFromRight(this.line, t, -0.7, { stagger: 0.07 });
    const s = eo(seg(t, 0.3, 0.75));
    this.sub.opacity = s;
    this.sub.transform = 'translateX(' + lerp(26, 0, s) + 'px)';
    const c = seg(t, -0.4, 0.3);
    this.card.opacity = eo(seg(t, -0.4, -0.1));
    this.card.transform = 'translateY(' + lerp(60, 0, eo(c)) + 'px) scale(' + lerp(0.94, 1, eo(c)) + ')';
    this.ill.transform = 'scale(' + lerp(0.6, 1, eob(seg(t, -0.2, 0.45), 1.7)) + ') rotate(' + Math.sin(t * 1.4) * 4 + 'deg)';
    this.voice.transform = 'rotate(-4deg) scale(' + eob(seg(t, 0.35, 0.65), 1.8) + ')';
    this.chips.forEach((st, i) => { st.transform = 'scale(' + eob(seg(t, 0.75 + i * 0.15, 1.05 + i * 0.15), 1.8) + ')'; });
    const k = seg(t, 1.05, 1.5);
    this.sticker.opacity = eo(seg(t, 1.05, 1.15));
    this.sticker.transform = 'rotate(' + lerp(-14, -5, eo(k)) + 'deg) scale(' + eob(k, 1.9) + ')';
    this.btn.transform = 'scale(' + (1 + 0.04 * Math.sin(Math.PI * seg(t, 1.7, 2.1))) + ')';
    const out = eio(seg(t, 2.35, 2.8));
    this.cam.transformOrigin = '540px 900px';
    this.cam.transform = 'scale(' + (1 + 0.02 * t / 2.8 + out * 0.03) + ')';
  },
});
