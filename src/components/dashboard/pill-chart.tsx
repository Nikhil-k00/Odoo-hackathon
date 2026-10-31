import { formatINR } from "@/lib/money";

export type MonthPoint = { label: string; invoiced: number; collected: number };

/**
 * Stacked "pill" bar chart in the reference style: black = invoiced but not yet collected,
 * lime = collected. Months with no activity render as a dashed placeholder pill.
 */
export function PillChart({ data }: { data: MonthPoint[] }) {
  const W = 760, H = 300, padL = 44, padR = 12, padT = 20, padB = 34;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(1, ...data.map((d) => d.invoiced));
  const step = innerW / data.length;
  const barW = Math.min(30, step * 0.42);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : `${Math.round(n)}`);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Invoiced versus collected by month">
      {ticks.map((t) => {
        const y = padT + innerH - innerH * t;
        return (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#141414" strokeOpacity="0.06" />
            <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#6f766f">{compact(max * t)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = padL + step * i + step / 2;
        const x = cx - barW / 2;
        const total = (d.invoiced / max) * innerH;
        const collected = Math.min(total, (d.collected / max) * innerH);
        const yTop = padT + innerH - total;
        const yCol = padT + innerH - collected;
        const r = barW / 2;
        const labelY = H - 12;
        if (d.invoiced <= 0) {
          return (
            <g key={d.label}>
              <rect x={x} y={padT} width={barW} height={innerH} rx={r} fill="none" stroke="#141414" strokeOpacity="0.25" strokeDasharray="4 4" />
              <circle cx={cx} cy={padT + r} r="4" fill="#ffffff" stroke="#141414" strokeOpacity="0.3" />
              <text x={cx} y={labelY} textAnchor="middle" fontSize="10" fill="#6f766f">{d.label}</text>
            </g>
          );
        }
        return (
          <g key={d.label}>
            <title>{`${d.label}: invoiced ${formatINR(d.invoiced)}, collected ${formatINR(d.collected)}`}</title>
            <rect x={x} y={yTop} width={barW} height={Math.max(total, barW)} rx={r} fill="#141414" />
            {collected > 0 && <rect x={x} y={Math.min(yCol, padT + innerH - barW)} width={barW} height={Math.max(collected, barW)} rx={r} fill="#e4f77e" />}
            <circle cx={cx} cy={yTop + r} r="4" fill="#ffffff" />
            {collected > 0 && <circle cx={cx} cy={Math.min(yCol, padT + innerH - barW) + r} r="4" fill="#141414" />}
            <text x={cx} y={labelY} textAnchor="middle" fontSize="10" fontWeight={i === data.length - 1 ? 700 : 400} fill={i === data.length - 1 ? "#141414" : "#6f766f"}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
