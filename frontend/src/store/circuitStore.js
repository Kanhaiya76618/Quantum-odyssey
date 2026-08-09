import { create } from "zustand";
import { simulate } from "../api/client";

export const NUM_COLS = 12;
export const MAX_QUBITS = 5;

const PARAM_GATES = new Set(["rx", "ry", "rz", "p"]);
// multi-qubit gates: the sequence of roles the user places, in click order
const MULTI = {
  cx: ["control", "target"],
  cz: ["control", "target"],
  swap: ["target", "target"],
  ccx: ["control", "control", "target"],
};

const makeGrid = (n) => Array.from({ length: n }, () => Array(NUM_COLS).fill(null));

const loadVisited = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem("qo.visited") || "[]"));
  } catch {
    return new Set();
  }
};
const saveVisited = (set_) => {
  try {
    localStorage.setItem("qo.visited", JSON.stringify([...set_]));
  } catch {
    /* private mode */
  }
};

let opCounter = 0;
let debounceTimer = null;
let shakeTimer = null;
let noticeTimer = null;
let runSeq = 0;

export const useCircuitStore = create((set, get) => {
  const scheduleRun = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => get().run(), 300);
  };

  const flashShake = (q, col) => {
    clearTimeout(shakeTimer);
    set({ shake: { q, col } });
    shakeTimer = setTimeout(() => set({ shake: null }), 350);
  };

  const flashNotice = (q, col, msg) => {
    clearTimeout(noticeTimer);
    set({ notice: { q, col, msg } });
    noticeTimer = setTimeout(() => set({ notice: null }), 1200);
  };

  const commitOp = (name, cells, params = []) => {
    const opId = ++opCounter;
    const grid = get().grid.map((row) => row.slice());
    cells.forEach(({ q, col, role }) => {
      grid[q][col] = { name, role, opId, ...(params.length ? { params } : {}) };
    });
    set({ grid });
    scheduleRun();
  };

  return {
    numQubits: 2,
    grid: makeGrid(2),
    selectedGate: "h",
    view: "landing", // 'landing' | 'builder' | 'city'
    pending: null, // in-progress multi-qubit op: {name, roles, cells:[{q,col,role}]}
    paramRequest: null, // {name, q, col} while ParamModal is open
    results: null,
    error: null,
    loading: false,
    shake: null, // {q, col} transient invalid-click flash
    notice: null, // {q, col, msg} transient tooltip

    isGridEmpty: () => get().grid.every((row) => row.every((c) => !c)),

    setSelectedGate: (name) => set({ selectedGate: name, pending: null, paramRequest: null }),

    setView: (view) => set({ view }),

    era: "city", // 'city' | 'wave' | 'schrodinger'
    pendingEra: null,
    travelTo: (era) => {
      if (get().era !== era && !get().pendingEra) set({ pendingEra: era });
    },
    commitEra: () => {
      const e = get().pendingEra;
      if (e) set({ era: e, pendingEra: null });
    },
    builderFocus: false,
    setBuilderFocus: (builderFocus) => set({ builderFocus }),

    quality: "balanced", // 'cinema' | 'balanced' | 'lite'
    setQuality: (quality) => set({ quality }),

    runPulse: 0, // ui beat: user pressed Run ▶ (medium core pulse); run() itself untouched
    pingRun: () => set((s) => ({ runPulse: s.runPulse + 1 })),

    boxCollapsed: false, // schrodinger era ui
    setBoxCollapsed: (boxCollapsed) => set({ boxCollapsed }),
    restoreTick: 0,
    requestRestore: () => set((s) => ({ restoreTick: s.restoreTick + 1, boxCollapsed: false })),

    setScriptedNarration: (text) =>
      set((s) => ({ eigen: { ...s.eigen, text, referencedGates: [], referencedAt: 0 } })),

    // ---- The Journey (timeline) — additive ui slice ----
    journey: { activeId: null, hoveredId: null, filter: "all", query: "", visited: loadVisited(), pendingAct: null },
    openEvent: (id) =>
      set((s) => {
        const visited = new Set(s.journey.visited);
        visited.add(id);
        saveVisited(visited);
        return { journey: { ...s.journey, activeId: id, visited } };
      }),
    closeEvent: () => set((s) => ({ journey: { ...s.journey, activeId: null } })),
    markVisited: (id) =>
      set((s) => {
        if (s.journey.visited.has(id)) return {};
        const visited = new Set(s.journey.visited);
        visited.add(id);
        saveVisited(visited);
        return { journey: { ...s.journey, visited } };
      }),
    setJourneyFilter: (filter) => set((s) => ({ journey: { ...s.journey, filter } })),
    setJourneyQuery: (query) => set((s) => ({ journey: { ...s.journey, query } })),
    setJourneyHover: (hoveredId) => set((s) => ({ journey: { ...s.journey, hoveredId } })),
    journeyToAct: (actId) => set((s) => ({ view: "journey", journey: { ...s.journey, pendingAct: actId } })),
    clearPendingAct: () => set((s) => ({ journey: { ...s.journey, pendingAct: null } })),

    // ---- Eigen (additive; narration is derived ONLY from simulation results) ----
    eigen: { text: "", loading: false, typing: false, referencedGates: [], referencedAt: 0 },

    eigenSetTyping: (typing) => set((s) => ({ eigen: { ...s.eigen, typing } })),

    // opId -> index in serialize().gates (same column-major, min-qubit-first order)
    opIndexByOpId: () => {
      const { grid, numQubits } = get();
      const map = {};
      let idx = 0;
      for (let col = 0; col < NUM_COLS; col++) {
        const seen = new Set();
        for (let q = 0; q < numQubits; q++) {
          const cell = grid[q][col];
          if (!cell || seen.has(cell.opId)) continue;
          seen.add(cell.opId);
          map[cell.opId] = idx++;
        }
      }
      return map;
    },

    eigenNarrate: () => {
      const { results } = get();
      if (!results) {
        set((s) => ({
          eigen: { ...s.eigen, text: "I am Eigen. Place gates on the rails and I will narrate the state as it evolves.", referencedGates: [], referencedAt: 0 },
        }));
        return;
      }
      const gates = get().serialize().gates;
      const refs = [];
      const parts = [];
      gates.forEach((g, i) => {
        if (g.name === "h") { parts.push(`H opens q${g.targets[0]} into superposition`); refs.push(i); }
        else if (g.name === "cx") { parts.push(`CX entangles q${g.controls[0]}→q${g.targets[0]}`); refs.push(i); }
        else if (g.name === "ccx") { parts.push(`CCX flips q${g.targets[0]} only when q${g.controls.join(" and q")} agree`); refs.push(i); }
        else if (g.name === "swap") { parts.push(`SWAP trades q${g.targets[0]}↔q${g.targets[1]}`); refs.push(i); }
      });
      const top = Object.entries(results.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const dist = top.map(([b, p]) => `|${b}⟩ at ${(p * 100).toFixed(1)}%`).join(", ");
      const entangled =
        results.bloch.length > 1 && top.length > 1 && results.bloch.every((v) => Math.hypot(v.x, v.y, v.z) < 0.05);
      let text = parts.length ? parts.slice(0, 2).join("; ") + ". " : "";
      text += `The statevector gives ${dist}.`;
      if (entangled) text += " Every Bloch vector has collapsed to the origin — the qubits now share one entangled state.";
      set((s) => ({ eigen: { ...s.eigen, text, referencedGates: refs, referencedAt: Date.now() } }));
    },

    eigenAsk: (question) => {
      const { results } = get();
      const q = question.toLowerCase();
      if (!results) {
        set((s) => ({ eigen: { ...s.eigen, text: "There is nothing to measure yet — place a gate and I will explain what the simulation says.", referencedGates: [], referencedAt: 0 } }));
        return;
      }
      const gates = get().serialize().gates;
      const allRefs = gates.map((_, i) => i);
      const causal = gates.map((g, i) => (["h", "cx", "cz", "ccx"].includes(g.name) ? i : -1)).filter((i) => i >= 0);
      const top = Object.entries(results.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const dist = top.map(([b, p]) => `|${b}⟩ ${(p * 100).toFixed(1)}%`).join(" · ");
      let text;
      let refs;
      if (/(why|prob|chance|percent|50|split)/.test(q)) {
        text = `The split comes straight from the amplitudes: ${dist}. Hadamard puts equal weight on both branches, and every control gate ties outcomes together, so only the correlated ones survive measurement.`;
        refs = causal.length ? causal : allRefs;
      } else if (/(bloch|arrow|sphere|vector)/.test(q)) {
        text = "Bloch vectors: " + results.bloch.map((v) => `q${v.qubit} (${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`).join("; ") + ". A vector at the origin means that qubit alone carries no definite state.";
        refs = [];
      } else if (/entang/.test(q)) {
        const mixed = results.bloch.filter((v) => Math.hypot(v.x, v.y, v.z) < 0.05).map((v) => `q${v.qubit}`);
        text = mixed.length >= 2 ? `Yes — ${mixed.join(" and ")} are maximally mixed on their own yet perfectly correlated together. That correlation is entanglement.` : "Not yet — each qubit still has its own definite Bloch vector.";
        refs = causal;
      } else {
        text = `Right now the circuit is ${results.gate_count} gate(s) deep on ${results.num_qubits} qubit(s), giving ${dist}.`;
        refs = allRefs;
      }
      set((s) => ({ eigen: { ...s.eigen, text, referencedGates: refs, referencedAt: Date.now() } }));
    },

    setNumQubits: (n) => {
      set({ numQubits: n, grid: makeGrid(n), pending: null, paramRequest: null });
      scheduleRun();
    },

    clearAll: () => {
      set({ grid: makeGrid(get().numQubits), pending: null, paramRequest: null });
      scheduleRun();
    },

    cancelPending: () => set({ pending: null, paramRequest: null }),

    removeOp: (opId) => {
      set({ grid: get().grid.map((row) => row.map((c) => (c && c.opId === opId ? null : c))) });
      scheduleRun();
    },

    eraseAt: (q, col) => {
      const cell = get().grid[q][col];
      if (cell) get().removeOp(cell.opId);
    },

    cellClick: (q, col) => {
      const s = get();
      const cell = s.grid[q][col];

      if (s.pending) {
        const p = s.pending;
        const sameColumn = col === p.cells[0].col;
        const rowTaken = p.cells.some((c) => c.q === q);
        if (!sameColumn || rowTaken || cell) {
          flashShake(q, col);
          return;
        }
        const cells = [...p.cells, { q, col, role: p.roles[p.cells.length] }];
        if (cells.length === p.roles.length) {
          set({ pending: null });
          commitOp(p.name, cells);
        } else {
          set({ pending: { ...p, cells } });
        }
        return;
      }

      const gate = s.selectedGate;
      if (gate === "erase") {
        if (cell) s.removeOp(cell.opId);
        return;
      }
      if (cell) {
        flashNotice(q, col, "erase first");
        return;
      }
      if (MULTI[gate]) {
        set({ pending: { name: gate, roles: MULTI[gate], cells: [{ q, col, role: MULTI[gate][0] }] } });
        return;
      }
      if (PARAM_GATES.has(gate)) {
        set({ paramRequest: { name: gate, q, col } });
        return;
      }
      commitOp(gate, [{ q, col, role: "single" }]);
    },

    confirmParam: (value) => {
      const pr = get().paramRequest;
      if (!pr) return;
      set({ paramRequest: null });
      commitOp(pr.name, [{ q: pr.q, col: pr.col, role: "single" }], [value]);
    },

    serialize: () => {
      const { grid, numQubits } = get();
      const gates = [];
      for (let col = 0; col < NUM_COLS; col++) {
        const seen = new Set();
        for (let q = 0; q < numQubits; q++) {
          const cell = grid[q][col];
          if (!cell || seen.has(cell.opId)) continue;
          seen.add(cell.opId);
          const targets = [];
          const controls = [];
          let params = [];
          for (let r = 0; r < numQubits; r++) {
            const c = grid[r][col];
            if (!c || c.opId !== cell.opId) continue;
            (c.role === "control" ? controls : targets).push(r);
            if (c.params) params = c.params;
          }
          gates.push({ name: cell.name, targets, controls, params });
        }
      }
      return { num_qubits: numQubits, gates };
    },

    run: async () => {
      clearTimeout(debounceTimer);
      const payload = get().serialize();
      if (payload.gates.length === 0) {
        set({ results: null, error: null, loading: false });
        return;
      }
      const seq = ++runSeq;
      set({ loading: true, error: null });
      try {
        const results = await simulate(payload);
        if (seq !== runSeq) return;
        set({ results, loading: false });
      } catch (e) {
        if (seq !== runSeq) return;
        set({ results: null, error: e.message, loading: false });
      }
    },
  };
});

// dev-only hook: lets tooling/tests drive the store (portals, tiers, bell checks)
if (import.meta.env.DEV && typeof window !== "undefined") window.__odyssey = useCircuitStore;
