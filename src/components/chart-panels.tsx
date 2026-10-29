"use client";
import dynamic from "next/dynamic";
const CompletionChart = dynamic(
  () => import("./analytics-charts").then((m) => m.CompletionChart),
  {
    ssr: false,
    loading: () => (
      <div
        className="panel h-80 motion-safe:animate-pulse"
        aria-label="Loading chart"
      />
    ),
  },
);
const TrendChart = dynamic(
  () => import("./analytics-charts").then((m) => m.TrendChart),
  { ssr: false },
);
const DistributionChart = dynamic(
  () => import("./analytics-charts").then((m) => m.DistributionChart),
  { ssr: false },
);
export { CompletionChart, TrendChart, DistributionChart };
