/** MSL survey-compass emblem (from the company logo), drawn as SVG so it stays sharp at any size. */
const pt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [+(r * Math.cos(a)).toFixed(2), +(r * Math.sin(a)).toFixed(2)] as const;
};
const arc = (r: number, a0: number, a1: number) => {
  const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};
const TICKS = Array.from({ length: 9 }, (_, i) => 110 + i * 30).map((d) => [pt(84, d), pt(101, d)] as const);
const STAR = (len: number, w: number) => [0, 90, 180, 270].map((a) => ({ a, l: `M0 ${-len} L${w} ${-w} L0 0 Z`, d: `M0 ${-len} L${-w} ${-w} L0 0 Z` }));

export function BrandMark({ size = 40, tone = 'color' }: { size?: number; tone?: 'color' | 'white' }) {
  const red = tone === 'white' ? '#ffffff' : '#C8202F';
  const dark = tone === 'white' ? 'rgba(255,255,255,.72)' : '#8E1420';
  const accent = tone === 'white' ? '#F2C14E' : '#4A2A1E';
  return (
    <svg width={size} height={size} viewBox="-112 -112 224 224" role="img" aria-label="MSL">
      <path d={arc(96, 100, 350)} fill="none" stroke={red} strokeWidth="9" strokeLinecap="round" />
      <path d={arc(80, 120, 340)} fill="none" stroke={red} strokeWidth="4" strokeLinecap="round" opacity=".8" />
      {TICKS.map(([[x0, y0], [x1, y1]], i) => (
        <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={red} strokeWidth="6" strokeLinecap="round" />
      ))}
      <path d={arc(104, 6, 90)} fill="none" stroke={accent} strokeWidth="13" strokeLinecap="round" />
      {STAR(56, 9).map((s) => (
        <g key={`d${s.a}`} transform={`rotate(${s.a + 45})`}><path d={s.l} fill={red} /><path d={s.d} fill={dark} /></g>
      ))}
      {STAR(98, 14).map((s) => (
        <g key={`m${s.a}`} transform={`rotate(${s.a})`}><path d={s.l} fill={red} /><path d={s.d} fill={dark} /></g>
      ))}
      <circle r="12" fill={tone === 'white' ? '#0f1d45' : '#fff'} stroke={red} strokeWidth="5" />
    </svg>
  );
}

export function BrandLockup({ tone = 'white', size = 38 }: { tone?: 'color' | 'white'; size?: number }) {
  return (
    <div className="row" style={{ gap: 12 }}>
      <BrandMark size={size} tone={tone} />
      <div>
        <div className="brand-name" style={tone === 'color' ? { color: 'var(--text)' } : undefined}>MSL Registry</div>
        <div className="brand-sub">Land Surveyors Co. Ltd</div>
      </div>
    </div>
  );
}
