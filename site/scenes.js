// Original illustrations, drawn in code: flat layers in the site's colours.
const C = { night: '#12323a', river: '#1f6f78', reed: '#4f9a8f', sand: '#e9c893', stone: '#d39a5b', clay: '#b4562f', sun: '#f2b441', sky: '#f7e7c8', dusk: '#f3c79a', white: '#fffaf0' };
const p = (d, f, o) => `<path d="${d}" fill="${f}"${o ? ` opacity="${o}"` : ''}/>`;
const r = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
const c = (x, y, q, f) => `<circle cx="${x}" cy="${y}" r="${q}" fill="${f}"/>`;
const tri = (x, base, w, h, a, b) => p(`M${x} ${base}L${x + w / 2} ${base - h}L${x + w * 0.62} ${base}Z`, a) + p(`M${x + w / 2} ${base - h}L${x + w} ${base}L${x + w * 0.62} ${base}Z`, b);
const dune = (y, f) => p(`M0 ${y}C80 ${y - 18} 150 ${y + 12} 230 ${y - 4}S350 ${y - 16} 400 ${y}V300H0Z`, f);
const palm = (x, y, h) => p(`M${x} ${y}c-2 -${h * 0.4} 2 -${h * 0.8} 4 -${h}l4 1c-3 ${h * 0.4} -4 ${h * 0.7} -3 ${h - 1}Z`, C.night) + [[-26, -2], [-18, -16], [2, -22], [22, -14], [28, 2]].map(([a, b]) => p(`M${x + 5} ${y - h}q${a / 2} ${b - 8} ${a} ${b + 8}q${-a / 3} -6 ${-a} -8Z`, C.reed)).join('');
const column = (x, base, h) => r(x, base - h, 20, h, C.stone) + r(x + 12, base - h, 8, h, C.clay) + p(`M${x - 7} ${base - h}L${x + 27} ${base - h}L${x + 20} ${base - h + 16}H${x}Z`, C.sand) + r(x - 5, base - 8, 30, 8, C.clay);
const sail = (x, y, s) => p(`M${x} ${y}q${6 * s} -${46 * s} ${40 * s} -${78 * s}q${-2 * s} ${50 * s} ${-14 * s} ${78 * s}Z`, C.white) + p(`M${x - 22 * s} ${y}h${74 * s}q${-8 * s} ${13 * s} ${-20 * s} ${13 * s}h${-34 * s}q${-14 * s} 0 ${-20 * s} ${-13 * s}Z`, C.night);
const waves = (y, f) => [0, 1, 2].map(i => `<path d="M${-20 + i * 30} ${y + i * 22}q25 -8 50 0t50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0" fill="none" stroke="${f}" stroke-width="3" opacity=".5"/>`).join('');
const seated = (x, base, h) => r(x, base - h * 0.45, 34, h * 0.45, C.clay) + r(x + 3, base - h * 0.8, 28, h * 0.4, C.stone) + c(x + 17, base - h * 0.88, 11, C.stone) + p(`M${x + 2} ${base - h * 0.92}q15 -${h * 0.18} 30 0v16h-30Z`, C.clay) + c(x + 17, base - h * 0.86, 8, C.sand) + r(x + 4, base - h * 0.3, 11, h * 0.3, C.stone) + r(x + 19, base - h * 0.3, 11, h * 0.3, C.stone);
const minaret = (x, base, h) => r(x, base - h, 16, h, C.stone) + r(x + 10, base - h, 6, h, C.clay) + r(x - 5, base - h * 0.7, 26, 6, C.clay) + r(x + 2, base - h - 26, 12, 26, C.sand) + p(`M${x} ${base - h - 26}q8 -26 16 0Z`, C.clay) + r(x + 7, base - h - 54, 2, 14, C.night);
const dome = (x, base, w, h) => r(x, base - h, w, h, C.sand) + p(`M${x + 6} ${base - h}q${w / 2 - 6} -${w * 0.75} ${w - 12} 0Z`, C.clay) + [0.22, 0.5, 0.78].map(k => p(`M${x + w * k - 7} ${base}v-${h * 0.45}q7 -14 14 0v${h * 0.45}Z`, C.night)).join('');

