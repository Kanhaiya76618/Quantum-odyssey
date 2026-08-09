import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCircuitStore } from '../../store/circuitStore';

interface BackButtonProps {
  label?: string;
  onClick?: () => void;
  targetView?: string;
  archiveState?: any;
  onGoToStack?: () => void;
}

export default function BackButton({
  label = 'Back to Home',
  onClick,
  targetView = 'landing',
  archiveState,
  onGoToStack,
}: BackButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const setView = useCircuitStore((s) => s.setView);

  const handleClick = () => {
    if (archiveState && archiveState.mode !== 'stack' && onGoToStack) {
      onGoToStack();
      return;
    }
    if (onClick) {
      onClick();
    } else {
      setView(targetView);
    }
  };

  const actualLabel = (archiveState && archiveState.mode !== 'stack') ? '‹ Overview' : label;

  return (
    <motion.button
      whileHover={shouldReduceMotion ? {} : { x: -2 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
      transition={{ duration: 0.15 }}
      onClick={handleClick}
      aria-label={actualLabel}
      className="inline-flex items-center gap-2 px-3.5 py-1.5 focus-ring cursor-pointer"
      style={{
        background: '#FDFBF7',
        border: '1.5px solid #1A1A1A',
        borderRadius: 999,
        color: '#0A0A0A',
        fontSize: 12,
        fontWeight: 800,
        fontFamily: 'var(--font-body, Inter, sans-serif)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M8.5 3.5L5 7L8.5 10.5" stroke="#0A0A0A" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{actualLabel}</span>
    </motion.button>
  );
}