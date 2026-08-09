// Single world clock: OdysseyWorld's one clock-writer useFrame mutates this;
// every breathing/drift/pulse effect reads it. No allocations, no React state.
export const clockRef = { t: 0, dt: 0.016 };
