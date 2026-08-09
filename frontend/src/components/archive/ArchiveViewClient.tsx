import React, { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CENTURIES, type Century, type QuantumEvent } from '../../content/quantum_timeline';
import ArchiveBreadcrumb from './ArchiveBreadcrumb';
import DetailCard from './DetailCard';
import BackButton from './BackButton';
import DiscoverySearch from './DiscoverySearch';
import ArchiveCanvas from './ArchiveCanvas';

export type ArchiveMode = 'stack' | 'inside' | 'detail';

export interface ArchiveState {
  mode: ArchiveMode;
  activeCentury: Century | null;
  activeYear: QuantumEvent | null;
  visitedIds: Set<string>;
  selectedCenturyIndex: number;
  selectedStationIndex: number;
}

// ─── Archive stats ────────────────────────────────────────────────────────────
const TOTAL_EVENTS = CENTURIES.reduce((sum, c) => sum + c.events.length, 0);
const TOTAL_CENTURIES = CENTURIES.length;

// ─── Ambient glow orbs ───────────────────────────────────────────────────────
function AmbientOrbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }} aria-hidden="true">
      {/* Top-left warm glow */}
      <div style={{
        position: 'absolute',
        top: -120,
        left: -80,
        width: 480,
        height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(185,156,80,0.07) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      {/* Bottom-right cool glow */}
      <div style={{
        position: 'absolute',
        bottom: -100,
        right: -60,
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(100,130,180,0.06) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      {/* Center subtle vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(200,195,180,0.12) 100%)',
      }} />
    </div>
  );
}

// ─── Archive header bar ───────────────────────────────────────────────────────
function ArchiveHeaderBar({
  archiveState,
  onSearchOpen,
}: {
  archiveState: ArchiveState;
  onSearchOpen: () => void;
}) {
  const totalVisited = archiveState.visitedIds.size;
  const progressPct = TOTAL_EVENTS > 0 ? (totalVisited / TOTAL_EVENTS) * 100 : 0;

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      role="banner"
      aria-label="Quantum Archive navigation"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 35,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(12px, 3vw, 24px)',
        background: '#EAE7DF',
        borderBottom: '2px solid #1A1A1A',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Left: Logo + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#1A1A1A',
            border: '1.5px solid #1A1A1A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#F2F0EA',
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          ◈
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 'clamp(14px, 2.5vw, 16px)', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.01em', lineHeight: 1 }}>
            Grand Quantum Museum
          </div>
          <div style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 11, fontWeight: 700, color: '#2B2B2B', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
            <span className="hidden sm:inline">{TOTAL_CENTURIES} Centuries · {TOTAL_EVENTS} Discoveries</span>
            <span className="sm:hidden">{TOTAL_CENTURIES}C · {TOTAL_EVENTS}D</span>
          </div>
        </div>
      </div>

      {/* Center: Progress bar */}
      <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 11, fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Explored
        </span>
        <div
          role="progressbar"
          aria-valuenow={totalVisited}
          aria-valuemin={0}
          aria-valuemax={TOTAL_EVENTS}
          aria-label={`${totalVisited} of ${TOTAL_EVENTS} discoveries explored`}
          style={{ width: 140, height: 6, background: '#C9C5BA', borderRadius: 3, overflow: 'hidden', border: '1px solid #1A1A1A' }}
        >
          <motion.div
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ height: '100%', background: '#1A1A1A', borderRadius: 3 }}
          />
        </div>
        <span style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 11, fontWeight: 800, color: '#0A0A0A', minWidth: 32 }}>
          {totalVisited}/{TOTAL_EVENTS}
        </span>
      </div>

      {/* Right: Mode indicator + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Mode pill */}
        <div
          className="hidden md:flex"
          aria-live="polite"
          style={{
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            background: '#FDFBF7',
            border: '1.5px solid #1A1A1A',
            borderRadius: 999,
          }}
        >
          <div aria-hidden="true" style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#1A1A1A',
          }} />
          <span style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 11, fontWeight: 700, color: '#0A0A0A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {archiveState.mode === 'stack' ? 'Overview' : archiveState.mode === 'inside' ? archiveState.activeCentury?.range ?? 'Century' : 'Discovery'}
          </span>
        </div>

        {/* Search button */}
        <motion.button
          onClick={onSearchOpen}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Open discovery search (Cmd+K)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: '#FDFBF7',
            border: '1.5px solid #1A1A1A',
            borderRadius: 20,
            cursor: 'pointer',
            fontFamily: 'var(--font-body, Inter, sans-serif)',
            fontSize: 12,
            fontWeight: 800,
            color: '#0A0A0A',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            minHeight: 40,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <circle cx={5} cy={5} r={3.5} stroke="#0A0A0A" strokeWidth={1.6} />
            <line x1={7.5} y1={7.5} x2={10.5} y2={10.5} stroke="#0A0A0A" strokeWidth={1.6} strokeLinecap="round" />
          </svg>
          <span>Search</span>
          <span className="hidden sm:inline" aria-hidden="true" style={{ padding: '2px 6px', background: '#EAE7DF', border: '1px solid #1A1A1A', borderRadius: 4, fontSize: 10, fontWeight: 700, color: '#0A0A0A' }}>⌘K</span>
        </motion.button>
      </div>
    </motion.header>
  );
}

