import { ACTS, ACT_HUE } from "../../content/timeline";
import { xOfYear } from "./riverMath";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

// Six static translucent bands behind the river — never re-render on scroll.
export default function ActBands() {
  return (
    <div className="act-bands" aria-hidden="true">
      {ACTS.map((a, i) => {
        const x0 = xOfYear(a.start);
        const x1 = xOfYear(a.id === ACTS.length ? 2026 : a.end + 1);
        return (
          <div
            key={a.id}
            className="act-band"
            style={{ transform: `translate3d(${x0}px,0,0)`, width: x1 - x0, "--hue": ACT_HUE[a.id] }}
          >
            <div className="act-band-head">
              <span className="act-band-title">
                ACT {ROMAN[i]} · {a.title.toUpperCase()} · {a.range}
              </span>
              <span className="act-band-theme">{a.theme}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
