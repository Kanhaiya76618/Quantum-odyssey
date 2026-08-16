'use client';
import React, { useEffect, useRef } from 'react';

interface DiagramSVGProps {
  concept: string;
  eventId: string;
  shouldReduceMotion: boolean;
}

const STROKE = '#2B2B2B';
const STROKE_SOFT = '#55524C';
const SW = '1.5';

// Animated path wrapper — draws stroke on mount
function AnimPath({
  d,
  delay = 0,
  rm,
  strokeWidth = SW,
  strokeDasharray,
  opacity,
  fill = 'none',
  stroke = STROKE,
  ...rest
}: React.SVGProps<SVGPathElement> & { delay?: number; rm: boolean; strokeWidth?: string }) {
  const ref = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (rm || !ref.current) return;
    const el = ref.current;
    const len = el.getTotalLength?.() ?? 800;
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.style.transition = `stroke-dashoffset 1.2s ease ${delay}s`;
    // Trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = '0';
      });
    });
  }, [rm, delay]);

  return (
    <path
      ref={ref}
      d={d}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill}
      opacity={opacity}
      {...rest}
    />
  );
}

function AnimLine({
  x1, y1, x2, y2, delay = 0, rm, stroke = STROKE, strokeWidth = SW, ...rest
}: React.SVGProps<SVGLineElement> & { delay?: number; rm: boolean }) {
  const ref = useRef<SVGLineElement>(null);

  useEffect(() => {
    if (rm || !ref.current) return;
    const el = ref.current;
    const dx = Number(x2) - Number(x1);
    const dy = Number(y2) - Number(y1);
    const len = Math.sqrt(dx * dx + dy * dy);
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.style.transition = `stroke-dashoffset 0.9s ease ${delay}s`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = '0';
      });
    });
  }, [rm, delay, x1, y1, x2, y2]);

  return (
    <line
      ref={ref}
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={stroke}
      strokeWidth={strokeWidth}
      {...rest}
    />
  );
}

function AnimCircle({
  cx, cy, r, delay = 0, rm, stroke = STROKE, strokeWidth = SW, fill = 'none', ...rest
}: React.SVGProps<SVGCircleElement> & { delay?: number; rm: boolean }) {
  const ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (rm || !ref.current) return;
    const el = ref.current;
    const len = 2 * Math.PI * Number(r);
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.style.transition = `stroke-dashoffset 1.1s ease ${delay}s`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = '0';
      });
    });
  }, [rm, delay, r]);

  return (
    <circle
      ref={ref}
      cx={cx} cy={cy} r={r}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill}
      {...rest}
    />
  );
}

// --- Individual diagrams ---

function DoubleSlit({ rm }: { rm: boolean }) {
  return (
    <svg width="280" height="160" viewBox="0 0 280 160" fill="none" aria-label="Double-slit interference diagram">
      {/* Barrier */}
      <rect x="90" y="10" width="4" height="52" fill={STROKE} />
      <rect x="90" y="98" width="4" height="52" fill={STROKE} />
      <text x="80" y="78" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif">slits</text>
      {/* Screen */}
      <rect x="220" y="10" width="3" height="140" fill={STROKE} />
      {/* Wavefronts from source */}
      <AnimPath d="M30,80 Q60,42 90,65" rm={rm} delay={0.1} />
      <AnimPath d="M30,80 Q60,118 90,95" rm={rm} delay={0.2} />
      {/* Fan lines */}
      {[20,35,50,65,80,95,110,125,140].map((y, i) => (
        <line key={`f1-${i}`} x1="94" y1="65" x2="220" y2={y} stroke={STROKE_SOFT} strokeWidth="0.5" opacity="0.2" />
      ))}
      {[20,35,50,65,80,95,110,125,140].map((y, i) => (
        <line key={`f2-${i}`} x1="94" y1="95" x2="220" y2={y} stroke={STROKE_SOFT} strokeWidth="0.5" opacity="0.2" />
      ))}
      {/* Interference fringes */}
      {[0,1,2,3,4,5,6].map(i => {
        const intensity = Math.abs(Math.cos((i - 3) * Math.PI / 3));
        const w = Math.max(2, intensity * 10);
        return (
          <rect key={`fringe-${i}`} x="225" y={20 + i * 18} width={w} height={12} fill={STROKE} opacity={intensity * 0.9 + 0.1} />
        );
      })}
      <text x="140" y="155" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif">interference pattern</text>
    </svg>
  );
}

