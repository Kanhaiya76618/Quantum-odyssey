import { memo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useCircuitStore } from "../../store/circuitStore";
import { ACT_HUE } from "../../content/timeline";
import { cn } from "../../lib/utils";

function EventNode({ event, x, y, dim, index }) {
  const visited = useCircuitStore((s) => s.journey.visited.has(event.id));
  const openEvent = useCircuitStore((s) => s.openEvent);
  const setJourneyHover = useCircuitStore((s) => s.setJourneyHover);
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);

  return (
    <div className="river-node-pos" style={{ transform: `translate3d(${x - 90}px, ${y - 12}px, 0)` }}>
      <motion.button
        className={cn("river-node", visited && "visited", dim && "dim")}
        style={{ "--hue": ACT_HUE[event.act] }}
        initial={reduced ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: reduced ? 0 : (index % 10) * 0.04 }}
        whileHover={reduced ? undefined : { scale: 1.06 }}
        onHoverStart={() => {
          setHover(true);
          setJourneyHover(event.id);
        }}
        onHoverEnd={() => {
          setHover(false);
          setJourneyHover(null);
        }}
        onClick={() => openEvent(event.id)}
        aria-label={`${event.year} — ${event.title}`}
      >
        <span className="node-beam" aria-hidden="true" />
        <motion.span layoutId={reduced ? undefined : `orb-${event.id}`} className="node-orb" aria-hidden="true" />
        <span className="node-year">{event.year}</span>
        <span className="node-title">{event.title}</span>
        {hover && event.people[0] && <span className="node-tip">{event.people[0]}</span>}
      </motion.button>
    </div>
  );
}

export default memo(EventNode);
