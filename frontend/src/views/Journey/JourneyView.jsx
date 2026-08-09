import { useRef } from "react";
import { AnimatePresence } from "motion/react";
import Starfield from "../../components/landing/Starfield";
import EigenPanel from "../../components/EigenPanel";
import { useCircuitStore } from "../../store/circuitStore";
import TimelineRiver from "./TimelineRiver";
import JourneyHUD from "./JourneyHUD";
import EventCard from "./EventCard";

export default function JourneyView() {
  const scrollerRef = useRef(null);
  const activeId = useCircuitStore((s) => s.journey.activeId);

  return (
    <div className="journey">
      <div className="journey-bg" aria-hidden="true">
        <Starfield />
        <div className="journey-nebula" />
      </div>
      <TimelineRiver scrollerRef={scrollerRef} />
      <JourneyHUD scrollerRef={scrollerRef} />
      <AnimatePresence>{activeId && <EventCard key="card" />}</AnimatePresence>
      <EigenPanel variant="overlay" />
    </div>
  );
}