function PhotoelectricDiagram({ rm }: { rm: boolean }) {
  return (
    <svg width="280" height="160" viewBox="0 0 280 160" fill="none" aria-label="Photoelectric effect diagram">
      {/* Metal surface */}
      <rect x="20" y="100" width="160" height="8" fill={STROKE} rx="1" />
      <text x="100" y="122" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif">metal surface</text>
      {/* Incoming photons */}
      {[40,80,120].map((x, i) => (
        <g key={`photon-${i}`}>
          <AnimLine x1={x} y1={30} x2={x} y2={98} rm={rm} delay={0.1 + i * 0.08} strokeDasharray="4 3" />
          <polygon points={`${x-4},90 ${x+4},90 ${x},100`} fill={STROKE} />
          <text x={x} y="22" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">hν</text>
        </g>
      ))}
      {/* Ejected electrons */}
      {[50,90,130].map((x, i) => (
        <g key={`electron-${i}`}>
          <AnimLine x1={x} y1={98} x2={x + 30 + i*8} y2={60 - i*10} rm={rm} delay={0.4 + i * 0.1} />
          <circle cx={x + 30 + i*8} cy={60 - i*10} r="4" stroke={STROKE} strokeWidth={SW} fill="#F2F0EA" />
          <text x={x + 36 + i*8} y={57 - i*10} fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">e⁻</text>
        </g>
      ))}
      <text x="140" y="152" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif">energy ∝ frequency, not intensity</text>
    </svg>
  );
}

function BohrDiagram({ rm }: { rm: boolean }) {
  return (
    <svg width="280" height="160" viewBox="0 0 280 160" fill="none" aria-label="Bohr atomic model diagram">
      <defs>
        <marker id="bohr-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={STROKE} />
        </marker>
      </defs>
      {/* Nucleus */}
      <circle cx="140" cy="80" r="10" fill={STROKE} />
      <text x="140" y="84" textAnchor="middle" fontSize="8" fill="#F2F0EA" fontFamily="sans-serif">+</text>
      {/* Orbits */}
      {[28, 46, 64].map((r, i) => (
        <AnimCircle key={`orbit-${i}`} cx={140} cy={80} r={r} rm={rm} delay={0.1 + i * 0.12}
          strokeDasharray={i === 2 ? '4 3' : undefined} />
      ))}
      {/* Electrons */}
      <circle cx="168" cy="80" r="4" stroke={STROKE} strokeWidth={SW} fill="#F2F0EA" />
      <circle cx="140" cy="34" r="4" stroke={STROKE} strokeWidth={SW} fill="#F2F0EA" />
      <circle cx="204" cy="80" r="4" stroke={STROKE} strokeWidth={SW} fill="#F2F0EA" />
      {/* Quantum jump */}
      <AnimPath d="M140,34 Q115,57 140,68" rm={rm} delay={0.5} markerEnd="url(#bohr-arrow)" />
      <text x="108" y="52" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">ΔE=hν</text>
      <text x="172" y="60" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">n=1</text>
      <text x="190" y="55" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">n=2</text>
      <text x="208" y="50" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">n=3</text>
      <text x="140" y="155" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif">quantised energy levels</text>
    </svg>
  );
}

function UncertaintyDiagram({ rm }: { rm: boolean }) {
  return (
    <svg width="280" height="160" viewBox="0 0 280 160" fill="none" aria-label="Heisenberg uncertainty principle diagram">
      {/* Left box: Δx narrow */}
      <rect x="30" y="40" width="30" height="60" stroke={STROKE} strokeWidth={SW} fill="none" rx="2" />
      <text x="45" y="35" textAnchor="middle" fontSize="10" fill={STROKE} fontFamily="sans-serif" fontWeight="500">Δx small</text>
      <AnimPath d="M32,70 Q37,50 40,70 Q43,90 45,70 Q47,50 50,70 Q53,90 57,70" rm={rm} delay={0.2} strokeWidth="1" />
      {/* Right box: Δx large */}
      <rect x="140" y="40" width="100" height="60" stroke={STROKE} strokeWidth={SW} fill="none" rx="2" />
      <text x="190" y="35" textAnchor="middle" fontSize="10" fill={STROKE} fontFamily="sans-serif" fontWeight="500">Δx large</text>
      <AnimPath d="M145,70 Q165,65 185,70 Q205,75 225,70 Q235,67 237,70" rm={rm} delay={0.3} strokeWidth="1" />
      {/* Momentum arrows */}
      <AnimLine x1={45} y1={115} x2={45} y2={140} rm={rm} delay={0.4} />
      <text x="45" y="152" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">Δp large</text>
      <AnimLine x1={190} y1={115} x2={190} y2={130} rm={rm} delay={0.45} />
      <text x="190" y="142" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">Δp small</text>
      <text x="100" y="80" textAnchor="middle" fontSize="14" fill={STROKE} fontFamily="serif" fontWeight="600">≥</text>
      <text x="100" y="95" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">ℏ/2</text>
    </svg>
  );
}

