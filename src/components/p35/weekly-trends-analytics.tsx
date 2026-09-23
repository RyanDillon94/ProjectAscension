import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, BarChart3, CheckCircle2, Flame, ArrowUpRight, ArrowDownRight, ChevronDown, ExternalLink } from "lucide-react";
import { getActiveHabits } from "@/lib/project35";
import { calculateTrainingProgress, WorkoutSet } from "@/lib/strengthUtils";
import { MUSCLE_GROUPS } from "@/lib/strengthMapping";

export function WeeklyTrendsAnalytics() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const sets: WorkoutSet[] = useMemo(() => {
    if (typeof window === "undefined") return []; // SSR Safe Check
    try {
      const raw = localStorage.getItem("p35_hevy_workouts") || localStorage.getItem("p35_cached_workout");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!parsed) return [];
      
      const extracted: WorkoutSet[] = [];
      const workouts = Array.isArray(parsed) ? parsed : [parsed];
      
      workouts.forEach((w: any) => {
        if (!w) return;
        const date = w.date || w.startTime?.slice(0, 10) || w.start_time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
        const exercises = w.exercises || w.workout_exercises || [];
        if (!Array.isArray(exercises)) return;

        exercises.forEach((ex: any) => {
          if (!ex) return;
          const exerciseName = ex.exercise_title || ex.title || ex.exercise?.title || "";
          const exerciseSets = ex.sets || [];
          if (!Array.isArray(exerciseSets)) return;

          exerciseSets.forEach((s: any) => {
            if (s && (s.weightKg !== null || s.weight !== null || s.weight_kg !== null || s.weightKg !== undefined)) {
              const weight = Number(s.weightKg ?? s.weight ?? s.weight_kg ?? 0);
              const reps = Number(s.reps ?? 0);
              if (weight > 0 && reps > 0) {
                extracted.push({
                  exerciseName,
                  weight,
                  reps,
                  date,
                });
              }
            }
          });
        });
      });
      
      return extracted;
    } catch (err) {
      console.error("Failed to parse workout history sets:", err);
      return [];
    }
  }, [isOpen]);

  const progress = useMemo(() => {
    return calculateTrainingProgress(sets);
  }, [sets]);

  const trendData = useMemo(() => {
    const weeks: { weekLabel: string; score: number }[] = [];
    const today = new Date();

    for (let w = 3; w >= 0; w--) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - w * 7);
      
      const dayOfWeek = targetDate.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(targetDate);
      monday.setDate(targetDate.getDate() - daysSinceMonday);

      let totalPossible = 0;
      let totalCompleted = 0;

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        if (d.getTime() > today.getTime() && w === 0) break;

        const k = d.toISOString().slice(0, 10);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const dayHabits = getActiveHabits(d);

        let parsedHabits: Record<string, boolean> = {};
        let raw = null;
        
        // SSR Safe Check
        if (typeof window !== "undefined") {
          try {
            raw = localStorage.getItem(`p35_habits_${k}`);
          } catch {}
        }
        
        if (raw) {
          try {
            parsedHabits = JSON.parse(raw);
          } catch {}
        }

        dayHabits.forEach((h: any) => {
          const labelLower = h.label.toLowerCase();
          
          const isLegacyWeekday = 
            h.key === "workout_complete" || 
            h.key === "early_morning" || 
            labelLower.includes("workout") || 
            /\d{1,2}:\d{2}\s*[ap]m/i.test(labelLower);
            
          const isWeekdayOnly = h.isWeekdayOnly !== undefined ? h.isWeekdayOnly : isLegacyWeekday;

          if (isWeekend && isWeekdayOnly) return;

          totalPossible++;
          if (parsedHabits[h.key]) {
            totalCompleted++;
          }
        });
      }

      const habitScore = totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;

      const mondayKey = monday.toISOString().slice(0, 10);
      let protocolScore = -1;
      
      // SSR Safe Check
      if (typeof window !== "undefined") {
        try {
          const rawProtocol = localStorage.getItem(`p35_weekly_protocol_${mondayKey}`);
          if (rawProtocol) {
            const protocolGoals = JSON.parse(rawProtocol);
            if (Array.isArray(protocolGoals) && protocolGoals.length > 0) {
              const completedCount = protocolGoals.filter((g: any) => g.completed || g.status === "completed").length;
              protocolScore = Math.round((completedCount / protocolGoals.length) * 100);
            }
          }
        } catch {}
      }

      let finalScore = Math.round(habitScore);
      if (protocolScore >= 0) {
        finalScore = Math.round(habitScore * 0.7 + protocolScore * 0.3);
      }

      const weekLabel = `Week of ${monday.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`;
      weeks.push({ weekLabel, score: Math.min(100, Math.max(0, finalScore)) });
    }

    return weeks;
  }, [isOpen]);

  const averageScore = useMemo(() => {
    const validWeeks = trendData.filter(w => w.score > 0);
    if (validWeeks.length === 0) return 0;
    return Math.round(validWeeks.reduce((acc, curr) => acc + curr.score, 0) / validWeeks.length);
  }, [trendData]);

  const renderChangeBadge = (val: number, hasData: boolean) => {
    if (!hasData) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }
    if (val > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-emerald-500 font-semibold">
          +{val}% <ArrowUpRight className="size-3.5" />
        </span>
      );
    } else if (val < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-rose-500 font-semibold">
          {val}% <ArrowDownRight className="size-3.5" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-muted-foreground font-semibold">
        0.0% →
      </span>
    );
  };

  return (
    <div className="panel flex items-center justify-between w-full p-4">
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <TrendingUp className="size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-bold truncate text-foreground">Weekly Trends & Analytics</p>
          <p className="text-xs text-muted-foreground truncate">Review 4-week compliance history</p>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-1.5 h-8 text-xs shrink-0 pointer-events-auto">
            <BarChart3 className="size-3.5" />
            Trends
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              Performance Analytics
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-center space-y-1">
                <p className="stat-label flex items-center justify-center gap-1">
                  <CheckCircle2 className="size-3.5 text-primary" />
                  <span>4-Week Avg Adherence</span>
                </p>
                <p className="font-display text-2xl font-bold text-primary">{averageScore}%</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-center space-y-1">
                <p className="stat-label flex items-center justify-center gap-1">
                  <Flame className="size-3.5 text-amber-500" />
                  <span>Execution Status</span>
                </p>
                <p className="text-sm font-semibold text-foreground pt-1">
                  {averageScore >= 80 ? "Top form, keep it up!" : averageScore >= 50 ? "Building Momentum, push harder" : "Absolutely shite, switch on!"}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 rounded-lg border border-border bg-surface-2/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rolling Weekly Adherence</p>
              <div className="space-y-3 pt-1">
                {trendData.map((week, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground">{week.weekLabel}</span>
                      <span className="text-primary font-semibold">{week.score}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border/65">
                      <div 
                        className="h-full bg-primary transition-all duration-500 rounded-full" 
                        style={{ width: `${week.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Adherence is calculated dynamically based on weekday rules and weekly execution protocol targets.
            </p>

            <div className="mt-6 pt-5 border-t border-border space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                4-Week Training Progress
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-surface-2/60 p-3.5 text-center space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Strength</p>
                  <div className="font-display text-xl font-bold pt-1">
                    {renderChangeBadge(progress.overallStrengthChange, true)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-2/60 p-3.5 text-center space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Volume</p>
                  <div className="font-display text-xl font-bold pt-1">
                    {renderChangeBadge(progress.overallVolumeChange, true)}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 rounded-lg border border-border bg-surface-2/40 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Muscle Groups</span>
                  <div className="flex gap-6 pr-2">
                    <span>Strength</span>
                    <span>Volume</span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {MUSCLE_GROUPS.map((group) => {
                    const data = progress.muscleGroups[group];
                    const hasActivity = data && (data.currentVolume > 0 || data.baselineVolume > 0);
                    const isExpanded = expandedGroup === group;

                    return (
                      <div key={group} className="border-b border-border/40 last:border-0 pb-1">
                        <div 
                          onClick={() => hasActivity && setExpandedGroup(isExpanded ? null : group)}
                          className={`flex items-center justify-between text-sm py-2 px-2 rounded-lg transition-colors ${hasActivity ? "cursor-pointer hover:bg-surface-2/80" : ""}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{group}</span>
                            {hasActivity && data.topExercises && data.topExercises.length > 0 && (
                              <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                            )}
                          </div>
                          <div className="flex gap-6 text-right">
                            <div className="w-16 text-right">
                              {renderChangeBadge(data.strengthChange, hasActivity && data.baselineVolume > 0)}
                            </div>
                            <div className="w-16 text-right">
                              {renderChangeBadge(data.volumeChange, hasActivity)}
                            </div>
                          </div>
                        </div>

                        {isExpanded && data.topExercises && data.topExercises.length > 0 && (
                          <div className="pb-3 pt-1 px-3 space-y-2 bg-surface-2/30 rounded-b-lg border-x border-b border-border/40 mb-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Top Exercises (4-Week Trend)</p>
                            {data.topExercises.map((ex, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs py-1 border-t border-border/20 first:border-0">
                                <span className="text-foreground truncate max-w-[180px]">{ex.exerciseName}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground">{ex.currentE1RM > 0 ? `${ex.currentE1RM}kg e1RM` : "—"}</span>
                                  <span className={ex.percentChange >= 0 ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                                    {ex.percentChange > 0 ? `+${ex.percentChange}%` : `${ex.percentChange}%`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="hevy://"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-2/60 hover:bg-surface-2 py-2.5 text-xs font-semibold text-foreground transition-colors"
              >
                <ExternalLink className="size-3.5 text-primary" />
                Open Hevy App
              </a>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}