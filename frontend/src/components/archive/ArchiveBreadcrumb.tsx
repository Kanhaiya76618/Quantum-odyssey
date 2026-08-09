import React from 'react';
import { motion } from 'framer-motion';
import type { ArchiveState } from './ArchiveViewClient';

interface BreadcrumbProps {
  archiveState: ArchiveState;
  onGoToStack: () => void;
  onGoToInsideFromDetail: () => void;
}

export default function ArchiveBreadcrumb({
  archiveState,
  onGoToStack,
  onGoToInsideFromDetail,
}: BreadcrumbProps) {
  const { mode, activeCentury, activeYear } = archiveState;

  if (mode === 'stack') return null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="px-4 py-1.5 flex items-center gap-2 rounded-full border border-[#1A1A1A] bg-[#EAE7DF] shadow-sm"
      aria-label="Archive navigation breadcrumb"
      style={{ whiteSpace: 'nowrap' }}
    >
      <button
        onClick={onGoToStack}
        className="font-body text-[#1A1A1A] font-bold hover:underline focus-ring bg-transparent border-0 cursor-pointer text-xs"
        aria-label="Back to Archive overview"
      >
        Archive
      </button>

      {activeCentury && (
        <>
          <span className="font-body font-bold text-[#1A1A1A] text-xs">›</span>
          <button
            onClick={mode === 'detail' ? onGoToInsideFromDetail : undefined}
            className="font-body text-[#1A1A1A] font-bold hover:underline focus-ring bg-transparent border-0 cursor-pointer text-xs"
          >
            {activeCentury.label}
          </button>
        </>
      )}

      {activeYear && (
        <>
          <span className="font-body font-bold text-[#1A1A1A] text-xs">›</span>
          <span className="font-body text-[#1A1A1A] font-extrabold text-xs">
            {activeYear.year}
          </span>
        </>
      )}
    </motion.nav>
  );
}