// Non-linear x-axis: sparse centuries compressed, the quantum century expanded.
import { EVENTS } from "../../content/timeline";

export const TOTAL_WIDTH = 14000;
export const RIVER_H = 560;
export const TRUNK_Y = 340;
export const COMPUTING_Y = TRUNK_Y - 90;

const BP = [
  [1600, 0],
  [1800, 0.1],
  [1900, 0.28],
  [1950, 0.55],
  [1980, 0.68],
  [2000, 0.85],
  [2026, 1],
];

export function xOfYear(year) {
  const y = Math.min(Math.max(year, BP[0][0]), BP[BP.length - 1][0]);
  for (let i = 0; i < BP.length - 1; i++) {
    const [y0, f0] = BP[i];
    const [y1, f1] = BP[i + 1];
    if (y <= y1) return (f0 + ((y - y0) / (y1 - y0)) * (f1 - f0)) * TOTAL_WIDTH;
  }
  return TOTAL_WIDTH;
}

export const FORK_X = xOfYear(1980);

// EVENTS is chronological, so XS is sorted — binary-search the render window.
export const XS = EVENTS.map((e) => xOfYear(e.year));

export const laneY = (e) => (e.year >= 1980 && e.track === "computing" ? COMPUTING_Y : TRUNK_Y);

function lowerBound(arr, v) {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function visibleRange(scrollLeft, vw) {
  const lo = lowerBound(XS, scrollLeft - vw * 1.5);
  const hi = lowerBound(XS, scrollLeft + vw * 2.5);
  return [lo, Math.min(hi, EVENTS.length - 1)];
}
