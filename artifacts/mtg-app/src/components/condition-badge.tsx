const CONDITION_STYLES: Record<string, string> = {
  NM: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  LP: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  MP: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  HP: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  DMG: "bg-red-500/20 text-red-400 border-red-500/30",
};

const CONDITION_LABELS: Record<string, string> = {
  NM: "NM",
  LP: "LP",
  MP: "MP",
  HP: "HP",
  DMG: "DMG",
};

export function ConditionBadge({ condition }: { condition: string }) {
  const style = CONDITION_STYLES[condition] ?? "bg-muted/50 text-muted-foreground border-border";
  const label = CONDITION_LABELS[condition] ?? condition;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${style}`}>
      {label}
    </span>
  );
}
