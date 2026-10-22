import type { ReactElement } from 'react';
import { asTheme, type ThemeKey } from '@/lib/themes';

/** Original, generated festival artwork. Deterministic per (theme, seed). No remote images. */

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 800;
const H = 500;
const WARM = ['#d9381e', '#f2a900', '#c2185b', '#ef6c00', '#ffb300'];
const BOLD = ['#d9381e', '#f2a900', '#2e7d32', '#c2185b', '#0e7c86', '#6a1b9a'];

function Grad({ id, stops }: { id: string; stops: [number, string][] }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
      {stops.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
    </linearGradient>
  );
}

function scene(theme: ThemeKey, r: () => number, gid: string): ReactElement[] {
  const out: ReactElement[] = [];
  const push = (e: ReactElement) => out.push(e);

  if (theme === 'lantern') {
    push(<rect key="bg" width={W} height={H} fill={`url(#${gid})`} />);
    for (let i = 0; i < 46; i++)
      push(<circle key={`s${i}`} cx={r() * W} cy={r() * H * 0.7} r={0.6 + r() * 1.8} fill="#fff" opacity={0.25 + r() * 0.5} />);
    push(<circle key="moon" cx={650} cy={105} r={58} fill="#ffd76a" opacity={0.92} />);
    push(<circle key="moon2" cx={672} cy={95} r={52} fill="#3a1c2b" opacity={0.35} />);
    for (let i = 0; i < 17; i++) {
      const x = 30 + r() * (W - 60);
      const len = 50 + r() * 230;
      const rad = 16 + r() * 28;
      const c = WARM[Math.floor(r() * WARM.length)];
      push(
        <g key={`l${i}`}>
          <line x1={x} y1={0} x2={x} y2={len} stroke="#f7d58a" strokeWidth={1.4} opacity={0.7} />
          <rect x={x - rad * 0.35} y={len} width={rad * 0.7} height={6} rx={2} fill="#2b1a12" />
          <ellipse cx={x} cy={len + 6 + rad} rx={rad * 0.82} ry={rad} fill={c} />
          <ellipse cx={x} cy={len + 6 + rad} rx={rad * 0.5} ry={rad * 0.8} fill="#fff3c4" opacity={0.55} />
          <line x1={x} y1={len + 6} x2={x} y2={len + 6 + rad * 2} stroke="#2b1a12" strokeWidth={1} opacity={0.35} />
          <rect x={x - rad * 0.3} y={len + 6 + rad * 2 - 2} width={rad * 0.6} height={6} rx={2} fill="#2b1a12" />
          <line x1={x} y1={len + 6 + rad * 2 + 4} x2={x} y2={len + 6 + rad * 2 + 18} stroke={c} strokeWidth={2} />
        </g>,
      );
    }
  } else if (theme === 'colorburst') {
    push(<rect key="bg" width={W} height={H} fill={`url(#${gid})`} />);
    for (let i = 0; i < 15; i++)
      push(
        <circle key={`b${i}`} cx={r() * W} cy={r() * H} r={50 + r() * 120} fill={BOLD[Math.floor(r() * BOLD.length)]} opacity={0.5} style={{ mixBlendMode: 'multiply' }} />,
      );
    for (let i = 0; i < 70; i++)
      push(<circle key={`d${i}`} cx={r() * W} cy={r() * H} r={2 + r() * 6} fill={BOLD[Math.floor(r() * BOLD.length)]} opacity={0.8} />);
  } else if (theme === 'twirl') {
    push(<rect key="bg" width={W} height={H} fill={`url(#${gid})`} />);
    const cols = ['#f2a900', '#ffd76a', '#ff7a45', '#fff3c4', '#2e7d32'];
    const rings: ReactElement[] = [];
    for (let k = 1; k <= 6; k++) {
      const rad = 38 * k;
      const petals = 6 + k * 4;
      for (let p = 0; p < petals; p++)
        rings.push(
          <ellipse key={`${k}-${p}`} cx={rad} cy={0} rx={rad * 0.26} ry={Math.max(5, rad * 0.1)} fill={cols[(k + p) % cols.length]} opacity={0.9} transform={`rotate(${(360 / petals) * p + k * 7})`} />,
        );
      rings.push(<circle key={`c${k}`} r={rad} fill="none" stroke="#fff3c4" strokeWidth={1} strokeDasharray="3 7" opacity={0.6} />);
    }
    push(<g key="m" transform={`translate(${500 + r() * 60} ${230})`}>{rings}<circle r={16} fill="#d9381e" /></g>);
    push(<g key="m2" transform="translate(110 400) scale(.42)" opacity={0.7}>{rings}</g>);
    for (let i = 0; i < 40; i++) push(<circle key={`s${i}`} cx={r() * W} cy={r() * H} r={1 + r() * 2.2} fill="#fff3c4" opacity={0.5} />);
  } else if (theme === 'fair') {
    push(<rect key="bg" width={W} height={H} fill={`url(#${gid})`} />);
    push(<circle key="sun" cx={140} cy={120} r={64} fill="#fff3c4" opacity={0.85} />);
    push(<rect key="gr" y={410} width={W} height={90} fill="#2e7d32" />);
    push(<rect key="gr2" y={410} width={W} height={10} fill="#1f5a23" />);
    const cx = 560, cy = 235, R = 135;
    const wheel: ReactElement[] = [<circle key="r1" cx={cx} cy={cy} r={R} fill="none" stroke="#1b1f2a" strokeWidth={6} />, <circle key="r2" cx={cx} cy={cy} r={R * 0.55} fill="none" stroke="#1b1f2a" strokeWidth={3} />];
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      wheel.push(<line key={`sp${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="#1b1f2a" strokeWidth={2} />);
      wheel.push(<rect key={`g${i}`} x={x - 13} y={y - 4} width={26} height={22} rx={6} fill={BOLD[i % BOLD.length]} />);
    }
    wheel.push(<line key="l1" x1={cx} y1={cy} x2={cx - 75} y2={410} stroke="#1b1f2a" strokeWidth={7} />, <line key="l2" x1={cx} y1={cy} x2={cx + 75} y2={410} stroke="#1b1f2a" strokeWidth={7} />, <circle key="hub" cx={cx} cy={cy} r={12} fill="#d9381e" />);
    push(<g key="w">{wheel}</g>);
    for (let i = 0; i < 3; i++) {
      const x = 40 + i * 120;
      push(
        <g key={`t${i}`}>
          <polygon points={`${x},330 ${x + 50},250 ${x + 100},330`} fill={BOLD[i * 2 % BOLD.length]} />
          <rect x={x + 6} y={330} width={88} height={80} fill="#fff7e8" />
          <rect x={x + 36} y={360} width={28} height={50} fill={BOLD[(i * 2 + 1) % BOLD.length]} />
        </g>,
      );
    }
    push(<path key="str" d={`M0 40 Q ${W / 2} 110 ${W} 40`} fill="none" stroke="#1b1f2a" strokeWidth={2} />);
    for (let i = 0; i < 24; i++) {
      const t = (i + 0.5) / 24;
      const x = t * W;
      const y = 40 + 70 * 2 * t * (1 - t) * 1.0;
      push(<polygon key={`f${i}`} points={`${x - 13},${y} ${x + 13},${y} ${x},${y + 28}`} fill={BOLD[i % BOLD.length]} />);
    }
  } else if (theme === 'kites') {
    push(<rect key="bg" width={W} height={H} fill={`url(#${gid})`} />);
    push(<circle key="sun" cx={640} cy={380} r={90} fill="#fff3c4" opacity={0.8} />);
    for (let i = 0; i < 10; i++) {
      const x = 60 + r() * (W - 120), y = 50 + r() * 300, s = 34 + r() * 40;
      const c = BOLD[Math.floor(r() * BOLD.length)];
      const c2 = BOLD[Math.floor(r() * BOLD.length)];
      const tail = `M ${x} ${y + s * 1.2} q ${-30 + r() * 60} 40 ${-20 + r() * 40} 80 t ${-20 + r() * 40} 80`;
      push(
        <g key={`k${i}`}>
          <path d={tail} fill="none" stroke="#1b1f2a" strokeWidth={1.4} opacity={0.7} />
          <polygon points={`${x},${y - s} ${x + s * 0.7},${y} ${x},${y + s * 1.2} ${x - s * 0.7},${y}`} fill={c} />
          <polygon points={`${x},${y - s} ${x + s * 0.7},${y} ${x},${y}`} fill={c2} opacity={0.8} />
          <line x1={x} y1={y - s} x2={x} y2={y + s * 1.2} stroke="#fff" strokeWidth={1.2} opacity={0.7} />
          <line x1={x - s * 0.7} y1={y} x2={x + s * 0.7} y2={y} stroke="#fff" strokeWidth={1.2} opacity={0.7} />
        </g>,
      );
    }
    let sky = `M0 500 L0 440`;
    for (let x = 0; x <= W; x += 40) sky += ` L${x} ${400 + r() * 60}`;
    push(<path key="sk" d={`${sky} L${W} 500 Z`} fill="#1b1f2a" opacity={0.85} />);
  } else {
    push(<rect key="bg" width={W} height={H} fill={`url(#${gid})`} />);
    for (let s = 0; s < 6; s++) {
      const y0 = 30 + s * 86;
      const pts: string[] = [];
      for (let x = -10; x <= W + 10; x += 20) pts.push(`${x},${(y0 + Math.sin(x / 90 + s) * 26).toFixed(1)}`);
      push(<polyline key={`st${s}`} points={pts.join(' ')} fill="none" stroke="#2e7d32" strokeWidth={3} />);
      for (let x = 0; x <= W; x += 22) {
        const y = y0 + Math.sin(x / 90 + s) * 26;
        const c = ['#f2a900', '#ef6c00', '#d9381e'][(x / 22 + s) % 3 | 0];
        push(
          <g key={`f${s}-${x}`}>
            <circle cx={x} cy={y} r={12} fill={c} />
            <circle cx={x} cy={y} r={6} fill="#fff3c4" opacity={0.6} />
          </g>,
        );
      }
    }
  }
  return out;
}

const BACKGROUNDS: Record<ThemeKey, [number, string][]> = {
  lantern: [[0, '#14172a'], [1, '#5a1d2c']],
  colorburst: [[0, '#fff3d6'], [1, '#ffd9b0']],
  twirl: [[0, '#3b0d3a'], [1, '#d9381e']],
  fair: [[0, '#ffd27a'], [1, '#ff8a5b']],
  kites: [[0, '#35b6e8'], [0.6, '#ffd27a'], [1, '#ff7a45']],
  marigold: [[0, '#fff0cf'], [1, '#ffd08a']],
};

export function CoverArt({ theme, seed = '', className }: { theme: string; seed?: string; className?: string }) {
  const t = asTheme(theme);
  const gid = `g-${t}-${seed.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'x'}`;
  const r = rng(`${t}:${seed}`);
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <Grad id={gid} stops={BACKGROUNDS[t]} />
      </defs>
      {scene(t, r, gid)}
    </svg>
  );
}
