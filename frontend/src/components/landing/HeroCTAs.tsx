import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCircuitStore } from '../../store/circuitStore';

export default function HeroCTAs() {
  const shouldReduceMotion = useReducedMotion();
  const setView = useCircuitStore((s) => s.setView);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.85 }}
      className="flex flex-wrap gap-3 items-center"
    >
      <motion.div
        whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
        transition={{ duration: 0.15 }}
      >
        <button
          onClick={() => setView('archive')}
          className="ink-pill inline-flex items-center gap-2 px-6 py-3 font-body focus-ring cursor-pointer"
          style={{ fontSize: '15px', fontWeight: 500, minHeight: '44px' }}
          data-liquid
        >
          Enter the 3D Archive
          <span aria-hidden="true">→</span>
        </button>
      </motion.div>

      <motion.div
        whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
        transition={{ duration: 0.15 }}
      >
        <button
          onClick={() => setView('machine-world')}
          className="ghost-pill inline-flex items-center gap-2 px-6 py-3 font-body focus-ring cursor-pointer"
          style={{ fontSize: '15px', fontWeight: 400, minHeight: '44px' }}
          data-liquid
        >
          Open Machine World
        </button>
      </motion.div>

      <motion.div
        whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
        transition={{ duration: 0.15 }}
      >
        <button
          onClick={() => setView('circuit-dashboard')}
          className="ghost-pill inline-flex items-center gap-2 px-6 py-3 font-body focus-ring cursor-pointer"
          style={{ fontSize: '15px', fontWeight: 400, minHeight: '44px' }}
          data-liquid
        >
          Circuit Dashboard
        </button>
      </motion.div>

      <motion.div
        whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
        transition={{ duration: 0.15 }}
      >
        <button
          onClick={() => setView('builder')}
          className="ghost-pill inline-flex items-center gap-2 px-6 py-3 font-body focus-ring cursor-pointer"
          style={{ fontSize: '15px', fontWeight: 400, minHeight: '44px' }}
          data-liquid
        >
          Circuit Builder
        </button>
      </motion.div>
    </motion.div>
  );
}
