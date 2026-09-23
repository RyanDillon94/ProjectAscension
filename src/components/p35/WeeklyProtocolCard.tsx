import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle2, Plus, Trash2, Calendar, AlertCircle, Check, XCircle, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { todayKey } from "@/lib/project35";

export type WeeklyProtocolGoal = {
  id: string;
  text: string;
  completed: boolean;
  status?: "completed" | "failed" | "pending";
  targetCount?: number; 
  completedCount?: number;
  notes?: string; 
};

export function getMondayKeyForDate(dateStr?: string) {
  const baseDate = dateStr ? new Date(dateStr + "T00:00:00Z") : new Date();
  const day = baseDate.getUTCDay();
  const diff = baseDate.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(baseDate.setUTCDate(diff));
  return monday.toISOString().slice(0, 10);
}

export function isDateMonday(dateStr?: string) {
  const baseDate = dateStr ? new Date(dateStr + "T00:00:00Z") : new Date();
  return baseDate.getUTCDay() === 1;
}

const STORAGE_KEY_PREFIX = "p35_weekly_protocol_";

export function WeeklyProtocolCard({ currentDate }: { currentDate?: string }) {
  // 1. Reactive state that forces test date to take absolute priority
  const [activeDate, setActiveDate] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("p35_test_date") || currentDate || todayKey();
    }
    return currentDate || todayKey();
  });

  // 2. Lightweight polling so the card updates instantly when you click Test Panel buttons
  useEffect(() => {
    const interval = setInterval(() => {
      const testDate = localStorage.getItem("p35_test_date");
      const resolvedDate = testDate || currentDate || new Date().toISOString().slice(0, 10);
      
      if (resolvedDate !== activeDate) {
        setActiveDate(resolvedDate);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [activeDate, currentDate]);

  const mondayKey = getMondayKeyForDate(activeDate);
  const storageKey = `${STORAGE_KEY_PREFIX}${mondayKey}`;
  const isMonday = isDateMonday(activeDate);

  const [goals, setGoals] = useState<WeeklyProtocolGoal[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newGoalText, setNewGoalText] = useState("");
  const [targetCount, setTargetCount] = useState<number>(0);
  const [expandedNotes, setExpandedNotes] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.max(38, inputRef.current.scrollHeight)}px`;
    }
  }, [newGoalText]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setGoals(saved ? JSON.parse(saved) : []);
    } catch {
      setGoals([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(goals));
    } catch (e) {
      console.error("Failed to save weekly protocol goals", e);
    }
  }, [goals, storageKey]);

  const addGoal = () => {
    if (!newGoalText.trim()) return;
    if (goals.length >= 3) {
      toast.error("Cap it at 3 targets maximum. Keep the execution razor-sharp.");
      return;
    }

    const updated: WeeklyProtocolGoal[] = [
      ...goals,
      {
        id: Date.now().toString(),
        text: newGoalText.trim(),
        completed: false,
        status: "pending",
        targetCount,
        completedCount: 0,
        notes: "",
      },
    ];
    setGoals(updated);
    setNewGoalText("");
    setTargetCount(0);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    toast.success("Weekly protocol target locked in.");
  };

  const toggleGoal = (id: string) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        const nextCompleted = !g.completed;
        const total = g.targetCount ?? 0;
        return {
          ...g,
          completed: nextCompleted,
          completedCount: nextCompleted ? (total > 0 ? total : 1) : 0,
          status: nextCompleted ? ("completed" as const) : ("pending" as const),
        };
      }
      return g;
    });
    setGoals(updated);
  };

  const markFailed = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = goals.map((g) => {
      if (g.id === id) {
        return {
          ...g,
          status: "failed" as const,
          completed: false, 
        };
      }
      return g;
    });
    setGoals(updated);
    
    if (!expandedNotes.includes(id)) {
      setExpandedNotes((prev) => [...prev, id]);
    }
  };

  const toggleNotes = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNotes((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const updateNotes = (id: string, notes: string) => {
    const updated = goals.map((g) => {
      if (g.id === id) {
        return { ...g, notes };
      }
      return g;
    });
    setGoals(updated);
  };

  const handleSubCheck = (id: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = goals.map((g) => {
      if (g.id === id) {
        const total = g.targetCount ?? 0;
        const current = g.completedCount ?? (g.completed ? total || 1 : 0);
        const nextCount = index + 1 === current ? index : index + 1;
        const isDone = total > 0 ? nextCount >= total : nextCount > 0;
        return {
          ...g,
          completedCount: nextCount,
          completed: isDone,
          status: isDone ? ("completed" as const) : ("pending" as const),
        };
      }
      return g;
    });
    setGoals(updated);
  };

  const deleteGoal = (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);
  };

  const needsSetup = isMonday && goals.length === 0;

  return (
    <section className={`panel p-5 space-y-4 transition-colors ${needsSetup ? "border-amber-500/50 bg-amber-500/5 animate-pulse" : "border-primary/30 bg-surface-2/40"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${needsSetup ? "bg-amber-500/20 text-amber-400" : "bg-primary/20 text-primary"}`}>
            {needsSetup ? <AlertCircle className="size-4" /> : <Target className="size-4" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Weekly Execution Protocol</h2>
            <p className="text-xs text-muted-foreground">
              {needsSetup ? "Monday Reset: Lock in your 2-3 focused targets for this week" : `Week specific targets for week of ${mondayKey}`}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${needsSetup ? "bg-amber-500/20 text-amber-300" : "text-primary bg-primary/10"}`}>
          <Calendar className="size-3" />
          <span>{needsSetup ? "Weekly Goals Required" : `${goals.filter((g) => g.completed).length}/${goals.length} Done`}</span>
        </div>
      </div>

      <div className="space-y-2">
        {goals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-2/20 p-4 text-center space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">No Protocol Targets Logged</p>
            <p className="text-[11px] text-muted-foreground/80">
              {isMonday ? "Add up to 3 sharp focus standards for this week." : "No targets were recorded for this historical week."}
            </p>
          </div>
        ) : (
          goals.map((goal) => {
            const total = goal.targetCount ?? 0;
            const current = goal.completedCount ?? (goal.completed ? total || 1 : 0);
            const currentStatus = goal.status || (goal.completed ? "completed" : "pending");

            return (
              <div
                key={goal.id}
                className={`rounded-lg border p-3 transition-colors ${
                  currentStatus === "completed" 
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" 
                    : currentStatus === "failed"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    : "border-border bg-surface-2/60 text-foreground"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div 
                    className="flex items-start gap-2.5 flex-1 cursor-pointer select-none"
                    onClick={() => toggleGoal(goal.id)}
                  >
                    <CheckCircle2 className={`size-4 shrink-0 mt-0.5 ${currentStatus === "completed" ? "text-emerald-500" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium whitespace-normal break-words leading-relaxed ${currentStatus === "failed" ? "line-through opacity-80" : ""}`}>
                      {goal.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mr-1 ${
                      currentStatus === "completed" 
                        ? "bg-emerald-500/25 text-emerald-300" 
                        : currentStatus === "failed"
                        ? "bg-rose-500/25 text-rose-300"
                        : "bg-amber-500/25 text-amber-300"
                    }`}>
                      {currentStatus === "completed" ? "Smashed" : currentStatus === "failed" ? "Failed" : total > 0 ? `${current}/${total}` : "Pending"}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className={`size-7 shrink-0 ${expandedNotes.includes(goal.id) || goal.notes ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                      onClick={(e) => toggleNotes(goal.id, e)}
                      title="Add Notes"
                    >
                      <MessageSquareText className="size-3.5" />
                    </Button>
                    
                    {currentStatus === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-rose-400 shrink-0"
                        onClick={(e) => markFailed(goal.id, e)}
                        title="Mark as Failed"
                      >
                        <XCircle className="size-3.5" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-rose-400 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGoal(goal.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {total > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5 pl-6.5">
                    {Array.from({ length: total }).map((_, idx) => {
                      const checked = idx < current;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => handleSubCheck(goal.id, idx, e)}
                          className={`size-5 rounded border flex items-center justify-center transition-all ${
                            checked
                              ? "bg-emerald-500 border-emerald-500 text-black shadow-sm"
                              : "border-border bg-surface-2/80 hover:border-primary/60 text-transparent"
                          }`}
                        >
                          <Check className={`size-3 stroke-[3] ${checked ? "opacity-100" : "opacity-0"}`} />
                        </button>
                      );
                    })}
                    <span className="text-[10px] text-muted-foreground/80 ml-1 font-mono">
                      {current} of {total} done
                    </span>
                  </div>
                )}

                {expandedNotes.includes(goal.id) && (
                  <div className="mt-3 pl-6.5 animate-in slide-in-from-top-2 fade-in duration-200">
                    <textarea
                      rows={1}
                      placeholder={currentStatus === "failed" ? "Why did you miss this target?" : "Add context or details..."}
                      value={goal.notes || ""}
                      ref={(el) => {
                        if (el) {
                          el.style.height = "auto";
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                      onChange={(e) => {
                        updateNotes(goal.id, e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-full resize-none overflow-hidden bg-surface-2/40 border rounded px-2.5 py-1.5 text-[11px] placeholder:text-muted-foreground/50 focus:outline-none transition-colors leading-relaxed ${
                        currentStatus === "failed" 
                          ? "border-rose-500/20 text-rose-200 focus:border-rose-400/50 bg-rose-500/5" 
                          : "border-border text-foreground focus:border-primary/50"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {goals.length < 3 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Frequency Checkboxes:</span>
            <div className="flex items-center gap-1">
              {[0, 2, 3, 4, 5, 6, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTargetCount(num)}
                  className={`h-6 min-w-[24px] px-1.5 rounded text-[10px] font-bold transition-colors ${
                    targetCount === num
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface-2 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {num === 0 ? "Single" : `${num}×`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Add weekly target (e.g. Complete 15 mins of mobility after 2 workouts)..."
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addGoal();
                }
              }}
              className="w-full min-h-[38px] max-h-32 resize-none rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-all"
            />
            <Button size="sm" className="h-9 shrink-0 gap-1 self-stretch" onClick={addGoal}>
              <Plus className="size-4" /> Add Target
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