// ─── Century progress strip (shown in stack mode) ─────────────────────────────
function CenturyProgressStrip({
  archiveState,
  onEnterCentury,
}: {
  archiveState: ArchiveState;
  onEnterCentury: (c: Century) => void;
}) {
  if (archiveState.mode !== 'stack') return null;

  return (
    <motion.nav
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.35, delay: 0.3 }}
      aria-label="Century navigation"
      style={{
        position: 'absolute',
        left: 16,
        bottom: 60,
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '14px 14px',
        background: '#FDFBF7',
        border: '2px solid #1A1A1A',
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        minWidth: 160,
        maxHeight: 'calc(100vh - 160px)',
        overflowY: 'auto',
      }}
    >
      <div style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0A0A0A', marginBottom: 4, paddingBottom: 6, borderBottom: '1px solid #1A1A1A' }}>
        Centuries
      </div>
      {CENTURIES.map((century, idx) => {
        const visitedInCentury = century.events.filter(e => archiveState.visitedIds.has(e.id)).length;
        const pct = century.events.length > 0 ? visitedInCentury / century.events.length : 0;
        const isSelected = archiveState.selectedCenturyIndex === idx;
        return (
          <motion.button
            key={century.id}
            onClick={() => onEnterCentury(century)}
            whileHover={{ x: 3 }}
            aria-label={`Enter ${century.range} — ${visitedInCentury} of ${century.events.length} events explored`}
            aria-pressed={isSelected}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: isSelected ? '#EAE7DF' : 'transparent',
              border: isSelected ? '1.5px solid #1A1A1A' : '1.5px solid transparent',
              borderRadius: 10,
              padding: '6px 10px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              minHeight: 40,
            }}
          >
            {/* Mini progress ring */}
            <div style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }} aria-hidden="true">
              <svg width={20} height={20} viewBox="0 0 20 20">
                <circle cx={10} cy={10} r={8} fill="none" stroke="#C9C5BA" strokeWidth={2} />
                <circle
                  cx={10} cy={10} r={8}
                  fill="none"
                  stroke={pct > 0.7 ? '#10B981' : pct > 0.3 ? '#D97706' : '#1A1A1A'}
                  strokeWidth={2.5}
                  strokeDasharray={`${pct * 50.27} 50.27`}
                  strokeLinecap="round"
                  transform="rotate(-90 10 10)"
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 12, fontWeight: 800, color: '#0A0A0A', lineHeight: 1.1, marginBottom: 2, whiteSpace: 'nowrap' }}>
                {century.range}
              </div>
              <div style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 10, fontWeight: 700, color: '#2B2B2B' }}>
                {visitedInCentury}/{century.events.length} explored
              </div>
            </div>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

