import React, { useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import type { QuantumEvent, Century } from '../../content/quantum_timeline';
import { CENTURIES } from '../../content/quantum_timeline';
import DiagramSVG from './DiagramSVG';
import { useCircuitStore } from '../../store/circuitStore';

interface DetailCardProps {
  event: QuantumEvent;
  century: Century;
  onClose: () => void;
  onNavigate: (dir: 'next' | 'prev') => void;
  shouldReduceMotion: boolean;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const cardVariants = {
  hidden: { opacity: 0, x: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 220, damping: 24 },
  },
  exit: {
    opacity: 0,
    x: 40,
    scale: 0.96,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

export default function DetailCard({
  event,
  century,
  onClose,
  onNavigate,
  shouldReduceMotion,
}: DetailCardProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkFlash, setBookmarkFlash] = useState(false);
  const setView = useCircuitStore((s) => s.setView);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('qo_bookmarks');
      if (raw) {
        const set = new Set<string>(JSON.parse(raw));
        setBookmarked(set.has(event.id));
      }
    } catch { /* private mode */ }
  }, [event.id]);

  const toggleBookmark = useCallback(() => {
    try {
      const raw = localStorage.getItem('qo_bookmarks');
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      if (set.has(event.id)) {
        set.delete(event.id);
        setBookmarked(false);
      } else {
        set.add(event.id);
        setBookmarked(true);
        setBookmarkFlash(true);
        setTimeout(() => setBookmarkFlash(false), 400);
      }
      localStorage.setItem('qo_bookmarks', JSON.stringify(Array.from(set)));
    } catch { /* private mode */ }
  }, [event.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        onNavigate('next');
      } else if (e.key === 'ArrowLeft') {
        onNavigate('prev');
      } else if (e.key === 'b' || e.key === 'B') {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          toggleBookmark();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate, toggleBookmark]);

  const eventIndex = century.events.findIndex(e => e.id === event.id);
  const hasPrev = eventIndex > 0;
  const hasNext = eventIndex < century.events.length - 1;

  const allEvents = CENTURIES.flatMap(c => c.events);
  const globalIndex = allEvents.findIndex(e => e.id === event.id);
  const isLastEventEver = globalIndex === allEvents.length - 1;

  return (
    <>
      {/* Dark backdrop scrim */}
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Tactile Paper Manuscript Card */}
      <motion.article
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        variants={shouldReduceMotion ? undefined : cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed top-8 bottom-8 right-6 z-50 bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-2xl shadow-2xl overflow-y-auto p-8 max-w-2xl w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-[#1A1A1A]">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <span
                className="font-display text-[#0A0A0A]"
                style={{
                  fontSize: 'clamp(44px, 6vw, 64px)',
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
                id="detail-title"
              >
                {event.year}
              </span>
              <div className="flex flex-col gap-1">
                <span
                  className="font-body text-[#1A1A1A] font-bold"
                  style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  {century.label}
                </span>
                <span
                  className="font-body text-[#4A4740] font-semibold"
                  style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  TRACK: {event.track}
                </span>
              </div>
            </div>
            <h2
              className="font-display text-[#0A0A0A]"
              style={{
                fontSize: 'clamp(20px, 2.5vw, 28px)',
                fontWeight: 700,
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
                maxWidth: '520px',
              }}
            >
              {event.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Bookmark button */}
            <motion.button
              onClick={toggleBookmark}
              animate={bookmarkFlash ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full focus-ring cursor-pointer"
              style={{
                background: bookmarked ? '#FEF3C7' : '#EAE7DF',
                border: `1.5px solid ${bookmarked ? '#D97706' : '#1A1A1A'}`,
                fontSize: '18px',
                color: bookmarked ? '#D97706' : '#1A1A1A',
              }}
              aria-label={bookmarked ? 'Remove bookmark (B)' : 'Bookmark this event (B)'}
              title={bookmarked ? 'Remove bookmark (B)' : 'Bookmark this event (B)'}
            >
              {bookmarked ? '★' : '☆'}
            </motion.button>

            <button
              onClick={onClose}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full focus-ring cursor-pointer"
              style={{
                background: '#EAE7DF',
                border: '1.5px solid #1A1A1A',
                fontSize: '16px',
                color: '#1A1A1A',
                fontWeight: 700,
              }}
              aria-label="Close detail card (Esc)"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Bookmark status pill */}
        {bookmarked && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 bg-amber-100 border border-amber-500 rounded-full text-xs font-semibold text-amber-900"
          >
            ★ Bookmarked in Quantum Archive
          </motion.div>
        )}

        {/* Scientists / People */}
        {event.people.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {event.people.map(person => (
              <span
                key={`person-${event.id}-${person.replace(/\s/g, '-')}`}
                className="font-body text-[#1A1A1A] font-medium"
                style={{
                  fontSize: '13px',
                  padding: '4px 12px',
                  border: '1px solid #1A1A1A',
                  borderRadius: '999px',
                  backgroundColor: '#EAE7DF',
                }}
              >
                {person}
              </span>
            ))}
          </div>
        )}

        {/* Diagram Box */}
        <div
          className="mb-6 flex justify-center rounded-xl p-4 border border-[#1A1A1A]"
          style={{
            background: '#F5F2EA',
          }}
        >
          <DiagramSVG
            concept={event.concept}
            eventId={event.id}
            shouldReduceMotion={shouldReduceMotion}
          />
        </div>

        {/* Deep Text Sections */}
        <div className="flex flex-col gap-6">
          <DetailSection label="What was discovered" content={event.discovery} />
          <DetailSection label="The evidence" content={event.evidence} />
          <DetailSection label="Why it matters" content={event.significance} />
        </div>

        {/* Navigation Footer */}
        <footer className="flex items-center justify-between mt-8 pt-6 border-t-2 border-[#1A1A1A]">
          <button
            onClick={() => onNavigate('prev')}
            disabled={!hasPrev}
            className="font-body text-[#1A1A1A] font-semibold focus-ring flex items-center gap-2 bg-transparent border-0 cursor-pointer disabled:opacity-30 disabled:cursor-default"
            style={{ fontSize: '14px', minHeight: '44px' }}
          >
            ← Previous
          </button>

          <span className="font-body text-[#1A1A1A] font-semibold text-xs uppercase tracking-wider">
            {eventIndex + 1} of {century.events.length}
          </span>

          {isLastEventEver ? (
            <button
              onClick={() => setView('machine-world')}
              className="ink-pill px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Step into Machine World →
            </button>
          ) : hasNext ? (
            <button
              onClick={() => onNavigate('next')}
              className="font-body text-[#1A1A1A] font-semibold focus-ring flex items-center gap-2 bg-transparent border-0 cursor-pointer"
              style={{ fontSize: '14px', minHeight: '44px' }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="font-body text-[#1A1A1A] font-semibold bg-transparent border-0 cursor-pointer"
              style={{ fontSize: '14px' }}
            >
              Close
            </button>
          )}
        </footer>

        {/* Action pills */}
        <div className="mt-6 pt-4 border-t border-[#1A1A1A] flex flex-wrap gap-3">
          <button
            onClick={() => setView('machine-world')}
            className="hairline-pill px-3 py-1.5 text-xs font-semibold text-[#1A1A1A] bg-[#EAE7DF] border border-[#1A1A1A] rounded-full cursor-pointer flex items-center gap-1.5"
          >
            <span>⚛</span> Open in Machine World
          </button>
          <button
            onClick={() => setView('circuit-dashboard')}
            className="hairline-pill px-3 py-1.5 text-xs font-semibold text-[#1A1A1A] bg-[#EAE7DF] border border-[#1A1A1A] rounded-full cursor-pointer flex items-center gap-1.5"
          >
            <span>◈</span> Circuit Dashboard
          </button>
          <button
            onClick={() => setView('builder')}
            className="hairline-pill px-3 py-1.5 text-xs font-semibold text-[#1A1A1A] bg-[#EAE7DF] border border-[#1A1A1A] rounded-full cursor-pointer flex items-center gap-1.5"
          >
            <span>⚡</span> Circuit Builder
          </button>
        </div>
      </motion.article>
    </>
  );
}

function DetailSection({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <h3
        className="font-body text-[#1A1A1A] mb-2 font-bold uppercase tracking-wider text-xs"
      >
        {label}
      </h3>
      <p
        className="font-body text-[#1A1A1A] leading-relaxed text-sm max-w-prose"
      >
        {content}
      </p>
    </div>
  );
}