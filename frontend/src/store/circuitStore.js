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
    pending: null, // in-progress multi-qubit op: {name, roles, cells:[{q,col,role}]}
    paramRequest: null, // {name, q, col} while ParamModal is open
    results: null,
    error: null,
    loading: false,
    shake: null, // {q, col} transient invalid-click flash
    notice: null, // {q, col, msg} transient tooltip

    isGridEmpty: () => get().grid.every((row) => row.every((c) => !c)),

    setSelectedGate: (name) => set({ selectedGate: name, pending: null, paramRequest: null }),

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
