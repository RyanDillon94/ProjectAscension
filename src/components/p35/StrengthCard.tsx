import { useMemo } from "react";
import { Dumbbell, Activity } from "lucide-react";
import { MuscleGroupProgress, calculateMuscleStrengthProgress, WorkoutSet } from "@/lib/strengthUtils";

export function StrengthCard({
  sets = [],
}: {
  sets?: WorkoutSet[];
}) {
  const progress: Record<string, MuscleGroupProgress> = useMemo(() => {
    return calculateMuscleStrengthProgress(sets);
  }, [sets]);

  const groups = ["Chest", "Back", "Shoulders", "Arms", "Legs"] as const;

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Muscle Group Progression</h2>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Activity className="size-3.5" /> 4-Week vs Baseline
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {groups.map((group) => {
          const data = progress[group];
          const hasData = data && data.sampleCount > 0;
          const isPositive = data && data.percentChange > 0;
          const isNegative = data && data.percentChange < 0;

          return (
            <div
              key={group}
              className="rounded-lg border border-border bg-surface-2/60 p-3 text-center flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                <p className="font-display text-xl font-bold text-foreground mt-1">
                  {hasData ? `${data.currentE1RM} kg` : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Est. 1RM
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-border/60">
                {hasData ? (
                  <p
                    className={`text-xs font-semibold ${
                      isPositive
                        ? "text-emerald-500"
                        : isNegative
                        ? "text-rose-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {data.percentChange}% vs baseline
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No recent sets</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}