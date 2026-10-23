// SkyCab costume skeleton v2: parametric cardboard pattern generator.
// Shape follows reference/blueprint-2-rotors-v3.jpg; sizes follow the child's measurements.
// All lengths in centimetres. Plan coords: x forward (nose +), y left (+), z up (deck = 0, i.e. her waist).
// Part coords (for printing): x right, y down.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SkyCab = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULTS = {
    // the child (cm)
    hipW: 8 * 2.54, hipD: 5 * 2.54, waistThigh: 8 * 2.54, height: 42.5 * 2.54,
    // body: the belt line is the widest outline; deck (top) and bottom tuck in from it
    L: 60, W: 44, beltZ: 8, nF: 2.0, nR: 2.8,
    topF: 6, topR: 2, topS: 2.5,
    botF: 9, botR: 2.5, botS: 3.5,
    rearRim: 11, beamD: 6, board: 0.4,
    backW: 30, backR: 6, backTab: 3, seatT: 4,
    // rotors
    rotorD: 22, tilt: 20, ringW: 2.5, rimH: 3, span: 74, tubeD: 7, tubeL: 59, podTop: 7,   // the mailing tubes bought: 22 cm round the outside (7.0 cm across), 59 cm long
    // details
    taxiW: 9.6, taxiD: 3.5, taxiH: 4.5,
    domeL: 14, domeW: 24, domeH: 11,
    lampL: 6     // headlight window length (blueprint: an egg about 6 x 4.6 cm on a 44 cm body)
  };
  const M = 240;
  const TABW = 1.5;   // glue-tab edge on the long strips R3 and R8
  const G_CARD = 0.05; // grams per cm2, single-wall corrugated

  const lerp = (a, b, f) => a + (b - a) * f;
  const lerp2 = (A, B, f) => [lerp(A[0], B[0], f), lerp(A[1], B[1], f)];
  const dist3 = (A, B) => Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);

  function se(t, a, b, n) {
    const c = Math.cos(t), s = Math.sin(t);
    return [a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)];
  }

  function derive(p) {
    p.H = Math.round((p.waistThigh + 1) * 2) / 2;
    p.holeW = p.hipW + 7;
    p.holeD = p.hipD + 7;
    p.backH = Math.max(15, Math.round(p.height * 0.22 - 5));
    p.ol = {
      top: { a: (p.L - p.topF - p.topR) / 2, b: p.W / 2 - p.topS, cx: (p.topR - p.topF) / 2, z: 0 },
      belt: { a: p.L / 2, b: p.W / 2, cx: 0, z: -p.beltZ },
      bot: { a: (p.L - p.botF - p.botR) / 2, b: p.W / 2 - p.botS, cx: (p.botR - p.botF) / 2, z: -p.H }
    };
    const deckRear = p.ol.top.cx - p.ol.top.a;
    p.holeRear = deckRear + p.rearRim;
    p.hx = p.holeRear + p.holeD / 2;
    p.holeFront = p.hx + p.holeD / 2;
    p.beamFX = p.holeFront + 1.5;                    // rear face of the front beam
    p.tubeFX = p.beamFX + p.board + p.tubeD / 2;     // strut tube centre (x)
    // strut tube centre (z): a 7 cm tube fills most of the 8 cm upper wall, so it sits right up under the deck
    // (0.5 mm below the deck board), leaving cardboard between the wall hole and the belt fold, and clear of belt ring B1
    p.strutZ = -(p.tubeD / 2 + p.board + 0.05);
    p.rotorY = p.span / 2 - p.rotorD / 2;            // rotor centre, out from the centreline
    p.podBot = p.strutZ - p.tubeD / 2 - 1;
    p.podLen = p.podTop - p.podBot;
    p.tiltR = p.tilt * Math.PI / 180;                 // rotors lean forward so the audience sees the blades
    p.slant = (p.tubeD / 2) * Math.tan(p.tiltR);      // pod top: back side this much higher, front side this much lower
    p.sockR = 1.15; p.sockF = 0.9;   // motor socket in disc Q: 23 mm round, 18 mm across the flats
    p.lampT = 0.34; p.lampZ = -p.beltZ / 2;           // headlight centre on the upper front wall
    p.lampH = p.lampL * 0.77;
    p.backX = p.holeRear - 1;                        // front face of the backrest
    p.backT = p.seatT;                               // seat back is a hollow box: front panel, back panel, edge strip
    p.taxiD = p.seatT + 0.6;                         // TAXI sign sits on top of the seat, as deep as the seat
    p.deckRear = deckRear;
    // tail cone: a three-sided wedge behind the backrest, like the blueprint's back and top views
    p.tailX0 = p.backX - p.backT; p.tailX1 = deckRear + 0.5;
    p.tailH = p.backH - 4; p.tailW = Math.min(10, p.backW * 0.34);
    // big swept-back fin traced from the blueprint side view (scaled to the seat height):
    // leading edge glued up the back of the seat, then sloping back; top overhangs the tail; trailing edge sweeps back
    p.finH = p.backH + 3; p.finXD = p.tailX0 - 2.6; p.finXC = p.tailX1 - 5;
    // battery box hides under the deck behind her, reached from under the back hem
    p.batX = (p.tailX0 + deckRear) / 2 + 0.5;
    return p;
  }

  const olPt = (p, o, t) => { const q = se(t, o.a, o.b, Math.cos(t) >= 0 ? p.nF : p.nR); return [q[0] + o.cx, q[1], o.z]; };
  const topPt = (p, t) => olPt(p, p.ol.top, t);
  function band(p, which, t) {
    return which === 'upper' ? { T: olPt(p, p.ol.top, t), B: olPt(p, p.ol.belt, t) } : { T: olPt(p, p.ol.belt, t), B: olPt(p, p.ol.bot, t) };
  }
  function wallPt(p, t, z) {
    const up = z >= -p.beltZ, r = band(p, up ? 'upper' : 'lower', t);
    const v = up ? -z / p.beltZ : (-z - p.beltZ) / (p.H - p.beltZ);
    return [lerp(r.T[0], r.B[0], v), lerp(r.T[1], r.B[1], v), z];
  }
  function tAtX(p, X, z) {
    let lo = 0, hi = Math.PI;
    for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (wallPt(p, mid, z)[0] > X) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  const halfWidth = (p, X, z) => wallPt(p, tAtX(p, X, z), z)[1];
  const holeHalf = (p, X) => { const u = (X - p.hx) / (p.holeD / 2); return Math.abs(u) >= 1 ? 0 : (p.holeW / 2) * Math.sqrt(1 - u * u); };
  // take-off button: right-hand deck rim, just ahead of her hip, where her hand rests
  function buttonAt(p) { const x = p.hx + p.holeD * 0.35, hh = holeHalf(p, x); return [x, -(hh + (halfWidth(p, x, 0) - hh) * 0.45)]; }

  // headlight outline in cm on the wall face: du towards the back, dv up; grow widens it (trim, lens)
  function lampLocal(p, grow, n) {
    const a = p.lampL / 2 + grow, b = p.lampH / 2 + grow, e = 0.25, r = 20 * Math.PI / 180, out = [];
    for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2, x = a * Math.cos(t), y = b * Math.sin(t) * (1 - e * Math.cos(t));
      out.push([x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]);
    }
    return out;
  }
  function lampTZ(p, grow, n) {
    const t0 = p.lampT, z0 = p.lampZ, d = 1e-3;
    const A = wallPt(p, t0 - d, z0), B = wallPt(p, t0 + d, z0), sp = Math.hypot(B[0] - A[0], B[1] - A[1]) / (2 * d);
    const C = wallPt(p, t0, z0), D = wallPt(p, t0, z0 - 0.5), q = Math.hypot(C[0] - D[0], C[1] - D[1], C[2] - D[2]) / 0.5;
    return lampLocal(p, grow, n).map(([u, v]) => [t0 + u / sp, z0 + v / q]);
  }

  function circ(P, Q, rp, rq, avoid) {
    const dx = Q[0] - P[0], dy = Q[1] - P[1], d = Math.hypot(dx, dy);
    const a = (rp * rp - rq * rq + d * d) / (2 * d), h = Math.sqrt(Math.max(0, rp * rp - a * a));
    const mx = P[0] + a * dx / d, my = P[1] + a * dy / d;
    const s1 = [mx - h * dy / d, my + h * dx / d], s2 = [mx + h * dy / d, my - h * dx / d];
    const side = X => dx * (X[1] - P[1]) - dy * (X[0] - P[0]);
    if (avoid) return Math.sign(side(s1)) !== Math.sign(side(avoid)) ? s1 : s2;
    return side(s1) < 0 ? s1 : s2;
  }
  // unroll a ruled strip (list of {T,B}) into the plane, keeping every edge length
  function unfold(rs) {
    const T = [[0, 0]], B = [[0, dist3(rs[0].T, rs[0].B)]];
    for (let i = 0; i < rs.length - 1; i++) {
      const a = rs[i], b = rs[i + 1];
      T[i + 1] = circ(T[i], B[i], dist3(a.T, b.T), dist3(a.B, b.T), i ? T[i - 1] : null);
      B[i + 1] = circ(T[i + 1], B[i], dist3(b.T, b.B), dist3(a.B, b.B), T[i]);
    }
    return { T, B };
  }

  // ---------- shape helpers ----------
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  function circle(cx, cy, r, n) { const out = []; n = n || 48; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return out; }
  function arc(cx, cy, r, a0, a1, n) { const out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return out; }
  function polyArea(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  function polyCx(pts) { let A = 0, cx = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], c = a[0] * b[1] - b[0] * a[1]; A += c; cx += (a[0] + b[0]) * c; } return cx / (3 * A); }
  const P = (pts, kind, closed) => ({ pts, kind, closed: !!closed });
  const T = (x, y, t, o) => Object.assign({ x, y, t, size: 8, anchor: 'middle' }, o || {});

  function normalize(part) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    part.paths.forEach(pa => pa.pts.forEach(q => { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }));
    const sh = q => [q[0] - x0, q[1] - y0];
    part.paths.forEach(pa => { pa.pts = pa.pts.map(sh); });
    if (part.layer2) part.layer2.forEach(pa => { pa.pts = pa.pts.map(sh); });
    part.texts.forEach(t => { const s = sh([t.x, t.y]); t.x = s[0]; t.y = s[1]; });
    if (part.flutes) part.flutes = part.flutes.map(sh);
    part.w = x1 - x0; part.h = y1 - y0;
    return part;
  }

  // ---------- parts ----------
  function deckPart(p) {
    const o = p.ol.top, X = x => x - (o.cx - o.a);
    const curve = [];
    for (let i = 0; i <= M; i++) { const q = topPt(p, Math.PI * i / M); curve.push([X(q[0]), q[1]]); }
    const hole = [];
    for (let i = 0; i <= 96; i++) { const s = Math.PI * i / 96; hole.push([X(p.hx + p.holeD / 2 * Math.cos(s)), p.holeW / 2 * Math.sin(s)]); }
    const len = 2 * o.a;
    const paths = [P(curve, 'cut'), P(hole, 'cut'), P([[0, 0], [len, 0]], 'center')];
    const texts = [];
    const line = (xa, label, ty) => {
      paths.push(P([[X(xa), 0], [X(xa), halfWidth(p, xa, 0)]], 'mark'));
      if (label) texts.push(T(X(xa) + 0.4, ty, label, { anchor: 'start', size: 6.5, color: 'mark' }));
    };
    line(p.beamFX); line(p.beamFX + p.board, 'front beam (underneath)', halfWidth(p, p.beamFX, 0) - 1.2);
    line(p.tubeFX - p.tubeD / 2); line(p.tubeFX + p.tubeD / 2, 'strut tube (under)', halfWidth(p, p.tubeFX, 0) - 3);
    line(p.backX, 'seat front', 1.6); line(p.backX - p.backT, 'seat back', 4.2);
    paths.push(P([[X(p.tailX0), p.tailW / 2], [X(p.tailX1), 0]], 'mark'));
    texts.push(T(X(p.tailX1) + 0.6, 4.6, 'tail fin K', { size: 6.5, color: 'mark', anchor: 'start' }));
    paths.push(P(rect(X(p.batX - 3), 0, 6, 1.75), 'mark'));
    const btn = buttonAt(p);
    paths.push(P(circle(X(btn[0]), -btn[1], 0.8, 20), 'mark', true));
    texts.push(T(X(btn[0]), -btn[1] + 2.1, 'button hole, RIGHT side only', { size: 6, color: 'mark' }));
    texts.push(T(X(p.batX), 2.9, 'battery box (under)', { size: 6, color: 'mark' }));
    // front strap slot, just in front of the hole (like dungaree bib straps), clear of the beam
    const sx = p.holeFront + 0.7, sy = Math.min(9, p.holeW / 3);
    p.strapFront = [sx, sy];
    paths.push(P(rect(X(sx) - 0.3, sy - 2, 0.6, 4), 'cut', true));
    texts.push(T(X(sx) - 0.8, sy + 0.3, 'strap slot', { size: 6.5, color: 'mark', anchor: 'end' }));
    // dome footprint, dashboard tab
    const sl = []; for (let i = 0; i <= 30; i++) { const q = shieldPt(p, i / 30, false); sl.push([X(q[0]), q[1]]); }
    paths.push(P(sl, 'mark'));
    texts.push(T(X(p.beamFX + p.domeL * 0.45), p.domeW / 2 * 0.62, 'windshield S line', { size: 6.5, color: 'mark' }));
    paths.push(P(rect(X(p.beamFX + 0.5), 0, 2, 7), 'mark'));
    texts.push(T(X(p.hx), p.holeW / 4 - 1.2, 'A  DECK', { size: 13, bold: true }));
    texts.push(T(X(p.hx), p.holeW / 4 + 0.6, 'Half pattern: trace, flip on red line, trace again', { size: 7 }));
    texts.push(T(X(p.hx), p.holeW / 4 + 1.9, '(the waist hole is cut out)', { size: 7 }));
    texts.push(T(len - 4, 2.2, 'NOSE >', { size: 9, bold: true }));
    texts.push(T(3.5, 6.5, '< REAR', { size: 9, bold: true }));
    const half = polyArea(curve) - polyArea(hole);
    return normalize({ id: 'A', name: 'Deck', cut: '1 (half pattern, flip on centre line)', count: 1, mat: 'Corrugated cardboard', half: true,
      note: 'Sits at her waist. Cut the waist hole and both strap slots. Flutes front to back.', paths, texts,
      flutes: [[X(o.cx + o.a - 14), 3], [X(o.cx + o.a - 6), 3]], area: 2 * half, sheet: 'deck',
      mass: { x: o.cx, g: 2 * half * G_CARD } });
  }

  function ringPart(p, which, id, name, width, note, sheet) {
    const o = p.ol[which], X = x => x - (o.cx - o.a);
    const outer = [], inner = [];
    for (let i = 0; i <= M; i++) {
      const t = Math.PI * i / M, n = Math.cos(t) >= 0 ? p.nF : p.nR;
      const a = se(t, o.a, o.b, n), q = se(t, o.a - width, o.b - width, n);
      outer.push([X(a[0] + o.cx), a[1]]); inner.push([X(q[0] + o.cx), q[1]]);
    }
    const paths = [P(outer, 'cut'), P(inner, 'cut'), P([outer[0], inner[0]], 'center'), P([outer[M], inner[M]], 'center')];
    const texts = [T(o.a, o.b * 0.42, `${id}  ${name.toUpperCase()}`, { size: 12, bold: true }),
      T(o.a, o.b * 0.42 + 1.6, 'Half pattern: flip on red line. Centre is waste.', { size: 7 }),
      T(2 * o.a - 7, 1.6, 'NOSE >', { size: 8, bold: true })];
    const area = 2 * (polyArea(outer.concat([[o.a, 0]])) - polyArea(inner.concat([[o.a, 0]])));
    return normalize({ id, name, cut: '1 (half pattern, flip on centre line)', count: 1, mat: 'Corrugated cardboard', half: true,
      note, paths, texts, flutes: null, area, sheet, mass: { x: o.cx, g: area * G_CARD } });
  }

  // a strip L long: top tab row a deep, core, bottom tab row b deep; V notches every `step` let the tabs bend round curves
  // without overlapping. x runs along the strip, y across it.
  function notchStrip(L, core, a, b, step, notch) {
    const w = a + core + b, out = [[0, 0]];
    if (a) for (let x = step; x < L - 0.3; x += step) out.push([x - notch / 2, 0], [x, a - 0.05], [x + notch / 2, 0]);
    out.push([L, 0], [L, w]);
    if (b) for (let x = Math.floor((L - 0.3) / step) * step; x > 0.29; x -= step) out.push([x + notch / 2, w], [x, w - b + 0.05], [x - notch / 2, w]);
    out.push([0, w]);
    const folds = []; if (a) folds.push([[0, a], [L, a]]); if (b) folds.push([[0, w - b], [L, w - b]]);
    return { out, folds, w };
  }
  const hoodLen = p => { const e = lampLocal(p, 0.7, 72); let L = 0; e.forEach((q, i) => { const r = e[(i + 1) % e.length]; if (q[1] > 0 && r[1] > 0) L += Math.hypot(r[0] - q[0], r[1] - q[1]); }); return L + 1; };
  const boxLen = p => { const e = lampLocal(p, 0.3, 72); return e.reduce((L, q, i) => L + Math.hypot(e[(i + 1) % e.length][0] - q[0], e[(i + 1) % e.length][1] - q[1]), 0) + 1; };

  // trapezoid glue tabs on the chosen edges of a closed polygon; returns the new outline and the fold lines
  function tabEdges(pts, edges, w) {
    const n = pts.length, cen = [pts.reduce((s, q) => s + q[0], 0) / n, pts.reduce((s, q) => s + q[1], 0) / n], out = [], folds = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n]; out.push(a);
      if (!edges.includes(i)) continue;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], mid = lerp2(a, b, 0.5), ins = Math.min(w, L * 0.3);
      let nn = [u[1], -u[0]]; if (nn[0] * (cen[0] - mid[0]) + nn[1] * (cen[1] - mid[1]) > 0) nn = [-nn[0], -nn[1]];
      out.push([a[0] + nn[0] * w + u[0] * ins, a[1] + nn[1] * w + u[1] * ins], [b[0] + nn[0] * w - u[0] * ins, b[1] + nn[1] * w - u[1] * ins]);
      folds.push([a, b]);
    }
    return { out, folds };
  }

  // glue tabs along an edge E (O = the opposite edge): V gaps let them follow a curve
  function fringeTabs(E, O, depth) {
    const cum = [0];
    for (let i = 1; i < E.length; i++) cum.push(cum[i - 1] + Math.hypot(E[i][0] - E[i - 1][0], E[i][1] - E[i - 1][1]));
    const L = cum[cum.length - 1];
    const ptAt = s => {
      let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
      const f = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), e = lerp2(E[i - 1], E[i], f), o = lerp2(O[i - 1], O[i], f), d = Math.hypot(e[0] - o[0], e[1] - o[1]);
      return { e, out: [e[0] + (e[0] - o[0]) / d * depth, e[1] + (e[1] - o[1]) / d * depth] };
    };
    const end = 1.5, gap = 0.6, taper = 0.45, k = Math.max(1, Math.round((L - 2 * end + gap) / (2.6 + gap))), tl = (L - 2 * end + gap) / k - gap;
    const out = [E[0]], edge = (sa, sb) => { for (let i = 0; i < E.length; i++) if (cum[i] > sa && cum[i] < sb) out.push(E[i]); };
    let s = end; edge(0, s);
    for (let j = 0; j < k; j++) {
      const a = s, b = s + tl;
      out.push(ptAt(a).e);
      for (let q = 0; q <= 4; q++) out.push(ptAt(a + taper + (b - a - 2 * taper) * q / 4).out);
      out.push(ptAt(b).e);
      s = j < k - 1 ? b + gap : L; edge(b, s);
    }
    out.push(E[E.length - 1]);
    return out;
  }

  // curved windshield: ruled surface from a U on the deck (in front of her) to a smaller U, higher and further back
  function shieldPt(p, f, top) {
    const ph = f * Math.PI / 2, xc = p.beamFX;
    return top ? [xc + p.domeL * 0.32 * Math.cos(ph), p.domeW / 2 * 0.86 * Math.sin(ph), p.domeH]
      : [xc + p.domeL * Math.cos(ph), p.domeW / 2 * Math.sin(ph), 0];
  }
  function shieldPart(p) {
    const n = 60, rs = [];
    for (let i = 0; i <= n; i++) { const f = -1 + 2 * i / n; rs.push({ T: shieldPt(p, f, true), B: shieldPt(p, f, false) }); }
    let { T: Tp, B: Bp } = unfold(rs);
    const ang = Math.atan2(Bp[n][1] - Bp[0][1], Bp[n][0] - Bp[0][0]), ca = Math.cos(-ang), sa = Math.sin(-ang), rot = q => [q[0] * ca - q[1] * sa, q[0] * sa + q[1] * ca];
    Tp = Tp.map(rot); Bp = Bp.map(rot);
    const paths = [P(fringeTabs(Bp, Tp, 1.5).concat(Tp.slice().reverse()), 'cut', true), P(Bp, 'fold'), P([Bp[n / 2], Tp[n / 2]], 'mark')];
    const cx = (Bp[n / 2][0] + Tp[n / 2][0]) / 2, cy = (Bp[n / 2][1] + Tp[n / 2][1]) / 2;
    const texts = [T(cx, cy - 1.2, 'S  WINDSHIELD', { size: 10, bold: true }), T(cx, cy + 0.2, 'Clear plastic: A3 OHP sheet or an opened clear folder', { size: 6.5 }),
      T(cx, cy + 1.4, 'Tabs fold OUT and tape to the deck on line S', { size: 6.5 }), T(Bp[n / 2][0] + 0.4, Bp[n / 2][1] - 1, 'front centre', { size: 6, color: 'mark', anchor: 'start' })];
    let area = 0; for (let i = 0; i < n; i++) area += polyArea([Tp[i], Tp[i + 1], Bp[i + 1], Bp[i]]);
    return normalize({ id: 'S', name: 'Windshield', cut: '1', count: 1, mat: 'Clear plastic sheet (A3 OHP / clear folder)', half: false,
      note: 'Curves round the front of the cockpit and leans back, like the blueprint. Tape the tabs to the deck on the printed line, then run black electrical tape along the top edge so it is smooth and easy to see.',
      paths, texts, flutes: null, area, sheet: 'shield', mass: { x: p.beamFX + p.domeL * 0.4, g: area * 0.03 } });
  }

  function wallPart(p, which, front) {
    const t0 = front ? 0 : Math.PI / 2, t1 = front ? Math.PI / 2 : Math.PI, n = M / 2;
    const ts = [];
    for (let i = 0; i <= n; i++) ts.push(lerp(t0, t1, i / n));
    const rs = ts.map(t => band(p, which, t));
    let { T: Tp, B: Bp } = unfold(rs);
    const last = Tp[Tp.length - 1], ang = Math.atan2(last[1] - Tp[0][1], last[0] - Tp[0][0]);
    const ca = Math.cos(-ang), sa = Math.sin(-ang), rot = q => [q[0] * ca - q[1] * sa, q[0] * sa + q[1] * ca];
    Tp = Tp.map(rot); Bp = Bp.map(rot);
    const z0 = which === 'upper' ? 0 : -p.beltZ, z1 = which === 'upper' ? -p.beltZ : -p.H;
    const at = (t, z) => {
      const v = (z - z0) / (z1 - z0);
      let f = (t - t0) / (t1 - t0) * n; const i = Math.min(n - 1, Math.max(0, Math.floor(f))); f -= i;
      return lerp2(lerp2(Tp[i], Bp[i], v), lerp2(Tp[i + 1], Bp[i + 1], v), f);
    };
    const fringe = fringeTabs;
    const TAB = 1.5;
    const paths = [P(fringe(Tp, Bp, TAB).concat(fringe(Bp, Tp, TAB).reverse()), 'cut', true), P(Tp, 'fold'), P(Bp, 'fold')];
    const texts = [];
    // press lines along the lines the wall bends on, every 2 cm: the piece fans out, so towards one end the bend runs
    // up to 25 degrees across the flutes and would kink without them. Pressed on the inside face.
    {
      const BEND = 2;
      let acc = 0, first = null;
      for (let i = 1; i < n; i++) {
        acc += Math.hypot(Tp[i][0] - Tp[i - 1][0], Tp[i][1] - Tp[i - 1][1]);
        if (acc < BEND) continue;
        let left = 0;
        for (let j = i + 1; j <= n; j++) left += Math.hypot(Tp[j][0] - Tp[j - 1][0], Tp[j][1] - Tp[j - 1][1]);
        if (left < 0.8) break;
        paths.push(P([Tp[i], Bp[i]], 'score')); acc = 0; if (!first) first = i;
      }
      if (first) texts.push(T((Tp[first][0] + Bp[first][0]) / 2 + 0.4, (Tp[first][1] + Bp[first][1]) / 2 + 2.2, 'press lines (inside, every 2 cm)', { size: 6, color: 'mark', anchor: 'start' }));
    }
    const vline = (x, zA, zB, label) => {
      const a0 = at(tAtX(p, x, zA), zA), a1 = at(tAtX(p, x, zB), zB);
      paths.push(P([a0, a1], 'mark'));
      texts.push(T(a1[0] + 0.5, (a0[1] + a1[1]) / 2, label, { size: 6.5, color: 'mark', anchor: 'start' }));
    };
    if (which === 'upper') {
      if (front) {
        // strut hole: where the tube (plus 1 mm all round) passes through the sloping, curving wall, so it comes out oval
        const hc = at(tAtX(p, p.tubeFX, p.strutZ), p.strutZ), hr = p.tubeD / 2 + 0.1, sh = [];
        for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, x = p.tubeFX + hr * Math.cos(a), z = p.strutZ + hr * Math.sin(a); sh.push(at(tAtX(p, x, z), z)); }
        paths.push(P(sh, 'cut', true));
        texts.push(T(hc[0], hc[1] - p.tubeD / 2 - 0.6, 'strut hole', { size: 6.5, color: 'mark' }));
        vline(p.beamFX + p.board / 2, 0, -p.beamD, 'beam (inside)');
        const lc = at(p.lampT, p.lampZ), onC1 = grow => lampTZ(p, grow, 72).map(([t, z]) => at(t, z));
        paths.push(P(onC1(0), 'cut', true));
        texts.push(T(lc[0], lc[1] + p.lampH / 2 + 1.6, 'headlight window', { size: 6.5, color: 'mark' }));
        p.lampFlat = { window: onC1(0), trimO: onC1(0.7), trimI: onC1(-0.1), lens: onC1(0.6) };
      } else vline(p.backX - p.board / 2, 0, -p.beamD, 'rear beam (inside)');
    }
    const mid = (t0 + t1) / 2, c = at(mid, (z0 + z1) / 2);
    const idn = (which === 'upper' ? (front ? 'C1' : 'C2') : (front ? 'C3' : 'C4'));
    const nm = (which === 'upper' ? 'UPPER ' : 'LOWER ') + (front ? 'FRONT' : 'REAR');
    const tall = which === 'lower';
    texts.push(T(c[0], c[1] - (tall ? 1.6 : 0.9), `${idn}  WALL ${nm}`, { size: tall ? 11 : 9, bold: true }));
    texts.push(T(c[0], c[1] + (tall ? 0.2 : 0.6), 'Printed side = outside of LEFT wall. Cut 2, flip for RIGHT.', { size: 6.5 }));
    if (tall) texts.push(T(c[0], c[1] + 1.6, 'Flutes top to bottom.', { size: 6.5 }));
    const top = at(mid + (t1 - t0) * 0.22, z0 + (z1 - z0) * 0.12), bot = at(mid + (t1 - t0) * 0.22, z0 + (z1 - z0) * 0.9);
    texts.push(T(top[0], top[1], which === 'upper' ? 'top: to deck' : 'top: to belt ring', { size: 6 }));
    texts.push(T(bot[0], bot[1], which === 'upper' ? 'bottom: to belt ring' : 'bottom: to bottom ring', { size: 6 }));
    const e0 = at(t0, (z0 + z1) / 2), e1 = at(t1, (z0 + z1) / 2);
    texts.push(T(e0[0] + 1.2, e0[1] + (tall ? 0 : 2.4), front ? 'NOSE' : 'SIDE', { size: 7, bold: true, anchor: 'start' }));
    texts.push(T(e1[0] - 1.2, e1[1] + (tall ? 0 : 2.4), front ? 'SIDE' : 'REAR', { size: 7, bold: true, anchor: 'end' }));
    const area = polyArea(paths[0].pts);
    const mx = ts.reduce((s, t) => s + (wallPt(p, t, (z0 + z1) / 2)[0]), 0) / ts.length;
    return normalize({ id: idn, name: `Wall, ${which} ${front ? 'front' : 'rear'}`, cut: '2 (flip one for the right side)', count: 2,
      mat: 'Corrugated cardboard', half: false,
      note: which === 'upper' ? 'The sloping shoulder from deck to belt line. Flutes top to bottom. Fold the edge tabs inward and glue them under the deck and onto the belt ring; press the green lines on the inside to help the tight bends.' : 'The lower body from belt line to bottom edge. Pre-roll over a table edge, fold the edge tabs inward and glue them under the belt ring and onto the bottom ring.',
      paths, texts, flutes: [at(mid - (t1 - t0) * 0.25, z0 + (z1 - z0) * 0.25), at(mid - (t1 - t0) * 0.25, z0 + (z1 - z0) * 0.75)],
      area, sheet: which === 'upper' ? 'wallsU' : 'wallsL', mass: { x: mx, g: 2 * area * G_CARD } });
  }

  function beamPart(p, front) {
    const x = front ? p.beamFX + p.board / 2 : p.backX - p.board / 2;
    // fits between the walls: one card thickness in from the outside line at each end
    // (and one more for the folded end tabs)
    const yt = halfWidth(p, x, 0) - 2 * p.board, yb = halfWidth(p, x, -p.beamD) - 2 * p.board, d = p.beamD;
    const pts = [[0, 0], [2 * yt, 0], [yt + yb, d], [yt - yb, d]], tb = tabEdges(pts, [0, 1, 3], 1.5);
    const paths = [P(tb.out, 'cut', true), P([[yt, 0], [yt, d]], 'mark')].concat(tb.folds.map(f => P(f, 'fold')));
    if (!front) paths.push(P(circle(yt * 1.6, 1.4, 0.6, 16), 'cut', true));
    const layer2 = [P(pts, 'cut', true)].concat(front ? [] : [P(circle(yt * 1.6, 1.4, 0.6, 16), 'cut', true)]);
    const texts = [T(yt, d / 2 - 0.2, front ? 'D1  FRONT BEAM' : 'D2  REAR BEAM', { size: 10, bold: true }),
      T(yt, d / 2 + 1.4, 'Long edge up. Top tab glues under the deck on the marked line,', { size: 6.5 }), T(yt, d / 2 + 2.5, 'end tabs onto the inside of the walls.', { size: 6.5 })];
    return normalize({ id: front ? 'D1' : 'D2', name: front ? 'Front beam' : 'Rear beam', cut: '1', count: 1, mat: 'Corrugated cardboard', half: false,
      note: front ? 'Stiffens the deck in front of her. The strut tube is glued along its front face.' : 'Sits directly under the backrest. The small hole lets the battery wire through.',
      paths, layer2, texts, flutes: [[yt * 0.25, 1.2], [yt * 0.25, d - 1.2]], area: polyArea(pts), sheet: 'beams', mass: { x, g: polyArea(pts) * G_CARD } });
  }

  function backrestPart(p) {
    const hw = p.backW / 2, R = p.backR, H = p.backH, tb = p.backTab;
    const outline = [[0, 0], [hw - R, 0]].concat(arc(hw - R, R, R, -Math.PI / 2, 0, 16)).concat([[hw, H], [hw - 1, H + tb], [0, H + tb]]);
    const paths = [P(outline, 'cut'), P([[0, 0], [0, H + tb]], 'center'), P([[0, H], [hw, H]], 'fold')];
    const sx = Math.min(7, hw - 4);
    p.strapBackY = sx;
    paths.push(P(rect(sx - 1.75, 3.2, 3.5, 0.6), 'cut', true));
    paths.push(P([[0, H - p.tailH], [p.tailW / 2, H]], 'mark'));
    const layer2 = [P([[0, 0], [hw - R, 0]].concat(arc(hw - R, R, R, -Math.PI / 2, 0, 16)).concat([[hw, H], [0, H]]), 'cut'), P([[0, 0], [0, H]], 'center'), P(rect(sx - 1.75, 3.2, 3.5, 0.6), 'cut', true)];
    const texts = [T(hw / 2 + 1, 7.4, 'E  BACKREST', { size: 11, bold: true }),
      T(hw / 2 + 1, 8.9, 'Half pattern. Cut 2: seat front and back.', { size: 7 }), T(hw / 2 + 1, 10.1, 'Strap slot in the front one only.', { size: 7 }),
      T(sx, 2.4, 'strap slot', { size: 6.5, color: 'mark' }),
      T(p.tailW / 4 + 0.6, H - p.tailH / 2, 'tail fin K (back panel)', { size: 6, color: 'mark', anchor: 'start' }),
      T(hw / 2, H + tb / 2 + 0.3, 'TAB: fold into the box, glue to deck', { size: 6.5 })];
    const area = 2 * polyArea(outline);
    return normalize({ id: 'E', name: 'Backrest', cut: '2: seat front and seat back (half pattern, flip on centre line)', count: 2, mat: 'Corrugated cardboard', half: true,
      note: 'The seat back. Two panels joined 4 cm apart by edge strip R8 make a thick, padded-looking seat. The front panel rests on her back and has the strap slots; the TAXI sign sits on top and the tail fin is glued to the back.',
      paths, layer2, texts, flutes: [[hw - 2, 12], [hw - 2, 16]], area, sheet: 'small', mass: { x: p.backX - p.board, g: 2 * area * G_CARD } });
  }

  function tailLightPart(p) {
    const w = 3, h = 5, r = 0.8;
    const out = arc(r, r, r, Math.PI, Math.PI * 1.5, 6).concat(arc(w - r, r, r, -Math.PI / 2, 0, 6), arc(w - r, h - r, r, 0, Math.PI / 2, 6), arc(r, h - r, r, Math.PI / 2, Math.PI, 6));
    return normalize({ id: 'M', name: 'Tail light', cut: '2', count: 2, mat: 'Red card (or red craft foam)', half: false,
      note: 'Glue one at each rear corner on the lower wall, just under the checker stripe. Paint the panel between them black.',
      paths: [P(out, 'cut', true)], texts: [T(w / 2, h / 2 + 0.4, 'M', { size: 10, bold: true })], flutes: null, area: 0, sheet: 'small' });
  }

  // headlight trim and lens: outlines taken from wall C1's flat pattern, so they follow its curve when glued on
  function trimPart(p) {
    const f = p.lampFlat, c = f.trimO.reduce((s, q) => [s[0] + q[0] / f.trimO.length, s[1] + q[1] / f.trimO.length], [0, 0]);
    return normalize({ id: 'U', name: 'Headlight trim', cut: '2 (flip one for the right side)', count: 2, mat: 'Thin card (cereal box), painted silver or white', half: false,
      note: 'Gives the headlight its egg shape, like the blueprint. Glue it on the outside of wall C1 round the headlight window, pointed end up and towards the back. Its inner edge sits 1 mm inside the window, hiding the cut edge. Hood R7 goes over the top.',
      paths: [P(f.trimO, 'cut', true), P(f.trimI, 'cut', true)], texts: [T(c[0], c[1] + 0.3, 'U', { size: 7, bold: true })], flutes: null, area: 0, sheet: 'small' });
  }
  function boxSidePart(p) {
    const L = boxLen(p), st = notchStrip(L, 3, 1, 1, 1, 0.5), m = L / 2;
    return normalize({ id: 'W', name: 'Headlight box side', cut: '2', count: 2, mat: 'Thin card (cereal box)', half: false, size: `5 x ${L.toFixed(0)} cm`,
      note: 'Cut round the outline, including every small V notch: the V\'s go in the bin, the tabs between them stay. Paint the middle band white. Top row of tabs folds OUT and glues to the inside of wall C1 round the headlight window (over the lens). Bottom row folds IN; back X glues onto them. Bend it round the egg, overlap the ends 1 cm and tape.',
      paths: [P(st.out, 'cut', true)].concat(st.folds.map(f => P(f, 'fold'))),
      texts: [T(m, 1.55, 'TOP TABS: fold OUT, glue to the wall round the window', { size: 5.5 }),
        T(m, 2.55, 'W  HEADLIGHT BOX SIDE  -  this side white, faces in', { size: 7, bold: true }),
        T(m, 3.15, 'overlap the ends 1 cm', { size: 5.5 }),
        T(m, 3.85, 'BOTTOM TABS: fold IN, back X glues on', { size: 5.5 })], flutes: null, area: 0, sheet: 'small' });
  }
  function hoodPart(p) {
    const L = hoodLen(p), st = notchStrip(L, 2, 1, 0, 1, 0.5), m = L / 2;
    return normalize({ id: 'R7', name: 'Headlight hood', cut: '2', count: 2, mat: 'Thin card (cereal box)', half: false, size: `3 x ${L.toFixed(0)} cm`,
      note: 'Cut round the outline including the V notches (bin the V\'s, keep the tabs). Fold the tabs back, bend the strip into an arch over the top of trim U and glue the tabs to the wall, so it sticks out like an eyelid. Paint it yellow with the body.',
      paths: [P(st.out, 'cut', true)].concat(st.folds.map(f => P(f, 'fold'))),
      texts: [T(m, 1.6, 'TABS: fold back, glue to the wall above the trim', { size: 5.5 }), T(m, 2.45, 'R7  HEADLIGHT HOOD', { size: 7, bold: true })], flutes: null, area: 0, sheet: 'small' });
  }
  function boxBackPart(p) {
    const e = lampLocal(p, 0.3, 72).map(([u, v]) => [u, -v]), x0 = Math.min(...e.map(q => q[0])), y0 = Math.min(...e.map(q => q[1]));
    const pts = e.map(q => [q[0] - x0, q[1] - y0]), c = [-x0, -y0];
    return normalize({ id: 'X', name: 'Headlight box back', cut: '2 (flip one for the right side)', count: 2, mat: 'Thin card (cereal box)', half: false,
      note: 'The back of the little light box behind each headlight. Push the LED through the centre hole from behind and hot-glue it there, then glue this panel onto the back tabs of strip W. Paint the front face white.',
      paths: [P(pts, 'cut', true), P(circle(c[0], c[1], 0.5, 16), 'cut', true)], texts: [T(c[0], c[1] - 0.9, 'X  BOX BACK', { size: 6.5, bold: true }), T(c[0], c[1] + 1.5, 'LED hole', { size: 5.5 })],
      flutes: null, area: 0, sheet: 'small' });
  }
  function lensPart(p) {
    const f = p.lampFlat, c = f.lens.reduce((s, q) => [s[0] + q[0] / f.lens.length, s[1] + q[1] / f.lens.length], [0, 0]);
    return normalize({ id: 'V', name: 'Headlight lens', cut: '2 (flip one for the right side)', count: 2, mat: 'White see-through plastic (frosted folder, milk jug)', half: false,
      note: 'Glued behind the headlight window, inside wall C1, so the whole egg glows white. The dashed line is the window: centre the lens on it. Light box W + X is glued on behind it.',
      paths: [P(f.lens, 'cut', true), P(f.window, 'mark', true)], texts: [T(c[0], c[1] + 0.3, 'V  LENS', { size: 7, bold: true })], flutes: null, area: 0, sheet: 'small' });
  }

  function dashPart(p) {
    const w = 14, h = 6, r = 2, tab = 2;
    const out = [[0, h + tab], [0, r]].concat(arc(r, r, r, Math.PI, Math.PI * 1.5, 8)).concat(arc(w - r, r, r, -Math.PI / 2, 0, 8)).concat([[w, h + tab]]);
    return normalize({ id: 'G', name: 'Dashboard', cut: '1', count: 1, mat: 'Corrugated cardboard', half: false,
      note: 'Behind the windshield, leaning back towards her. A jar lid makes the steering wheel.', paths: [P(out, 'cut', true), P([[0, h], [w, h]], 'fold')],
      texts: [T(w / 2, 3, 'G  DASHBOARD', { size: 9, bold: true }), T(w / 2, h + 1.3, 'tab: fold, glue to deck', { size: 6.5 })], flutes: null,
      area: polyArea(out), sheet: 'small', mass: { x: p.beamFX + 2, g: polyArea(out) * G_CARD } });
  }

  function bracePart(p) {
    const pts = [[0, 0], [0, 5], [3.5, 5]], tb = tabEdges(pts, [0, 1], 1.2);
    return normalize({ id: 'H', name: 'Dashboard brace', cut: '2', count: 2, mat: 'Corrugated cardboard', half: false,
      note: 'Props the dashboard at an angle. Fold one tab onto the deck and the other onto the back of the dashboard.', paths: [P(tb.out, 'cut', true)].concat(tb.folds.map(f => P(f, 'fold'))), texts: [T(1.1, 4.2, 'H', { size: 8, bold: true })], flutes: null,
      area: 8.75, sheet: 'small', mass: { x: p.beamFX + 2, g: 17.5 * G_CARD } });
  }

  function rotorRingPart(p) {
    const R = p.rotorD / 2, r = R - p.ringW;
    const outer = arc(R, 0, R, 0, Math.PI, 64), inner = arc(R, 0, r, 0, Math.PI, 64);
    const paths = [P(outer, 'cut'), P(inner, 'cut'), P([[0, 0], [R - r, 0]], 'center'), P([[R + r, 0], [2 * R, 0]], 'center'),
      P([[R - 0.6, 0], [R + 0.6, 0]], 'mark'), P([[R, -0.6], [R, 0.6]], 'mark')];
    const area = Math.PI * (R * R - r * r);
    return normalize({ id: 'I', name: 'Rotor ring', cut: '2 rings (half pattern). Outer line also = clear covers', count: 2, mat: 'Cardboard; clear plastic for covers', half: true,
      note: 'The thick yellow lip on top of the rim. Use the outer line to cut 2 clear plastic discs, one over each rotor; base disc Q already closes the bottom.',
      paths, texts: [T(R, r * 0.45, 'I  ROTOR RING', { size: 9, bold: true }), T(R, r * 0.45 + 1.3, 'half: flip on red line', { size: 6.5 })],
      flutes: null, area, sheet: 'small', mass: { x: p.tubeFX, g: 2 * area * G_CARD } });
  }

  function bladePart(p) {
    const R = p.rotorD / 2, len = R - p.ringW - 1 - 1.5, tip = 1.4, Lc = len - tip;
    const top = [], bot = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20, hw = 0.6 + (tip - 0.6) * Math.pow(u, 0.7); top.push([u * Lc, -hw]); bot.push([u * Lc, hw]); }
    const pts = top.concat(arc(Lc, 0, tip, -Math.PI / 2, Math.PI / 2, 12)).concat(bot.reverse());
    return normalize({ id: 'J', name: 'Rotor blade', cut: '8 (4 per rotor)', count: 8, mat: 'Thin card (cereal box), painted black', half: false,
      note: 'Soft card, not plastic: the motor spins fast. Narrow end glues onto the bottle-cap hub with a slight twist.', paths: [P(pts, 'cut', true)],
      texts: [T(Lc * 0.55, 0.3, 'J', { size: 8, bold: true })], flutes: null, area: 0, sheet: 'small' });
  }

  // fin side panel corners (plan coords): A base front against the seat, B tail point on the deck,
  // C top rear, D top front, E top of the seat; B..E lie on the centre plane, so the panel folds gently along A-C and A-D
  function finPts(p) {
    return { A: [p.tailX0, p.tailW / 2, 0], B: [p.tailX1, 0, 0], C: [p.finXC, 0, p.finH], D: [p.finXD, 0, p.finH], E: [p.tailX0, 0, p.backH] };
  }
  function tailPart(p) {
    // fan-unfold around A: every edge length and the angle between neighbouring rays is kept
    const F = finPts(p), sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
    const ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v)))));
    const rays = ['B', 'C', 'D', 'E'].map(k => sub(F[k], F.A));
    const pts = { A: [0, 0] }; let th = 0;
    rays.forEach((r, i) => { if (i) th += ang(rays[i - 1], r); const L = Math.hypot(...r); pts['BCDE'[i]] = [L * Math.sin(th), -L * Math.cos(th)]; });
    const { A: a, B: b, C: c, D: d, E: e } = pts, w = 1.5;
    const cen = [(a[0] + b[0] + c[0] + d[0] + e[0]) / 5, (a[1] + b[1] + c[1] + d[1] + e[1]) / 5];
    const tab = (P0, Q0) => {
      const L = Math.hypot(Q0[0] - P0[0], Q0[1] - P0[1]), u = [(Q0[0] - P0[0]) / L, (Q0[1] - P0[1]) / L], mid = lerp2(P0, Q0, 0.5);
      let nn = [u[1], -u[0]]; if (nn[0] * (cen[0] - mid[0]) + nn[1] * (cen[1] - mid[1]) > 0) nn = [-nn[0], -nn[1]];
      return [[P0[0] + nn[0] * w + u[0] * w, P0[1] + nn[1] * w + u[1] * w], [Q0[0] + nn[0] * w - u[0] * w, Q0[1] + nn[1] * w - u[1] * w]];
    };
    const out = [a].concat(tab(a, b), [b], tab(b, c), [c], tab(c, d), [d], tab(d, e), [e], tab(e, a));
    const paths = [P(out, 'cut', true), P([a, b], 'fold'), P([a, e], 'fold'), P([b, c], 'fold'), P([c, d], 'fold'), P([d, e], 'fold'), P([a, c], 'score'), P([a, d], 'score')];
    const lc = lerp2(lerp2(c, d, 0.5), a, 0.3);
    const texts = [T(lc[0], lc[1] - 0.4, 'K  TAIL FIN', { size: 9, bold: true }), T(lc[0], lc[1] + 0.9, 'cut 2, flip one', { size: 6.5 }),
      T(lc[0], lc[1] + 2.1, 'bend gently on the green lines', { size: 6 }),
      T((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 2.4, 'tab: deck', { size: 6 }),
      T((a[0] + e[0]) / 2, (a[1] + e[1]) / 2 + 2.4, 'tab: back of seat', { size: 6 }),
      T((b[0] + c[0]) / 2 - 0.6, (b[1] + c[1]) / 2, 'back edge', { size: 6, anchor: 'end' }), T((c[0] + d[0]) / 2, (c[1] + d[1]) / 2 + 1.2, 'top', { size: 6 }),
      T(lc[0], lc[1] + 3.3, 'back/top/front tabs: cut them OFF the flipped copy', { size: 6 })];
    const area = polyArea([a, b, c, d, e]);
    return normalize({ id: 'K', name: 'Tail fin side', cut: '2 (flip one)', count: 2, mat: 'Corrugated cardboard', half: false,
      note: 'Two sides make the big swept-back fin behind the seat, traced from the blueprint side view. Cut the back, top and front edge tabs off the flipped copy. Bend gently on the green lines, glue the base tabs to the deck and up the back of the seat, then glue the edge tabs of one side inside the other. Leaf logo on each side.',
      paths, texts, flutes: [[cen[0], cen[1] - 3], [cen[0], cen[1] + 3]], area, sheet: 'fin',
      mass: { x: (p.tailX0 + p.tailX1 + p.finXC + p.finXD) / 4, g: 2 * area * G_CARD } });
  }

  function taxiPart(p) {
    const W = p.taxiW, D = p.taxiD, Hs = p.taxiH, tb = 1, a = tb + D, y0 = Hs + D, nw = p.backT / 2 + 0.25, nd = 2.5;
    const notch = () => [];
    const out = [[a, 0], [a + 0.6, -1], [a + W - 0.6, -1], [a + W, 0], [a + W, y0],
      [a + W + 0.3, y0 - tb], [a + W + D - 0.3, y0 - tb], [a + W + D, y0],
      [a + W + D + tb, y0 + 0.3], [a + W + D + tb, y0 + Hs - 0.3], [a + W + D, y0 + Hs]]
      .concat(notch(a + W + D / 2)).concat([[a + W, y0 + Hs], [a + W - 0.6, y0 + Hs + 1], [a + 0.6, y0 + Hs + 1], [a, y0 + Hs]]).concat(notch(a - D / 2))
      .concat([[a - D, y0 + Hs], [a - D - tb, y0 + Hs - 0.3], [a - D - tb, y0 + 0.3], [a - D, y0], [a - D + 0.3, y0 - tb], [a - 0.3, y0 - tb], [a, y0]]);
    const folds = [[[a, 0], [a + W, 0]], [[a, y0 + Hs], [a + W, y0 + Hs]], [[a, Hs], [a + W, Hs]], [[a, y0], [a + W, y0]], [[a - D, y0], [a, y0]], [[a + W, y0], [a + W + D, y0]],
      [[a, y0], [a, y0 + Hs]], [[a + W, y0], [a + W, y0 + Hs]], [[a - D, y0], [a - D, y0 + Hs]], [[a + W + D, y0], [a + W + D, y0 + Hs]]];
    const paths = [P(out, 'cut', true)].concat(folds.map(f => P(f, 'fold')));
    const texts = [T(a + W / 2, Hs / 2 + 0.3, 'back', { size: 7 }), T(a + W / 2, Hs + D / 2 + 0.3, 'top', { size: 7 }),
      T(a + W / 2, y0 + Hs / 2 + 0.6, 'L  TAXI (front)', { size: 9, bold: true }),
      T(a - D / 2, y0 + 1.6, 'end', { size: 6 }), T(a + W + D / 2, y0 + 1.6, 'end', { size: 6 })];
    return normalize({ id: 'L', name: 'TAXI sign box', cut: '1', count: 1, mat: 'Thin card (cereal box)', half: false,
      note: 'Score the dashed lines, fold, glue the side tabs inside. Fold the two bottom tabs in and glue them to the top of the seat.', paths, texts, flutes: null, area: 0, sheet: 'small' });
  }

  function capPart(p) {
    const r = p.tubeD / 2, c = r + 1.5, k = 8, out = [];
    for (let j = 0; j < k; j++) {
      const th = j / k * Math.PI * 2, hw = r * Math.sin(Math.PI / k) * 0.75, a = Math.asin(hw / r), ux = Math.cos(th), uy = Math.sin(th);
      out.push(...arc(c, c, r, th - Math.PI / k, th - a, 4));
      out.push([c + ux * (r + 1.5) + uy * hw, c + uy * (r + 1.5) - ux * hw], [c + ux * (r + 1.5) - uy * hw, c + uy * (r + 1.5) + ux * hw]);
      out.push(...arc(c, c, r, th + a, th + Math.PI / k, 4));
    }
    return normalize({ id: 'N', name: 'Pod bottom cap', cut: '2 (one per pod)', count: 2, mat: 'Corrugated cardboard', half: false,
      note: 'Closes the bottom of each pod tube. Fold the tabs up and glue them round the outside of the pod bottom. Glue it on last, after the motor wires are through.',
      paths: [P(out, 'cut', true), P(circle(c, c, r, 48), 'fold', true)], texts: [T(c, c + 0.3, 'N', { size: 8, bold: true })], flutes: null, area: Math.PI * r * r, sheet: 'small' });
  }

  // fish-mouth: wrap round the strut tube end and trim so it fits snugly against the round pod
  function fishPart(p) {
    const r = p.tubeD / 2, C = 2 * Math.PI * r, hgt = r + 2;
    const curve = [];
    for (let i = 0; i <= 80; i++) { const s = C * i / 80; curve.push([s, r * Math.abs(Math.sin(s / r))]); }
    const paths = [P(rect(0, 0, C, hgt), 'cut', true), P(curve, 'cut')];
    const texts = [T(C / 2, r + 0.9, 'O  FISH-MOUTH: cut the paper on the wavy line first', { size: 6.5, bold: true })];
    ['FRONT', 'TOP', 'BACK', 'BOTTOM', 'FRONT'].forEach((s, i) => {
      paths.push(P([[C * i / 4, hgt - 0.6], [C * i / 4, hgt]], 'mark'));
      texts.push(T(C * i / 4 + (i === 4 ? -0.15 : 0.15), hgt - 0.15, s, { size: 5.5, anchor: i === 4 ? 'end' : 'start' }));
    });
    [1, 3].forEach(q => texts.push(T(C * q / 4, r * 0.4, 'cut off', { size: 6, color: 'mark' })));
    return normalize({ id: 'O', name: 'Fish-mouth guide', cut: 'paper only, use 4 times', count: 0, mat: 'Paper (the printout itself)', half: false,
      note: 'Cut the paper along the wavy line and throw the top bits away. Wrap it round one end of the strut, wavy edge to the end, FRONT mark towards the nose, so the FRONT and BACK points are level with the end. Draw along the wavy edge and cut the tube on that line. The end then hugs the round pod. The paper ends should just meet round the tube; if they leave a gap or overlap, your tube is a different size: re-measure it and enter it on the page. See "Fitting the tubes".',
      paths, texts, flutes: null, area: 0, sheet: 'small' });
  }

  function podPart(p) {
    // wrap template for each motor pod: slanted top, straight bottom, where the strut meets, wire hole
    const r = p.tubeD / 2, C = 2 * Math.PI * r, k = p.slant, Hh = p.podLen + k;
    const top = [], saddle = [];
    for (let i = 0; i <= 80; i++) { const s = C * i / 80; top.push([s, k * (1 - Math.cos(s / r))]); }
    const ys = k + (p.podTop - p.strutZ), su = C / 4;
    for (let i = 0; i <= 40; i++) { const f = -Math.PI / 2 + Math.PI * i / 40; saddle.push([su + r * f, ys - r * Math.cos(f)]); }
    for (let i = 0; i <= 40; i++) { const f = Math.PI / 2 - Math.PI * i / 40; saddle.push([su + r * f, ys + r * Math.cos(f)]); }
    const paths = [P([[0, 0], [C, 0], [C, Hh], [0, Hh]], 'cut', true), P(top, 'cut'), P(saddle, 'mark', true), P(circle(su, ys, 1, 24), 'cut', true),
      P([[C / 2, 2 * k], [C / 2, 2 * k + 1.2]], 'mark')];
    const cx = (su + r * Math.PI / 2 + C) / 2;   // notes sit beside the strut circle, clear of it
    return normalize({ id: 'P', name: 'Pod tube wrap template', cut: 'paper only, use for both pods', count: 0, mat: 'Paper (the printout itself)', half: false,
      note: `Cut the paper on its curved top line first. Wrap it round a ${(p.podLen + p.slant).toFixed(1)} cm piece of tube, bottom edges level, FRONT towards the nose. Draw along the curve and cut the tube there: the pod top then leans ${p.tilt} degrees forward. Mark the strut circle, cut the 2 cm wire hole in it. For the second pod, flip the paper over. See "Fitting the tubes".`,
      paths, texts: [T(cx, Hh * 0.62, 'P  POD TUBE', { size: 9, bold: true }), T(cx, Hh * 0.62 + 1.2, 'wrap round tube, top edge flush', { size: 6 }),
        T(cx, Hh * 0.62 + 2.2, 'ends must just meet: made for a', { size: 5.5 }), T(cx, Hh * 0.62 + 3, `${p.tubeD} cm OUTSIDE diameter tube`, { size: 5.5 }),
        T(cx, Hh * 0.62 + 4, 'gap or overlap? re-measure and enter it on the page', { size: 5.5 }),
        T(C / 2 + 0.3, 2 * k + 1, 'FRONT', { size: 6, anchor: 'start' }), T(0.3, 1.6, 'BACK', { size: 6, anchor: 'start' }),
        T(su, ys - r - 0.5, 'strut joins here (inner side)', { size: 6, color: 'mark' }), T(su, ys + 0.3, 'wire', { size: 5.5 }),
        T(C / 2, Hh - 0.5, 'cut: bottom of pod', { size: 6 })],
      flutes: null, area: 0, sheet: 'small' });
  }

  // collar round the slanted top of each pod tube: its notched tabs fold OUT flat under base disc Q, so the rotor
  // is held by a ring of tabs, not just the thin edge of the tube. The top edge follows the same curve as template P.
  function collarPart(p) {
    const r = p.tubeD / 2, C = 2 * Math.PI * r, k = p.slant, L = C + 1, a = 1, band = 2.5, step = 1, n = 0.5;
    const yc = x => a + k * (1 - Math.cos(x / r));
    const out = [[0, yc(0) - a]];
    for (let x = step; x < L - 0.3; x += step) out.push([x - n / 2, yc(x - n / 2) - a], [x, yc(x) - 0.05], [x + n / 2, yc(x + n / 2) - a]);
    out.push([L, yc(L) - a]);
    const fold = [], bot = [];
    for (let i = 0; i <= 80; i++) { const x = L * i / 80; fold.push([x, yc(x)]); bot.push([x, yc(x) + band]); }
    const outline = out.concat(bot.slice().reverse());
    const m = C / 2, f = yc(m);
    return normalize({ id: 'Y', name: 'Pod top collar', cut: '2 (one per pod)', count: 2, mat: 'Thin card (cereal box)', half: false, size: `${(band + a + 2 * k).toFixed(1)} x ${L.toFixed(0)} cm`,
      note: 'Holds base disc Q on the slanted pod top. Cut out the small V notches (bin the V shapes, keep the tabs). Wrap the collar round the outside of the pod tube, curved edge flush with the slanted top, FRONT towards the nose, overlap 1 cm and glue. Fold the tabs OUT flat, then glue disc Q down onto them and onto the tube edge.',
      paths: [P(outline, 'cut', true), P(fold, 'fold'), P([[L - 1, yc(L - 1)], [L - 1, yc(L - 1) + band]], 'mark')],
      texts: [T(m, f + 0.8, 'TABS: fold OUT, glue under disc Q', { size: 6 }), T(m, f + 1.65, 'Y  POD TOP COLLAR', { size: 7, bold: true }),
        T(m, f + 2.3, 'FRONT', { size: 6 }), T(0.4, yc(0) + 1.4, 'BACK', { size: 6, anchor: 'start' }), T(L - 0.5, yc(L) + 1.4, 'overlap', { size: 5, anchor: 'middle' })],
      flutes: null, area: 0, sheet: 'small' });
  }
  // collar that wraps the motor so it fills the socket in Q's bottom layer (printed so nobody has to measure it)
  function motorCollarPart(p) {
    const W = 25, H = 2.5;
    return normalize({ id: 'R9', name: 'Motor collar', cut: '2 (one per motor)', count: 2, mat: 'Thin card (cereal box)', half: false, size: `${H} x ${W} cm`,
      note: 'Holds the motor square in the socket of base disc Q (the motor-shaped hole in its bottom layer). Wrap the strip tightly round the motor body with glue between the turns, the marked edge level with the motor face, and keep wrapping until it just pushes into the socket (about 3 turns); trim off what is left. Push it in until the motor face touches the top layer of Q, shaft up through the small hole, and run a bead of hot glue round the collar where it meets Q. It hangs inside the pod, already leaning with the rotor.',
      paths: [P(rect(0, 0, W, H), 'cut', true), P([[0.3, 0.35], [W - 0.3, 0.35]], 'mark')],
      texts: [T(W / 2, 0.85, 'THIS EDGE level with the motor face', { size: 6 }), T(W / 2, 1.65, 'R9  MOTOR COLLAR', { size: 7, bold: true }),
        T(W / 2, 2.25, 'wrap about 3 turns, until it fits the socket in Q', { size: 5.5 })],
      flutes: null, area: 0, sheet: 'small' });
  }
  function crossBarPart(p) {
    // rotor base: a disc glued on the slanted pod top; the rim strip wraps its edge, ring I sits on the rim as a lip
    const R = p.rotorD / 2, r = p.tubeD / 2, ea = r / Math.cos(p.tiltR);
    const outer = arc(R, 0, R, 0, Math.PI, 64), oval = [];
    for (let i = 0; i <= 40; i++) { const t = Math.PI * i / 40; oval.push([R + ea * Math.cos(t), r * Math.sin(t)]); }
    const paths = [P(outer, 'cut'), P([[0, 0], [R - 0.35, 0]], 'center'), P([[R + 0.35, 0], [2 * R, 0]], 'center'),
      P(arc(R, 0, 0.35, 0, Math.PI, 12), 'cut'), P(oval, 'mark')];
    // layer 2 socket: the shape of a type-130 hobby motor (20 mm round, 15 mm across its flats) plus about 3 turns of collar R9
    const sk = p.sockR, sock = []; for (let i = 0; i <= 32; i++) { const a = Math.PI * i / 32; sock.push([R + sk * Math.cos(a), Math.min(sk * Math.sin(a), p.sockF)]); }
    const layer2 = [P(outer, 'cut'), P([[0, 0], [R - sk, 0]], 'center'), P([[R + sk, 0], [2 * R, 0]], 'center'), P(sock, 'cut'), P(oval, 'mark')]   // the bottom layer sits on the tube, so it carries the oval too;
    const texts = [T(R, R * 0.5, 'Q  ROTOR BASE DISC', { size: 9, bold: true }), T(R, R * 0.5 + 1.3, 'half: flip on red line. Centre hole = motor shaft', { size: 6.5 }),
      T(R + ea + 0.4, r * 0.45, 'pod top (oval):', { size: 6, color: 'mark', anchor: 'start' }), T(R + ea + 0.4, r * 0.45 + 0.8, 'collar Y tabs glue here', { size: 6, color: 'mark', anchor: 'start' }), T(2 * R - 1.2, 1.4, 'FRONT', { size: 6.5, anchor: 'end' })];
    const area = Math.PI * R * R;
    return normalize({ id: 'Q', name: 'Rotor base disc', cut: '2 (half pattern, flip on centre line)', count: 2, mat: 'Corrugated cardboard', half: true,
      note: 'Glued flat on the slanted pod top (the oval mark shows where), FRONT towards the nose, onto the tabs of collar Y. Layer 2 (underneath) has a socket for the motor in its collar R9; the motor shaft comes up through the small centre hole. Rim strip R3 wraps its edge to make a shallow pan for the blades.',
      paths, layer2, texts, flutes: null, area, sheet: 'small', mass: { x: p.tubeFX, g: 2 * area * G_CARD } });
  }

  function rulerCuts(p) {
    const wrap = Math.PI * p.tubeD + 1.5, rim = Math.PI * p.rotorD + 2;
    const strut = 2 * p.rotorY;
    const uH = Math.hypot(p.beltZ, p.topS) + 0.5, lH = Math.hypot(p.H - p.beltZ, p.botS) + 0.5;
    const ws = halfWidth(p, p.tubeFX, p.strutZ), hoodL = hoodLen(p);
    return [
      { id: 'R1', name: 'Strut tube', size: `${strut.toFixed(1)} cm long, ${p.tubeD} cm across`, cut: '1', how: `Use a stiff ready-made tube, not rolled corrugated card (that goes floppy). Best: a cardboard mailing / poster tube ${p.tubeD} cm (${(p.tubeD / 2.54).toFixed(1)} in) across. R1 needs one unbroken tube at least ${strut.toFixed(0)} cm long; both pods R2 come from a second tube (${(2 * (p.podLen + p.slant)).toFixed(0)} cm), so you need 2 tubes (3 with a spare). Passes right through the body; fish-mouth both ends with guide O. Mark the middle of the strut: it crosses the walls ${ws.toFixed(1)} cm out each side. Wire hole: 1.5 cm across, on the UNDERSIDE of the strut, ${(ws - 2).toFixed(1)} cm from the middle towards her RIGHT (just inside that wall: the wire comes down the inside of the wall from under the right deck edge).`, w: strut, h: wrap, n: 1, x: p.tubeFX },
      { id: 'R2', name: 'Motor pod tube', size: `${(p.podLen + p.slant).toFixed(1)} cm long (back side), ${p.tubeD} cm across`, cut: '2', how: `Cut from the same postal tube as R1. Wrap template P round it to mark the slanted top (low side towards the nose, so the rotor leans ${p.tilt} degrees towards the audience), the bottom and the wire hole where the strut meets it.`, w: p.podLen + p.slant, h: wrap, n: 2, x: p.tubeFX },
      { id: 'R3', name: 'Rotor rim strip', size: `${p.rimH + 2 * TABW} x ${rim.toFixed(1)} cm (${p.rimH} cm rim + ${TABW} cm tabs each side)`, cut: '2', how: `Flutes across the strip so it bends. Cut out the small V notches along both edges (drawn on the cut-sheet print): the V's go, the tabs between them stay, so they fold in round the curve without overlapping. Wrap the strip round base disc Q, hot-glue the bottom tabs under Q, and glue lip ring I onto the top tabs.`, w: p.rimH, h: rim, n: 2, x: p.tubeFX, tabs: [TABW, TABW] },
      { id: 'R5', name: 'Wall joiner strips', size: `5 x ${uH.toFixed(0)} cm (4) and 5 x ${lH.toFixed(0)} cm (4)`, cut: '8', how: 'Glued inside each vertical wall seam: nose, rear and both sides, upper and lower.', w: 5, h: uH + lH, n: 4, x: 0 },
      { id: 'R8', name: 'Seat edge strip', size: `${p.seatT + 2 * TABW} x ${(2 * (p.backH - p.backR) + (p.backW - 2 * p.backR) + Math.PI * p.backR + 1).toFixed(0)} cm (${p.seatT} cm + ${TABW} cm tabs each side)`, cut: '1', how: `Flutes ACROSS the strip so it bends round the rounded corners. Cut out the small V notches along both edges (drawn on the cut-sheet print), keep the tabs between them, and fold the tabs in. Hot-glue one row of tabs to the inside of the front seat panel E round the sides and top, then run glue along the other row and press the back panel on from outside: the seat becomes a ${p.seatT} cm thick padded-looking box.`, tabs: [TABW, TABW], w: p.seatT, h: 2 * (p.backH - p.backR) + (p.backW - 2 * p.backR) + Math.PI * p.backR, n: 1, x: p.backX - p.seatT / 2 },
      { id: 'R6', name: 'Shoulder straps', size: '2.5 cm elastic, 2 x about 55 cm', cut: '2', how: 'Deck slot, up over the shoulder, cross at the back, down to the backrest slot. Bottle cap as a washer under every knot; a bag buckle makes them adjustable.', w: 0, h: 0, n: 0, x: 0 }
    ];
  }

  function electrics(p) {
    return [
      ['2 x small DC hobby motor (3-6 V)', 'One inside the top of each pod, in the socket of base disc Q, shaft pointing up through its centre hole.'],
      ['Battery box, 3 x AA with on/off switch (4.5 V)', 'Velcro under the deck behind her, inside the tail end of the body. Its switch is the master switch: you turn it on from under the back hem before she walks out, and the headlights come on. 3 x AA is needed for white LEDs; the motors are happy on it too.'],
      ['About 2 m of thin two-core wire', 'Battery box, through the hole in rear beam D2, along under the right-hand deck edge (masking tape every 10 cm) to the button, then into the strut tube and out to each pod.'],
      ['Latching push button, 16 mm (press on, press off)', 'The TAKE-OFF button on the right-hand deck rim, just ahead of her hip. The pilot presses it on the ramp; it sits in the wire between the battery box and the motors.'],
      ['2 x 10 mm white LEDs + 2 x 100 ohm resistors', `Headlights. Each LED sits in a small white card light box (strip W + back X) glued behind lens V and the egg-shaped window in wall C1, so the whole egg glows. Trim U on the outside, hood R7 over it. One resistor on the long (+) leg of each LED. Wired straight to the battery, so they light with the master switch, not the take-off button.`],
      ['About 1.5 m more two-core wire (headlights)', 'From the battery, taped alongside the motor wire under the right deck edge, on past the button to the nose, then one branch to each headlight.'],
      ['Solder and heat-shrink or insulating tape', 'Wire the two motors in parallel. Swap the two wires on one motor if you want the rotors to spin in opposite directions.'],
      ['2 bottle caps', 'Blade hubs, open side UP. Make a hole a little smaller than the shaft in the centre, press it on so it clears the base disc by 2 mm, add a drop of glue. Glue the 4 blades to its sides.'],
      ['Sandpaper, hot glue', 'Holding the motor: scuff the motor front with sandpaper, wrap it in collar R9 and push it into the socket under base disc Q until the face touches the top layer, shaft up through the centre hole, then hot-glue round the collar. Keep glue off the shaft and out of the vents on the motor sides.'],
      ['Clear plastic (food-box lid or OHP sheet)', 'Two discs from the ring pattern, one taped over each rotor. With base disc Q underneath, the blades are fully enclosed.']
    ];
  }

  function build(over) {
    const p = derive(Object.assign({}, DEFAULTS, over || {}));
    const parts = [deckPart(p),
      ringPart(p, 'belt', 'B1', 'Belt ring', 3, 'Horizontal ring at the belt line where upper and lower walls meet. Gives the body its widest shape. The checker stripe goes here.', 'belt'),
      ringPart(p, 'bot', 'B2', 'Bottom ring', 4, 'Holds the bottom edge of the lower walls in shape.', 'ring'),
      wallPart(p, 'upper', true), wallPart(p, 'upper', false), wallPart(p, 'lower', true), wallPart(p, 'lower', false),
      beamPart(p, true), beamPart(p, false), backrestPart(p), tailPart(p), dashPart(p), bracePart(p), trimPart(p), lensPart(p), boxSidePart(p), boxBackPart(p), hoodPart(p),
      rotorRingPart(p), bladePart(p), taxiPart(p), shieldPart(p), tailLightPart(p), capPart(p), crossBarPart(p), collarPart(p), motorCollarPart(p), fishPart(p), podPart(p)];
    const ruler = rulerCuts(p);
    // weight and balance
    const masses = parts.filter(q => q.mass).map(q => ({ name: q.name, x: q.mass.x, g: q.mass.g }));
    ruler.forEach(r => { if (r.n) masses.push({ name: r.name, x: r.x, g: r.w * r.h * r.n * G_CARD }); });
    masses.push({ name: 'motors', x: p.tubeFX, g: 2 * 20 }, { name: 'clear covers + blades', x: p.tubeFX, g: 2 * 12 },
      { name: 'battery box + 3 AA', x: p.batX, g: 85 }, { name: 'headlights', x: p.L / 2 - 6, g: 15 },
      { name: 'wire, glue', x: (p.tubeFX + p.backX) / 2, g: 40 });
    const total = masses.reduce((s, m) => s + m.g, 0);
    const cgX = masses.reduce((s, m) => s + m.g * m.x, 0) / total;
    const xf = p.strapFront[0], xb = p.backX - p.board;
    const stats = {
      span: 2 * (p.rotorY + p.rotorD / 2), sideRim: halfWidth(p, p.hx, 0) - p.holeW / 2,
      grams: total, cgX, cgFromHips: cgX - p.hx, frontShare: (cgX - xb) / (xf - xb),
      topAboveWaist: p.backH + p.taxiH, strapFront: p.strapFront, strapBackY: p.strapBackY,
      bodyH: p.H, hole: [p.holeW, p.holeD], backH: p.backH
    };
    return { p, parts, ruler, electrics: electrics(p), stats, helpers: { topPt, olPt, band, wallPt, halfWidth, holeHalf, se, buttonAt, shieldPt, finPts, lampTZ, lampLocal } };
  }

  // ---------- A4 tiling ----------
  const PAGE = { CW: 19.4, CH: 27.2, pad: 0.3, gap: 1.0 };
  function placeItems(parts, rot, horizontal) {
    let cur = PAGE.pad, other = 0; const items = [];
    parts.forEach(pt => {
      const w = rot ? pt.h : pt.w, h = rot ? pt.w : pt.h;
      if (horizontal) { items.push({ part: pt, rot, ox: cur, oy: PAGE.pad }); cur += w + PAGE.gap; other = Math.max(other, h); }
      else { items.push({ part: pt, rot, ox: PAGE.pad, oy: cur }); cur += h + PAGE.gap; other = Math.max(other, w); }
    });
    const len = cur - PAGE.gap + PAGE.pad, wid = other + 2 * PAGE.pad;
    return horizontal ? { items, w: len, h: wid } : { items, w: wid, h: len };
  }
  function layoutA4(parts) {
    const sheets = [];
    ['deck', 'belt', 'ring', 'wallsU', 'wallsL', 'beams', 'shield', 'fin'].forEach(key => {
      const ps = parts.filter(q => q.sheet === key);
      if (!ps.length) return;
      const a = placeItems(ps, false, false), b = placeItems(ps, true, true);
      const cnt = s => Math.ceil(s.w / PAGE.CW - 1e-9) * Math.ceil(s.h / PAGE.CH - 1e-9);
      const s = cnt(b) < cnt(a) ? b : a;
      sheets.push({ key, items: s.items, w: s.w, h: s.h, cols: Math.ceil(s.w / PAGE.CW - 1e-9), rows: Math.ceil(s.h / PAGE.CH - 1e-9), name: ps.map(q => q.id).join(' + ') });
    });
    // first-fit shelf packing of the small parts, trying both orientations
    const small = parts.filter(q => q.sheet === 'small').sort((u, v) => v.w * v.h - u.w * u.h);
    const smallPages = [];
    small.forEach(pt => {
      const opts = [false, true].map(rot => ({ rot, w: (rot ? pt.h : pt.w) + 2 * PAGE.pad, h: (rot ? pt.w : pt.h) + 2 * PAGE.pad }))
        .filter(o => o.w <= PAGE.CW && o.h <= PAGE.CH);
      let done = false;
      for (const pg of smallPages) {
        for (const o of opts) {
          for (const sh of pg.shelves) if (!done && o.h <= sh.h && sh.x + o.w <= PAGE.CW) { pg.items.push({ part: pt, rot: o.rot, ox: sh.x + PAGE.pad, oy: sh.y + PAGE.pad }); sh.x += o.w; done = true; }
          if (!done && pg.used + o.h <= PAGE.CH) { pg.shelves.push({ y: pg.used, h: o.h, x: o.w }); pg.items.push({ part: pt, rot: o.rot, ox: PAGE.pad, oy: pg.used + PAGE.pad }); pg.used += o.h; done = true; }
          if (done) break;
        }
        if (done) break;
      }
      if (!done) {
        const o = opts[0];
        smallPages.push({ key: 'small', items: [{ part: pt, rot: o.rot, ox: PAGE.pad, oy: PAGE.pad }], shelves: [{ y: 0, h: o.h, x: o.w }], used: o.h, w: PAGE.CW, h: PAGE.CH, cols: 1, rows: 1 });
      }
    });
    smallPages.forEach(pg => sheets.push(pg));
    sheets.forEach(sh => { if (sh.key === 'small') sh.name = sh.items.map(i => i.part.id).join(', '); });
    const pages = [];
    sheets.forEach(sh => {
      for (let r = 0; r < sh.rows; r++) for (let c = 0; c < sh.cols; c++)
        pages.push({ sheet: sh, c, r, x0: c * PAGE.CW, y0: r * PAGE.CH, label: sh.cols * sh.rows > 1 ? String.fromCharCode(65 + c) + (r + 1) : '' });
    });
    return { pages, sheets, PAGE };
  }
  function place(item, q) {
    return item.rot ? [item.ox + (item.part.h - q[1]), item.oy + q[0]] : [item.ox + q[0], item.oy + q[1]];
  }

  // ---------- cardboard sheet layouts ----------
  // Lays every corrugated part out on 24 x 36 in sheets, waves running the way each part needs,
  // and nests smaller parts inside the holes of rings.
  const SHEET0 = { w: 91.4, h: 61 };
  const FIVE_PLY = ['A', 'E', 'D1', 'D2', 'Q'];
  const decimate = (pts, n) => { if (pts.length <= n) return pts; const out = []; for (let i = 0; i < n; i++) out.push(pts[Math.floor(i * pts.length / n)]); return out; };
  function inPoly(q, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function segDist(q, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L));
    return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy);
  }
  // the whole piece as cut (half patterns mirrored), its outline and any holes big enough to nest parts in
  function fullShape(part) {
    const paths = [], loops = [];
    if (part.half) {
      const c = part.paths.find(pa => pa.kind === 'center').pts, horiz = Math.abs(c[0][1] - c[c.length - 1][1]) < 1e-6;
      const mir = horiz ? q => [q[0], 2 * c[0][1] - q[1]] : q => [2 * c[0][0] - q[0], q[1]];
      part.paths.forEach(pa => {
        if (pa.kind === 'center') return;
        if (pa.kind === 'cut' && !pa.closed) { const loop = pa.pts.concat(pa.pts.slice().reverse().map(mir)); loops.push(loop); paths.push({ kind: 'cut', closed: true, pts: loop }); }
        else { paths.push(pa); paths.push({ kind: pa.kind, closed: pa.closed, pts: pa.pts.map(mir) }); }
      });
    } else part.paths.forEach(pa => { paths.push(pa); if (pa.kind === 'cut' && pa.closed) loops.push(pa.pts); });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    paths.forEach(pa => pa.pts.forEach(q => { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }));
    const sh = q => [q[0] - x0, q[1] - y0];
    const ls = loops.map(l => ({ l: l.map(sh), a: polyArea(l) })).sort((u, v) => v.a - u.a);
    const w = x1 - x0, h = y1 - y0;
    return {
      paths: paths.map(pa => ({ kind: pa.kind, closed: pa.closed, pts: pa.pts.map(sh) })),
      outline: ls.length ? ls[0].l : rect(0, 0, w, h), test: ls.length ? decimate(ls[0].l, 72) : rect(0, 0, w, h),
      holes: ls.slice(1).filter(o => o.a > 30).map(o => decimate(o.l, 72)), w, h,
      texts: part.texts.map(t => Object.assign({}, t, { x: t.x - x0, y: t.y - y0 })), flutes: part.flutes ? part.flutes.map(sh) : null
    };
  }
  const rectShape = (w, h) => ({ paths: [{ kind: 'cut', closed: true, pts: rect(0, 0, w, h) }], outline: rect(0, 0, w, h), test: rect(0, 0, w, h), holes: [], w, h });
  function stripShape(core, h, tabs) {
    const [a, b] = tabs || [0, 0], st = notchStrip(h, core, a, b, 2.5, 0.9), sw = q => [q[1], q[0]], w = st.w, sh = rectShape(w, h);
    sh.paths = [{ kind: 'cut', closed: true, pts: st.out.map(sw) }].concat(st.folds.map(f => ({ kind: 'fold', closed: false, pts: f.map(sw) })));
    return sh;
  }
  // place a shape: optional mirror (the "flip one" copy), optional quarter turn, then move
  function sheetTf(shape, rot, flip, x, y) {
    return q => { let a = flip ? [shape.w - q[0], q[1]] : q; a = rot ? [shape.h - a[1], a[0]] : a; return [a[0] + x, a[1] + y]; };
  }
  function layoutSheets(model, opts) {
    // sheet size in cm (landscape: w = long side); defaults to 24 x 36 in
    const SHEET = opts && opts.sheetW ? { w: Math.max(opts.sheetW, opts.sheetH), h: Math.min(opts.sheetW, opts.sheetH) } : SHEET0;
    SHEET.label = `${(SHEET.h / 2.54).toFixed(0)} × ${(SHEET.w / 2.54).toFixed(0)} in (${SHEET.h.toFixed(0)} × ${SHEET.w.toFixed(0)} cm)`;
    const along = opts && opts.flute === 'long' ? 'x' : 'y';   // sheet drawn landscape: x = long side
    const items = [], push = (id, name, shape, axis, board, n, flipOne) => { for (let k = 0; k < n; k++) items.push({ id, name, shape, axis, board, flip: !!flipOne && k % 2 === 1 }); };
    const only3 = !!(opts && opts.only3);
    // with only 3-ply: each 5-ply part becomes two 3-ply layers glued with the waves crossed (the seat's back panel stays single)
    model.parts.forEach(pt => {
      if (!/Corrugated|^Cardboard/.test(pt.mat) || !pt.count) return;
      const f = pt.flutes, axis = f ? (Math.abs(f[1][0] - f[0][0]) > Math.abs(f[1][1] - f[0][1]) ? 'x' : 'y') : null;
      const shape = fullShape(pt), heavy = FIVE_PLY.includes(pt.id);
      if (heavy && only3) {
        const extra = pt.id === 'E' ? 1 : pt.count;   // E: front panel doubled, back panel single
        const shape2 = pt.layer2 ? fullShape(Object.assign({}, pt, { paths: pt.layer2 })) : shape;   // no glue tabs on the 2nd layer
        push(pt.id, pt.name, shape, axis, 3, pt.count, false);
        push(pt.id, pt.name + ' (2nd layer, waves crossed)', shape2, axis ? (axis === 'x' ? 'y' : 'x') : null, 3, extra, false);
        return;
      }
      push(pt.id, pt.name, shape, axis, heavy ? 5 : 3, pt.count * (pt.id === 'T' ? 2 : 1), /flip one/.test(pt.cut));
    });
    const p = model.p;
    // long strips: waves must run across them; if they are then longer than the sheet allows, cut them in two (1 cm spare on each half, trimmed so the ends butt together)
    const room = (along === 'y' ? SHEET.w : SHEET.h) - 2;
    ['R3', 'R8'].forEach(id => {
      const r = model.ruler.find(q => q.id === id); if (!r) return;
      if (r.h <= room) push(id, r.name, stripShape(r.w, r.h, r.tabs), 'x', 3, r.n);
      else push(id, r.name + ' (half: trim ends to butt-join)', stripShape(r.w, r.h / 2 + 1, r.tabs), 'x', 3, 2 * r.n);
    });
    const uH = Math.hypot(p.beltZ, p.topS) + 0.5, lH = Math.hypot(p.H - p.beltZ, p.botS) + 0.5;
    push('R5', 'Wall joiner strip', rectShape(5, uH), 'y', 3, 4); push('R5', 'Wall joiner strip', rectShape(5, lH), 'y', 3, 4);
    const MARGIN = 1, GAP = 1, CLR = 0.8;
    const dims = (it, rot) => rot ? [it.shape.h, it.shape.w] : [it.shape.w, it.shape.h];
    const rots = it => it.axis ? [it.axis === along ? 0 : 1] : [0, 1];
    const hits = (r, list) => list.some(o => r.x < o.x + o.w + GAP && o.x < r.x + r.w + GAP && r.y < o.y + o.h + GAP && o.y < r.y + r.h + GAP);
    function intoHole(sh, it) {
      for (const hole of sh.holes) for (const rot of rots(it)) {
        const [w, h] = dims(it, rot);
        if (w > hole.bw - 2 * CLR || h > hole.bh - 2 * CLR) continue;
        const cands = [];
        for (let y = hole.by; y <= hole.by + hole.bh - h; y += 0.5) for (let x = hole.bx; x <= hole.bx + hole.bw - w; x += 0.5) cands.push([x, y, Math.hypot(x + w / 2 - hole.cx, y + h / 2 - hole.cy)]);
        cands.sort((a, b) => a[2] - b[2]);
        for (const [x, y] of cands) {
          const r = { x, y, w, h };
          if (hits(r, hole.rects)) continue;
          const T = sheetTf(it.shape, rot, it.flip, x, y), n = hole.poly.length;
          if (it.shape.test.every(q0 => { const q = T(q0); return inPoly(q, hole.poly) && hole.poly.every((a, i) => segDist(q, a, hole.poly[(i + 1) % n]) >= CLR); })) { hole.rects.push(r); return { x, y, rot }; }
        }
      }
      return null;
    }
    function onSheet(sh, it) {
      for (const rot of rots(it)) {
        const [w, h] = dims(it, rot);
        for (let y = MARGIN; y <= SHEET.h - MARGIN - h; y += 1) for (let x = MARGIN; x <= SHEET.w - MARGIN - w; x += 1) {
          const r = { x, y, w, h };
          if (!hits(r, sh.rects)) { sh.rects.push(r); return { x, y, rot }; }
        }
      }
      return null;
    }
    const ORDERS = [
      (u, v) => Math.max(v.shape.w, v.shape.h) - Math.max(u.shape.w, u.shape.h) || v.shape.w * v.shape.h - u.shape.w * u.shape.h,
      (u, v) => v.shape.w * v.shape.h - u.shape.w * u.shape.h,
      (u, v) => v.shape.h - u.shape.h || v.shape.w - u.shape.w,
      (u, v) => v.shape.w - u.shape.w || v.shape.h - u.shape.h,
      (u, v) => (v.shape.w + v.shape.h) - (u.shape.w + u.shape.h),
      (u, v) => (v.shape.holes.length - u.shape.holes.length) || v.shape.w * v.shape.h - u.shape.w * u.shape.h
    ];
    const pack = (list, board) => {
      const mine = [], miss = [];
      list.forEach(it => {
        let pl = null, sh = null;
        for (const s of mine) { pl = intoHole(s, it); if (pl) { sh = s; break; } }
        if (!pl) for (const s of mine) { pl = onSheet(s, it); if (pl) { sh = s; break; } }
        if (!pl) { sh = { board, rects: [], holes: [], placed: [] }; pl = onSheet(sh, it); if (pl) mine.push(sh); }
        if (!pl) { miss.push(it.id); return; }
        sh.placed.push({ id: it.id, name: it.name, shape: it.shape, flip: it.flip, x: pl.x, y: pl.y, rot: pl.rot });
        const T = sheetTf(it.shape, pl.rot, it.flip, pl.x, pl.y);
        it.shape.holes.forEach(hl => {
          const poly = hl.map(T), xs = poly.map(q => q[0]), ys = poly.map(q => q[1]);
          const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
          sh.holes.push({ poly, bx, by, bw, bh, cx: bx + bw / 2, cy: by + bh / 2, rects: [] });
        });
      });
      // score: fewest sheets, then the emptiest last sheet
      const last = mine.length ? mine[mine.length - 1].placed.reduce((t, q) => t + q.shape.w * q.shape.h, 0) : 0;
      return { mine, miss, score: mine.length * 1e6 + last };
    };
    const sheets = [], tooBig = [];
    [5, 3].forEach(board => {
      const best = ORDERS.map(o => pack(items.filter(it => it.board === board).sort(o), board)).sort((a, b) => a.score - b.score)[0];
      sheets.push(...best.mine); tooBig.push(...best.miss);
    });
    return { sheets: sheets.map(s => ({ board: s.board, placed: s.placed })), sheet: SHEET, along, tooBig };
  }

  return { DEFAULTS, build, layoutA4, place, PAGE, layoutSheets, sheetTf, fullShape };
});