function EntanglementDiagram({ rm }: { rm: boolean }) {
  return (
    <svg width="280" height="160" viewBox="0 0 280 160" fill="none" aria-label="Quantum entanglement EPR diagram">
      {/* Source */}
      <circle cx="140" cy="80" r="8" fill={STROKE} />
      <text x="140" y="68" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">source</text>
      {/* Particle A */}
      <AnimLine x1={132} y1={80} x2={50} y2={80} rm={rm} delay={0.2} strokeDasharray="5 3" />
      <AnimCircle cx={40} cy={80} r={10} rm={rm} delay={0.3} />
      <text x="40" y="84" textAnchor="middle" fontSize="9" fill={STROKE} fontFamily="sans-serif">A</text>
      <text x="40" y="100" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">↑</text>
      {/* Particle B */}
      <AnimLine x1={148} y1={80} x2={230} y2={80} rm={rm} delay={0.2} strokeDasharray="5 3" />
      <AnimCircle cx={240} cy={80} r={10} rm={rm} delay={0.3} />
      <text x="240" y="84" textAnchor="middle" fontSize="9" fill={STROKE} fontFamily="sans-serif">B</text>
      <text x="240" y="100" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">↓</text>
      {/* Correlation arc */}
      <AnimPath d="M50,65 Q140,30 230,65" rm={rm} delay={0.5} stroke={STROKE_SOFT} strokeWidth="1" strokeDasharray="3 3" />
      <text x="140" y="38" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">non-local correlation</text>
      <text x="140" y="130" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif">measuring A instantly determines B</text>
    </svg>
  );
}

function ShorDiagram({ rm }: { rm: boolean }) {
  return (
    <svg width="280" height="160" viewBox="0 0 280 160" fill="none" aria-label="Shor's algorithm period-finding diagram">
      {Array.from({ length: 12 }, (_, i) => {
        const x = 20 + i * 20;
        const h = (i % 4 === 0) ? 60 : (i % 4 === 2) ? 30 : 10;
        return (
          <rect key={`bar-${i}`} x={x} y={100 - h} width="14" height={h} fill={STROKE} opacity={i % 4 === 0 ? 0.9 : 0.35} rx="1" />
        );
      })}
      <AnimLine x1={20} y1={115} x2={100} y2={115} rm={rm} delay={0.3} strokeWidth="1" />
      <text x="60" y="128" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">period r</text>
      <AnimLine x1={100} y1={115} x2={180} y2={115} rm={rm} delay={0.35} strokeWidth="1" />
      <text x="140" y="128" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">period r</text>
      <AnimLine x1={220} y1={70} x2={255} y2={70} rm={rm} delay={0.5} />
      <polygon points="255,66 263,70 255,74" fill={STROKE} />
      <text x="232" y="55" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">QFT</text>
      <text x="270" y="60" textAnchor="middle" fontSize="9" fill={STROKE} fontFamily="sans-serif" fontWeight="500">p·q</text>
      <text x="270" y="74" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">=N</text>
      <text x="140" y="150" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif">period-finding → prime factors</text>
    </svg>
  );
}

function BlochDiagram({ rm }: { rm: boolean }) {
  return (
    <svg width="280" height="160" viewBox="0 0 280 160" fill="none" aria-label="Bloch sphere qubit state diagram">
      <AnimCircle cx={140} cy={80} r={60} rm={rm} delay={0} />
      <ellipse cx="140" cy="80" rx="60" ry="18" stroke={STROKE} strokeWidth="1" fill="none" strokeDasharray="4 3" />
      <AnimLine x1={140} y1={20} x2={140} y2={140} rm={rm} delay={0.1} strokeWidth="1" stroke={STROKE_SOFT} strokeDasharray="3 2" />
      <AnimLine x1={140} y1={80} x2={180} y2={42} rm={rm} delay={0.4} strokeWidth="2" />
      <circle cx="180" cy="42" r="4" fill={STROKE} />
      <circle cx="140" cy="20" r="3" fill={STROKE} />
      <circle cx="140" cy="140" r="3" fill={STROKE} />
      <text x="148" y="18" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">|0⟩</text>
      <text x="148" y="152" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">|1⟩</text>
      <text x="188" y="38" fontSize="9" fill={STROKE} fontFamily="sans-serif" fontWeight="500">|ψ⟩</text>
      <text x="140" y="155" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif">qubit superposition state</text>
    </svg>
  );
}

