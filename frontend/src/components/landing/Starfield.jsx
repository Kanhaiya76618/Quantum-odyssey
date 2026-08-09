import { useEffect, useRef } from "react";

const LINK_DIST = 60;

export default function Starfield() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;

    const pick = () => {
      const r = Math.random();
      return r < 0.7 ? "0,229,255" : r < 0.95 ? "124,58,237" : "255,45,149";
    };

    const stars = [];
    let seeded = false;
    const seed = () => {
      if (seeded || !w || !h) return;
      seeded = true;
      for (let i = 0; i < 200; i++) {
        const depth = 0.3 + Math.random() * 0.7; // deeper = bigger, faster (parallax)
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          depth,
          r: 0.6 + depth * 1.4,
          c: pick(),
          vx: 0.02 + 0.06 * depth,
          vy: -(0.01 + 0.03 * depth),
        });
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(); // canvas may measure 0 before styles apply; seed on first real size
    };
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            const o = (1 - Math.sqrt(d2) / LINK_DIST) * 0.25; // entanglement links
            ctx.strokeStyle = `rgba(0,229,255,${o.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const s of stars) {
        ctx.fillStyle = `rgba(${s.c},${(0.35 + s.depth * 0.65).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      if (!seeded) resize();
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x > w + 5) s.x = -5;
        if (s.x < -5) s.x = w + 5;
        if (s.y < -5) s.y = h + 5;
        if (s.y > h + 5) s.y = -5;
      }
      draw();
      raf = requestAnimationFrame(step);
    };

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) raf = requestAnimationFrame(step);
    };
    const onResize = () => {
      resize();
      draw();
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    if (reduced) draw();
    else raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
