import { useEffect, useRef, useState } from 'react';

/** Single-series bar chart: registrations per week. Hover or focus a bar for the exact figure. */
export function WeeklyChart({ data }: { data: { weekStart: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    // Draw at the real width so text stays at its true size on phones.
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 200 : 240, L = 30, B = 28, T = 22;
  const peak = Math.max(...data.map((d) => d.count), 0);
  const step = peak <= 5 ? 1 : peak <= 10 ? 2 : peak <= 25 ? 5 : peak <= 50 ? 10 : Math.ceil(peak / 50) * 10;
  const max = Math.max(step * Math.ceil(peak / step), step * 4);
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const bw = (W - L) / Math.max(data.length, 1);
  const barW = Math.max(bw - 14, 6);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const label = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const last = data.length - 1;
  const every = Math.max(1, Math.ceil(52 / bw)); // keep date labels from colliding

  return (
    <div className="chart" ref={box} onMouseLeave={() => setHover(null)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxWidth: '100%' }} role="img" aria-label="Registrations per week, last 12 weeks">
        {ticks.map((g) => (
          <g key={g}>
            <line x1={L} x2={W} y1={y(g)} y2={y(g)} stroke="var(--chart-grid)" />
            <text x={L - 8} y={y(g) + 4} fontSize="11" fill="var(--text-3)" textAnchor="end">{g}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = L + i * bw + (bw - barW) / 2, top = y(d.count), base = y(0), r = Math.min(4, (base - top) / 2);
          const path = d.count === 0 ? '' : `M${x} ${base} V${top + r} Q${x} ${top} ${x + r} ${top} H${x + barW - r} Q${x + barW} ${top} ${x + barW} ${top + r} V${base} Z`;
          const active = hover === i;
          return (
            <g key={d.weekStart}>
              {path && <path d={path} fill={i === last || active ? 'var(--primary)' : 'var(--chart-bar)'} />}
              {/* generous invisible hit target */}
              <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" tabIndex={0}
                aria-label={`Week of ${label(d.weekStart)}: ${d.count} registrations`}
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
              {((last - i) % every === 0) && (
                <text x={x + barW / 2} y={H - 8} fontSize="11" fill="var(--text-3)" textAnchor="middle">{label(d.weekStart)}</text>
              )}
              {i === last && hover === null && d.count > 0 && (
                <text x={x + barW / 2} y={top - 7} fontSize="12" fontWeight="700" fill="var(--text)" textAnchor="middle">{d.count}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div className="chart-tip" style={{ left: `${((L + hover * bw + bw / 2) / W) * 100}%`, top: `${(y(data[hover].count) / H) * 100}%` }}>
          <strong>{data[hover].count}</strong> registration{data[hover].count === 1 ? '' : 's'}
          <span>Week of {label(data[hover].weekStart)}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>Registrations per week</caption>
        <tbody>{data.map((d) => <tr key={d.weekStart}><th>{label(d.weekStart)}</th><td>{d.count}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
