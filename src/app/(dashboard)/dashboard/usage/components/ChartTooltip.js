"use client";

import PropTypes from "prop-types";

// Recharts' default tooltip renders item text in the (dark) series default colour,
// which is unreadable on a themed background. Colour the value with the hovered
// series/bar colour and keep the label muted.
export default function ChartTooltip({ active, payload, label, valueFormatter, metricLabel }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs shadow-md">
      {label != null && <div className="mb-0.5 text-center text-text-muted">{label}</div>}
      {payload.map((p) => (
        <div
          key={p.dataKey ?? p.name}
          className="text-center font-semibold"
          style={{ color: p.color || p.fill || "var(--color-text)" }}
        >
          {metricLabel || p.name}: {valueFormatter ? valueFormatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

ChartTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  valueFormatter: PropTypes.func,
  metricLabel: PropTypes.string,
};