// ─── Inside-century event strip ───────────────────────────────────────────────
function InsideEventStrip({
  archiveState,
  onOpenEvent,
}: {
  archiveState: ArchiveState;
  onOpenEvent: (e: QuantumEvent) => void;
}) {
  if (archiveState.mode !== 'inside' || !archiveState.activeCentury) return null;
  const events = archiveState.activeCentury.events;

  return (
    <motion.nav
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.35 }}
      aria-label={`Events in ${archiveState.activeCentury.range}`}
      style={{
        position: 'absolute',
        bottom: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        display: 'flex',
        gap: 6,
        padding: '10px 14px',
        background: 'rgba(242,240,234,0.82)',
        backdropFilter: 'blur(16px) saturate(130%)',
        border: '1px solid rgba(201,197,186,0.55)',
        borderRadius: 14,
        boxShadow: '0 4px 24px rgba(43,43,43,0.1)',
        maxWidth: 'calc(100vw - 40px)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {events.map((event, idx) => {
        const isVisited = archiveState.visitedIds.has(event.id);
        const isSelected = archiveState.selectedStationIndex === idx;
        return (
          <motion.button
            key={event.id}
            onClick={() => onOpenEvent(event)}
            whileHover={{ y: -2 }}
            aria-label={`${event.year}: ${event.title}${isVisited ? ' (visited)' : ''}`}
            aria-pressed={isSelected}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 10px',
              background: isSelected ? 'rgba(43,43,43,0.09)' : isVisited ? 'rgba(185,156,80,0.08)' : 'transparent',
              border: isSelected ? '1px solid rgba(43,43,43,0.18)' : isVisited ? '1px solid rgba(185,156,80,0.3)' : '1px solid transparent',
              borderRadius: 8,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s',
              minWidth: 52,
              minHeight: 44,
            }}
          >
            <span style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 13, fontWeight: 700, color: isVisited ? '#B99C50' : 'var(--ink)', lineHeight: 1 }}>
              {event.year}
            </span>
            <div aria-hidden="true" style={{ width: 4, height: 4, borderRadius: '50%', background: isVisited ? '#B99C50' : isSelected ? 'var(--ink)' : 'rgba(43,43,43,0.2)', transition: 'background 0.2s' }} />
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default function ArchiveViewClient() {
  const shouldReduceMotion = useReducedMotion();
  const [hoveredCentury, setHoveredCentury] = useState<Century | null>(null);
  const tooltipRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [searchOpen, setSearchOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const [archiveState, setArchiveState] = useState<ArchiveState>({
    mode: 'stack',
    activeCentury: null,
    activeYear: null,
    visitedIds: new Set(),
    selectedCenturyIndex: 0,
    selectedStationIndex: 0,
  });

  const enterCentury = useCallback((century: Century) => {
    setArchiveState(prev => ({
      ...prev,
      mode: 'inside',
      activeCentury: century,
      activeYear: null,
      selectedStationIndex: 0,
    }));
    setHoveredCentury(null);
  }, []);

  const openEvent = useCallback((event: QuantumEvent) => {
    setArchiveState(prev => ({
      ...prev,
      mode: 'detail',
      activeYear: event,
      visitedIds: new Set([...prev.visitedIds, event.id]),
    }));
  }, []);

  const closeDetail = useCallback(() => {
    setArchiveState(prev => ({ ...prev, mode: 'inside', activeYear: null }));
  }, []);

  const goToStack = useCallback(() => {
    setArchiveState(prev => ({
      ...prev,
      mode: 'stack',
      activeCentury: null,
      activeYear: null,
    }));
  }, []);

  const goToInsideFromDetail = useCallback(() => {
    setArchiveState(prev => ({ ...prev, mode: 'inside', activeYear: null }));
  }, []);

  const navigateEvent = useCallback((direction: 'prev' | 'next') => {
    setArchiveState(prev => {
      if (!prev.activeCentury || !prev.activeYear) return prev;
      const events = prev.activeCentury.events;
      const idx = events.findIndex(e => e.id === prev.activeYear!.id);
      const nextIdx = direction === 'next'
        ? Math.min(idx + 1, events.length - 1)
        : Math.max(idx - 1, 0);
      const nextEvent = events[nextIdx];
      return {
        ...prev,
        activeYear: nextEvent,
        selectedStationIndex: nextIdx,
        visitedIds: new Set([...prev.visitedIds, nextEvent.id]),
      };
    });
  }, []);

  // Navigate to an event from search: find its century, enter it, then open the event
  const navigateToEventFromSearch = useCallback((event: QuantumEvent) => {
    const century = CENTURIES.find(c => c.events.some(e => e.id === event.id));
    if (!century) return;
    setArchiveState(prev => ({
      ...prev,
      mode: 'detail',
      activeCentury: century,
      activeYear: event,
      visitedIds: new Set([...prev.visitedIds, event.id]),
      selectedStationIndex: century.events.findIndex(e => e.id === event.id),
    }));
  }, []);

  // Global keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Open search with Cmd/Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      // Close search with Escape (handled inside DiscoverySearch too)
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        return;
      }

      const { mode, activeCentury, activeYear, selectedCenturyIndex, selectedStationIndex } = archiveState;

      if (mode === 'stack') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const newIdx = Math.min(selectedCenturyIndex + 1, CENTURIES.length - 1);
          setArchiveState(prev => ({ ...prev, selectedCenturyIndex: newIdx }));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const newIdx = Math.max(selectedCenturyIndex - 1, 0);
          setArchiveState(prev => ({ ...prev, selectedCenturyIndex: newIdx }));
        } else if (e.key === 'Enter') {
          enterCentury(CENTURIES[selectedCenturyIndex]);
        }
      } else if (mode === 'inside' && activeCentury) {
        const events = activeCentury.events;
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const newIdx = Math.min(selectedStationIndex + 1, events.length - 1);
          setArchiveState(prev => ({ ...prev, selectedStationIndex: newIdx }));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const newIdx = Math.max(selectedStationIndex - 1, 0);
          setArchiveState(prev => ({ ...prev, selectedStationIndex: newIdx }));
        } else if (e.key === 'Enter') {
          openEvent(events[selectedStationIndex]);
        } else if (e.key === 'Escape') {
          goToStack();
        }
      } else if (mode === 'detail') {
        if (e.key === 'Escape') {
          closeDetail();
        } else if (e.key === 'ArrowLeft') {
          navigateEvent('prev');
        } else if (e.key === 'ArrowRight') {
          navigateEvent('next');
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [archiveState, enterCentury, openEvent, closeDetail, goToStack, navigateEvent, searchOpen]);

  // Track mouse for tooltip
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      tooltipRef.current = { x: e.clientX, y: e.clientY };
      setTooltipPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const modeLabel = archiveState.mode === 'stack' ?'Archive overview — select a century to explore'
    : archiveState.mode === 'inside'
    ? `Inside ${archiveState.activeCentury?.range ?? 'century'} — select an event`
    : `Viewing: ${archiveState.activeYear?.title ?? 'discovery'}`;

  return (
    <main
      ref={mainRef}
      className="relative w-full h-screen min-h-screen overflow-hidden"
      style={{ background: '#F2F0EA' }}
      aria-label="Quantum Archive 3D Scene"
    >
      {/* Screen reader live region for mode changes */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {modeLabel}
      </div>

      {/* Ambient glow orbs */}
      <AmbientOrbs />

      {/* 3D Canvas */}
      <Suspense fallback={null}>
        <ArchiveCanvas
          archiveState={archiveState}
          onEnterCentury={enterCentury}
          onOpenEvent={openEvent}
          onHoverCentury={setHoveredCentury}
        />
      </Suspense>

      {/* ── Enhanced header bar ── */}
      <ArchiveHeaderBar archiveState={archiveState} onSearchOpen={() => setSearchOpen(true)} />

      {/* Back / Home button — below header, left */}
      <div className="absolute left-4 z-40" style={{ top: 64 }}>
        <BackButton archiveState={archiveState} onGoToStack={goToStack} />
      </div>

      {/* Breadcrumb — below header, center */}
      <div className="absolute left-1/2 z-40" style={{ top: 64, transform: 'translateX(-50%)' }}>
        <ArchiveBreadcrumb
          archiveState={archiveState}
          onGoToStack={goToStack}
          onGoToInsideFromDetail={goToInsideFromDetail}
        />
      </div>

      {/* ── Century progress strip (stack mode) ── */}
      <AnimatePresence>
        {archiveState.mode === 'stack' && (
          <CenturyProgressStrip
            key="century-strip"
            archiveState={archiveState}
            onEnterCentury={enterCentury}
          />
        )}
      </AnimatePresence>

      {/* ── Inside event strip ── */}
      <AnimatePresence>
        {archiveState.mode === 'inside' && (
          <InsideEventStrip
            key="event-strip"
            archiveState={archiveState}
            onOpenEvent={openEvent}
          />
        )}
      </AnimatePresence>

      {/* ── Bottom status bar ── */}
      <motion.footer
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        aria-label="Archive status and keyboard shortcuts"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 44,
          zIndex: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(12px, 3vw, 24px)',
          background: '#EAE7DF',
          borderTop: '2px solid #1A1A1A',
        }}
      >
        {/* Left: keyboard hints */}
        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 12 }}>
          <AnimatePresence mode="wait">
            {archiveState.mode === 'stack' && (
              <motion.div key="hint-stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {[['↑↓', 'Select'], ['Enter', 'Descend'], ['Click', 'Enter']].map(([key, label]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <kbd style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 10, fontWeight: 700, color: '#0A0A0A', background: '#FDFBF7', border: '1px solid #1A1A1A', borderRadius: 4, padding: '2px 6px' }}>{key}</kbd>
                    <span style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 10, fontWeight: 700, color: '#2B2B2B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
                  </div>
                ))}
              </motion.div>
            )}
            {archiveState.mode === 'inside' && (
              <motion.div key="hint-inside" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {[['←→', 'Navigate'], ['Enter', 'Open'], ['Esc', 'Back']].map(([key, label]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <kbd style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 10, fontWeight: 700, color: '#0A0A0A', background: '#FDFBF7', border: '1px solid #1A1A1A', borderRadius: 4, padding: '2px 6px' }}>{key}</kbd>
                    <span style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 10, fontWeight: 700, color: '#2B2B2B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
                  </div>
                ))}
              </motion.div>
            )}
            {archiveState.mode === 'detail' && (
              <motion.div key="hint-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {[['←→', 'Navigate'], ['B', 'Bookmark'], ['Esc', 'Close']].map(([key, label]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <kbd style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 10, fontWeight: 700, color: '#0A0A0A', background: '#FDFBF7', border: '1px solid #1A1A1A', borderRadius: 4, padding: '2px 6px' }}>{key}</kbd>
                    <span style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 10, fontWeight: 700, color: '#2B2B2B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile touch hint */}
        <div className="flex sm:hidden" style={{ alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 10, fontWeight: 700, color: '#0A0A0A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {archiveState.mode === 'stack' ? 'Tap century to enter' : archiveState.mode === 'inside' ? 'Swipe or tap events' : 'Swipe to navigate'}
          </span>
        </div>

        {/* Right: century/event context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {archiveState.activeCentury && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A1A1A' }} />
              <span style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 11, fontWeight: 700, color: '#0A0A0A', letterSpacing: '0.04em' }}>
                <span className="hidden sm:inline">{archiveState.activeCentury.range} · {archiveState.activeCentury.events.length} events</span>
                <span className="sm:hidden">{archiveState.activeCentury.range}</span>
              </span>
            </div>
          )}
          {archiveState.activeYear && (
            <>
              <span aria-hidden="true" style={{ color: '#1A1A1A', fontSize: 12, fontWeight: 800 }}>·</span>
              <span style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 13, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
                <span className="hidden sm:inline">{archiveState.activeYear.year} — {archiveState.activeYear.title.slice(0, 40)}{archiveState.activeYear.title.length > 40 ? '…' : ''}</span>
                <span className="sm:hidden">{archiveState.activeYear.year}</span>
              </span>
            </>
          )}
          {!archiveState.activeCentury && (
            <span style={{ fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: 11, fontWeight: 700, color: '#0A0A0A', letterSpacing: '0.04em' }}>
              <span className="hidden sm:inline">{TOTAL_CENTURIES} centuries of quantum history</span>
              <span className="sm:hidden">{TOTAL_CENTURIES} centuries</span>
            </span>
          )}
        </div>
      </motion.footer>

      {/* Hover tooltip for century blocks */}
      <AnimatePresence>
        {hoveredCentury && archiveState.mode === 'stack' && (
          <motion.div
            key="century-tooltip"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="tooltip"
            className="pointer-events-none fixed z-50 breadcrumb-glass px-3 py-2 font-body text-ink"
            style={{
              left: tooltipPos.x + 16,
              top: tooltipPos.y - 12,
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
          >
            Enter the {hoveredCentury.range} — {hoveredCentury.count} discoveries
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail card overlay */}
      <AnimatePresence>
        {archiveState.mode === 'detail' && archiveState.activeYear && (
          <DetailCard
            key={archiveState.activeYear.id}
            event={archiveState.activeYear}
            century={archiveState.activeCentury!}
            onClose={closeDetail}
            onNavigate={navigateEvent}
            shouldReduceMotion={!!shouldReduceMotion}
          />
        )}
      </AnimatePresence>

      {/* Discovery search panel */}
      <DiscoverySearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigateToEvent={navigateToEventFromSearch}
      />

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}