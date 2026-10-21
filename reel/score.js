kit.score(function (S, T) {
  // scenes are slowed by these factors (new dur / old dur); offsets below are in the original scene seconds
  const K = { hook: 3.6 / 2.8, brandbook: 5 / 3.6, claude: 4.6 / 3.2, screens: 5.4 / 3.8, soon: 4.5 / 3 };
  const at = (id, s) => T[id] + s * K[id];
  const BPM = 100;
  S.tempo(BPM, { t0: 0 });
  S.program('pad', 'pad', { rev: 0.6 }); S.program('keys', 'ep'); S.program('bass', 'bass'); S.program('mallet', 'marimba', { pan: 0.2 });
  S.chord('pad', ['D3', 'A3', 'F#4'], { t: 0, dur: T.claude, vel: 34 });
  S.note('mallet', 'A4', { t: 0, dur: 0.5, vel: 52 });
  S.fx('pop', at('hook', 0.4), { vel: 45 });
  S.fx('pop', at('hook', 0.85), { vel: 42 }); S.fx('pop', at('hook', 1.0), { vel: 42, pitch: 2 });
  S.fx('boing', at('hook', 1.2), { vel: 62 });
  [0, 1, 2, 3, 4].forEach(i => S.fx('pop', at('brandbook', 0.4 + i * 0.16), { vel: 48, pitch: i * 2 }));
  S.run('mallet', ['D5', 'E5', 'F#5', 'A5', 'B5'], { t: at('brandbook', 0.4), step: 0.16 * K.brandbook, vel: 46 });
  S.fx('sparkle', at('brandbook', 1.25), { vel: 40 });
  S.fx('thud', at('brandbook', 1.95), { vel: 55 }); S.fx('thud', at('brandbook', 2.15), { vel: 55 });
  const g0 = Math.ceil(S.toBeat(T.claude)), g1 = Math.floor(S.toBeat(T.soon));
  const bars = Math.floor((g1 - g0) / 4);
  S.drums({ kick: 'x...x...', sidestick: '..x...x.', hat: 'oxoxoxox' }, { from: g0, repeat: bars, vel: 70 });
  for (let b = 0; b < bars; b++) {
    const ch = b % 2 ? ['G3', 'B3', 'D4', 'F#4'] : ['D3', 'A3', 'D4', 'F#4'];
    S.chord('keys', ch, { beat: g0 + b * 4, beats: 3.5, vel: 50 });
    S.note('bass', b % 2 ? 'G2' : 'D2', { beat: g0 + b * 4, beats: 1.5, vel: 76 });
    S.note('bass', b % 2 ? 'D2' : 'A2', { beat: g0 + b * 4 + 2, beats: 1, vel: 66 });
  }
  const ticks = []; for (let i = 0; i < 41; i += 2) ticks.push(at('claude', 0.2 + i / 60) + (i % 3) * 0.004);
  S.ticks(ticks, { vel: 28 });
  S.fx('pop', at('claude', 1.05), { vel: 40 }); S.fx('pop', at('claude', 1.3), { vel: 40 });
  S.fx('chime', at('claude', 2.5), { vel: 55 });
  S.fx('whoosh', at('screens', 0.9), { dur: 0.7 }); S.fx('sparkle', at('screens', 1.3), { vel: 42 });
  [0, 1, 2].forEach(i => S.fx('pop', at('screens', 1.75 + i * 0.15), { vel: 48, pitch: i * 2 }));
  S.fx('click', at('screens', 2.65), { vel: 60 }); S.fx('chime', at('screens', 2.9), { vel: 58 });
  S.fx('revswell', at('soon', 0.3), { dur: 1.3 });
  S.run('mallet', ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6'], { t: T.soon - 0.6, step: 0.1, vel: 50, cresc: 8 });
  S.chord('keys', ['D3', 'A3', 'D4', 'F#4', 'A4'], { t: at('soon', 0.3), dur: 3.6, vel: 72 });
  S.note('bass', 'D2', { t: at('soon', 0.3), dur: 3, vel: 84 });
  S.drum('kick', { t: at('soon', 0.3), vel: 96 }); S.drum('crash', { t: at('soon', 0.3), vel: 50 });
  S.chord('pad', ['D3', 'A3', 'F#4'], { t: at('soon', 0.3), dur: 3.7, vel: 40 });
  S.fx('ding', at('soon', 1.0), { vel: 48 });
  S.master({ gain: -6, fadeOut: 1.2 });
});
