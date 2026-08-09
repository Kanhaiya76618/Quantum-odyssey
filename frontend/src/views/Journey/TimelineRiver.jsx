import { useEffect, useMemo, useRef, useState } from "react";
import { useCircuitStore } from "../../store/circuitStore";
import { EVENTS, ACTS, ACT_HUE, search } from "../../content/timeline";
import { TOTAL_WIDTH, RIVER_H, TRUNK_Y, COMPUTING_Y, FORK_X, XS, laneY, visibleRange, xOfYear } from "./riverMath";
import ActBands from "./ActBands";
import EventNode from "./EventNode";

function RiverSVG() {
  const xEnd = TOTAL_WIDTH - 120;
  const x0 = Math.max(0, xOfYear(1621) - 80);
  const trunk = `M ${x0} ${TRUNK_Y} H ${FORK_X}`;
  const found = `M ${FORK_X} ${TRUNK_Y} H ${xEnd}`;
  const comp = `M ${FORK_X} ${TRUNK_Y} C ${FORK_X + 240} ${TRUNK_Y}, ${FORK_X + 240} ${COMPUTING_Y}, ${FORK_X + 480} ${COMPUTING_Y} H ${xEnd}`;
  const paths = [trunk, found, comp];

  return (
    <svg className="river-svg" width={TOTAL_WIDTH} height={RIVER_H} aria-hidden="true">
      <defs>
        <linearGradient id="riverGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={TOTAL_WIDTH} y2="0">
          {ACTS.map((a) => (
            <stop key={a.id} offset={xOfYear(a.start) / TOTAL_WIDTH} stopColor={ACT_HUE[a.id]} />
          ))}
          <stop offset="1" stopColor="#00E5FF" />
        </linearGradient>
      </defs>
      {paths.map((d, i) => (
        <path key={`glow-${i}`} d={d} stroke="url(#riverGrad)" strokeWidth="7" fill="none" opacity="0.18" />
      ))}
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="url(#riverGrad)" strokeWidth="2.5" fill="none" />
      ))}
      {paths.map((d, i) => (
        <path key={`shimmer-${i}`} d={d} className="river-shimmer" stroke="#F3F8FF" strokeWidth="1.6" fill="none" />
      ))}
      <circle cx={FORK_X} cy={TRUNK_Y} r="7" fill="#7C3AED" className="fork-pulse" />
      <circle cx={FORK_X} cy={TRUNK_Y} r="15" fill="none" stroke="#7C3AED" strokeWidth="1.5" opacity="0.5" className="fork-pulse" />
      <text x={FORK_X + 26} y={COMPUTING_Y - 46} className="fork-label">
        THE FORK — INFORMATION BECOMES PHYSICAL
      </text>
      <text x={FORK_X + 520} y={COMPUTING_Y - 18} className="lane-label" fill="#7C3AED">
        COMPUTING ▲
      </text>
      <text x={FORK_X + 520} y={TRUNK_Y + 28} className="lane-label" fill="#00E5FF">
        FOUNDATIONS ▼
      </text>
    </svg>
  );
}

export default function TimelineRiver({ scrollerRef }) {
  const filter = useCircuitStore((s) => s.journey.filter);
  const query = useCircuitStore((s) => s.journey.query);
  const [range, setRange] = useState([0, Math.min(30, EVENTS.length - 1)]);
  const dragged = useRef(false);

  const hits = useMemo(() => (query.trim() ? search(query) : null), [query]);

  // virtualization + wheel→horizontal (rAF-throttled, passive scroll)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = visibleRange(el.scrollLeft, el.clientWidth);
        setRange((old) => (old[0] === r[0] && old[1] === r[1] ? old : r));
      });
    };
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(raf);
    };
  }, [scrollerRef]);

  // drag to pan
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let startX = 0;
    let startLeft = 0;
    let down = false;
    const dn = (e) => {
      if (e.button !== 0) return;
      down = true;
      dragged.current = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };
    const mv = (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) dragged.current = true;
      if (dragged.current) el.scrollLeft = startLeft - dx;
    };
    const up = () => {
      down = false;
    };
    el.addEventListener("pointerdown", dn);
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", dn);
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [scrollerRef]);

  // memory-wall deep link: scroll to a pending act
  useEffect(() => {
    const st = useCircuitStore.getState();
    const act = st.journey.pendingAct && ACTS.find((a) => a.id === st.journey.pendingAct);
    if (act && scrollerRef.current) {
      scrollerRef.current.scrollLeft = Math.max(0, xOfYear(act.start) - 120);
      st.clearPendingAct();
    }
  }, [scrollerRef]);

  const onKeyDown = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let idx = XS.findIndex((x) => x >= center - 1);
    if (idx < 0) idx = XS.length - 1;
    let target = null;
    if (e.key === "ArrowRight") target = Math.min(XS.length - 1, XS[idx] <= center + 1 ? idx + 1 : idx);
    else if (e.key === "ArrowLeft") target = Math.max(0, XS[idx] >= center - 1 ? idx - 1 : idx);
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = XS.length - 1;
    if (target !== null) {
      e.preventDefault();
      el.scrollTo({ left: XS[target] - el.clientWidth / 2, behavior: "smooth" });
    }
  };

  const onClickCapture = (e) => {
    if (dragged.current) {
      e.stopPropagation();
      e.preventDefault();
      dragged.current = false;
    }
  };

  const [lo, hi] = range;
  const nodes = [];
  for (let i = lo; i <= hi; i++) {
    const ev = EVENTS[i];
    const dim = (filter !== "all" && ev.track !== filter) || (hits && !hits.has(ev.id));
    nodes.push(<EventNode key={ev.id} event={ev} x={XS[i]} y={laneY(ev)} dim={!!dim} index={i - lo} />);
  }

  return (
    <div
      className="river-scroller"
      ref={scrollerRef}
      tabIndex={0}
      role="region"
      aria-label="Quantum history timeline. Arrow keys move between events; Home and End jump to the ends."
      onKeyDown={onKeyDown}
      onClickCapture={onClickCapture}
    >
      <div className="river-content" style={{ width: TOTAL_WIDTH }}>
        <ActBands />
        <div className="river-stage" style={{ height: RIVER_H }}>
          <RiverSVG />
          {nodes}
        </div>
      </div>
    </div>
  );
}
