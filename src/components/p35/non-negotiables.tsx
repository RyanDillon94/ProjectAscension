import { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { DAILY_TARGETS, getActiveHabits, todayKey, getAscensionProfile } from "@/lib/project35";
import { useHabitDay } from "@/lib/p35-cloud";
import { Beef, BookOpen, ChevronLeft, ChevronRight, Dumbbell, Footprints, Sunrise, Utensils } from "lucide-react";
import { toast } from "sonner";

// Pure UTC helper to avoid timezone day skipping
function shiftIsoDate(isoDate: string, daysDelta: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + daysDelta);
  return date.toISOString().slice(0, 10);
}

export function NonNegotiables({ userId, onDateChange }: { userId: string | null; onDateChange?: (date: string) => void }) {
  const actualToday = todayKey();
  
  // Initialize from shared active storage or live today
  const [selectedDay, setSelectedDay] = useState(() => {
    try {
      return localStorage.getItem("p35_active_date") || actualToday;
    } catch {
      return actualToday;
    }
  });

  const { habits, toggle } = useHabitDay(userId, selectedDay);

  const currentDateObj = useMemo(() => {
    const [y, m, d] = selectedDay.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  }, [selectedDay]);

  const activeHabits = useMemo(() => getActiveHabits(currentDateObj), [currentDateObj]);

  const journalKey = `p35_journal_${selectedDay}`;
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    try {
      setNote(localStorage.getItem(journalKey) || "");
    } catch {
      setNote("");
    }
  }, [journalKey]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(68, textareaRef.current.scrollHeight)}px`;
    }
  }, [note]);

  const handleNoteChange = (text: string) => {
    setNote(text);
    try {
      localStorage.setItem(journalKey, text);
    } catch (err) {
      console.error("Failed to save journal:", err);
    }
  };

  const onToggle = (key: string) =>
    toggle.mutate(key, {
      onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save."),
    });

  // Predictable date navigation
  const isToday = selectedDay >= actualToday;

  const updateSelectedDay = (newDate: string) => {
    setSelectedDay(newDate);
    try {
      localStorage.setItem("p35_active_date", newDate);
      window.dispatchEvent(new Event("p35-date-changed"));
      if (onDateChange) onDateChange(newDate);
    } catch {}
  };

  const stepDay = (delta: number) => {
    const nextDate = shiftIsoDate(selectedDay, delta);
    if (delta > 0 && nextDate > actualToday) return;
    updateSelectedDay(nextDate);
  };

  const dateHeading = useMemo(() => {
    if (selectedDay === actualToday) return "Today";
    return currentDateObj.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }, [selectedDay, actualToday, currentDateObj]);

  // Weekly Top Form Score (Monday of current selected week through selected day)
  const statsMetric = useMemo(() => {
    const [y, m, dNum] = selectedDay.split("-").map(Number);
    const selDate = new Date(Date.UTC(y, m - 1, dNum, 12, 0, 0));

    // Find Monday of the selected day's week (UTC-safe)
    const dayOfWeek = selDate.getUTCDay(); // 0 is Sunday, 1 is Monday...
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const mondayDate = new Date(selDate);
    mondayDate.setUTCDate(selDate.getUTCDate() - daysSinceMonday);

    let totalPossibleChecks = 0;
    let totalCompletedChecks = 0;

    // Loop from Monday up to the selected day
    const loopDate = new Date(mondayDate);
    while (loopDate.getTime() <= selDate.getTime()) {
      const k = loopDate.toISOString().slice(0, 10);
      const loopDayOfWeek = loopDate.getUTCDay();
      const isWeekend = loopDayOfWeek === 0 || loopDayOfWeek === 6;

      const dayHabits = getActiveHabits(loopDate);

      const raw = localStorage.getItem(`p35_habits_${k}`);
      let parsedHabits: Record<string, boolean> = {};
      if (raw) {
        try {
          parsedHabits = JSON.parse(raw);
        } catch {}
      }

      dayHabits.forEach((h: any) => {
        const labelLower = h.label.toLowerCase();
        
        // Legacy regex to protect your existing historical data
        const isLegacyWeekday = 
          h.key === "workout_complete" || 
          h.key === "early_morning" || 
          labelLower.includes("workout") || 
          /\d{1,2}:\d{2}\s*[ap]m/i.test(labelLower);

        // Look for explicit property first, fall back to string matching
        const isWeekdayOnly = h.isWeekdayOnly !== undefined ? h.isWeekdayOnly : isLegacyWeekday;

        if (isWeekend && isWeekdayOnly) {
          return;
        }

        totalPossibleChecks++;
        // If we are looking at the currently selected day in state, use live `habits` state; otherwise read storage
        if (k === selectedDay && habits[h.key]) {
          totalCompletedChecks++;
        } else if (parsedHabits[h.key]) {
          totalCompletedChecks++;
        }
      });

      // Advance loop date by 1 day UTC
      loopDate.setUTCDate(loopDate.getUTCDate() + 1);
    }

    const formScore =
      totalPossibleChecks > 0
        ? Math.round((totalCompletedChecks / totalPossibleChecks) * 100)
        : 0;

    return { formScore };
  }, [habits, selectedDay]);

  const done = activeHabits.filter((h) => habits[h.key]).length;

  // Dynamically fetch targets to prevent hardcoding your specific metrics
  const profile = getAscensionProfile();
  const liveTargets = profile?.targets || DAILY_TARGETS;

  const targetStats = [
    {
      icon: Utensils,
      label: "Calories",
      value: `${(liveTargets.caloriesMin ?? DAILY_TARGETS.caloriesMin).toLocaleString()}–${(liveTargets.caloriesMax ?? DAILY_TARGETS.caloriesMax).toLocaleString()} kcal`,
    },
    { icon: Beef, label: "Protein", value: `${liveTargets.protein ?? DAILY_TARGETS.protein}g+` },
    { icon: Footprints, label: "Steps", value: (liveTargets.steps ?? DAILY_TARGETS.steps).toLocaleString() },
    { icon: Sunrise, label: "Routine", value: liveTargets.routine ?? DAILY_TARGETS.routine },
  ];

  return (
    <section className="panel p-5 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Dumbbell className="size-5 shrink-0 text-primary" />
          <h2 className="text-base sm:text-lg font-bold truncate">Daily Non-Negotiables</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {statsMetric.formScore}% of week
          </span>
          <span className="font-display text-sm text-primary">
            {done}/{activeHabits.length}
          </span>
        </div>
      </div>

      {/* Target Metrics Grid (Fixed with responsive single/dual column and overflow-hidden) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {targetStats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface-2/60 p-3.5 flex flex-col justify-between overflow-hidden"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              <s.icon className="size-4 shrink-0 text-primary" />
              <span>{s.label}</span>
            </div>
            <div className={`font-bold text-foreground truncate ${s.label === "Routine" ? "text-xs sm:text-sm leading-snug line-clamp-2" : "text-base"}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Date Stepper Bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/40 px-3 py-2">
        <button
          type="button"
          onClick={() => stepDay(-1)}
          className="rounded p-1 text-muted-foreground hover:text-primary transition-colors active:bg-surface-2"
          aria-label="Previous Day"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs font-semibold tracking-wide text-foreground">
          {dateHeading} ({selectedDay})
        </span>
        <button
          type="button"
          onClick={() => stepDay(1)}
          disabled={isToday}
          className={`rounded p-1 transition-colors ${
            isToday
              ? "text-muted-foreground/30 cursor-not-allowed"
              : "text-muted-foreground hover:text-primary active:bg-surface-2"
          }`}
          aria-label="Next Day"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Habits Checklist for Selected Date */}
      <div className="space-y-2 pt-0.5">
        <p className="stat-label">Habit Check</p>
        {activeHabits.map((habit) => {
          const isChecked = Boolean(habits[habit.key]);
          return (
            <label
              key={habit.key}
              className={`flex min-h-12 cursor-pointer items-center justify-between rounded-lg border px-3 py-3 transition-colors ${
                isChecked
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-surface-2/40 hover:bg-surface-2/70 active:bg-surface-2"
              }`}
            >
              <div className="min-w-0 pr-3">
                <span
                  className={`block text-sm font-medium leading-snug ${
                    isChecked ? "text-primary font-semibold" : "text-foreground"
                  }`}
                >
                  {habit.label}
                </span>
                {habit.sublabel && (
                  <span className="block text-[11px] text-muted-foreground">{habit.sublabel}</span>
                )}
              </div>
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggle(habit.key)}
                className="size-5 shrink-0"
              />
            </label>
          );
        })}
      </div>

      {/* Daily Journal Note for Selected Date */}
      <div className="pt-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
          <BookOpen className="size-3.5 text-primary" />
          <span>Daily Journal / Log ({selectedDay})</span>
        </div>
        <textarea
          ref={textareaRef}
          rows={2}
          value={note}
          placeholder="Log weight, workout reflection, hunger, or thoughts..."
          onChange={(e) => handleNoteChange(e.target.value)}
          className="w-full min-h-[68px] resize-none rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-all"
        />
      </div>
    </section>
  );
}