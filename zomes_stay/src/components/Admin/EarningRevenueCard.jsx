// components/Admin/EarningRevenueCard.jsx
import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// sample data
const DATA = {
  week: [
    { x: "Mon", y: 240 }, { x: "Tue", y: 260 }, { x: "Wed", y: 210 },
    { x: "Thu", y: 320 }, { x: "Fri", y: 180 }, { x: "Sat", y: 260 },
    { x: "Sun", y: 300 },
  ],
  month: [
    { x: "Jan", y: 250 }, { x: "Feb", y: 390 }, { x: "Mar", y: 280 },
    { x: "Apr", y: 200 }, { x: "May", y: 360 }, { x: "Jun", y: 470 },
    { x: "Jul", y: 140 }, { x: "Aug", y: 210 }, { x: "Sep", y: 260 },
    { x: "Oct", y: 260 }, { x: "Nov", y: 270 }, { x: "Dec", y: 310 },
  ],
  year: [
    { x: "2020", y: 180 }, { x: "2021", y: 260 }, { x: "2022", y: 310 },
    { x: "2023", y: 420 }, { x: "2024", y: 350 }, { x: "2025", y: 460 },
  ],
};

const yTicks = [100, 200, 300, 400, 500];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md bg-white px-3 py-2 text-xs shadow-md ring-1 ring-black/5">
        <div className="font-medium text-slate-700">{label}</div>
        <div className="mt-1 text-indigo-600">${payload[0].value}</div>
      </div>
    );
  }
  return null;
};

export default function EarningRevenueCard() {
  const [range, setRange] = useState("month");

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-[15px] font-semibold text-slate-800">Earning Revenue</h3>
        <div className="flex items-center gap-2">
          {["week", "month", "year"].map((k) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize ${
                range === k
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {k === "week" ? "Week" : k === "month" ? "Month" : "Year"}
            </button>
          ))}
          <div className="ml-1 h-8 w-8 grid place-content-center text-slate-400">⋮</div>
        </div>
      </div>

      <div className="h-[360px] px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={DATA[range]}
            margin={{ top: 10, right: 20, bottom: 20, left: 0 }}
          >
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.08} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="#e5e7eb"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="x"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              height={30}
            />
            <YAxis
              ticks={yTicks}
              domain={[100, 500]}
              tickFormatter={(v) => `$${v}`}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="y"
              stroke="#4f46e5"         
              strokeWidth={4}
              fill="url(#revFill)"
              activeDot={{ r: 5 }}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="pb-4 text-center text-xs text-slate-400">Months</div>
    </div>
  );
}
