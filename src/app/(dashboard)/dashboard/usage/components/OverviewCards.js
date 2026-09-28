"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

// Label block keeps a fixed height so the values of every card share one baseline
// even when a label wraps to two lines.
const LABEL_CLASS =
  "flex min-h-8 w-full items-center justify-center text-center leading-tight text-text-muted text-xs uppercase font-semibold sm:min-h-10 sm:text-sm";
const VALUE_CLASS = "w-full truncate text-center text-lg font-bold xl:text-xl";

export default function OverviewCards({ stats }) {
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          <Card className="flex min-w-[10rem] max-w-xs flex-1 basis-40 flex-col items-center text-center gap-1 px-3 py-3 sm:px-4">
            <span className={LABEL_CLASS}>Total Requests</span>
            <span className={VALUE_CLASS} title={fmt(stats.totalRequests)}>{fmt(stats.totalRequests)}</span>
          </Card>
          <Card className="flex min-w-[10rem] max-w-xs flex-1 basis-40 flex-col items-center text-center gap-1 px-3 py-3 sm:px-4">
            <span className={LABEL_CLASS}>Total Input Tokens</span>
            <span className={`${VALUE_CLASS} text-primary`} title={fmt(stats.totalPromptTokens)}>{fmt(stats.totalPromptTokens)}</span>
          </Card>
          <Card className="flex min-w-[10rem] max-w-xs flex-1 basis-40 flex-col items-center text-center gap-1 px-3 py-3 sm:px-4">
            <span className={LABEL_CLASS}>Cached Tokens</span>
            <span className={`${VALUE_CLASS} text-info`} title={fmt(stats.totalCachedTokens)}>{fmt(stats.totalCachedTokens)}</span>
          </Card>
          <Card className="flex min-w-[10rem] max-w-xs flex-1 basis-40 flex-col items-center text-center gap-1 px-3 py-3 sm:px-4">
            <span className={LABEL_CLASS}>Output Tokens</span>
            <span className={`${VALUE_CLASS} text-success`} title={fmt(stats.totalCompletionTokens)}>{fmt(stats.totalCompletionTokens)}</span>
          </Card>
          <Card className="flex min-w-[10rem] max-w-xs flex-1 basis-40 flex-col items-center text-center gap-1 px-3 py-3 sm:px-4">
            <span className={LABEL_CLASS}>Est. Cost</span>
            <span className={`${VALUE_CLASS} text-warning`} title={`~${fmtCost(stats.totalCost)}`}>~{fmtCost(stats.totalCost)}</span>
            <span className="text-center text-[10px] text-text-muted">Estimated, not actual billing</span>
          </Card>
        </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
