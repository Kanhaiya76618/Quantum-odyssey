import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useScroll, useMotionValueEvent } from "motion/react";
import { Button } from "../ui/button";
import { useCircuitStore } from "../../store/circuitStore";
import { cn } from "../../lib/utils";

const NAV = [
  { label: "Grand Quantum Museum", view: "archive" },
  { label: "Machine World", view: "machine-world" },
  { label: "Dashboard", view: "circuit-dashboard" },
  { label: "Builder", view: "builder" },
  { label: "Qubit City", view: "city" },
];

const linkCls =
  "cursor-pointer rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan";

export default function HeroHeader() {
  const setView = useCircuitStore((s) => s.setView);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  const items = (extra) =>
    NAV.map((n) =>
      n.href ? (
        <a key={n.label} href={n.href} className={cn(linkCls, extra)} onClick={() => setOpen(false)}>
          {n.label}
        </a>
      ) : (
        <button
          key={n.label}
          className={cn(linkCls, extra)}
          onClick={() => {
            setOpen(false);
            setView(n.view);
          }}
        >
          {n.label}
        </button>
      )
    );

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <nav
        aria-label="Main"
        className={cn(
          "mx-auto flex max-w-5xl items-center justify-between rounded-3xl border border-transparent px-5 py-3 transition-all duration-300",
          (scrolled || open) && "border-cyan/10 bg-panel/50 backdrop-blur-xl"
        )}
      >
        <span className="flex items-center gap-2 font-display text-sm font-bold tracking-[0.2em] text-text">
          <span className="text-lg text-cyan" aria-hidden="true">
            ◈
          </span>
          QUANTUM ODYSSEY
        </span>

        <div className="hidden items-center gap-1 md:flex">{items()}</div>

        <div className="hidden items-center gap-2 md:flex">
          <a href="#" className={linkCls}>
            GitHub
          </a>
          <Button onClick={() => setView("city")}>Enter Odyssey</Button>
        </div>

        <button
          className="cursor-pointer rounded-full p-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </nav>

      {open && (
        <div className="mx-auto mt-2 flex max-w-5xl flex-col gap-1 rounded-3xl border border-cyan/10 bg-panel/80 p-4 backdrop-blur-xl md:hidden">
          {items("text-left")}
          <a href="#" className={cn(linkCls, "text-left")}>
            GitHub
          </a>
          <Button className="mt-2" onClick={() => setView("city")}>
            Enter Odyssey
          </Button>
        </div>
      )}
    </header>
  );
}
