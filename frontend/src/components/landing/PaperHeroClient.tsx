import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import LiquidCursor from './LiquidCursor';
import IsoGlyphs from './IsoGlyphs';
import MilestoneStrip from './MilestoneStrip';
import HeroHeadline from './HeroHeadline';
import HeroCTAs from './HeroCTAs';

export default function PaperHeroClient() {
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {!shouldReduceMotion && <LiquidCursor />}
      <div className="absolute inset-0 z-0 pointer-events-none engineering-grid" />
      <section
        ref={heroRef}
        className="relative z-10 min-h-[calc(100vh-64px)] flex flex-col justify-center bg-paper"
        aria-labelledby="hero-headline"
      >
        <div className="relative max-w-screen-2xl mx-auto w-full px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24 pt-16 pb-8">
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 xl:col-span-6 relative z-10">
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <span
                  className="inline-block font-body text-ink-soft mb-6"
                  style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  71 Discoveries · Four Centuries · One Archive
                </span>
              </motion.div>

              <HeroHeadline />

              <motion.p
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.7 }}
                className="font-body text-ink-soft mt-6 mb-8"
                style={{ fontSize: '18px', lineHeight: 1.65, maxWidth: '560px' }}
              >
                Quantum Odyssey is an interactive archive of how humanity learned
                the quantum — 71 discoveries across four centuries, from Newton's
                prism to{' '}
                <span
                  className="font-body text-ink"
                  style={{
                    borderBottom: '1px solid var(--ink)',
                    paddingBottom: '1px',
                    cursor: 'default',
                  }}
                >
                  real IBM hardware
                </span>
                .
              </motion.p>

              <HeroCTAs />
            </div>

            <div className="lg:col-span-5 xl:col-span-6 relative min-h-[400px] hidden lg:block">
              <IsoGlyphs />
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto">
          <MilestoneStrip />
        </div>
      </section>
    </>
  );
}
