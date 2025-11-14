import { ArrowDownRight, ArrowUpRight } from "lucide-react";

const StatCard = ({
  title,
  value,
  delta,           
  icon,            
  barPct = 70,     
  tone = "green",  
}) => {
  const isUp = delta >= 0;

  const tones = {
    green:  {
      text: "text-emerald-500",
      barDark: "rgba(16,185,129,0.75)",   
      barLight:"rgba(16,185,129,0.20)",
      barBg:   "bg-emerald-100",
    },
    rose:   {
      text: "text-rose-500",
      barDark: "rgba(244,63,94,0.75)",    
      barLight:"rgba(244,63,94,0.20)",
      barBg:   "bg-rose-100/60",
    },
    indigo: {
      text: "text-indigo-600",
      barDark: "rgba(79,70,229,0.75)",    
      barLight:"rgba(79,70,229,0.20)",
      barBg:   "bg-indigo-100/60",
    },
  };
  const c = tones[tone] || tones.green;

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[13px] text-gray-500">{title}</p>
          <div className="text-2xl font-semibold text-slate-800">{value}</div>

          <div className="flex items-center gap-1 text-[12px]">
            {isUp ? (
              <ArrowUpRight className={`h-4 w-4 ${c.text}`} />
            ) : (
              <ArrowDownRight className={`h-4 w-4 ${c.text}`} />
            )}
            <span className={`${c.text}`}>{Math.abs(delta)}</span>
            <span className="text-gray-400">than last month</span>
          </div>
        </div>

        <div className="shrink-0 rounded-lg bg-white">
          {icon}
        </div>
      </div>

      <div className="mt-4 h-2 w-full rounded-full overflow-hidden">
        <div className={`h-full ${c.barBg}`}>
          <div
            className="h-full"
            style={{
              width: `${barPct}%`,
              backgroundImage: `repeating-linear-gradient(45deg, ${c.barDark} 0 10px, ${c.barLight} 10px 20px)`,
              borderTopLeftRadius: 9999,
              borderBottomLeftRadius: 9999,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
