import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const WORDS_LINE1 = ['From', "Newton's", 'prism'];
const WORDS_LINE2 = ['to', 'a', 'living'];
const WORDS_EMPHASIS = ['quantum', 'machine.'];

const wordVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function HeroHeadline() {
  const shouldReduceMotion = useReducedMotion();
  let wordIndex = 0;

  return (
    <h1
      id="hero-headline"
      className="font-display text-ink"
      style={{
        fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
        lineHeight: 0.98,
        letterSpacing: '-0.02em',
        textWrap: 'balance',
      }}
    >
      <span className="block mb-1">
        {WORDS_LINE1.map((word) => {
          const idx = wordIndex++;
          return (
            <motion.span
              key={`word-${word}-${idx}`}
              custom={idx}
              variants={shouldReduceMotion ? undefined : wordVariants}
              initial={shouldReduceMotion ? false : 'hidden'}
              animate="visible"
              className="inline-block mr-[0.22em]"
            >
              {word}
            </motion.span>
          );
        })}
      </span>
      <span className="block mb-1">
        {WORDS_LINE2.map((word) => {
          const idx = wordIndex++;
          return (
            <motion.span
              key={`word-${word}-${idx}`}
              custom={idx}
              variants={shouldReduceMotion ? undefined : wordVariants}
              initial={shouldReduceMotion ? false : 'hidden'}
              animate="visible"
              className="inline-block mr-[0.22em]"
            >
              {word}
            </motion.span>
          );
        })}
      </span>

      <span className="block relative inline-block">
        {WORDS_EMPHASIS.map((word, i) => (
          <motion.span
            key={`emphasis-${word}-${i}`}
            custom={wordIndex + i}
            variants={shouldReduceMotion ? undefined : wordVariants}
            initial={shouldReduceMotion ? false : 'hidden'}
            animate="visible"
            className="inline-block mr-[0.22em] relative squiggle-underline"
          >
            {word}
            <svg
              aria-hidden="true"
              className="absolute left-0 pointer-events-none"
              style={{
                bottom: '-6px',
                width: '100%',
                height: '8px',
                overflow: 'visible',
              }}
              preserveAspectRatio="none"
            >
              <motion.path
                d="M0,4 C8,0 16,8 24,4 C32,0 40,8 48,4 C56,0 64,8 72,4 C80,0 88,8 96,4 C104,0 112,8 120,4 C128,0 136,8 144,4 C152,0 160,8 168,4 C176,0 184,8 192,4 C200,0 208,8 216,4"
                fill="none"
                stroke="var(--ink)"
                strokeWidth="1.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={shouldReduceMotion ? {} : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.1, ease: 'easeOut' }}
              />
            </svg>
          </motion.span>
        ))}
      </span>
    </h1>
  );
}