function BlackbodyDiagram({ rm }: { rm: boolean }) {
  return (
    <svg width="280" height="160" viewBox="0 0 280 160" fill="none" aria-label="Blackbody radiation spectrum diagram">
      <AnimLine x1={30} y1={130} x2={260} y2={130} rm={rm} delay={0} />
      <AnimLine x1={30} y1={130} x2={30} y2={20} rm={rm} delay={0.05} />
      <text x="145" y="150" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif">wavelength →</text>
      <text x="18" y="75" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif" transform="rotate(-90,18,75)">intensity</text>
      {/* Classical (Rayleigh-Jeans) — diverges */}
      <AnimPath d="M40,128 Q60,80 80,50 Q100,25 120,15 Q140,8 260,5"
        rm={rm} delay={0.2} stroke={STROKE_SOFT} strokeWidth="1.5" strokeDasharray="5 3" />
      <text x="200" y="18" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">classical</text>
      {/* Planck curve */}
      <AnimPath d="M40,128 Q70,90 100,45 Q120,25 140,35 Q170,55 200,90 Q230,115 260,126"
        rm={rm} delay={0.35} strokeWidth="2" />
      <text x="95" y="38" fontSize="9" fill={STROKE} fontFamily="sans-serif" fontWeight="500">Planck</text>
      <AnimLine x1={100} y1={45} x2={100} y2={130} rm={rm} delay={0.6} strokeWidth="1" stroke={STROKE_SOFT} strokeDasharray="3 2" />
      <text x="100" y="143" textAnchor="middle" fontSize="9" fill={STROKE_SOFT} fontFamily="sans-serif">λmax</text>
    </svg>
  );
}

function TransistorDiagram({ rm }: { rm: boolean }) {
  return (
    <svg width="280" height="160" viewBox="0 0 280 160" fill="none" aria-label="Transistor gate diagram">
      <rect x="120" y="20" width="40" height="20" stroke={STROKE} strokeWidth={SW} fill="none" rx="2" />
      <text x="140" y="34" textAnchor="middle" fontSize="10" fill={STROKE} fontFamily="sans-serif">Gate</text>
      <AnimLine x1={140} y1={40} x2={140} y2={58} rm={rm} delay={0.1} />
      <rect x="100" y="58" width="80" height="8" fill={STROKE_SOFT} opacity="0.3" rx="1" />
      <text x="140" y="65" textAnchor="middle" fontSize="8" fill={STROKE_SOFT} fontFamily="sans-serif">oxide</text>
      <rect x="60" y="66" width="160" height="24" stroke={STROKE} strokeWidth={SW} fill="none" rx="2" />
      {[0,1,2].map(i => (
        <circle key={`tunnel-${i}`} cx={110 + i * 20} cy="78" r="3" fill={STROKE} opacity={0.6} />
      ))}
      <text x="140" y="93" textAnchor="middle" fontSize="8" fill={STROKE_SOFT} fontFamily="sans-serif">quantum tunnelling</text>
      <rect x="20" y="66" width="40" height="24" stroke={STROKE} strokeWidth={SW} fill="none" rx="2" />
      <text x="40" y="82" textAnchor="middle" fontSize="9" fill={STROKE} fontFamily="sans-serif">S</text>
      <rect x="220" y="66" width="40" height="24" stroke={STROKE} strokeWidth={SW} fill="none" rx="2" />
      <text x="240" y="82" textAnchor="middle" fontSize="9" fill={STROKE} fontFamily="sans-serif">D</text>
      <AnimLine x1={60} y1={78} x2={30} y2={78} rm={rm} delay={0.5} />
      <AnimLine x1={220} y1={78} x2={250} y2={78} rm={rm} delay={0.5} />
      <text x="140" y="130" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif">semiconductor gate controls current</text>
    </svg>
  );
}

function ErrorCorrectionDiagram({ rm }: { rm: boolean }) {
  return (
    <svg width="280" height="160" viewBox="0 0 280 160" fill="none" aria-label="Quantum error correction diagram">
      <rect x="10" y="65" width="40" height="30" stroke={STROKE} strokeWidth={SW} fill="none" rx="3" />
      <text x="30" y="83" textAnchor="middle" fontSize="9" fill={STROKE} fontFamily="sans-serif">|ψ⟩</text>
      <text x="30" y="105" textAnchor="middle" fontSize="8" fill={STROKE_SOFT} fontFamily="sans-serif">logical</text>
      <AnimLine x1={50} y1={80} x2={68} y2={80} rm={rm} delay={0.15} />
      <polygon points="68,76 76,80 68,84" fill={STROKE} />
      <text x="62" y="72" textAnchor="middle" fontSize="8" fill={STROKE_SOFT} fontFamily="sans-serif">encode</text>
      {[50,80,110].map((y, i) => (
        <g key={`physical-${i}`}>
          <rect x="80" y={y} width="30" height="22" stroke={STROKE} strokeWidth="1" fill="none" rx="2" />
          <text x="95" y={y + 14} textAnchor="middle" fontSize="8" fill={STROKE} fontFamily="sans-serif">|ψ⟩</text>
        </g>
      ))}
      <text x="95" y="148" textAnchor="middle" fontSize="8" fill={STROKE_SOFT} fontFamily="sans-serif">3 physical qubits</text>
      <AnimLine x1={115} y1={80} x2={148} y2={80} rm={rm} delay={0.4} />
      <polygon points="148,76 156,80 148,84" fill={STROKE} />
      <rect x="158" y="60" width="50" height="40" stroke={STROKE} strokeWidth={SW} fill="none" rx="3" />
      <text x="183" y="78" textAnchor="middle" fontSize="8" fill={STROKE} fontFamily="sans-serif">syndrome</text>
      <text x="183" y="90" textAnchor="middle" fontSize="8" fill={STROKE} fontFamily="sans-serif">measure</text>
      <AnimLine x1={208} y1={80} x2={240} y2={80} rm={rm} delay={0.6} />
      <polygon points="240,76 248,80 240,84" fill={STROKE} />
      <rect x="250" y="65" width="24" height="30" stroke={STROKE} strokeWidth={SW} fill="none" rx="3" />
      <text x="262" y="83" textAnchor="middle" fontSize="8" fill={STROKE} fontFamily="sans-serif">fix</text>
    </svg>
  );
}

