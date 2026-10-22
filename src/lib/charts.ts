import { compactINR, fmtINR } from './money';

/** Brand-neutral categorical palette (festival tones). Used by dashboard and exported report. */
export const PALETTE = ['#d9381e', '#f2a900', '#2e7d32', '#c2185b', '#0e7c86', '#6a1b9a', '#ef6c00', '#1b1f2a'];

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function niceMax(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

const empty = (label: string) =>
  `<svg viewBox="0 0 640 120" role="img" aria-label="${esc(label)}"><text x="320" y="64" text-anchor="middle" font-size="14" fill="currentColor" opacity=".6">${esc(label)}</text></svg>`;

export type Datum = { label: string; value: number };

/** Vertical bars, e.g. spend per day. Values in paise. */
export function barChartSvg(data: Datum[], title: string, color = PALETTE[0]): string {
  if (!data.length) return empty('No spending yet');
  const W = 640, H = 280, L = 54, R = 12, T = 14, B = 44;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const plotW = W - L - R, plotH = H - T - B;
  const slot = plotW / data.length;
  const bw = Math.min(54, slot * 0.62);
  const every = Math.ceil(data.length / 9);
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const y = T + plotH * (1 - i / 4);
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="currentColor" opacity=".12"/>`;
    g += `<text x="${L - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity=".7">${compactINR((max * i) / 4)}</text>`;
  }
  data.forEach((d, i) => {
    const h = (d.value / max) * plotH;
    const x = L + slot * i + (slot - bw) / 2;
    const y = T + plotH - h;
    g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="${color}"><title>${esc(d.label)}: ${esc(fmtINR(d.value))}</title></rect>`;
    if (i % every === 0)
      g += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 22}" text-anchor="middle" font-size="11" fill="currentColor" opacity=".8">${esc(clip(d.label, 10))}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${g}</svg>`;
}

export type PairRow = { label: string; a: number; b: number };

/** Horizontal paired bars: amount paid vs fair share, per person. */
export function pairChartSvg(rows: PairRow[], title: string, names: [string, string]): string {
  if (!rows.length) return empty('Nobody on the roster yet');
  const W = 640, L = 112, R = 92, rowH = 46, T = 30;
  const H = T + rows.length * rowH + 8;
  const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b]));
  const plotW = W - L - R;
  const colors = [PALETTE[0], PALETTE[1]];
  let g = `<rect x="${L}" y="8" width="10" height="10" rx="2" fill="${colors[0]}"/><text x="${L + 16}" y="17" font-size="11" fill="currentColor">${esc(names[0])}</text>`;
  g += `<rect x="${L + 110}" y="8" width="10" height="10" rx="2" fill="${colors[1]}"/><text x="${L + 126}" y="17" font-size="11" fill="currentColor">${esc(names[1])}</text>`;
  rows.forEach((r, i) => {
    const y = T + i * rowH;
    g += `<text x="${L - 10}" y="${y + 20}" text-anchor="end" font-size="12" fill="currentColor">${esc(clip(r.label, 14))}</text>`;
    [r.a, r.b].forEach((v, k) => {
      const w = Math.max(2, (v / max) * plotW);
      g += `<rect x="${L}" y="${y + k * 18 + 4}" width="${w.toFixed(1)}" height="14" rx="4" fill="${colors[k]}"><title>${esc(r.label)} – ${esc(names[k])}: ${esc(fmtINR(v))}</title></rect>`;
      g += `<text x="${(L + w + 6).toFixed(1)}" y="${y + k * 18 + 15}" font-size="10.5" fill="currentColor" opacity=".8">${esc(fmtINR(v))}</text>`;
    });
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${g}</svg>`;
}

/** Donut of contribution by person. */
export function donutSvg(data: Datum[], title: string): string {
  const items = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  if (!items.length) return empty('No payments yet');
  const top = items.slice(0, 7);
  const rest = items.slice(7).reduce((t, d) => t + d.value, 0);
  if (rest > 0) top.push({ label: 'Others', value: rest });
  const total = top.reduce((t, d) => t + d.value, 0);
  const R = 70, C = 2 * Math.PI * R;
  let offset = 0;
  let arcs = '';
  let legend = '';
  top.forEach((d, i) => {
    const len = (d.value / total) * C;
    const col = PALETTE[i % PALETTE.length];
    arcs += `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${col}" stroke-width="34" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 100 100)"><title>${esc(d.label)}: ${esc(fmtINR(d.value))}</title></circle>`;
    offset += len;
    const y = 30 + i * 22;
    legend += `<rect x="220" y="${y - 10}" width="12" height="12" rx="3" fill="${col}"/><text x="240" y="${y}" font-size="12" fill="currentColor">${esc(clip(d.label, 14))} · ${Math.round((d.value / total) * 100)}%</text>`;
  });
  const H = Math.max(200, 40 + top.length * 22);
  return `<svg viewBox="0 0 420 ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${arcs}<text x="100" y="97" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">Total paid</text><text x="100" y="116" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">${esc(compactINR(total))}</text>${legend}</svg>`;
}
