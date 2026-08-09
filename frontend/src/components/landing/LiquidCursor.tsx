import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

export default function LiquidCursor() {
  const shouldReduceMotion = useReducedMotion();
  const [isTouch, setIsTouch] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [ripples, setRipples] = useState<{ id: string; x: number; y: number }[]>([]);
  const rippleIdRef = useRef(0);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springX = useSpring(mouseX, { stiffness: 120, damping: 18, mass: 0.6 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 18, mass: 0.6 });

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    if (mq.matches) {
      setIsTouch(true);
      return;
    }

    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 20);
      mouseY.set(e.clientY - 20);

      const target = e.target as HTMLElement;
      const isLiquid = target?.closest('[data-liquid]') !== null;
      setIsHovering(!!isLiquid);
    };

    const handleClick = (e: MouseEvent) => {
      const id = `ripple-${++rippleIdRef.current}`;
      setRipples(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 600);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('click', handleClick);
    };
  }, [mouseX, mouseY]);

  if (shouldReduceMotion || isTouch) return null;

  return (
    <>
      <motion.div
        className="liquid-cursor"
        style={{
          x: springX,
          y: springY,
          scale: isHovering ? 1.8 : 1,
          opacity: isHovering ? 0.9 : 0.6,
        }}
        transition={{ scale: { type: 'spring', stiffness: 200, damping: 20 } }}
        aria-hidden="true"
      />

      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          aria-hidden="true"
          className="pointer-events-none fixed z-[9998] rounded-full"
          style={{
            left: ripple.x - 20,
            top: ripple.y - 20,
            width: 40,
            height: 40,
            border: '1px solid var(--accent)',
          }}
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}
