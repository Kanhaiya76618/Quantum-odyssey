'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { QUANTUM_EVENTS, CENTURIES, type QuantumEvent } from '../../content/quantum_timeline';

interface SearchResult {
  event: QuantumEvent;
  centuryLabel: string;
  centuryId: string;
  matchField: 'title' | 'year' | 'keyword';
}

interface DiscoverySearchProps {
  onNavigateToEvent: (event: QuantumEvent) => void;
  isOpen: boolean;
  onClose: () => void;
}

function getCenturyForEvent(event: QuantumEvent): { label: string; id: string } {
  for (const century of CENTURIES) {
    if (century.events.some(e => e.id === event.id)) {
      return { label: century.label, id: century.id };
    }
  }
  return { label: 'Unknown', id: '' };
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} style={{ background: 'rgba(185,196,214,0.45)', color: '#2B2B2B', borderRadius: '2px', padding: '0 1px' }}>
        {part}
      </mark>
    ) : part
  );
}

export default function DiscoverySearch({ onNavigateToEvent, isOpen, onClose }: DiscoverySearchProps) {
  const shouldReduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Search logic
  const runSearch = useCallback((q: string) => {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    const yearNum = parseInt(trimmed, 10);
    const isYearSearch = !isNaN(yearNum) && trimmed.length >= 3;

    const scored: Array<{ event: QuantumEvent; score: number; matchField: SearchResult['matchField'] }> = [];

    for (const event of QUANTUM_EVENTS) {
      let score = 0;
      let matchField: SearchResult['matchField'] = 'keyword';

      // Year match
      if (isYearSearch && String(event.year).startsWith(trimmed)) {
        score += 100;
        matchField = 'year';
      }

      // Title match
      const titleLower = event.title.toLowerCase();
      if (titleLower.includes(trimmed)) {
        score += titleLower.startsWith(trimmed) ? 80 : 60;
        matchField = 'title';
      }

      // People match
      if (event.people.some(p => p.toLowerCase().includes(trimmed))) {
        score += 50;
        matchField = 'keyword';
      }

      // Keyword in discovery/significance
      if (event.discovery.toLowerCase().includes(trimmed)) score += 20;
      if (event.significance.toLowerCase().includes(trimmed)) score += 15;
      if (event.concept.toLowerCase().includes(trimmed)) score += 30;
      if (event.track.toLowerCase().includes(trimmed)) score += 25;

      if (score > 0) {
        scored.push({ event, score, matchField });
      }
    }

    scored.sort((a, b) => b.score - a.score || a.event.year - b.event.year);

    const mapped: SearchResult[] = scored.slice(0, 20).map(({ event, matchField }) => {
      const century = getCenturyForEvent(event);
      return { event, centuryLabel: century.label, centuryId: century.id, matchField };
    });

    setResults(mapped);
    setActiveIndex(0);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    runSearch(val);
  }, [runSearch]);

  const handleSelect = useCallback((result: SearchResult) => {
    onNavigateToEvent(result.event);
    onClose();
  }, [onNavigateToEvent, onClose]);

  // Keyboard navigation within results
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    }
  }, [results, activeIndex, handleSelect, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const panelVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { opacity: 0, y: -12, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
        exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.15 } },
      };

  const trackColor = (track: string) =>
    track === 'computing' ? '#B9C4D6' : '#C9C5BA';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(242,240,234,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="search-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed z-50"
            style={{
              top: '10vh',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(680px, 92vw)',
            }}
          >
            <div
              style={{
                background: '#FDFBF7',
                border: '2px solid #1A1A1A',
                borderRadius: '20px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
                overflow: 'hidden',
              }}
            >
              {/* Search input row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  borderBottom: '2px solid #1A1A1A',
                  background: '#EAE7DF',
                }}
              >
                {/* Search icon */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="7.5" cy="7.5" r="5.5" stroke="#0A0A0A" strokeWidth={1.8} />
                  <line x1="11.5" y1="11.5" x2="16" y2="16" stroke="#0A0A0A" strokeWidth={1.8} strokeLinecap="round" />
                </svg>

                <input
                  ref={inputRef}
                  value={query}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Search 71 quantum events — title, year, or keyword…"
                  style={{
                    flex: 1,
                    background: '#FFFFFF',
                    border: '1.5px solid #1A1A1A',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#0A0A0A',
                    letterSpacing: '0.01em',
                  }}
                  aria-label="Search quantum events"
                  autoComplete="off"
                  spellCheck={false}
                />

                {/* Count badge */}
                {query.trim() && (
                  <span
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '11px',
                      color: '#55524C',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </span>
                )}

                {/* Close / ESC */}
                <button
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(201,197,186,0.6)',
                    borderRadius: '6px',
                    padding: '2px 7px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    color: '#55524C',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                  }}
                  aria-label="Close search"
                >
                  ESC
                </button>
              </div>

              {/* Results list */}
              <div
                ref={listRef}
                style={{
                  maxHeight: '52vh',
                  overflowY: 'auto',
                  padding: results.length > 0 ? '8px 0' : '0',
                }}
              >
                {!query.trim() && (
                  <div
                    style={{
                      padding: '28px 24px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      color: '#55524C',
                      textAlign: 'center',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <div style={{ marginBottom: '8px', opacity: 0.6 }}>
                      Search across all 71 quantum discoveries
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {['double-slit', 'entanglement', '1926', 'Planck', 'Shor', 'computing'].map(hint => (
                        <button
                          key={hint}
                          onClick={() => { setQuery(hint); runSearch(hint); }}
                          style={{
                            background: 'rgba(201,197,186,0.25)',
                            border: '1px solid rgba(201,197,186,0.5)',
                            borderRadius: '20px',
                            padding: '3px 10px',
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '12px',
                            color: '#55524C',
                            cursor: 'pointer',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {query.trim() && results.length === 0 && (
                  <div
                    style={{
                      padding: '28px 24px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      color: '#55524C',
                      textAlign: 'center',
                      opacity: 0.7,
                    }}
                  >
                    No discoveries found for &ldquo;{query}&rdquo;
                  </div>
                )}

                {results.map((result, idx) => (
                  <div
                    key={result.event.id}
                    data-idx={idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      width: '100%',
                      padding: '10px 20px',
                      background: idx === activeIndex ? 'rgba(185,196,214,0.18)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Main clickable area */}
                    <button
                      onClick={() => handleSelect(result)}
                      aria-selected={idx === activeIndex}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: 0,
                      }}
                    >
                      {/* Year badge */}
                      <div
                        style={{
                          flexShrink: 0,
                          width: '52px',
                          fontFamily: '"Playfair Display", Georgia, serif',
                          fontSize: '17px',
                          color: '#2B2B2B',
                          lineHeight: 1.1,
                          paddingTop: '1px',
                        }}
                      >
                        {highlight(String(result.event.year), query)}
                      </div>

                      {/* Main content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#2B2B2B',
                            lineHeight: 1.3,
                            marginBottom: '3px',
                          }}
                        >
                          {highlight(result.event.title, query)}
                        </div>
                        <div
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '12px',
                            color: '#55524C',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {highlight(result.event.discovery.slice(0, 120) + (result.event.discovery.length > 120 ? '…' : ''), query)}
                        </div>
                      </div>

                      {/* Right meta */}
                      <div
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '10px',
                            color: '#55524C',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            opacity: 0.7,
                          }}
                        >
                          {result.centuryLabel}
                        </span>
                        <span
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '10px',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: trackColor(result.event.track),
                            background: `${trackColor(result.event.track)}22`,
                            border: `1px solid ${trackColor(result.event.track)}55`,
                            borderRadius: '10px',
                            padding: '1px 7px',
                          }}
                        >
                          {result.event.track}
                        </span>
                      </div>
                    </button>

                    {/* Enhanced event action links */}
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
                      <a
                        href="/machine-world"
                        onClick={e => e.stopPropagation()}
                        title="Open in Machine World"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 26,
                          height: 26,
                          background: 'rgba(43,43,43,0.06)',
                          border: '1px solid rgba(201,197,186,0.5)',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '12px',
                          color: '#55524C',
                          transition: 'all 0.15s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(43,43,43,0.12)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(43,43,43,0.3)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(43,43,43,0.06)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,197,186,0.5)';
                        }}
                      >
                        ⚛
                      </a>
                      <a
                        href="/circuit-dashboard"
                        onClick={e => e.stopPropagation()}
                        title="Circuit Dashboard"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 26,
                          height: 26,
                          background: 'rgba(43,43,43,0.06)',
                          border: '1px solid rgba(201,197,186,0.5)',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '11px',
                          color: '#55524C',
                          transition: 'all 0.15s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(43,43,43,0.12)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(43,43,43,0.3)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(43,43,43,0.06)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,197,186,0.5)';
                        }}
                      >
                        ◈
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              {results.length > 0 && (
                <div
                  style={{
                    padding: '8px 20px',
                    borderTop: '1px solid rgba(201,197,186,0.4)',
                    display: 'flex',
                    gap: '16px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    color: '#55524C',
                    letterSpacing: '0.05em',
                    opacity: 0.7,
                  }}
                >
                  <span>↑↓ Navigate</span>
                  <span>↵ Open station</span>
                  <span>Esc Close</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
