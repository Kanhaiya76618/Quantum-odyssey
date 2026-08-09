import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCircuitStore } from '../../store/circuitStore';

const MILESTONES = [
  { id: 'milestone-1900', year: '1900', title: "Planck's Quantum", subtitle: 'The birth of the quantum — E = hν', glyph: 'blackbody' },
  { id: 'milestone-1926', year: '1926', title: "Schrödinger's Equation", subtitle: 'The master equation of quantum mechanics', glyph: 'wave' },
  { id: 'milestone-1964', year: '1964', title: "Bell's Theorem", subtitle: 'Entanglement is real and measurable', glyph: 'entanglement' },
  { id: 'milestone-1994', year: '1994', title: "Shor's Algorithm", subtitle: 'Quantum computers can break encryption', glyph: 'shor' },
];

function MiniGlyph({ type }: { type: string }) {
  if (type === 'blackbody') {
    return (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none" aria-hidden="true">
        <path d="M2,20 Q8,2 16,10 Q24,18 30,4" stroke="var(--ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M2,20 Q8,8 16,14 Q24,20 30,14" stroke="var(--ink-soft)" strokeWidth="1" fill="none" strokeLinecap="round" strokeDasharray="2 2" />
      </svg>
    );
  }
  if (type === 'wave') {
    return (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none" aria-hidden="true">
        <path d="M2,12 C6,4 10,20 14,12 C18,4 22,20 26,12 C28,8 30,12 30,12" stroke="var(--ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'entanglement') {
    return (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none" aria-hidden="true">
        <circle cx="8" cy="12" r="5" stroke="var(--ink)" strokeWidth="1.5" />
        <circle cx="24" cy="12" r="5" stroke="var(--ink)" strokeWidth="1.5" />
        <line x1="13" y1="12" x2="19" y2="12" stroke="var(--ink)" strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    );
  }
  if (type === 'shor') {
    return (
      <svg width="32" height="24" viewBox="0 0 32 24" fill="none" aria-hidden="true">
        <path d="M2,20 L8,8 L14,14 L20,6 L26,10 L30,4" stroke="var(--ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="14" r="2" fill="var(--ink)" />
        <circle cx="20" cy="6" r="2" fill="var(--ink)" />
      </svg>
    );
  }
  return null;
}

export default function MilestoneStrip() {
  const shouldReduceMotion = useReducedMotion();
  const setView = useCircuitStore((s) => s.setView);

  return (
    <div className="border-t" style={{ borderColor: 'var(--line)' }}>
      <div className="max-w-screen-2xl mx-auto px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24 py-8">
        <div className="flex items-center justify-between mb-6">
          <span className="font-body text-ink-soft" style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            The Discoveries
          </span>
          <button
            onClick={() => setView('archive')}
            className="font-body text-ink cursor-pointer focus-ring bg-transparent border-0"
            style={{ fontSize: '13px', textDecoration: 'none', borderBottom: '1px solid var(--line)', paddingBottom: '1px' }}
          >
            View the 3D archive museum →
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MILESTONES.map((m, i) => (
            <motion.div
              key={m.id}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.45 }}
            >
              <button
                onClick={() => setView('archive')}
                className="milestone-card w-full text-left block p-5 cursor-pointer focus-ring bg-transparent"
                style={{ textDecoration: 'none' }}
                data-liquid
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-display text-ink" style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {m.year}
                  </span>
                  <MiniGlyph type={m.glyph} />
                </div>
                <p className="font-body text-ink" style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px', lineHeight: 1.3 }}>
                  {m.title}
                </p>
                <p className="font-body text-ink-soft" style={{ fontSize: '12px', lineHeight: 1.45 }}>
                  {m.subtitle}
                </p>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
