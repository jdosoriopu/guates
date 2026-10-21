// Tone-on-tone stripes (rhythm of patron-franjas) filling the edges Instagram covers; row args kept for the scenes' calls
window.GQ = {
  bands(kit, topRow, bottomRow) {
    let r = '';
    for (let x = 0; x < 1400; x += 118) r += '<rect x="' + x + '" y="0" width="58" height="400"/>';
    const b = (top, h) => '<div style="position:absolute;left:0;top:' + top + 'px;width:1080px;height:' + h + 'px;overflow:hidden"><svg class="gq-band-svg" viewBox="0 0 1400 ' + h + '" style="position:absolute;left:0;top:0;width:1400px;height:' + h + 'px;fill:color-mix(in srgb, var(--second) 7%, var(--ground))">' + r + '</svg></div>';
    return b(0, 170) + b(1540, 380);
  },
  bandEls(kit) { return [...kit.stage.querySelectorAll('.gq-band-svg')].map(e => e.style); },
  drift(els, t) { els.forEach((s, i) => { s.transform = 'translateX(' + (-(t * 18) - i * 59) + 'px)'; }); },
};