const S = {
  pyramids: () => c(300, 92, 38, C.sun) + dune(214, C.dusk) + tri(176, 236, 130, 92, C.sand, C.stone) + tri(40, 240, 190, 138, C.sand, C.clay) + tri(268, 240, 84, 56, C.sand, C.stone) + dune(236, C.stone) + palm(356, 262, 58) + dune(266, C.clay),
  step: () => c(92, 88, 36, C.sun) + dune(216, C.dusk) + [0, 1, 2, 3, 4, 5].map(i => r(90 + i * 18, 238 - (i + 1) * 23, 220 - i * 36, 23, i % 2 ? C.stone : C.sand) + r(90 + i * 18 + (220 - i * 36) * 0.66, 238 - (i + 1) * 23, (220 - i * 36) * 0.34, 23, C.clay)).join('') + dune(238, C.stone) + dune(268, C.clay),
  bent: () => c(318, 84, 34, C.sun) + dune(214, C.dusk) + p('M70 240L112 150L180 100L210 240Z', C.sand) + p('M180 100L248 150L290 240H210Z', C.clay) + tri(282, 240, 90, 52, C.sand, C.stone) + dune(236, C.stone) + dune(266, C.clay),
  museum: () => c(330, 80, 32, C.sun) + dune(220, C.dusk) + tri(18, 226, 92, 62, C.sand, C.stone) + p('M70 250L120 120H400V250Z', C.sand) + [0, 1, 2, 3, 4, 5, 6].map(i => p(`M${126 + i * 40} 250L${146 + i * 40} 150L${166 + i * 40} 250Z`, i % 2 ? C.stone : C.clay)).join('') + seated(206, 252, 110) + r(0, 250, 400, 50, C.clay),
  columns: () => c(72, 78, 34, C.sun) + dune(226, C.dusk) + r(60, 84, 300, 20, C.clay) + r(50, 72, 320, 14, C.sand) + [74, 138, 202, 266, 330].map(x => column(x, 256, 152)).join('') + r(0, 254, 400, 46, C.stone) + dune(276, C.clay),
  felucca: () => c(292, 104, 40, C.sun) + dune(176, C.stone) + palm(52, 186, 62) + palm(86, 186, 46) + palm(352, 184, 54) + r(0, 182, 400, 118, C.river) + waves(204, C.reed) + sail(160, 236, 1.35) + sail(318, 206, 0.5),
  colossi: () => p('M30 260L64 70H336L370 260Z', C.sand) + r(64, 70, 272, 18, C.stone) + [78, 138, 226, 286].map(x => seated(x, 256, 150)).join('') + p('M186 256v-70h28v70Z', C.night) + r(0, 254, 400, 46, C.stone) + dune(276, C.clay),
  sea: () => c(88, 96, 40, C.sun) + r(0, 168, 400, 132, C.river) + p('M240 168q40 -42 90 -46t70 46Z', C.stone) + r(316, 78, 22, 60, C.sand) + r(331, 78, 7, 60, C.clay) + r(310, 72, 34, 8, C.clay) + r(320, 54, 14, 18, C.white) + waves(192, C.reed) + sail(120, 238, 0.95) + p('M0 300q90 -38 190 -22t210 -6v28Z', C.sand),
  minaret: () => c(322, 88, 36, C.sun) + dune(224, C.dusk) + dome(150, 258, 120, 84) + minaret(112, 258, 160) + minaret(290, 258, 130) + dome(20, 262, 78, 52) + r(0, 256, 400, 44, C.clay),
  bazaar: () => r(0, 60, 400, 240, C.stone) + [0, 1, 2].map(i => p(`M${14 + i * 130} 300V168q52 -86 104 0V300Z`, C.night)).join('') + [40, 92, 168, 222, 300, 352].map((x, i) => `<path d="M${x} 60V${120 + (i % 3) * 22}" stroke="${C.night}" stroke-width="2"/>` + p(`M${x - 11} ${130 + (i % 3) * 22}q11 -20 22 0l-5 24h-12Z`, i % 2 ? C.sun : C.sky)).join('') + r(0, 52, 400, 14, C.clay)
};

function scene(kind, label) {
  const bg = kind === 'colossi' || kind === 'bazaar' ? C.dusk : C.sky;
  return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${r(0, 0, 400, 300, bg)}${(S[kind] || S.pyramids)()}</svg>`;
}

// The wide picture on the home page: the whole trip in one line, from the pyramids to the sea.
function panorama() {
  const at = (x, s) => `<g transform="translate(${x} 0)">${s}</g>`;
  return `<svg viewBox="0 0 1600 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${r(0, 0, 1600, 520, C.sky)}${c(1060, 150, 74, C.sun)}${p('M0 330C260 280 420 360 720 320S1220 290 1600 330V520H0Z', C.dusk)}` +
    at(90, tri(150, 372, 190, 130, C.sand, C.stone) + tri(-20, 384, 290, 214, C.sand, C.clay)) +
    at(470, minaret(40, 376, 170) + dome(76, 376, 130, 84) + minaret(230, 376, 130)) +
    at(760, r(30, 196, 260, 18, C.clay) + r(20, 184, 280, 14, C.sand) + [44, 104, 164, 224].map(x => column(x, 376, 162)).join('')) +
    at(1100, p('M10 384L34 200H256L280 384Z', C.sand) + [44, 96, 158, 210].map(x => seated(x, 382, 140)).join('')) +
    p('M0 372H1600V520H0Z', C.stone) + p('M0 400C300 372 520 436 820 404S1320 380 1600 408V520H0Z', C.river) +
    `<path d="M40 452q40 -12 80 0t80 0 80 0 80 0M700 468q40 -12 80 0t80 0 80 0 80 0M1180 450q40 -12 80 0t80 0 80 0" fill="none" stroke="${C.reed}" stroke-width="4" opacity=".6"/>` +
    sail(420, 462, 1.25) + sail(1010, 446, 0.8) + palm(30, 388, 84) + palm(70, 386, 62) + palm(1450, 388, 90) + palm(1496, 388, 66) + palm(730, 384, 54) + '</svg>';
}
module.exports = { scene, panorama, C };
