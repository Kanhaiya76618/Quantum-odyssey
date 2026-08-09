import React, { useState } from 'react';
import { Sun, Search, Menu, X } from 'lucide-react';
import { useCircuitStore } from '../../store/circuitStore';

export default function HeroHeader() {
  const setView = useCircuitStore((s) => s.setView);
  const currentView = useCircuitStore((s) => s.view);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className="relative z-30 flex items-center justify-between px-6 md:px-12 h-16 bg-paper"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      {/* Wordmark */}
      <button
        onClick={() => setView('landing')}
        className="focus-ring bg-transparent border-0 cursor-pointer flex items-center gap-2"
      >
        <span className="text-xl" style={{ color: 'var(--ink)' }}>◈</span>
        <span
          className="font-display text-ink"
          style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          Quantum Odyssey
        </span>
      </button>

      {/* Right nav */}
      <nav className="hidden md:flex items-center gap-5">
        <button
          onClick={() => setView('archive')}
          className={`nav-link-paper focus-ring bg-transparent border-0 cursor-pointer ${currentView === 'archive' ? 'font-bold text-ink' : ''}`}
        >
          Grand Quantum Museum
        </button>
        <button
          onClick={() => setView('machine-world')}
          className={`nav-link-paper focus-ring bg-transparent border-0 cursor-pointer ${currentView === 'machine-world' ? 'font-bold text-ink' : ''}`}
        >
          Machine World
        </button>
        <button
          onClick={() => setView('circuit-dashboard')}
          className={`nav-link-paper focus-ring bg-transparent border-0 cursor-pointer ${currentView === 'circuit-dashboard' ? 'font-bold text-ink' : ''}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setView('builder')}
          className={`nav-link-paper focus-ring bg-transparent border-0 cursor-pointer ${currentView === 'builder' ? 'font-bold text-ink' : ''}`}
        >
          Builder
        </button>
        <button
          onClick={() => setView('city')}
          className={`nav-link-paper focus-ring bg-transparent border-0 cursor-pointer ${currentView === 'city' ? 'font-bold text-ink' : ''}`}
        >
          Qubit City
        </button>

        {/* Search pill */}
        <button
          onClick={() => setView('archive')}
          className="hairline-pill flex items-center gap-2 px-3 py-1.5 focus-ring cursor-pointer bg-transparent"
          aria-label="Search Grand Quantum Museum"
        >
          <Search size={14} className="text-ink-soft" />
          <span
            className="font-body text-ink-soft"
            style={{ fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            Search
          </span>
          <kbd
            className="font-body text-ink-soft"
            style={{ fontSize: '11px', letterSpacing: '0.04em', opacity: 0.7 }}
          >
            ⌘K
          </kbd>
        </button>
      </nav>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden flex items-center justify-center p-2 focus-ring bg-transparent border-0 cursor-pointer"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle navigation"
      >
        {mobileMenuOpen ? <X size={20} className="text-ink" /> : <Menu size={20} className="text-ink" />}
      </button>

      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 z-50 bg-paper border-b border-line p-4 flex flex-col gap-3 md:hidden shadow-lg">
          <button onClick={() => { setView('archive'); setMobileMenuOpen(false); }} className="nav-link-paper text-left py-2 font-bold">Grand Quantum Museum</button>
          <button onClick={() => { setView('machine-world'); setMobileMenuOpen(false); }} className="nav-link-paper text-left py-2">Machine World</button>
          <button onClick={() => { setView('circuit-dashboard'); setMobileMenuOpen(false); }} className="nav-link-paper text-left py-2">Dashboard</button>
          <button onClick={() => { setView('builder'); setMobileMenuOpen(false); }} className="nav-link-paper text-left py-2">Builder</button>
          <button onClick={() => { setView('city'); setMobileMenuOpen(false); }} className="nav-link-paper text-left py-2">Qubit City</button>
        </div>
      )}
    </header>
  );
}