function PrismOpticksDiagram({ rm }: { rm: boolean }) {
  return (
    <svg viewBox="0 0 400 240" width="340" height="204" fill="none" style={{ backgroundColor: '#FDFBF7', border: '2px solid #1A1A1A', borderRadius: 8 }}>
      {/* Ink Prism */}
      <polygon points="150,50 250,50 200,150" fill="#F2F0EA" stroke="#1A1A1A" strokeWidth="2.5" strokeLinejoin="round" />
      
      {/* Incoming White Light */}
      <AnimLine x1={20} y1={100} x2={150} y2={100} stroke="#1A1A1A" strokeWidth="2.5" rm={rm} delay={0.1} />
      <text x="35" y="90" fontFamily="Georgia, serif" fontSize="12" fill="#4B5563" fontWeight="bold">White Light</text>
      
      {/* Outgoing Spectrum Rays */}
      <AnimLine x1={250} y1={100} x2={375} y2={50} stroke="#EF4444" strokeWidth="2" strokeDasharray="4 2" rm={rm} delay={0.3} />
      <AnimLine x1={250} y1={100} x2={375} y2={75} stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 2" rm={rm} delay={0.35} />
      <AnimLine x1={250} y1={100} x2={375} y2={100} stroke="#10B981" strokeWidth="2" strokeDasharray="4 2" rm={rm} delay={0.4} />
      <AnimLine x1={250} y1={100} x2={375} y2={125} stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 2" rm={rm} delay={0.45} />
      <AnimLine x1={250} y1={100} x2={375} y2={150} stroke="#8B5CF6" strokeWidth="2" strokeDasharray="4 2" rm={rm} delay={0.5} />
      
      {/* Mathematical Angle Indicators */}
      <path d="M 160 100 A 15 15 0 0 1 170 85" fill="none" stroke="#4B5563" strokeWidth="1" />
      <text x="165" y="80" fontFamily="Georgia, serif" fontSize="11" fill="#4B5563" fontStyle="italic">θ</text>
      <path d="M 240 100 A 15 15 0 0 0 230 115" fill="none" stroke="#4B5563" strokeWidth="1" />
      <text x="225" y="125" fontFamily="Georgia, serif" fontSize="11" fill="#4B5563" fontStyle="italic">φ</text>
      
      {/* Formula Text */}
      <text x="90" y="210" fontFamily="Georgia, serif" fontSize="14" fill="#1A1A1A" fontStyle="italic" fontWeight="bold">n = sin(θ) / sin(φ) · Dispersion Index</text>
    </svg>
  );
}

function CoulombDiagram({ rm }: { rm: boolean }) {
  return (
    <svg viewBox="0 0 400 240" width="340" height="204" fill="none" style={{ backgroundColor: '#FDFBF7', border: '2px solid #1A1A1A', borderRadius: 8 }}>
      {/* Torsion Wire (Vertical) */}
      <line x1="200" y1="15" x2="200" y2="90" stroke="#1A1A1A" strokeWidth="2" strokeDasharray="3 3" />
      
      {/* Horizontal Rod */}
      <line x1="110" y1="90" x2="290" y2="90" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      
      {/* Charged Spheres */}
      <circle cx="110" cy="90" r="14" fill="#F2F0EA" stroke="#1A1A1A" strokeWidth="2.5" />
      <circle cx="290" cy="90" r="14" fill="#F2F0EA" stroke="#1A1A1A" strokeWidth="2.5" />
      <text x="105" y="95" fontFamily="Georgia, serif" fontSize="13" fill="#1A1A1A" fontWeight="bold">q₁</text>
      <text x="285" y="95" fontFamily="Georgia, serif" fontSize="13" fill="#1A1A1A" fontWeight="bold">q₂</text>
      
      {/* Distance Indicator (r) */}
      <line x1="110" y1="130" x2="290" y2="130" stroke="#4B5563" strokeWidth="1.2" />
      <line x1="110" y1="125" x2="110" y2="135" stroke="#4B5563" strokeWidth="1.2" />
      <line x1="290" y1="125" x2="290" y2="135" stroke="#4B5563" strokeWidth="1.2" />
      <text x="195" y="145" fontFamily="Georgia, serif" fontSize="13" fill="#4B5563" fontStyle="italic">r</text>
      
      {/* Inverse Square Radiance */}
      <circle cx="110" cy="90" r="35" fill="none" stroke="#4B5563" strokeWidth="0.8" opacity="0.4" />
      <circle cx="110" cy="90" r="60" fill="none" stroke="#4B5563" strokeWidth="0.8" opacity="0.2" />
      <circle cx="290" cy="90" r="35" fill="none" stroke="#4B5563" strokeWidth="0.8" opacity="0.4" />
      <circle cx="290" cy="90" r="60" fill="none" stroke="#4B5563" strokeWidth="0.8" opacity="0.2" />
      
      {/* Formula Text */}
      <text x="130" y="205" fontFamily="Georgia, serif" fontSize="16" fill="#1A1A1A" fontWeight="bold">F = k · (q₁ · q₂) / r²</text>
    </svg>
  );
}

