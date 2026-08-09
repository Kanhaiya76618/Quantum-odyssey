// Read-only data layer over quantum_timeline.json — derive, never mutate.
import data from "./quantum_timeline.json";

export const META = Object.freeze(data.meta);
export const FORK_ID = "1980-benioff";

export const ACTS = Object.freeze(
  data.acts.map((a) => {
    const [start, end] = a.range.split("-").map(Number);
    return Object.freeze({ ...a, start, end });
  })
);

export const EVENTS = Object.freeze(
  data.events.map((e) =>
    Object.freeze({
      ...e,
      decade: Math.floor(e.year / 10) * 10,
      isFork: e.id === FORK_ID,
      hasComputingTrack: e.year >= 1980,
    })
  )
);

export const YEAR_MIN = EVENTS[0].year;
export const YEAR_MAX = EVENTS[EVENTS.length - 1].year;

export const eventsByAct = Object.freeze(
  EVENTS.reduce((m, e) => {
    (m[e.act] = m[e.act] || []).push(e);
    return m;
  }, {})
);

export const eventsByTrack = Object.freeze(
  EVENTS.reduce((m, e) => {
    (m[e.track] = m[e.track] || []).push(e);
    return m;
  }, {})
);

export const ACT_HUE = Object.freeze({
  1: "#8EA2C6",
  2: "#00E5FF",
  3: "#7C3AED",
  4: "#FF2D95",
  5: "#00E5FF",
  6: "#7C3AED",
});

export function search(q) {
  const s = q.trim().toLowerCase();
  const hits = new Set();
  if (!s) return hits;
  for (const e of EVENTS) {
    if (
      e.title.toLowerCase().includes(s) ||
      e.discovery.toLowerCase().includes(s) ||
      e.people.some((p) => p.toLowerCase().includes(s))
    )
      hits.add(e.id);
  }
  return hits;
}
