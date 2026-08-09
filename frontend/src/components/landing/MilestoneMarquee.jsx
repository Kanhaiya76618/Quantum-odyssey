import { useReducedMotion } from "motion/react";
import InfiniteSlider from "./InfiniteSlider";
import ProgressiveBlur from "./ProgressiveBlur";
import { MILESTONES } from "../../content/milestones";

function Chip({ year, label }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap rounded-full border border-[rgba(0,229,255,0.15)] bg-panel/40 px-4 py-2 transition-colors hover:border-cyan">
      <span className="font-mono text-sm text-cyan">{year}</span>
      <span className="text-sm text-muted">{label}</span>
    </span>
  );
}

export default function MilestoneMarquee() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className="flex flex-wrap justify-center gap-3">
        {MILESTONES.map((m) => (
          <Chip key={m.year} {...m} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <InfiniteSlider gap={12} duration={45} durationOnHover={120}>
        {MILESTONES.map((m) => (
          <Chip key={m.year} {...m} />
        ))}
      </InfiniteSlider>
      <ProgressiveBlur direction="left" className="absolute inset-y-0 left-0 w-24" />
      <ProgressiveBlur direction="right" className="absolute inset-y-0 right-0 w-24" />
    </div>
  );
}
