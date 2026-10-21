const { seg, eo, eob, eio, lerp, TextFx } = kit;
// logo by 0.35, headline by ~1.0, call to action by 1.1, held to the end
kit.scene('soon', {
  init(kit) {
    kit.stage.append(kit.h('<div class="ground">' + window.GQ.bands(kit, 3, 2) +
      '<div class="soon-logo" style="position:absolute;left:190px;top:290px;width:700px;color:var(--second)">' + kit.module('logo.html') + '</div>' +
      '<div class="words" style="left:60px;top:640px;width:860px;align-items:center;text-align:center;gap:30px">' +
      '<p class="hand soon-hand" style="font-size:72px">Algo bueno se está tostando</p>' +
      '<h2 class="line soon-line" style="font-size:100px">Nuestra tienda en línea, muy pronto</h2>' +
      '<div class="soon-under pill" style="width:300px;height:14px;background:var(--main);transform-origin:50% 50%"></div></div>' +
      '<div class="soon-cta pill" style="position:absolute;left:70px;width:850px;top:1280px;padding:30px 0;box-sizing:border-box;background:var(--accent);color:var(--ground);text-align:center;font-size:46px;font-weight:700">Síguenos para ver el próximo paso</div>' +
      '</div>'));
    for (const k of ['logo', 'hand', 'under', 'cta']) this[k] = kit.stage.querySelector('.soon-' + k).style;
    this.line = kit.stage.querySelector('.soon-line');
    this.logo.transformOrigin = '50% 50%';
    this.bands = window.GQ.bandEls(kit);
  },
  render(t) {
    t = t * 3 / 4.5;
    window.GQ.drift(this.bands, t);
    const l = seg(t, -0.05, 0.35);
    this.logo.opacity = eo(seg(t, -0.05, 0.1));
    this.logo.transform = 'scale(' + (lerp(0.3, 1, eob(l, 1.7)) * (1 + Math.sin(t * 2.1) * 0.006 * seg(t, 0.6, 1.2))) + ')';
    const h = eo(seg(t, 0.2, 0.5));
    this.hand.opacity = h;
    this.hand.transform = 'translateX(' + lerp(28, 0, h) + 'px) rotate(-2deg)';
    TextFx.fadeFromRight(this.line, t, 0.3, { stagger: 0.05 });
    this.under.transform = 'scaleX(' + eio(seg(t, 0.8, 1.1)) + ')';
    const c = seg(t, 0.8, 1.15);
    this.cta.opacity = eo(seg(t, 0.8, 0.9));
    this.cta.transform = 'translateY(' + lerp(60, 0, eo(c)) + 'px) scale(' + (eob(c, 1.6) * (1 + 0.012 * Math.sin(Math.max(0, t - 1.4) * 3))) + ')';
  },
});
