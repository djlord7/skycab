// True-scale stencil PDFs (no dependencies). Used by make-pdf.js (Node) and by index.html (download buttons).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./geometry.js'));
  else root.SkyCabPDF = factory(root.SkyCab);
})(typeof self !== 'undefined' ? self : this, function (G) {
  'use strict';
  const K = 72 / 25.4; // mm -> pt
  // rough Helvetica character widths (in em), close enough to centre labels and keep them apart
  const em = (t, bold) => [...String(t)].reduce((w, c) => w + (/[A-Z]/.test(c) ? (/[IJ]/.test(c) ? 0.5 : /[MW]/.test(c) ? 0.9 : 0.72)
    : /[0-9]/.test(c) ? 0.56 : /[a-z]/.test(c) ? (/[ijlft]/.test(c) ? 0.3 : /[mw]/.test(c) ? 0.85 : 0.56) : c === ' ' ? 0.28 : 0.35) * (bold ? 1.05 : 1), 0);

  class PDF {
    constructor() { this.pages = []; }
    page(w, h) { const pg = { w, h, ops: [] }; this.pages.push(pg); this.cur = pg; return this; }
    op(s) { this.cur.ops.push(s); return this; }
    X(mm) { return (mm * K).toFixed(2); }
    Y(mm) { return ((this.cur.h - mm) * K).toFixed(2); }
    style(kind) {
      const S = {
        cut: ['0 0 0', 0.9, '[] 0'], fold: ['0.1 0.25 0.65', 0.7, '[6 3] 0'], center: ['0.85 0.1 0.1', 0.9, '[9 3 2 3] 0'],
        mark: ['0.35 0.45 0.6', 0.6, '[1.2 2] 0'], grid: ['0.8 0.82 0.86', 0.3, '[1 3] 0'], border: ['0.55 0.55 0.55', 0.4, '[] 0'],
        flute: ['0.55 0.35 0.15', 0.8, '[] 0'], thin: ['0 0 0', 0.5, '[] 0'], score: ['0.1 0.55 0.25', 0.7, '[1.5 1.5] 0']
      }[kind];
      return this.op(`${S[0]} RG ${S[1]} w ${S[2]} d`);
    }
    line(pts, closed) {
      if (pts.length < 2) return this;
      let s = `${this.X(pts[0][0])} ${this.Y(pts[0][1])} m`;
      for (let i = 1; i < pts.length; i++) s += ` ${this.X(pts[i][0])} ${this.Y(pts[i][1])} l`;
      return this.op(s + (closed ? ' h S' : ' S'));
    }
    rect(x, y, w, h, fill) {
      return this.op(`${this.X(x)} ${this.Y(y + h)} ${(w * K).toFixed(2)} ${(h * K).toFixed(2)} re ${fill ? 'f' : 'S'}`);
    }
    text(x, y, t, o = {}) {
      const size = o.size || 8, font = o.bold ? 'F2' : 'F1';
      t = String(t).replace(/[^\x20-\x7e]/g, '-');
      const wmm = em(t, o.bold) * size / K;
      let dx = 0;
      if (o.anchor === 'middle') dx = -wmm / 2; else if (o.anchor === 'end') dx = -wmm;
      const col = o.color === 'mark' ? '0.3 0.4 0.55' : o.color === 'red' ? '0.8 0.1 0.1' : o.color === 'grey' ? '0.45 0.45 0.45' : '0 0 0';
      const esc = t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      if (o.down) return this.op(`BT /${font} ${size} Tf ${col} rg 0 -1 1 0 ${this.X(x)} ${this.Y(y + dx)} Tm (${esc}) Tj ET`);
      if (o.vertical) return this.op(`BT /${font} ${size} Tf ${col} rg 0 1 -1 0 ${this.X(x)} ${this.Y(y - dx)} Tm (${esc}) Tj ET`);
      return this.op(`BT /${font} ${size} Tf ${col} rg ${this.X(x + dx)} ${this.Y(y)} Td (${esc}) Tj ET`);
    }
    // the box a text() call covers on the page, in mm: [x0, y0, x1, y1]
    box(x, y, t, o = {}) {
      const size = o.size || 8, h = size / K, wmm = em(t, o.bold) * size / K;
      const dx = o.anchor === 'middle' ? -wmm / 2 : o.anchor === 'end' ? -wmm : 0;
      return o.down ? [x - 0.25 * h, y + dx, x + 0.8 * h, y + dx + wmm] : [x + dx, y - 0.8 * h, x + dx + wmm, y + 0.25 * h];
    }
    clip(x, y, w, h) { return this.op(`q ${this.X(x)} ${this.Y(y + h)} ${(w * K).toFixed(2)} ${(h * K).toFixed(2)} re W n`); }
    unclip() { return this.op('Q'); }
    bytes() {
      const objs = [];
      const add = s => { objs.push(s); return objs.length; };
      add('<< /Type /Catalog /Pages 2 0 R >>');
      add('PAGES');
      add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const kids = [];
      this.pages.forEach(pg => {
        const body = pg.ops.join('\n');
        const c = add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
        kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${(pg.w * K).toFixed(2)} ${(pg.h * K).toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${c} 0 R >>`));
      });
      objs[1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
      let out = '%PDF-1.4\n';
      const offs = [];
      objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
      const xref = out.length;
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
      out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      return out;   // ASCII only (text() replaces anything else), so string length = byte length
    }
  }

  // draw one part. tf maps part cm -> page mm
  function drawPart(pdf, part, tf, rot, grow) {
    part.paths.forEach(pa => { pdf.style(pa.kind).line(pa.pts.map(tf), pa.closed); });
    if (part.flutes) {
      const [a, b] = part.flutes.map(tf);
      pdf.style('flute').line([a, b]);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hd = 2.2;
      [[b, ang], [a, ang + Math.PI]].forEach(([p, g]) => pdf.line([[p[0] - hd * Math.cos(g - 0.45), p[1] - hd * Math.sin(g - 0.45)], p, [p[0] - hd * Math.cos(g + 0.45), p[1] - hd * Math.sin(g + 0.45)]]));
      pdf.text((a[0] + b[0]) / 2 + 1.5, (a[1] + b[1]) / 2, 'FLUTES', { size: 6.5, anchor: 'start', color: 'grey' });
    }
    part.texts.forEach(t => { const q = tf([t.x, t.y]), o = Object.assign({}, t, grow ? { size: grow(t.size || 8) } : {}, rot ? { down: true } : {}); pdf.text(q[0], q[1], t.t, o); });
  }

  function ruler10(pdf, x, y) {
    pdf.style('thin').line([[x, y], [x + 100, y]]);
    for (let i = 0; i <= 100; i += 10) pdf.line([[x + i, y], [x + i, y - (i % 50 ? 1.5 : 2.6)]]);
    pdf.text(x + 102, y, '10 cm check: measure this. Must be exactly 10 cm.', { size: 6.5, anchor: 'start', color: 'grey' });
  }

  // ---------- A4 tiled ----------
  function makeA4(model) {
    const pdf = new PDF();
    const L = G.layoutA4(model.parts);
    const MX = 8, MY = 15; // content origin (mm)
    const CW = L.PAGE.CW * 10, CH = L.PAGE.CH * 10;
    const total = L.pages.length + 1;
    const partPages = {};
    L.pages.forEach((pg, i) => pg.sheet.items.forEach(it => { (partPages[it.part.id] = partPages[it.part.id] || new Set()).add(i + 2); }));

    // cover
    pdf.page(210, 297);
    pdf.text(15, 22, 'SKYCAB COSTUME - CARDBOARD SKELETON STENCILS', { size: 15, bold: true });
    const inch = v => (v / 2.54).toFixed(1) + '"';
    pdf.text(15, 29, `Made for: hips ${inch(model.p.hipW)} wide x ${inch(model.p.hipD)} deep, waist to mid-thigh ${inch(model.p.waistThigh)}, height ${inch(model.p.height)}. Body ${model.p.L} x ${model.p.W} cm, rotor span ${model.stats.span.toFixed(0)} cm, about ${Math.round(model.stats.grams / 10) * 10} g.`, { size: 8 });
    pdf.text(15, 38, '1. PRINT AT 100% / "ACTUAL SIZE". Turn OFF "fit to page" and "shrink oversized pages".', { size: 9, bold: true });
    pdf.text(15, 44, '2. Measure the 10 x 10 cm square below in BOTH directions. If it is off by more than 1 mm, fix the printer setting and reprint.', { size: 8 });
    pdf.text(15, 49, '3. Parts bigger than a page are split into tiles (A1, B1, A2...). Trim the margin on the RIGHT and BOTTOM edges', { size: 8 });
    pdf.text(19, 53.5, 'of a tile along its grey border, lay it over the next tile so the grey borders meet and the dotted 5 cm grid lines continue. Tape.', { size: 8 });
    pdf.text(15, 58.5, '4. Cut the paper templates out, lay them on cardboard (match the FLUTES arrow to the cardboard ridges), trace, then cut.', { size: 8 });
    pdf.text(15, 63.5, '5. HALF patterns (red dash-dot line): trace, flip the template over along the red line, trace the other half.', { size: 8 });
    // calibration square
    pdf.style('cut').rect(15, 72, 100, 100);
    pdf.text(65, 122, '10 cm x 10 cm', { size: 12, bold: true, anchor: 'middle' });
    pdf.text(65, 128, 'Measure me before cutting anything', { size: 8, anchor: 'middle' });
    // legend
    const lg = [['cut', 'Cut line'], ['fold', 'Fold line (glue tabs fold inward)'], ['score', 'Press line: inside face, press with a blunt knife, do not cut'], ['center', 'Centre line: flip template here'], ['mark', 'Placement mark (do not cut)']];
    lg.forEach(([k, t], i) => { pdf.style(k).line([[125, 76 + i * 7], [145, 76 + i * 7]]); pdf.text(148, 77 + i * 7, t, { size: 7.5, anchor: 'start' }); });
    pdf.style('flute').line([[125, 111], [145, 111]]); pdf.text(148, 112, 'Run the cardboard flutes this way', { size: 7.5, anchor: 'start' });
    // parts table
    let y = 180;
    pdf.text(15, y, 'PRINTED PARTS', { size: 10, bold: true }); y += 6;
    model.parts.forEach(pt => {
      const pages = [...(partPages[pt.id] || [])].sort((a, b) => a - b);
      const pr = pages.length > 1 ? `pages ${pages[0]}-${pages[pages.length - 1]}` : `page ${pages[0]}`;
      pdf.text(15, y, pt.id, { size: 8, bold: true }); pdf.text(24, y, pt.name, { size: 8 }); pdf.text(68, y, 'Cut ' + pt.cut, { size: 8 }); pdf.text(150, y, pt.mat.replace('Corrugated cardboard', 'Cardboard'), { size: 7 }); pdf.text(195, y, pr, { size: 7, anchor: 'end' });
      y += 3.9;
    });
    y += 2;
    pdf.text(15, y, 'RULER CUTS (measure and cut with a steel ruler, no template)', { size: 10, bold: true }); y += 6;
    model.ruler.forEach(r => { pdf.text(15, y, r.id, { size: 8, bold: true }); pdf.text(24, y, r.name, { size: 8 }); pdf.text(68, y, r.size + (r.n ? `, cut ${r.cut}` : ''), { size: 8 }); y += 3.9; });
    pdf.text(195, 294, `Page 1 of ${total}`, { size: 7, color: 'grey', anchor: 'end' });

    L.pages.forEach((pg, i) => {
      pdf.page(210, 297);
      const sh = pg.sheet, nTiles = sh.cols * sh.rows;
      pdf.text(MX, 7, `SkyCab stencils  |  ${sh.name}${pg.label ? '  |  tile ' + pg.label + ` (${sh.cols} x ${sh.rows})` : ''}`, { size: 9, bold: true });
      pdf.text(202, 7, `Page ${i + 2} of ${total}`, { size: 7, anchor: 'end', color: 'grey' });
      ruler10(pdf, MX, 12);
      // tile frame
      pdf.style('border').rect(MX, MY, CW, CH);
      pdf.clip(MX, MY, CW, CH);
      const toPage = q => [MX + (q[0] - pg.x0) * 10, MY + (q[1] - pg.y0) * 10];
      if (nTiles > 1) {
        pdf.style('grid');
        for (let gx = Math.ceil(pg.x0 / 5) * 5; gx <= pg.x0 + L.PAGE.CW; gx += 5) pdf.line([toPage([gx, pg.y0]), toPage([gx, pg.y0 + L.PAGE.CH])]);
        for (let gy = Math.ceil(pg.y0 / 5) * 5; gy <= pg.y0 + L.PAGE.CH; gy += 5) pdf.line([toPage([pg.x0, gy]), toPage([pg.x0 + L.PAGE.CW, gy])]);
      }
      sh.items.forEach(it => drawPart(pdf, it.part, q => toPage(G.place(it, q)), it.rot));
      pdf.unclip();
      if (nTiles > 1) {
        const lab = (c, r) => String.fromCharCode(65 + c) + (r + 1);
        if (pg.c < sh.cols - 1) pdf.text(MX + CW + 2.5, MY + CH / 2, `trim here, overlap onto ${lab(pg.c + 1, pg.r)}`, { size: 7, vertical: true, anchor: 'middle', color: 'red' });
        if (pg.r < sh.rows - 1) pdf.text(MX + CW / 2, MY + CH + 4, `trim here, overlap onto ${lab(pg.c, pg.r + 1)}`, { size: 7, anchor: 'middle', color: 'red' });
        if (pg.c > 0) pdf.text(MX + 1.5, MY + 4, `< ${lab(pg.c - 1, pg.r)}`, { size: 7, anchor: 'start', color: 'grey' });
        if (pg.r > 0) pdf.text(MX + CW - 1.5, MY + 4, `^ ${lab(pg.c, pg.r - 1)}`, { size: 7, anchor: 'end', color: 'grey' });
      }
    });
    return { pdf, n: total };
  }

  // ---------- A0 sheet(s) for a print shop ----------
  // shelf packing; tries a few orderings and keeps the shortest
  function pack(parts, CW, G2, grow) {
    const orders = [
      ps => ps.sort((a, b) => b.w * b.h - a.w * a.h),
      ps => ps.sort((a, b) => Math.min(b.w, b.h) - Math.min(a.w, a.h)),
      ps => ps.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h))
    ];
    let best = null;
    orders.forEach(order => [true, false].forEach(flatFirst => {
      const shelves = []; let used = 0; const spots = [];
      order(parts.slice()).forEach(pt => {
        let opts = [false, true].map(rot => ({ rot, w: (rot ? pt.h : pt.w) * 10 + G2, h: (rot ? pt.w : pt.h) * 10 + G2 })).filter(o => o.w <= CW);
        if (flatFirst) opts.sort((u, v) => u.h - v.h);
        let spot = null;
        for (const o of opts) { for (const sh of shelves) if (!spot && o.h <= sh.h && sh.x + o.w <= CW) { spot = { o, x: sh.x, y: sh.y }; sh.x += o.w; } if (spot) break; }
        // the newest shelf may grow taller rather than start another one
        const last = shelves[shelves.length - 1];
        if (!spot && last && grow) for (const o of opts) if (last.x + o.w <= CW) { spot = { o, x: last.x, y: last.y }; last.x += o.w; used += Math.max(0, o.h - last.h); last.h = Math.max(last.h, o.h); break; }
        if (!spot) { const o = opts[0]; shelves.push({ y: used, h: o.h, x: o.w }); spot = { o, x: 0, y: used }; used += o.h; }
        spots.push({ pt, spot });
      });
      if (!best || used < best.used) best = { used, spots };
    }));
    return best;
  }
  function makeA0(model) {
    const pdf = new PDF();
    const MX = 15, TOP = 118, CW = 811, AVAIL = 1189 - TOP - 75, G2 = 10;
    const inch = v => (v / 2.54).toFixed(1) + '"';
    let todo = model.parts.slice(), sheet = 0, last = null;
    while (todo.length) {
      pdf.page(841, 1189); sheet++;
      pdf.text(MX, 16, `SKYCAB COSTUME - CARDBOARD SKELETON STENCILS (A0 sheet ${sheet}, PRINT AT 100% / ACTUAL SIZE)`, { size: 22, bold: true });
      pdf.text(MX, 26, `Hips ${inch(model.p.hipW)} x ${inch(model.p.hipD)}, waist to mid-thigh ${inch(model.p.waistThigh)}, height ${inch(model.p.height)}. Body ${model.p.L} x ${model.p.W} cm. Check the 10 cm square first. Red dash-dot = flip line for half patterns. Arrows = flute direction.`, { size: 11 });
      pdf.style('cut').rect(726, 8, 100, 100);
      pdf.text(776, 60, '10 x 10 cm', { size: 14, bold: true, anchor: 'middle' });
      // fit as many parts as possible onto this sheet
      let fit = todo.slice(), res = pack(fit, CW, G2);
      while (res.used > AVAIL && fit.length > 1) { fit.sort((a, b) => a.w * a.h - b.w * b.h); fit.pop(); res = pack(fit, CW, G2); }
      res.spots.forEach(({ pt, spot }) => {
        const it = { part: pt, rot: spot.o.rot, ox: 0, oy: 0 };
        const ox = MX + spot.x + 5, oy = TOP + spot.y + 5;
        drawPart(pdf, pt, q => { const s = G.place(it, q); return [ox + s[0] * 10, oy + s[1] * 10]; }, it.rot, BIG);
      });
      todo = todo.filter(q => !fit.includes(q));
      last = TOP + res.used;
    }
    let ry = Math.min(last + 15, 1189 - 60);
    pdf.text(MX, ry, 'RULER CUTS (no template needed):', { size: 14, bold: true });
    model.ruler.forEach((r, i) => pdf.text(MX, ry + 9 + i * 7, `${r.id}  ${r.name}: ${r.size}${r.n ? ', cut ' + r.cut : ''}`, { size: 11 }));
    return { pdf, n: sheet };
  }

  // ---------- full-size cardboard sheet prints: one page per cardboard sheet, at 100% ----------
  // A0 landscape, or opts.roll: a 36 inch (914 mm) roll with the sheet turned a quarter turn so its short side runs across.
  // The roll page is 860 mm wide, not the full 914: roll printers cannot print right to the edge, and a full-width page
  // tempts the driver to shrink it to fit. 860 leaves about 27 mm spare each side, so it prints at true size.
  const ROLL = 860;
  const BIG = s => s < 9 ? s * 1.45 : s;
  const NOTE = s => Math.max(9, s * 1.45), subSize = size => Math.max(9, Math.min(16, size * 0.3));
  function inPoly(q, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function makeSheetPrints(model, opts) {
    const L = G.layoutSheets(model, opts), roll = !!(opts && opts.roll), pdf = new PDF();
    const MX = 18, TOP = 62, W = L.sheet.w * 10, H = L.sheet.h * 10;
    const across = roll ? H : W, down = roll ? W : H;                       // the sheet as drawn on the page
    const panelBelow = roll && MX + across + 16 + 112 > ROLL - 8;
    const PW = roll ? ROLL : 1189, PH = roll ? TOP + down + (panelBelow ? 330 : 30) : 841;
    const SX = panelBelow ? MX : MX + across + 16, SY = panelBelow ? TOP + down + 24 : TOP;   // side panel
    // sheet mm -> page mm (roll: quarter turn clockwise, never a mirror)
    const S = roll ? (x, y) => [MX + (H - y), TOP + x] : (x, y) => [MX + x, TOP + y];
    const waves = (L.along === 'y') !== roll ? 'UP-DOWN' : 'LEFT-RIGHT';
    const paper = roll ? 'a 36 inch (914 mm) roll' : 'A0';
    const names = {};
    model.parts.forEach(pt => { names[pt.id] = pt.name; });
    model.ruler.forEach(r => { names[r.id] = r.name; });
    L.sheets.forEach((sh, i) => {
      pdf.page(PW, PH);
      pdf.text(MX, 16, `SKYCAB - CARDBOARD SHEET ${i + 1} OF ${L.sheets.length}   (${sh.board}-ply, ${L.sheet.label.replace(/×/g, 'x')})`, { size: 26, bold: true });
      pdf.text(MX, 27, `Print at 100% / ACTUAL SIZE on ${paper}${roll ? ' (page is 860 mm wide, so it fits inside the printer margins: no scaling)' : ''}. Check the 10 x 10 cm square before cutting.`, { size: 13 });
      pdf.text(MX, 36, `Line up the dashed sheet outline with a corner of your cardboard. The waves (flutes) inside the cardboard must run ${waves} on this print, like the grey lines.`, { size: 13, bold: true });
      pdf.text(MX, 45, 'Either cut the paper parts out and trace round them, or pin the whole print on the sheet and cut through the solid lines.', { size: 13 });
      // sheet outline and wave direction
      pdf.style('grid');
      if (L.along === 'y') for (let x = 50; x < W; x += 50) pdf.line([S(x, 0), S(x, H)]);
      else for (let y = 50; y < H; y += 50) pdf.line([S(0, y), S(W, y)]);
      pdf.style('mark').line([S(0, 0), S(W, 0), S(W, H), S(0, H)], true);
      pdf.text(MX + 2, TOP + down + 6, `edge of your ${L.sheet.label.replace(/×/g, 'x')} cardboard sheet`, { size: 10, color: 'grey', anchor: 'start' });
      sh.placed.forEach(pl => {
        const T = G.sheetTf(pl.shape, pl.rot, pl.flip, pl.x, pl.y), tf = q => { const t = T(q); return S(t[0] * 10, t[1] * 10); };
        pl.shape.paths.forEach(pa => { pdf.style(pa.kind).line(pa.pts.map(tf), pa.closed); });
        // small notes turn with the part (on the roll the whole sheet is turned, so they read downwards or across),
        // enlarged so they read easily on the big print
        const busy = [];
        (pl.shape.texts || []).forEach(t => {
          if (t.size >= 9) return;
          const q = tf([t.x, t.y]), o = Object.assign({}, t, { size: NOTE(t.size), down: !!pl.rot !== roll });
          pdf.text(q[0], q[1], t.t, o); busy.push(pdf.box(q[0], q[1], t.t, o));
        });
        if (pl.shape.flutes) {
          const [a, b] = pl.shape.flutes.map(tf), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hd = 3;
          pdf.style('flute').line([a, b]);
          [[b, ang], [a, ang + Math.PI]].forEach(([p, g]) => pdf.line([[p[0] - hd * Math.cos(g - 0.45), p[1] - hd * Math.sin(g - 0.45)], p, [p[0] - hd * Math.cos(g + 0.45), p[1] - hd * Math.sin(g + 0.45)]]));
        }
        // big part letter, plus "flipped" / "layer 2" where it applies
        const w = (pl.rot ? pl.shape.h : pl.shape.w) * 10, h = (pl.rot ? pl.shape.w : pl.shape.h) * 10;
        // it goes in the clearest spot inside the part: clear of the notes, the holes and the edges
        const fs = Math.max(12, Math.min(90, Math.min(w, h) * 0.38 * K));
        const layer2 = /2nd layer/.test(pl.name), small = Math.min(w, h) < 90;
        const label = pl.id + (small && layer2 ? ' L2' : '') + (small && pl.flip ? ' F' : '');
        const sub = small ? '' : (pl.flip ? 'FLIPPED COPY' : '') + (layer2 ? 'LAYER 2 - waves crossed' : '');
        const outl = pl.shape.outline.map(tf), area = pts => Math.abs(pts.reduce((a, q, i) => { const r = pts[(i + 1) % pts.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
        const holes = pl.shape.paths.filter(pa => pa.kind === 'cut' && pa.closed && area(pa.pts) < 0.9 * area(pl.shape.outline)).map(pa => pa.pts.map(tf));   // every cut-out
        const xs = outl.map(q => q[0]), ys = outl.map(q => q[1]);
        const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
        const block = (cx, cy, size) => {
          const a = pdf.box(cx, cy, label, { size, bold: true, anchor: 'middle' });
          if (!sub) return a;
          const b = pdf.box(cx, cy + Math.max(5, size / K * 0.55), sub, { size: subSize(size), anchor: 'middle' });
          return [Math.min(a[0], b[0]), a[1], Math.max(a[2], b[2]), b[3]];
        };
        const clear = r => {
          const pad = 3, R = [r[0] - pad, r[1] - pad, r[2] + pad, r[3] + pad];
          const pts = [[R[0], R[1]], [R[2], R[1]], [R[0], R[3]], [R[2], R[3]], [(R[0] + R[2]) / 2, R[1]], [(R[0] + R[2]) / 2, R[3]], [R[0], (R[1] + R[3]) / 2], [R[2], (R[1] + R[3]) / 2]];
          if (!pts.every(q => inPoly(q, outl))) return false;
          if (holes.some(hl => pts.some(q => inPoly(q, hl)) || hl.some(q => q[0] > R[0] && q[0] < R[2] && q[1] > R[1] && q[1] < R[3]))) return false;
          if (outl.some(q => q[0] > R[0] && q[0] < R[2] && q[1] > R[1] && q[1] < R[3])) return false;
          return !busy.some(b => b[0] < R[2] && R[0] < b[2] && b[1] < R[3] && R[1] < b[3]);
        };
        let best = null;
        for (let size = fs; !best && size >= 12; size *= 0.8) {
          const mx = (bx0 + bx1) / 2, my = (by0 + by1) / 2;
          for (let gy = by0; gy <= by1; gy += 4) for (let gx = bx0; gx <= bx1; gx += 4) {
            const d = Math.hypot(gx - mx, gy - my);
            if (best && best.d <= d) continue;
            if (clear(block(gx, gy, size))) best = { x: gx, y: gy, size, d };
          }
        }
        if (!best) best = { x: (bx0 + bx1) / 2, y: (by0 + by1) / 2, size: 12 };
        pdf.text(best.x, best.y, label, { size: best.size, bold: true, anchor: 'middle' });
        if (sub) pdf.text(best.x, best.y + Math.max(5, best.size / K * 0.55), sub, { size: subSize(best.size), anchor: 'middle' });
      });
      // side panel: scale check, legend, what is on this sheet
      pdf.style('cut').rect(SX, SY, 100, 100);
      pdf.text(SX + 50, SY + 53, '10 x 10 cm', { size: 16, bold: true, anchor: 'middle' });
      pdf.text(SX, SY + 108, 'Measure both ways. Must be exactly 10 cm.', { size: 9 });
      const lg = [['cut', 'Cut'], ['fold', 'Fold (glue tabs)'], ['score', 'Press line (inside face)'], ['mark', 'Placement mark / sheet edge'], ['flute', 'Waves (flutes) this way']];
      lg.forEach(([k, t], j) => { const y = SY + 122 + j * 8; pdf.style(k).line([[SX, y], [SX + 18, y]]); pdf.text(SX + 21, y + 1.2, t, { size: 10, anchor: 'start' }); });
      let y = SY + 172;
      pdf.text(SX, y, 'ON THIS SHEET', { size: 13, bold: true }); y += 8;
      const seen = {};
      sh.placed.forEach(pl => { const k = pl.id; seen[k] = (seen[k] || 0) + 1; });
      Object.keys(seen).forEach(k => {
        const nm = (names[k] || k).slice(0, 26);
        pdf.text(SX, y, `${k}`, { size: 11, bold: true, anchor: 'start' }); pdf.text(SX + 14, y, `${nm}  x${seen[k]}`, { size: 10, anchor: 'start' }); y += 6.5;
      });
      y += 6;
      ['FLIPPED COPY (F): this copy is the', 'mirror image, for the other side.', 'LAYER 2 (L2): glue face to face with', 'the first layer, waves crossed,', 'with PVA; press flat overnight.'].forEach(t => { pdf.text(SX, y, t, { size: 9.5, anchor: 'start' }); y += 5.5; });
      pdf.text(PW - MX, PH - 10, `Sheet ${i + 1} of ${L.sheets.length}  |  ${model.p.L} x ${model.p.W} cm body, hips ${(model.p.hipW / 2.54).toFixed(1)} in`, { size: 10, color: 'grey', anchor: 'end' });
    });
    return { pdf, n: L.sheets.length };
  }

  // ---------- A2: parts that are not cut from corrugated board (plastic, thin card, paper guides) ----------
  function makeExtrasA2(model, opts) {
    const pdf = new PDF(), MX = 15, roll = !!(opts && opts.roll);
    const extra = model.parts.filter(pt => !/Corrugated|^Cardboard/.test(pt.mat));
    if (roll) {
      // everything on one length of the 36 inch roll
      const top = Math.max(112, 40 + extra.length * 6), res = pack(extra.slice(), ROLL - 2 * MX, 10, true), PH = top + res.used + 15;
      pdf.page(ROLL, PH);
      pdf.text(MX, 16, 'SKYCAB - LAST PAGE: PARTS NOT CUT FROM CORRUGATED CARDBOARD (thin card, plastic, paper guides)', { size: 18, bold: true });
      pdf.text(MX, 25, 'Print at 100% / ACTUAL SIZE on a 36 inch (914 mm) roll; the page is 860 mm wide so it fits inside the printer margins. Check the 10 x 10 cm square first.', { size: 11 });
      pdf.style('cut').rect(ROLL - MX - 100, 8, 100, 100);
      pdf.text(ROLL - MX - 50, 60, '10 x 10 cm', { size: 14, bold: true, anchor: 'middle' });
      extra.forEach((pt, i) => pdf.text(MX, 34 + i * 6, `${pt.id}  ${pt.name}: ${pt.mat}, cut ${pt.cut}`, { size: 9.5 }));
      res.spots.forEach(({ pt, spot }) => {
        const it = { part: pt, rot: spot.o.rot, ox: 0, oy: 0 }, ox = MX + spot.x + 5, oy = top + spot.y + 5;
        drawPart(pdf, pt, q => { const s = G.place(it, q); return [ox + s[0] * 10, oy + s[1] * 10]; }, it.rot, BIG);
      });
      return { pdf, n: 1, len: PH };
    }
    // as many A2 pages as needed; each page takes as many parts as fit
    let todo = extra.slice(), page = 0;
    while (todo.length) {
      page++;
      pdf.page(420, 594);
      pdf.text(MX, 16, `SKYCAB - PARTS NOT CUT FROM CORRUGATED CARDBOARD${page > 1 ? ` (page ${page})` : ''}`, { size: 18, bold: true });
      pdf.text(MX, 25, 'Print at 100% / ACTUAL SIZE on A2. Check the 10 x 10 cm square first.', { size: 11 });
      pdf.style('cut').rect(305, 8, 100, 100);
      pdf.text(355, 60, '10 x 10 cm', { size: 14, bold: true, anchor: 'middle' });
      let fit = todo.slice();
      const top = () => Math.max(112, 40 + fit.length * 6);
      let res = pack(fit, 390, 10, true);
      while (top() + res.used > 584 && fit.length > 1) { fit.sort((a, b) => a.w * a.h - b.w * b.h); fit.pop(); res = pack(fit, 390, 10, true); }
      fit.forEach((pt, i) => pdf.text(MX, 34 + i * 6, `${pt.id}  ${pt.name}: ${pt.mat}, cut ${pt.cut}`, { size: 9.5 }));
      res.spots.forEach(({ pt, spot }) => {
        const it = { part: pt, rot: spot.o.rot, ox: 0, oy: 0 }, ox = MX + spot.x + 5, oy = top() + spot.y + 5;
        drawPart(pdf, pt, q => { const s = G.place(it, q); return [ox + s[0] * 10, oy + s[1] * 10]; }, it.rot, BIG);
      });
      todo = todo.filter(q => !fit.includes(q));
    }
    return { pdf, n: page };
  }

  // everything for the print shop in one file: one page per cardboard sheet, then the other-parts page(s)
  function makeShopPrints(model, opts) {
    const a = makeSheetPrints(model, opts), b = makeExtrasA2(model, { roll: opts && opts.roll });
    a.pdf.pages.push(...b.pdf.pages);
    return { pdf: a.pdf, n: a.pdf.pages.length, sheets: a.n };
  }

  // one roll page with the pieces that changed for the 7 cm mailing tubes, plus the wall pieces as full-size
  // bend-line templates (for walls already cut from an earlier print: lay on, prick the line ends through)
  function makeFixRoll(model) {
    const pdf = new PDF(), MX = 15, by = id => model.parts.find(pt => pt.id === id);
    const item = (pt, paths, extra) => {
      const sh = G.fullShape(Object.assign({}, pt, paths ? { paths } : {}));
      // extra notes go under the piece's own centre notes (title, "Printed side...", "Flutes...")
      const own = sh.texts.filter(t => /WALL|Printed side|Flutes top/.test(t.t)), cx = own.length ? own[0].x : sh.w / 2;
      const y0 = own.length ? Math.max(...own.map(t => t.y)) + 1.4 : sh.h / 2 + 1.6;
      if (extra) sh.texts = sh.texts.concat(extra.map((t, i) => ({ t, x: cx, y: y0 + i * 1.1, size: i ? 7 : 9, bold: !i, anchor: 'middle' })));
      return Object.assign(sh, { id: pt.id });
    };
    const Q = by('Q'), items = [];
    for (let k = 0; k < Q.count; k++) items.push(item(Q, null, [`LAYER 1 (${k + 1} of ${Q.count})`]));
    for (let k = 0; k < Q.count; k++) items.push(item(Q, Q.layer2, [`LAYER 2 (${k + 1} of ${Q.count}): waves crossed, goes underneath`]));
    ['N', 'Y'].forEach(id => { for (let k = 0; k < by(id).count; k++) items.push(item(by(id))); });
    ['O', 'P'].forEach(id => items.push(item(by(id))));
    ['C1', 'C2', 'C3', 'C4'].forEach(id => items.push(item(by(id), null, ['BEND-LINE TEMPLATE', 'already cut? lay this on it and prick both ends of every green line'])));
    const notes = [
      ['CORRECTED FOR THE 7.0 cm MAILING TUBES (22 cm round): replaces these pieces on the earlier print', true],
      [`Q  Rotor base disc: ${Q.count} x layer 1 + ${Q.count} x layer 2 (motor socket), glued in pairs with the waves crossed. The pod-top oval and collar marks are for the 7 cm tube.`, false],
      [`N  Pod bottom cap x${by('N').count} (cardboard).   Y  Pod top collar x${by('Y').count} (cereal-box card).   O fish-mouth guide and P pod wrap: paper guides, use the print itself.`, false],
      ['(N, Y, O, P are the same as pages 2-5 of the A4 pack: use either.)', false],
      ['C1-C4 WALL TEMPLATES: green press lines every 2 cm along the lines each wall bends on. Already cut your walls? Lay the template on', true],
      ['the paper side of the piece (the BARE BACK for a flipped copy), prick both ends of every green line, join them on the bare back and press.', false],
      ['C1 also shows the new strut hole for the 7 cm tube. Deck A: the two "strut tube (under)" lines are now 7 cm apart.', false]
    ];
    const top = 40 + notes.length * 6 + 8, res = pack(items.slice(), ROLL - 2 * MX, 10, true), PH = top + res.used + 15;
    pdf.page(ROLL, PH);
    pdf.text(MX, 16, 'SKYCAB - CORRECTED PIECES FOR THE 7 cm TUBES + WALL BEND-LINE TEMPLATES', { size: 18, bold: true });
    pdf.text(MX, 25, 'Print at 100% / ACTUAL SIZE on a 36 inch (914 mm) roll; the page is 860 mm wide so it fits inside the printer margins. Check the 10 x 10 cm square first.', { size: 11 });
    pdf.style('cut').rect(ROLL - MX - 100, 8, 100, 100);
    pdf.text(ROLL - MX - 50, 60, '10 x 10 cm', { size: 14, bold: true, anchor: 'middle' });
    notes.forEach(([t, b], i) => pdf.text(MX, 36 + i * 6, t, { size: 9.5, bold: b }));
    const lg = [['cut', 'Cut'], ['fold', 'Fold (glue tabs)'], ['score', 'Press line (inside face)'], ['center', 'Centre line'], ['mark', 'Placement mark']];
    lg.forEach(([k, t], j) => { const y = top - 6; pdf.style(k).line([[MX + j * 70, y], [MX + j * 70 + 14, y]]); pdf.text(MX + j * 70 + 17, y + 1.2, t, { size: 9, anchor: 'start' }); });
    res.spots.forEach(({ pt, spot }) => {
      const it = { part: pt, rot: spot.o.rot, ox: 0, oy: 0 }, ox = MX + spot.x + 5, oy = top + spot.y + 5;
      drawPart(pdf, pt, q => { const s = G.place(it, q); return [ox + s[0] * 10, oy + s[1] * 10]; }, it.rot, BIG);
    });
    return { pdf, n: 1, len: PH };
  }

  return { makeA4, makeA0, makeSheetPrints, makeExtrasA2, makeShopPrints, makeFixRoll };
});
