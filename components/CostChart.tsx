// Pure SVG — no client directive needed

const VIEW_W = 620;
const VIEW_H = 380;
const PAD_L = 72;
const PAD_R = 130;
const PAD_T = 28;
const PAD_B = 50;

const CHART_W = VIEW_W - PAD_L - PAD_R; // 418
const CHART_H = VIEW_H - PAD_T - PAD_B; // 302

const MAX_VAL = 2600;

const WEBEDIT = [498, 597, 696, 795, 894];
const SQUARESPACE = [500, 1000, 1500, 2000, 2500];
const Y_TICKS = [0, 500, 1000, 1500, 2000, 2500];

function xp(i: number) {
  return PAD_L + (i / 4) * CHART_W;
}
function yp(val: number) {
  return PAD_T + CHART_H * (1 - val / MAX_VAL);
}
function pts(data: number[]) {
  return data.map((v, i) => `${xp(i)},${yp(v)}`).join(" ");
}

const savingsArea = [
  ...SQUARESPACE.map((v, i) => `${xp(i)},${yp(v)}`),
  ...[...WEBEDIT].reverse().map((v, i) => `${xp(4 - i)},${yp(v)}`),
].join(" ");

const yr5SavedMidY = (yp(WEBEDIT[4]) + yp(SQUARESPACE[4])) / 2;

export default function CostChart() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 flex flex-col">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-800">WebEdit vs Traditional Website Hosting</h3>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        aria-label="WebEdit vs Traditional Website Hosting cost comparison chart"
      >
        {/* Horizontal grid lines + Y labels */}
        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_L}
              y1={yp(tick)}
              x2={VIEW_W - PAD_R}
              y2={yp(tick)}
              stroke={tick === 0 ? "#e5e7eb" : "#f3f4f6"}
              strokeWidth="1"
            />
            <text
              x={PAD_L - 8}
              y={yp(tick) + 4}
              textAnchor="end"
              fontSize="13"
              fill="#9ca3af"
            >
              {tick === 0 ? "$0" : tick >= 1000 ? `$${tick / 1000}k` : `$${tick}`}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {[1, 2, 3, 4, 5].map((yr, i) => (
          <text
            key={yr}
            x={xp(i)}
            y={VIEW_H - 10}
            textAnchor="middle"
            fontSize="13"
            fill="#9ca3af"
          >
            Year {yr}
          </text>
        ))}

        {/* Savings shaded area */}
        <polygon points={savingsArea} fill="#113D79" opacity="0.07" />

        {/* Squarespace line */}
        <polyline
          points={pts(SQUARESPACE)}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* WebEdit line */}
        <polyline
          points={pts(WEBEDIT)}
          fill="none"
          stroke="#113D79"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Squarespace dots */}
        {SQUARESPACE.map((v, i) => (
          <circle key={i} cx={xp(i)} cy={yp(v)} r="4" fill="white" stroke="#ef4444" strokeWidth="2" />
        ))}

        {/* WebEdit dots */}
        {WEBEDIT.map((v, i) => (
          <circle key={i} cx={xp(i)} cy={yp(v)} r="4" fill="white" stroke="#113D79" strokeWidth="2" />
        ))}

        {/* Year 5 savings bracket */}
        <line
          x1={xp(4) + 14}
          y1={yp(WEBEDIT[4])}
          x2={xp(4) + 14}
          y2={yp(SQUARESPACE[4])}
          stroke="#16a34a"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        {/* Bracket caps */}
        <line x1={xp(4) + 10} y1={yp(WEBEDIT[4])} x2={xp(4) + 18} y2={yp(WEBEDIT[4])} stroke="#16a34a" strokeWidth="1.5" />
        <line x1={xp(4) + 10} y1={yp(SQUARESPACE[4])} x2={xp(4) + 18} y2={yp(SQUARESPACE[4])} stroke="#16a34a" strokeWidth="1.5" />

        {/* Savings label */}
        <text
          x={xp(4) + 26}
          y={yr5SavedMidY - 28}
          fontSize="28"
          fontWeight="800"
          fill="#16a34a"
        >
          $1,606
        </text>
        <text
          x={xp(4) + 26}
          y={yr5SavedMidY + 4}
          fontSize="18"
          fill="#16a34a"
        >
          saved after
        </text>
        <text
          x={xp(4) + 26}
          y={yr5SavedMidY + 26}
          fontSize="18"
          fill="#16a34a"
        >
          5 years
        </text>
      </svg>

      {/* Legend */}
      <div className="flex gap-6 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 rounded-full" style={{ background: "#113D79" }} />
          <span className="text-sm text-gray-500 font-medium">WebEdit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 rounded-full bg-red-400" />
          <span className="text-sm text-gray-500 font-medium">Traditional hosting</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-3 h-3 rounded-sm opacity-20" style={{ background: "#113D79" }} />
          <span className="text-sm text-gray-400">savings zone</span>
        </div>
      </div>
    </div>
  );
}
