const { seg, eo, eio, lerp, TextFx } = kit;
const CL_PROMPT = 'Arma la ficha del Honey con nuestra marca';
const CL_STEPS = ['Leyendo tokens.json y el brandbook', 'Escribiendo FichaProducto.jsx'];
const CL_CODE = ['<OriginLabel product="honey" />', '<RoastScale level={2} />', '<Button>Agregar al carrito</Button>'];
// shared with score.js: steps at 1.05 / 1.3, done line + chime at 2.5
const CL_T = { steps: 1.05, code: 1.55, done: 2.5 };
kit.scene('claude', {
  init(kit) {
    let code = '';
    CL_CODE.forEach((c) => { code += '<div class="claude-code" style="white-space:pre">' + kit.esc(c) + '</div>'; });
    let steps = '';
    CL_STEPS.forEach((s) => { steps += '<div class="claude-step" style="display:flex;gap:18px"><span style="color:var(--main)">●</span><span>' + kit.esc(s) + '</span></div>'; });
    kit.stage.append(kit.h('<div class="ground" style="--ground:#364831">' + window.GQ.bands(kit, 0, 3) +
      '<div class="words" style="left:60px;top:280px;width:860px"><p class="eyebrow">Claude trabaja</p>' +
      '<h2 class="line claude-line">Así toma forma la tienda</h2></div>' +
      '<div class="card panel claude-term mono" style="left:60px;top:640px;width:860px;height:820px;font-size:31px;line-height:1.5">' +
      '<div style="display:flex;gap:14px;padding:26px 32px;border-bottom:2px solid color-mix(in srgb, var(--second) 14%, transparent)"><i class="pill c-platea" style="width:22px;height:22px"></i><i class="pill c-honey" style="width:22px;height:22px"></i><i class="pill c-brote" style="width:22px;height:22px"></i><span style="margin-left:16px;font-size:24px;opacity:.7">guates / tienda</span></div>' +
      '<div style="padding:30px 36px;display:flex;flex-direction:column;gap:20px">' +
      '<div style="color:var(--accent)">&gt; <span class="claude-typed"></span><span class="claude-caret" style="display:inline-block;width:16px;height:34px;background:var(--second);vertical-align:-6px;margin-left:4px"></span></div>' +
      steps +
      '<div class="claude-box" style="margin-top:8px;padding:24px 28px;border-radius:20px;background:color-mix(in srgb, var(--ground) 70%, var(--second));color:#f5e380;display:flex;flex-direction:column;gap:6px">' + code + '</div>' +
      '<div class="claude-done" style="color:#91ad80">✓ Lista la ficha, con tokens de la marca</div>' +
      '</div></div></div>'));
    this.line = kit.stage.querySelector('.claude-line');
    this.typedEl = kit.stage.querySelector('.claude-typed');
    this.caret = kit.stage.querySelector('.claude-caret').style;
    this.term = kit.stage.querySelector('.claude-term').style;
    this.steps = [...kit.stage.querySelectorAll('.claude-step')].map(e => e.style);
    this.codes = [...kit.stage.querySelectorAll('.claude-code')];
    this.box = kit.stage.querySelector('.claude-box').style;
    this.done = kit.stage.querySelector('.claude-done').style;
    this.typed = kit.typist(CL_PROMPT, 0.2, 60);
    this.bands = window.GQ.bandEls(kit);
  },
  render(t) {
    t = t * 3.2 / 4.6;
    window.GQ.drift(this.bands, t);
    TextFx.fadeFromRight(this.line, t, -0.1);
    const enter = eo(seg(t, 0, 0.45));
    this.term.transform = 'translateY(' + lerp(80, 0, enter) + 'px) scale(' + (1 + t * 0.006) + ')';
    this.term.opacity = enter;
    this.typedEl.textContent = this.typed.at(t);
    const typing = t < this.typed.end + 0.15;
    this.caret.opacity = typing || Math.floor(t / 0.53) % 2 === 0 ? 1 : 0;
    this.steps.forEach((s, i) => { const p = eo(seg(t, CL_T.steps + i * 0.25, CL_T.steps + i * 0.25 + 0.3)); s.opacity = p; s.transform = 'translateX(' + lerp(24, 0, p) + 'px)'; });
    this.box.opacity = eo(seg(t, CL_T.code, CL_T.code + 0.25));
    this.codes.forEach((el, i) => { el.textContent = kit.streamed(CL_CODE[i], t, CL_T.code + 0.1 + i * 0.25, 120, 4); });
    const p = eo(seg(t, CL_T.done, CL_T.done + 0.25));
    this.done.opacity = p;
    this.done.transform = 'translateY(' + lerp(16, 0, p) + 'px)';
  },
});
