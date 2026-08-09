import { ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "../ui/button";
import Starfield from "./Starfield";
import MilestoneMarquee from "./MilestoneMarquee";
import { useCircuitStore } from "../../store/circuitStore";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { y: 24, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 20 } },
};

export default function Hero() {
  const setView = useCircuitStore((s) => s.setView);
  const reduced = useReducedMotion();

  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden bg-bg">
      <Starfield />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 pt-32 pb-16 text-center">
        <motion.div
          variants={container}
          initial={reduced ? false : "hidden"}
          animate="show"
          className="flex flex-col items-center"
        >
          <motion.h1
            variants={item}
            className="font-display text-5xl font-bold tracking-tight text-balance text-text md:text-6xl lg:text-7xl"
          >
            The Journey of the{" "}
            <span className="bg-gradient-to-r from-cyan to-violet bg-clip-text text-transparent">Quantum</span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-2xl text-lg text-muted">
            A cinematic voyage from Newton's prism to real IBM hardware — narrated by Eigen, an AI grounded in true
            quantum simulation.
          </motion.p>

          <motion.div variants={item} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" onClick={() => setView("archive")}>
              Enter Grand Quantum Museum <ChevronRight size={18} aria-hidden="true" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => setView("city")}>
              Enter Qubit City
            </Button>
            <Button variant="ghost" size="lg" onClick={() => setView("builder")}>
              Open Circuit Builder
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <div id="journey" className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16">
        <p className="mb-4 text-center font-mono text-xs tracking-[0.25em] text-muted">
          MILESTONES ON THE ROAD — 1600 → TODAY
        </p>
        <MilestoneMarquee />
      </div>
    </section>
  );
}
