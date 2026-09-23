import { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DAILY_TARGETS,
  getActiveHabits,
  todayKey,
  getAscensionProfile,
} from "@/lib/project35";
import { useHabitDay } from "@/lib/p35-cloud";
import {
  Beef,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Footprints,
  Sunrise,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";

// Pure UTC helper to avoid timezone day skipping
function shiftIsoDate(
  isoDate: string,
  daysDelta: number,
): string {
  const [y, m, d] = isoDate.split("-").map(Number);

  const date = new Date(
    Date.UTC(y, m - 1, d),
  );

  date.setUTCDate(
    date.getUTCDate() + daysDelta,
  );

  return date.toISOString().slice(0, 10);
}

export function NonNegotiables({
  userId,
  onDateChange,
}: {
  userId: string | null;
  onDateChange?: (date: string) => void;
}) {
  const actualToday = todayKey();

  // ============================================================
  // SELECTED DAY
  // ============================================================

  const [selectedDay, setSelectedDay] =
    useState(() => {
      if (typeof window !== "undefined") {
        try {
          return (
            localStorage.getItem(
              "p35_active_date",
            ) || actualToday
          );
        } catch {
          return actualToday;
        }
      }

      return actualToday;
    });

  const { habits, toggle } =
    useHabitDay(userId, selectedDay);

  // ============================================================
  // CURRENT DATE
  // ============================================================

  const currentDateObj = useMemo(() => {
    const [y, m, d] =
      selectedDay.split("-").map(Number);

    return new Date(
      Date.UTC(y, m - 1, d, 12, 0, 0),
    );
  }, [selectedDay]);

  // ============================================================
  // ACTIVE HABITS
  // ============================================================

  const activeHabits = useMemo(
    () =>
      getActiveHabits(currentDateObj),
    [currentDateObj],
  );

  // ============================================================
  // JOURNAL
  // ============================================================

  const journalKey =
    `p35_journal_${selectedDay}`;

  const [note, setNote] =
    useState<string>("");

  useEffect(() => {
    try {
      setNote(
        localStorage.getItem(
          journalKey,
        ) || "",
      );
    } catch {
      setNote("");
    }
  }, [journalKey]);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height =
        "auto";

      textareaRef.current.style.height =
        `${Math.max(
          68,
          textareaRef.current.scrollHeight,
        )}px`;
    }
  }, [note]);

  const handleNoteChange = (
    text: string,
  ) => {
    setNote(text);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          journalKey,
          text,
        );
      } catch (err) {
        console.error(
          "Failed to save journal:",
          err,
        );
      }
    }
  };

  // ============================================================
  // HABIT TOGGLE
  // ============================================================

  const onToggle = (key: string) =>
    toggle.mutate(key, {
      onError: error =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not save.",
        ),
    });

  // ============================================================
  // DATE NAVIGATION
  // ============================================================

  const isToday =
    selectedDay >= actualToday;

  const updateSelectedDay = (
    newDate: string,
  ) => {
    setSelectedDay(newDate);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "p35_active_date",
          newDate,
        );

        window.dispatchEvent(
          new Event(
            "p35-date-changed",
          ),
        );

        if (onDateChange) {
          onDateChange(newDate);
        }
      } catch {}
    }
  };

  const stepDay = (delta: number) => {
    const nextDate =
      shiftIsoDate(
        selectedDay,
        delta,
      );

    if (
      delta > 0 &&
      nextDate > actualToday
    ) {
      return;
    }

    updateSelectedDay(nextDate);
  };

  // ============================================================
  // DATE HEADING
  // ============================================================

  const dateHeading = useMemo(() => {
    if (
      selectedDay === actualToday
    ) {
      return "Today";
    }

    return currentDateObj.toLocaleDateString(
      "en-GB",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      },
    );
  }, [
    selectedDay,
    actualToday,
    currentDateObj,
  ]);

  // ============================================================
  // WEEKLY FORM SCORE
  // ============================================================

  const statsMetric = useMemo(() => {
    const [
      y,
      m,
      dNum,
    ] = selectedDay
      .split("-")
      .map(Number);

    const selDate = new Date(
      Date.UTC(
        y,
        m - 1,
        dNum,
        12,
        0,
        0,
      ),
    );

    const dayOfWeek =
      selDate.getUTCDay();

    const daysSinceMonday =
      dayOfWeek === 0
        ? 6
        : dayOfWeek - 1;

    const mondayDate =
      new Date(selDate);

    mondayDate.setUTCDate(
      selDate.getUTCDate() -
        daysSinceMonday,
    );

    let totalPossibleChecks = 0;
    let totalCompletedChecks = 0;

    const loopDate =
      new Date(mondayDate);

    while (
      loopDate.getTime() <=
      selDate.getTime()
    ) {
      const k =
        loopDate
          .toISOString()
          .slice(0, 10);

      const loopDayOfWeek =
        loopDate.getUTCDay();

      const isWeekend =
        loopDayOfWeek === 0 ||
        loopDayOfWeek === 6;

      const dayHabits =
        getActiveHabits(
          loopDate,
        );

      let raw = null;

      if (
        typeof window !==
        "undefined"
      ) {
        try {
          raw =
            localStorage.getItem(
              `p35_habits_${k}`,
            );
        } catch {}
      }

      let parsedHabits: Record<
        string,
        boolean
      > = {};

      if (raw) {
        try {
          parsedHabits =
            JSON.parse(raw);
        } catch {}
      }

      dayHabits.forEach(
        (h: any) => {
          const labelLower =
            h.label.toLowerCase();

          const isLegacyWeekday =
            h.key ===
              "workout_complete" ||
            h.key ===
              "early_morning" ||
            labelLower.includes(
              "workout",
            ) ||
            /\d{1,2}:\d{2}\s*[ap]m/i.test(
              labelLower,
            );

          const isWeekdayOnly =
            h.isWeekdayOnly !==
            undefined
              ? h.isWeekdayOnly
              : isLegacyWeekday;

          if (
            isWeekend &&
            isWeekdayOnly
          ) {
            return;
          }

          totalPossibleChecks++;

          if (
            k === selectedDay &&
            habits[h.key]
          ) {
            totalCompletedChecks++;
          } else if (
            parsedHabits[h.key]
          ) {
            totalCompletedChecks++;
          }
        },
      );

      loopDate.setUTCDate(
        loopDate.getUTCDate() +
          1,
      );
    }

    const formScore =
      totalPossibleChecks > 0
        ? Math.round(
            (totalCompletedChecks /
              totalPossibleChecks) *
              100,
          )
        : 0;

    return {
      formScore,
    };
  }, [
    habits,
    selectedDay,
  ]);

  // ============================================================
  // COMPLETION
  // ============================================================

  const done =
    activeHabits.filter(
      h => habits[h.key],
    ).length;

  // ============================================================
  // LOAD ASCENSION PROFILE
  //
  // IMPORTANT:
  // New onboarding uses `dailyTargets`.
  //
  // Older profiles may use `targets`.
  //
  // Support both so existing users don't break.
  // ============================================================

  const profile =
    getAscensionProfile();

  const liveTargets =
    profile?.dailyTargets ??
    profile?.targets ??
    DAILY_TARGETS;

  // ============================================================
  // DAILY TARGETS
  // ============================================================

  const caloriesMin =
    Number(
      liveTargets?.caloriesMin ??
        DAILY_TARGETS.caloriesMin ??
        0,
    );

  const caloriesMax =
    Number(
      liveTargets?.caloriesMax ??
        DAILY_TARGETS.caloriesMax ??
        0,
    );

  const protein =
    Number(
      liveTargets?.protein ??
        DAILY_TARGETS.protein ??
        0,
    );

  const steps =
    Number(
      liveTargets?.steps ??
        DAILY_TARGETS.steps ??
        0,
    );

  const routine =
    liveTargets?.routine ??
    DAILY_TARGETS.routine ??
    "";

  // ============================================================
  // TARGET CARDS
  // ============================================================

  const targetStats = [
    {
      icon: Utensils,
      label: "Calories",
      value: `${caloriesMin.toLocaleString()}–${caloriesMax.toLocaleString()} kcal`,
    },

    {
      icon: Beef,
      label: "Protein",
      value: `${protein.toLocaleString()}g+`,
    },

    {
      icon: Footprints,
      label: "Steps",
      value: steps.toLocaleString(),
    },

    {
      icon: Sunrise,
      label: "Routine",
      value: routine,
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <section className="panel p-5 space-y-4 w-full overflow-hidden">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="flex items-center justify-between gap-2">

        <div className="flex items-center gap-2 min-w-0 flex-1">

          <Dumbbell className="size-5 shrink-0 text-primary" />

          <h2 className="text-base sm:text-lg font-bold truncate">
            Daily Non-Negotiables
          </h2>

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

      {/* ======================================================
          DAILY TARGETS
          ====================================================== */}

      <div className="grid gap-2 sm:grid-cols-2">

        {targetStats.map(s => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/60 p-3"
          >

            <s.icon className="size-4 shrink-0 text-primary" />

            <div className="min-w-0 flex-1">

              <p className="stat-label">
                {s.label}
              </p>

              <p className="truncate text-sm font-semibold">
                {s.value}
              </p>

            </div>

          </div>
        ))}

      </div>

      {/* ======================================================
          DATE NAVIGATION
          ====================================================== */}

      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2/40 px-3 py-2">

        <button
          type="button"
          onClick={() =>
            stepDay(-1)
          }
          className="rounded p-1 text-muted-foreground hover:text-primary transition-colors active:bg-surface-2"
          aria-label="Previous Day"
        >
          <ChevronLeft className="size-4" />
        </button>

        <span className="text-xs font-semibold tracking-wide text-foreground truncate px-2">
          {dateHeading} ({selectedDay})
        </span>

        <button
          type="button"
          onClick={() =>
            stepDay(1)
          }
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

      {/* ======================================================
          HABITS
          ====================================================== */}

      <div className="space-y-2 pt-0.5">

        <p className="stat-label">
          Habit Check
        </p>

        {activeHabits.map(
          habit => {
            const isChecked =
              Boolean(
                habits[
                  habit.key
                ],
              );

            return (
              <label
                key={habit.key}
                className={`flex min-h-12 cursor-pointer items-center justify-between rounded-lg border px-3 py-3 transition-colors ${
                  isChecked
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-surface-2/40 hover:bg-surface-2/70 active:bg-surface-2"
                }`}
              >

                <div className="min-w-0 flex-1 pr-3">

                  <span
                    className={`block text-sm font-medium leading-snug ${
                      isChecked
                        ? "text-primary font-semibold"
                        : "text-foreground"
                    }`}
                  >
                    {habit.label}
                  </span>

                  {habit.sublabel && (
                    <span className="block text-[11px] text-muted-foreground">
                      {habit.sublabel}
                    </span>
                  )}

                </div>

                <Checkbox
                  checked={
                    isChecked
                  }
                  onCheckedChange={() =>
                    onToggle(
                      habit.key,
                    )
                  }
                  className="size-5 shrink-0"
                />

              </label>
            );
          },
        )}

      </div>

      {/* ======================================================
          JOURNAL
          ====================================================== */}

      <div className="pt-2">

        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">

          <BookOpen className="size-3.5 text-primary" />

          <span className="truncate">
            Daily Journal / Log ({selectedDay})
          </span>

        </div>

        <textarea
          ref={textareaRef}
          rows={2}
          value={note}
          placeholder="Log weight, workout reflection, hunger, or thoughts..."
          onChange={e =>
            handleNoteChange(
              e.target.value,
            )
          }
          className="w-full min-h-[68px] resize-none rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none transition-all"
        />

      </div>

    </section>
  );
}
