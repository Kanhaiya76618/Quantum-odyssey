import React from 'react';
import { motion, MotionProps } from 'framer-motion';

interface GlassPanelProps extends MotionProps {
  children: React.ReactNode;
  depth?: number;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export default function GlassPanel({
  children,
  depth = 1,
  className = '',
  style = {},
  ...motionProps
}: GlassPanelProps) {
  const shadowStrength = depth === 1 ? 0.06 : depth === 2 ? 0.1 : 0.14;
  const shadowSize = depth === 1 ? 32 : depth === 2 ? 48 : 64;

  return (
    <motion.div
      className={`glass-panel relative overflow-hidden ${className}`}
      style={{
        boxShadow: `0 8px ${shadowSize}px rgba(43,43,43,${shadowStrength}), inset 0 1px 0 rgba(255,255,255,0.7)`,
        ...style,
      }}
      {...motionProps}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(var(--grid) 0 1px, transparent 1px 16px), repeating-linear-gradient(90deg, var(--grid) 0 1px, transparent 1px 16px)',
          backgroundSize: '16px 16px',
          opacity: 0.04,
          borderRadius: 'inherit',
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