function YoungWaveDiagram({ rm }: { rm: boolean }) {
  return (
    <svg viewBox="0 0 400 240" width="340" height="204" fill="none" style={{ backgroundColor: '#FDFBF7', border: '2px solid #1A1A1A', borderRadius: 8 }}>
      {/* Wave Sources */}
      <circle cx="130" cy="110" r="4" fill="#1A1A1A" />
      <circle cx="210" cy="110" r="4" fill="#1A1A1A" />
      <text x="115" y="115" fontFamily="Georgia, serif" fontSize="11" fill="#1A1A1A" fontWeight="bold">S₁</text>
      <text x="220" y="115" fontFamily="Georgia, serif" fontSize="11" fill="#1A1A1A" fontWeight="bold">S₂</text>
      
      {/* Concentric Wavefronts */}
      {[25, 50, 75, 100].map((r, i) => (
        <React.Fragment key={`wave-${i}`}>
          <circle cx="130" cy="110" r={r} fill="none" stroke="#1A1A1A" strokeWidth="1.2" opacity={0.6 - i * 0.12} />
          <circle cx="210" cy="110" r={r} fill="none" stroke="#1A1A1A" strokeWidth="1.2" opacity={0.6 - i * 0.12} />
        </React.Fragment>
      ))}
      
      {/* Target Point P */}
      <AnimLine x1={130} y1={110} x2={330} y2={50} stroke="#4B5563" strokeWidth="1.2" strokeDasharray="3 3" rm={rm} delay={0.2} />
      <AnimLine x1={210} y1={110} x2={330} y2={50} stroke="#4B5563" strokeWidth="1.2" strokeDasharray="3 3" rm={rm} delay={0.3} />
      <circle cx="330" cy="50" r="3.5" fill="#EF4444" />
      <text x="340" y="52" fontFamily="Georgia, serif" fontSize="13" fill="#1A1A1A" fontWeight="bold">P</text>
      
      {/* Formula Text */}
      <text x="95" y="210" fontFamily="Georgia, serif" fontSize="14" fill="#1A1A1A" fontStyle="italic" fontWeight="bold">d · sin(θ) = mλ · Wave Interference</text>
    </svg>
  );
}

function RefractionDiagram({ rm }: { rm: boolean }) {
  return (
    <svg viewBox="0 0 400 240" width="340" height="204" fill="none" style={{ backgroundColor: '#FDFBF7', border: '2px solid #1A1A1A', borderRadius: 8 }}>
      {/* Interface Boundary (Water / Glass) */}
      <rect x="20" y="110" width="360" height="110" fill="#EAE7DF" stroke="#1A1A1A" strokeWidth="1.5" />
      <text x="35" y="100" fontFamily="Georgia, serif" fontSize="12" fill="#4B5563" fontWeight="bold">Medium 1 (Air: n₁)</text>
      <text x="35" y="130" fontFamily="Georgia, serif" fontSize="12" fill="#4B5563" fontWeight="bold">Medium 2 (Glass: n₂)</text>

      {/* Normal Line */}
      <line x1="200" y1="20" x2="200" y2="210" stroke="#1A1A1A" strokeWidth="1.5" strokeDasharray="3 3" />

      {/* Incident Ray */}
      <AnimLine x1={80} y1={30} x2={200} y2={110} stroke="#EF4444" strokeWidth="2.5" rm={rm} delay={0.1} />
      {/* Refracted Bent Ray */}
      <AnimLine x1={200} y1={110} x2={280} y2={200} stroke="#3B82F6" strokeWidth="2.5" rm={rm} delay={0.3} />

      {/* Angle Arcs */}
      <path d="M 185 85 A 25 25 0 0 1 200 85" fill="none" stroke="#EF4444" strokeWidth="1.5" />
      <text x="175" y="75" fontFamily="Georgia, serif" fontSize="12" fill="#EF4444" fontStyle="italic">θ₁</text>

      <path d="M 200 145 A 35 35 0 0 0 225 140" fill="none" stroke="#3B82F6" strokeWidth="1.5" />
      <text x="215" y="160" fontFamily="Georgia, serif" fontSize="12" fill="#3B82F6" fontStyle="italic">θ₂</text>

      {/* Formula */}
      <text x="75" y="230" fontFamily="Georgia, serif" fontSize="15" fill="#1A1A1A" fontStyle="italic" fontWeight="bold">n₁ · sin(θ₁) = n₂ · sin(θ₂) · Snell's Law</text>
    </svg>
  );
}

