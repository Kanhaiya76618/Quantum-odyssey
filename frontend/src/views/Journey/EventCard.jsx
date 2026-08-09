import { useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { FlaskConical, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCircuitStore } from "../../store/circuitStore";
import { EVENTS, ACTS, ACT_HUE } from "../../content/timeline";
import { cn } from "../../lib/utils";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

export default function EventCard() {
  const activeId = useCircuitStore((s) => s.journey.activeId);
  const openEvent = useCircuitStore((s) => s.openEvent);
  const closeEvent = useCircuitStore((s) => s.closeEvent);
  const setView = useCircuitStore((s) => s.setView);
  const reduced = useReducedMotion();

  const idx = useMemo(() => EVENTS.findIndex((e) => e.id === activeId), [activeId]);
  const event = idx >= 0 ? EVENTS[idx] : null;

  // Eigen narrates the card — scripted line from the data, zero network
  useEffect(() => {
    if (!event) return;
    const who = event.people.length ? `${event.people.join(" & ")}, ` : "";
    useCircuitStore.getState().setScriptedNarration(`${who}${event.year}. ${event.significance}`);
  }, [event]);

  useEffect(() => {
    if (!event) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeEvent();
      else if (e.key === "ArrowRight" && idx < EVENTS.length - 1) openEvent(EVENTS[idx + 1].id);
      else if (e.key === "ArrowLeft" && idx > 0) openEvent(EVENTS[idx - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [event, idx, openEvent, closeEvent]);

  if (!event) return null;
  const act = ACTS.find((a) => a.id === event.act);
  const isLast = idx === EVENTS.length - 1;

  return (
    <motion.div
      className="journey-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.2 }}
      onClick={closeEvent}
    >
      <motion.article
        key={event.id}
        layoutId={reduced ? undefined : `orb-${event.id}`}
        className="event-card"
        style={{ "--hue": ACT_HUE[event.act] }}
        initial={reduced ? { opacity: 0 } : { scale: 0.96, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 260, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${event.year} — ${event.title}`}
      >
        <button className="card-x" onClick={closeEvent} aria-label="Close event card">
          <X size={16} aria-hidden="true" />
        </button>

        <div className="card-year-row">
          <span className="card-year">{event.year}</span>
          <span className="card-act">
            ACT {ROMAN[event.act - 1]} · {act.title.toUpperCase()}
          </span>
        </div>

        <h2 className="card-title">{event.title}</h2>

        {event.people.length > 0 && (
          <div className="card-people">
            {event.people.map((p) => (
              <span key={p} className="chip">
                {p}
              </span>
            ))}
          </div>
        )}

        <h3 className="card-h">WHAT THEY FOUND</h3>
        <p className="card-body">{event.discovery}</p>

        <h3 className="card-h">
          <FlaskConical size={13} aria-hidden="true" /> THE EVIDENCE
        </h3>
        <p className="card-evidence">{event.evidence}</p>

        <h3 className="card-h">WHY IT MATTERS</h3>
        <blockquote className="card-sig">{event.significance}</blockquote>

        {isLast && (
          <button
            className="card-cta"
            onClick={() => {
              closeEvent();
              setView("city");
            }}
          >
            STEP INTO THE MACHINE →
          </button>
        )}

        <footer className="card-foot">
          <button onClick={() => idx > 0 && openEvent(EVENTS[idx - 1].id)} disabled={idx === 0} aria-label="Previous event">
            <ChevronLeft size={15} aria-hidden="true" /> {idx > 0 ? EVENTS[idx - 1].year : ""}
          </button>
          <span className={cn("track-badge", event.track)}>{event.track.toUpperCase()}</span>
          <button onClick={() => !isLast && openEvent(EVENTS[idx + 1].id)} disabled={isLast} aria-label="Next event">
            {!isLast ? EVENTS[idx + 1].year : ""} <ChevronRight size={15} aria-hidden="true" />
          </button>
        </footer>
      </motion.article>
    </motion.div>
  );
}
