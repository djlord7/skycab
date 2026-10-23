// Writes true-scale stencil PDFs from geometry.js (no dependencies).
//   node make-pdf.js            -> SkyCab-stencils-A4.pdf + SkyCab-stencils-A0.pdf + full-size cardboard sheet prints (A0) + A2 extras
//   node make-pdf.js '{"hipW":24}' '{"only3":true,"sheetIn":[25,38]}'  (override sizes / sheet options as JSON)
const fs = require('fs');
const path = require('path');
const G = require('./geometry.js');
const P = require('./pdf-kit.js');

const over = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const model = G.build(over);
const out = __dirname;
const write = (name, r) => { fs.writeFileSync(path.join(out, name), r.pdf.bytes(), 'latin1'); return r.n; };

const n = write('SkyCab-stencils-A4.pdf', P.makeA4(model));
const n0 = write('SkyCab-stencils-A0.pdf', P.makeA0(model));
// cardboard sheet prints: defaults match the page (only 3-ply, 25 x 38 in sheets)
const sheetOpts = Object.assign({ only3: true, sheetIn: [25, 38] }, process.argv[3] ? JSON.parse(process.argv[3]) : {});
const base = { only3: sheetOpts.only3, sheetW: sheetOpts.sheetIn[1] * 2.54, sheetH: sheetOpts.sheetIn[0] * 2.54 };
const ns = write('SkyCab-cardboard-sheets-A0-waves-short-side.pdf', P.makeSheetPrints(model, Object.assign({ flute: 'short' }, base)));
const nl = write('SkyCab-cardboard-sheets-A0-waves-long-side.pdf', P.makeSheetPrints(model, Object.assign({ flute: 'long' }, base)));
const used = write('SkyCab-other-parts-A2.pdf', P.makeExtrasA2(model));
const rs = write('SkyCab-cardboard-sheets-36in-roll-waves-short-side.pdf', P.makeSheetPrints(model, Object.assign({ flute: 'short', roll: true }, base)));
write('SkyCab-cardboard-sheets-36in-roll-waves-long-side.pdf', P.makeSheetPrints(model, Object.assign({ flute: 'long', roll: true }, base)));
write('SkyCab-other-parts-36in-roll.pdf', P.makeExtrasA2(model, { roll: true }));
// one file for the print shop: cardboard sheets first, other parts last
write('SkyCab-PRINT-THIS-36in-roll.pdf', P.makeShopPrints(model, Object.assign({ flute: 'short', roll: true }, base)));
// just the tube-sized pieces on A4, for anyone who printed before measuring their tube
write('SkyCab-tube-pieces-A4.pdf', P.makeA4(Object.assign({}, model, { parts: model.parts.filter(q => ['O', 'P', 'Y', 'N'].includes(q.id)) })));
// one roll page: the pieces that changed for the 7 cm tubes, and full-size wall bend-line templates
write('SkyCab-corrections-7cm-tubes-36in-roll.pdf', P.makeFixRoll(model));
write('SkyCab-PRINT-THIS-A0-A2.pdf', P.makeShopPrints(model, Object.assign({ flute: 'short' }, base)));
console.log('A4 pages:', n, ' A0 sheets:', n0, ' cardboard sheet prints:', ns, '(short) /', nl, '(long);  A2 pages (other parts):', used, ' 36in roll sheets:', rs);