function DiffractionDiagram({ rm }: { rm: boolean }) {
  return (
    <svg viewBox="0 0 400 240" width="340" height="204" fill="none" style={{ backgroundColor: '#FDFBF7', border: '2px solid #1A1A1A', borderRadius: 8 }}>
      {/* Opaque Obstacle */}
      <rect x="150" y="40" width="20" height="140" fill="#1A1A1A" rx="2" />
      <text x="135" y="30" fontFamily="Georgia, serif" fontSize="12" fill="#1A1A1A" fontWeight="bold">Obstacle</text>

      {/* Incoming Parallel Light Rays */}
      {[50, 80, 110, 140, 170].map((y, i) => (
        <AnimLine key={`in-${i}`} x1={30} y1={y} x2={140} y2={y} stroke="#1A1A1A" strokeWidth="2" rm={rm} delay={i * 0.05} />
      ))}

      {/* Diffracted Bending Waves Into Geometric Shadow */}
      <path d="M 170 40 Q 230 45 320 15" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="3 2" />
      <path d="M 170 40 Q 240 70 320 60" fill="none" stroke="#10B981" strokeWidth="2" />
      <path d="M 170 180 Q 240 150 320 160" fill="none" stroke="#10B981" strokeWidth="2" />
      <path d="M 170 180 Q 230 175 320 205" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="3 2" />

      {/* Shadow Core */}
      <rect x="200" y="85" width="120" height="50" fill="#EAE7DF" opacity="0.6" />
      <text x="215" y="115" fontFamily="Georgia, serif" fontSize="12" fill="#4B5563" fontStyle="italic">Diffraction Shadow</text>

      {/* Formula */}
      <text x="75" y="225" fontFamily="Georgia, serif" fontSize="14" fill="#1A1A1A" fontStyle="italic" fontWeight="bold">Grimaldi's Bending Around Shadow Edges</text>
    </svg>
  );
}

function SpeedOfLightDiagram({ rm }: { rm: boolean }) {
  return (
    <svg viewBox="0 0 400 240" width="340" height="204" fill="none" style={{ backgroundColor: '#FDFBF7', border: '2px solid #1A1A1A', borderRadius: 8 }}>
      {/* Sun at center-left */}
      <circle cx="100" cy="110" r="22" fill="#F59E0B" stroke="#1A1A1A" strokeWidth="2" />
      <text x="90" y="115" fontFamily="Georgia, serif" fontSize="11" fill="#1A1A1A" fontWeight="bold">Sun</text>

      {/* Earth Orbit */}
      <ellipse cx="100" cy="110" rx="65" ry="55" fill="none" stroke="#4B5563" strokeWidth="1" strokeDasharray="3 3" />
      {/* Earth Position 1 & Position 2 */}
      <circle cx="165" cy="110" r="8" fill="#3B82F6" stroke="#1A1A1A" strokeWidth="1.5" />
      <text x="155" y="95" fontFamily="Georgia, serif" fontSize="10" fill="#1A1A1A" fontWeight="bold">E₁ (Near)</text>

      <circle cx="35" cy="110" r="8" fill="#3B82F6" stroke="#1A1A1A" strokeWidth="1.5" />
      <text x="15" y="95" fontFamily="Georgia, serif" fontSize="10" fill="#1A1A1A" fontWeight="bold">E₂ (Far)</text>

      {/* Jupiter & Io */}
      <circle cx="330" cy="110" r="26" fill="#E0DCD2" stroke="#1A1A1A" strokeWidth="2" />
      <text x="315" y="115" fontFamily="Georgia, serif" fontSize="11" fill="#1A1A1A" fontWeight="bold">Jupiter</text>
      <circle cx="330" cy="72" r="5" fill="#EF4444" stroke="#1A1A1A" strokeWidth="1" />
      <text x="340" y="75" fontFamily="Georgia, serif" fontSize="10" fill="#EF4444" fontWeight="bold">Io</text>

      {/* Light travel paths with delay */}
      <AnimLine x1={330} y1={72} x2={165} y2={110} stroke="#D97706" strokeWidth="2" rm={rm} delay={0.1} />
      <AnimLine x1={330} y1={72} x2={35} y2={110} stroke="#D97706" strokeWidth="2" strokeDasharray="4 2" rm={rm} delay={0.3} />

      {/* Formula */}
      <text x="65" y="215" fontFamily="Georgia, serif" fontSize="15" fill="#1A1A1A" fontWeight="bold">c = Δd / Δt = 299,792,458 m/s (Rømer 1676)</text>
    </svg>
  );
}

