import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
  calendar:
    "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M7 14h2m6 0h2m-10 4h2",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 7m5 10v-2a4 4 0 0 0-3-3.87",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  grid: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3Zm11 0h3v3h-3Zm7 0v7h-7",
  chart: "M3 3v18h18M7 16v-4m5 4V7m5 9v-6",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  layers: "m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5",
  tag: "M3 3h8l10 10-8 8L3 11ZM7 7h.01",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2",
  check: "m5 12 4 4L19 6",
  exit: "M9 3H3v18h6m6-14 5 5-5 5M9 12h11",
  shield: "m12 3 9 4v6c0 5-9 9-9 9s-9-4-9-9V7ZM8 12l3 3 5-6",
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, ...style }}
    >
      <path d={paths[name] || paths.layers} />
    </svg>
  );
}
