/* Lightweight SVG charts — no dependencies. */

/* Smooth line that never overshoots the data (monotone cubic, Fritsch–Carlson):
   it never dips below zero or rises above a peak that isn't there. */
function smoothPath(pts) {
  const n = pts.length;
  if (n < 2) return '';
  if (n === 2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
  const dx = [], s = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; s[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  m[0] = s[0]; m[n - 1] = s[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = s[i - 1] * s[i] <= 0 ? 0 : (s[i - 1] + s[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (s[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / s[i], b = m[i + 1] / s[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); m[i] = k * a * s[i]; m[i + 1] = k * b * s[i]; }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], c = dx[i] / 3;
    d += ` C${x1 + c},${y1 + m[i] * c} ${x2 - c},${y2 - m[i + 1] * c} ${x2},${y2}`;
  }
  return d;
}

/* Round axis steps (1, 2, 2.5, 5 × 10ⁿ) so the labels never repeat; `int` for counts */
function niceAxis(top, int) {
  top = top > 0 ? top : 1;
  const raw = top / 4, p = 10 ** Math.floor(Math.log10(raw));
  let step = (int ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]).find(k => k * p >= raw) * p;
  if (int) step = Math.max(1, step);
  const n = Math.max(1, Math.ceil((top * 1.02) / step));
  return { step, n, max: step * n };
}

/* series: [{values, cls, name}], labels: string[] */
function areaChart(series, labels, { h = 280, fmt = v => v, smooth = true, int = false } = {}) {
  const w = 760, pad = { t: 16, r: 12, b: 28, l: 48 };
  const all = series.flatMap(s => s.values);
  const ax = niceAxis(Math.max(...all, 0), int), max = ax.max, min = 0;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const x = i => pad.l + (iw * i) / (labels.length - 1);
  const y = v => pad.t + ih - ((v - min) / (max - min)) * ih;
  const grid = Array.from({ length: ax.n + 1 }, (_, k) => {
    const gy = pad.t + ih * (1 - k / ax.n);
    return `<line class="grid" x1="${pad.l}" x2="${w - pad.r}" y1="${gy}" y2="${gy}"/><text class="axis" x="${pad.l - 10}" y="${gy + 4}" text-anchor="end">${fmt(+(ax.step * k).toFixed(6))}</text>`;
  }).join('');
  const step = Math.ceil(labels.length / 8);
  const last = labels.length - 1;
  // The last label is always shown, so drop a regular one that would sit on top of it
  const xl = labels.map((l, i) => (i % step === 0 && (i === last || last - i >= step / 2 + 0.5)) || i === last ? `<text class="axis" x="${x(i)}" y="${h - 8}" text-anchor="middle">${l}</text>` : '').join('');
  const paths = series.map((s, si) => {
    const pts = s.values.map((v, i) => [x(i), y(v)]);
    const line = smooth ? smoothPath(pts) : `M${pts.map(p => p.join(',')).join(' L')}`;
    const area = `${line} L${x(pts.length - 1)},${pad.t + ih} L${pad.l},${pad.t + ih} Z`;
    return `${si === 0 ? `<path class="area ${s.cls}" d="${area}" fill="url(#g-${s.cls})"/>` : ''}<path class="line ${s.cls}" d="${line}"/>`;
  }).join('');
  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" data-w="${w}" data-pl="${pad.l}" data-pr="${pad.r}" data-pt="${pad.t}" data-ih="${ih}" data-max="${max}">
    <defs>${series.map(s => `<linearGradient id="g-${s.cls}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" class="stop-a ${s.cls}"/><stop offset="100%" class="stop-b ${s.cls}"/></linearGradient>`).join('')}</defs>
    ${grid}${xl}${paths}
    <line class="cross" y1="${pad.t}" y2="${pad.t + ih}" x1="-10" x2="-10"/>
    ${series.map(s => `<circle class="dot ${s.cls}" r="5" cx="-10" cy="-10"/>`).join('')}
    <rect class="hit" x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="transparent"/>
  </svg>`;
}

/* Wire hover tooltip for an areaChart inside `wrap` */
function bindAreaHover(wrap, series, labels, fmt, tipFn) {
  const svg = wrap.querySelector('svg'); const tip = wrap.querySelector('.chart-tip');
  if (!svg || !tip) return;
  const W = +svg.dataset.w, pl = +svg.dataset.pl, pr = +svg.dataset.pr, pt = +svg.dataset.pt, ih = +svg.dataset.ih;
  const max = +svg.dataset.max || 1;
  const cross = svg.querySelector('.cross'), dots = svg.querySelectorAll('.dot');
  const move = e => {
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(labels.length - 1, Math.round(((px - pl) / (W - pl - pr)) * (labels.length - 1))));
    const cx = pl + ((W - pl - pr) * i) / (labels.length - 1);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx);
    series.forEach((s, si) => { dots[si].setAttribute('cx', cx); dots[si].setAttribute('cy', pt + ih - (s.values[i] / max) * ih); });
    tip.innerHTML = tipFn ? tipFn(i) : `<b>${labels[i]}</b>${series.map(s => `<span><i class="sw ${s.cls}"></i>${s.name}<em>${fmt(s.values[i])}</em></span>`).join('')}`;
    const left = (cx / W) * rect.width;
    tip.style.transform = `translate(${Math.min(Math.max(left - tip.offsetWidth / 2, 0), rect.width - tip.offsetWidth)}px, 0)`;
    wrap.classList.add('hovering');
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerleave', () => wrap.classList.remove('hovering'));
}

/* Donut: parts [{value, cls}] */
function donut(parts, size = 180, stroke = 22) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, total = parts.reduce((a, p) => a + p.value, 0);
  let off = 0;
  const segs = parts.map((p, i) => {
    const len = (p.value / total) * c;
    const gap = 3;
    const s = `<circle class="seg ${p.cls}" r="${r}" cx="${size / 2}" cy="${size / 2}" stroke-width="${stroke}" stroke-dasharray="${Math.max(len - gap, 0)} ${c}" stroke-dashoffset="${-off}" style="--d:${i * 90}ms;--len:${len}"/>`;
    off += len; return s;
  }).join('');
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle class="track" r="${r}" cx="${size / 2}" cy="${size / 2}" stroke-width="${stroke}"/><g transform="rotate(-90 ${size / 2} ${size / 2})">${segs}</g></svg>`;
}

function sparkline(values, cls = 'c1', w = 120, h = 36) {
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => [(w * i) / (values.length - 1), h - 3 - ((v - min) / (max - min || 1)) * (h - 6)]);
  const line = smoothPath(pts);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path class="area ${cls}" d="${line} L${w},${h} L0,${h} Z"/><path class="line ${cls}" d="${line}" pathLength="1"/></svg>`;
}

function ring(pct, size = 64, stroke = 7, cls = 'c1') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle class="track" r="${r}" cx="${size / 2}" cy="${size / 2}" stroke-width="${stroke}"/><circle class="bar ${cls}" r="${r}" cx="${size / 2}" cy="${size / 2}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})" style="--c:${c}"/></svg>`;
}

/* Real EAN-13 barcode as SVG */
function ean13(code12) {
  const digits = String(code12).replace(/\D/g, '').padEnd(12, '0').slice(0, 12).split('').map(Number);
  const sum = digits.reduce((a, d, i) => a + d * (i % 2 ? 3 : 1), 0);
  digits.push((10 - (sum % 10)) % 10);
  const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
  const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
  const P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (P[digits[0]][i - 1] === 'L' ? L : G)[digits[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[digits[i]];
  bits += '101';
  const guard = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
  let rects = '';
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') rects += `<rect x="${i + 9}" y="0" width="1" height="${guard.has(i) ? 54 : 48}"/>`;
  const d = digits.join('');
  return `<svg class="barcode" viewBox="0 0 113 64" preserveAspectRatio="xMidYMid meet">${rects}
    <text x="4" y="62">${d[0]}</text><text x="31" y="62" text-anchor="middle">${d.slice(1, 7)}</text><text x="78" y="62" text-anchor="middle">${d.slice(7)}</text></svg>`;
}
