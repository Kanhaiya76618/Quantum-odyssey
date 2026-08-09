import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { useCircuitStore } from "../../store/circuitStore";
import { ACTS, ACT_HUE, EVENTS } from "../../content/timeline";
import { TOTAL_WIDTH, xOfYear } from "./riverMath";
import { cn } from "../../lib/utils";

const FILTERS = [
  ["all", "ALL"],
  ["foundations", "FOUNDATIONS"],
  ["computing", "COMPUTING"],
];
const MINI_W = 220;

export default function JourneyHUD({ scrollerRef }) {
  const filter = useCircuitStore((s) => s.journey.filter);
  const query = useCircuitStore((s) => s.journey.query);
  const visitedCount = useCircuitStore((s) => s.journey.visited.size);
  const setFilter = useCircuitStore((s) => s.setJourneyFilter);
  const setQuery = useCircuitStore((s) => s.setJourneyQuery);
  const setView = useCircuitStore((s) => s.setView);
  const rect = useRef(null);

  // minimap viewport rect follows scroll — direct style writes, zero re-renders
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const sync = () => {
      raf = 0;
      if (!rect.current) return;
      const w = Math.max(10, (el.clientWidth / TOTAL_WIDTH) * MINI_W);
      const x = (el.scrollLeft / TOTAL_WIDTH) * MINI_W;
      rect.current.style.width = `${w}px`;
      rect.current.style.transform = `translate3d(${x}px,0,0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    sync();
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [scrollerRef]);

  const seek = (clientX, mini) => {
    const el = scrollerRef.current;
    if (!el) return;
    const r = mini.getBoundingClientRect();
    const f = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
    el.scrollLeft = f * TOTAL_WIDTH - el.clientWidth / 2;
  };
  const onMiniPointerDown = (e) => {
    const mini = e.currentTarget;
    mini.setPointerCapture(e.pointerId);
    seek(e.clientX, mini);
    const mv = (ev) => seek(ev.clientX, mini);
    const up = () => {
      mini.removeEventListener("pointermove", mv);
      mini.removeEventListener("pointerup", up);
    };
    mini.addEventListener("pointermove", mv);
    mini.addEventListener("pointerup", up);
  };

  return (
    <>
      <header className="journey-hud">
        <button className="hud-brand" onClick={() => setView("landing")} aria-label="Back to the landing page">
          <span aria-hidden="true">◈</span> THE JOURNEY
        </button>
        <div className="hud-pills" role="group" aria-label="Track filter">
          {FILTERS.map(([v, label]) => (
            <button key={v} className={cn("hud-pill", filter === v && "on")} aria-pressed={filter === v} onClick={() => setFilter(v)}>
              {label}
            </button>
          ))}
        </div>
        <div className="hud-right">
          <label className="hud-search">
            <Search size={14} aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search the record…"
              aria-label="Search events by title, people or discovery"
            />
          </label>
          <div
            className="hud-mini"
            style={{ width: MINI_W }}
            onPointerDown={onMiniPointerDown}
            aria-label="Timeline minimap — drag to travel"
          >
            {ACTS.map((a) => {
              const x0 = (xOfYear(a.start) / TOTAL_WIDTH) * MINI_W;
              const x1 = (xOfYear(a.id === ACTS.length ? 2026 : a.end + 1) / TOTAL_WIDTH) * MINI_W;
              return <span key={a.id} className="mini-seg" style={{ left: x0, width: x1 - x0, background: ACT_HUE[a.id] }} />;
            })}
            <span ref={rect} className="mini-view" />
          </div>
        </div>
      </header>
      <div className="journey-progress" aria-live="polite">
        {visitedCount} / {EVENTS.length} discovered
      </div>
    </>
  );
}