function AberrationDiagram({ rm }: { rm: boolean }) {
  return (
    <svg viewBox="0 0 400 240" width="340" height="204" fill="none" style={{ backgroundColor: '#FDFBF7', border: '2px solid #1A1A1A', borderRadius: 8 }}>
      {/* Incoming Starlight Vector (c) */}
      <AnimLine x1={200} y1={30} x2={200} y2={150} stroke="#1A1A1A" strokeWidth="2.5" rm={rm} delay={0.1} />
      <polygon points="200,154 195,144 205,144" fill="#1A1A1A" />
      <text x="210" y="90" fontFamily="Georgia, serif" fontSize="13" fill="#1A1A1A" fontWeight="bold">c (Starlight)</text>

      {/* Earth Velocity Vector (v) */}
      <AnimLine x1={200} y1={150} x2={290} y2={150} stroke="#2563EB" strokeWidth="2.5" rm={rm} delay={0.3} />
      <polygon points="294,150 284,145 284,155" fill="#2563EB" />
      <text x="235" y="170" fontFamily="Georgia, serif" fontSize="13" fill="#2563EB" fontWeight="bold">v (Earth)</text>

      {/* Resultant Apparent Angle (Apparent Direction) */}
      <AnimLine x1={200} y1={30} x2={290} y2={150} stroke="#EF4444" strokeWidth="2" strokeDasharray="3 3" rm={rm} delay={0.4} />
      <text x="160" y="55" fontFamily="Georgia, serif" fontSize="13" fill="#EF4444" fontStyle="italic">α (Aberration)</text>

      {/* Formula */}
      <text x="65" y="215" fontFamily="Georgia, serif" fontSize="15" fill="#1A1A1A" fontStyle="italic" fontWeight="bold">tan(α) = v / c · Bradley's Stellar Aberration (1727)</text>
    </svg>
  );
}

function GenericCard({ title, year, people }: { title: string; year: number; people: string[] }) {
  return (
    <svg width="280" height="160" viewBox="0 0 280 160" fill="none" aria-label={`Key discovery: ${title}`}>
      <rect x="20" y="15" width="240" height="130" stroke={STROKE} strokeWidth="1" fill="none" rx="4" />
      <rect x="26" y="21" width="228" height="118" stroke={STROKE_SOFT} strokeWidth="0.5" fill="none" rx="3" opacity="0.4" />
      <text x="140" y="72" textAnchor="middle" fontSize="40" fill={STROKE} fontFamily="serif" fontWeight="700" opacity="0.1">
        {year || '?'}
      </text>
      <text x="140" y="88" textAnchor="middle" fontSize="13" fill={STROKE} fontFamily="serif" fontWeight="600">
        {title.length > 28 ? title.slice(0, 28) + '…' : title}
      </text>
      <text x="140" y="106" textAnchor="middle" fontSize="10" fill={STROKE_SOFT} fontFamily="sans-serif">
        {people.slice(0, 2).join(' · ')}
      </text>
      <line x1="80" y1="118" x2="200" y2="118" stroke={STROKE_SOFT} strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}

// --- Concept → Diagram map ---
const DIAGRAM_MAP: Record<string, React.ComponentType<{ rm: boolean }>> = {
  'refraction': RefractionDiagram,
  'diffraction': DiffractionDiagram,
  'speed-of-light': SpeedOfLightDiagram,
  'aberration': AberrationDiagram,
  'opticks': PrismOpticksDiagram,
  'spectrum': PrismOpticksDiagram,
  'coulomb': CoulombDiagram,
  'double-slit': YoungWaveDiagram,
  'wave': YoungWaveDiagram,
  'photoelectric': PhotoelectricDiagram,
  'bohr': BohrDiagram,
  'uncertainty': UncertaintyDiagram,
  'entanglement': EntanglementDiagram,
  'shor': ShorDiagram,
  'bloch': BlochDiagram,
  'blackbody': BlackbodyDiagram,
  'transistor': TransistorDiagram,
  'error-correction': ErrorCorrectionDiagram,
  'particle': BohrDiagram,
};

export default function DiagramSVG({ concept, eventId, shouldReduceMotion }: DiagramSVGProps) {
  const DiagramComponent = DIAGRAM_MAP[concept];

  return (
    <div className="flex items-center justify-center" style={{ minHeight: 160 }}>
      {DiagramComponent ? (
        <DiagramComponent rm={shouldReduceMotion} />
      ) : (
        <GenericCard title={eventId} year={0} people={[]} />
      )}
    </div>
  );
}