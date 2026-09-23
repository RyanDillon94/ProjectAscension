import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  getActiveBlockDetails,
  getActiveBlockCountdown,
  getActiveHabits, 
  todayKey, 
  DAILY_TARGETS, 
  GOAL_WEIGHT 
} from "@/lib/project35";
import { triggerFridayBackup } from "@/lib/p35-cloud";
import { CalendarCheck, Camera, Loader2, Sparkles, Trophy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getMondayKeyForDate } from "./WeeklyProtocolCard";

function getCoachSystemPrompt() {
  const { activePhase, activeBlock } = getActiveBlockDetails();

  return `You are the Project Ascension performance coach: direct, no-fluff, and technically sharp.
Rules:
- Celebrate only earned wins, briefly. No hype, no filler, no emoji.
- Athlete Phase Context: Phase ${activePhase.id} (${activePhase.title}) — ${activeBlock.name}. Focus: ${activeBlock.focus.join(", ")}. Phase Summary: ${activePhase.summary}
- Live Targets: ${DAILY_TARGETS.caloriesMin.toLocaleString()}–${DAILY_TARGETS.caloriesMax.toLocaleString()} kcal, ${DAILY_TARGETS.protein}g+ protein, ${DAILY_TARGETS.steps.toLocaleString()} steps daily, routine standard: "${DAILY_TARGETS.routine}", target benchmark: ${GOAL_WEIGHT} lbs.
- UNIT FIDELITY: Mirror the exact units logged in the Hevy payload (kg or lbs). Pounds for bodyweight.
- MANDATORY FORMATTING: You must output the review using EXACTLY four headers. Do not change them. Do not generate empty bullet points. Keep answers under 350 words.`;
}

function FormattedSynthesis({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
      {text.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("**")) {
          return (
            <p key={i} className="font-bold text-primary pt-3 first:pt-0 text-sm">
              {trimmed.slice(2, -2)}
            </p>
          );
        }

        const formattedLine = trimmed.replace(/\*\*(.*?)\*\*/g, "$1");
        const isBullet = formattedLine.startsWith("*") || formattedLine.startsWith("-");
        const cleanText = isBullet ? formattedLine.replace(/^[*-\s]+/, "• ") : formattedLine;

        return (
          <p key={i} className={isBullet ? "pl-2 font-medium text-foreground/90" : ""}>
            {cleanText}
          </p>
        );
      })}
    </div>
  );
}

export function FinaliseWeekBanner({ userId }: { userId: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    isSunday: boolean;
    isMonday: boolean;
    isOverdue: boolean;
    evaluationDateStr: string;
    isPhotoWeek: boolean;
    totalPossible: number;
    totalCompleted: number;
    overallPercentage: number;
    habitBreakdown: { label: string; completed: number; total: number }[];
    weeklyProtocolGoals: { id: string; text: string; completed: boolean; status?: "completed" | "failed" | "pending"; targetCount?: number; completedCount?: number; notes?: string }[];
    weightHistory: { date: string; weight: number }[];
    journals: string[];
    hevyWorkouts: string[];
    aiSummary: string;
    hasRequiredWeighIn: boolean;
    isFinalised: boolean;
  } | null>(null);

  const calculateWeekData = useCallback(() => {
    const todayStr = todayKey();
    const realTodayObj = new Date(todayStr + "T00:00:00Z");
    const dayOfWeek = realTodayObj.getUTCDay();
    const isSunday = dayOfWeek === 0;
    const isMonday = dayOfWeek === 1;

    // Determine which week we are evaluating. If it's Monday, look at yesterday (Sunday).
    let evaluationDateObj = realTodayObj;
    if (isMonday) {
      evaluationDateObj = new Date(realTodayObj.getTime() - 24 * 60 * 60 * 1000);
    }
    const evaluationDateStr = evaluationDateObj.toISOString().slice(0, 10);

    const weekKey = `p35_finalised_week_${evaluationDateStr}`;
    const lastLocked = localStorage.getItem("p35_last_locked_week");
    const isFinalised = localStorage.getItem(weekKey) !== null || lastLocked === evaluationDateStr;

    let hasWeighedIn = false;
    let weightHistory: { date: string; weight: number }[] = [];
    const validWeekDates = new Set<string>();

    try {
      const rawWeights = userId 
        ? localStorage.getItem(`p35_weigh_ins_${userId}`) || localStorage.getItem("p35_weigh_ins")
        : localStorage.getItem("p35_weigh_ins");
      
      if (rawWeights) {
        const parsedEntries = JSON.parse(rawWeights);
        if (Array.isArray(parsedEntries)) {
          hasWeighedIn = parsedEntries.some((e: any) => e.date === evaluationDateStr);
          weightHistory = parsedEntries
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
        }
      }
    } catch (err) {
      console.error("Failed to check weigh-in history:", err);
    }

    // Relax the weigh-in lock for Monday Overdue state so you don't get permanently stuck
    const hasRequiredWeighIn = isMonday ? true : hasWeighedIn;

    const mondayKey = getMondayKeyForDate(evaluationDateStr);
    const rawProtocol = localStorage.getItem(`p35_weekly_protocol_${mondayKey}`);
    const weeklyProtocolGoals = rawProtocol 
      ? JSON.parse(rawProtocol).map((g: any) => ({
          ...g,
          status: g.status || (g.completed ? "completed" : "pending")
        })) 
      : [];

    // REMOVED HARDCODED DATE - Dynamically fetch week from engine
    const { currentWeek } = getActiveBlockCountdown();
    const isPhotoWeek = evaluationDateObj.getUTCDay() === 0 && currentWeek % 4 === 0;

    const habitStats: Record<string, { label: string; completed: number; total: number; expectedTotal: number }> = {};
    let totalPossibleChecks = 0;
    let totalCompletedChecks = 0;
    const journals: string[] = [];
    const hevyWorkouts: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(evaluationDateObj);
      d.setUTCDate(evaluationDateObj.getUTCDate() - i);
      const k = d.toISOString().slice(0, 10);
      validWeekDates.add(k);
      
      const loopDayOfWeek = d.getUTCDay();
      const isWeekend = loopDayOfWeek === 0 || loopDayOfWeek === 6;

      const dayHabits = getActiveHabits(d);
      const rawHabits = localStorage.getItem(`p35_habits_${k}`);
      let parsedHabits: Record<string, boolean> = {};
      if (rawHabits) {
        try {
          parsedHabits = JSON.parse(rawHabits);
        } catch {}
      }

      dayHabits.forEach((h) => {
        if (h.key.startsWith("weekend_")) return;

        const labelLower = h.label.toLowerCase();
        const isWeekdayOnly = 
          h.key === "early_morning" || 
          h.key === "workout_complete" ||
          labelLower.includes("6:00 am") || 
          labelLower.includes("early morning");

        if (isWeekend && isWeekdayOnly) return;

        if (!habitStats[h.key]) {
          const expectedTotal = isWeekdayOnly ? 5 : 7;
          habitStats[h.key] = { 
            label: h.label, 
            completed: 0, 
            total: expectedTotal,
            expectedTotal
          };
        }

        if (parsedHabits[h.key]) {
          habitStats[h.key].completed++;
        }
      });

      const rawJournal = localStorage.getItem(`p35_journal_${k}`);
      if (rawJournal && rawJournal.trim()) {
        journals.push(`${k}: ${rawJournal.trim()}`);
      }
    }

    try {
      const allHevyRaw = localStorage.getItem("p35_hevy_workouts") || localStorage.getItem("hevy_cache");
      if (allHevyRaw) {
        const parsedHevy = JSON.parse(allHevyRaw);
        const workoutsArray = Array.isArray(parsedHevy) ? parsedHevy : (parsedHevy.workouts || []);
        
        workoutsArray.forEach((w: any) => {
          const workoutDate = w.start_time?.slice(0, 10) || w.startTime?.slice(0, 10);
          if (workoutDate && validWeekDates.has(workoutDate)) {
            const exSummary = w.exercises?.map((ex: any) => {
              const setsSummary = ex.sets?.map((s: any) => {
                const weight = s.weightKg ?? s.weightLbs ?? s.weight ?? "BW";
                const unit = s.weightLbs != null ? "lbs" : "kg";
                return `${weight}${unit}x${s.reps}`;
              }).join(", ");
              return `${ex.title} (${setsSummary})`;
            }).join(" | ");
            hevyWorkouts.push(`${workoutDate}: ${w.title} - ${exSummary}`);
          }
        });
      }
    } catch (e) {
      console.warn("Failed to parse Hevy workouts for synthesis", e);
    }

    const finalizedBreakdown = Object.values(habitStats).map((stat) => {
      const completed = Math.min(stat.completed, stat.expectedTotal);
      return {
        label: stat.label,
        completed,
        total: stat.expectedTotal,
      };
    });

    totalPossibleChecks = finalizedBreakdown.reduce((acc, curr) => acc + curr.total, 0);
    totalCompletedChecks = finalizedBreakdown.reduce((acc, curr) => acc + curr.completed, 0);

    const corePercentage = totalPossibleChecks > 0 ? (totalCompletedChecks / totalPossibleChecks) * 100 : 0;

    let protocolPercentage = 0;
    if (weeklyProtocolGoals.length > 0) {
      let totalProtocolTicks = 0;
      let completedProtocolTicks = 0;
  
      weeklyProtocolGoals.forEach((g: any) => {
        const target = g.targetCount && g.targetCount > 0 ? g.targetCount : 1;
        const done = g.completedCount ?? (g.completed ? target : 0);
        
        totalProtocolTicks += target;
        completedProtocolTicks += done;
      });
  
      protocolPercentage = totalProtocolTicks > 0 
        ? (completedProtocolTicks / totalProtocolTicks) * 100 
        : 0;
    }
  
    const hasProtocols = weeklyProtocolGoals.length > 0;
    const finalScore = hasProtocols 
      ? (corePercentage * 0.90) + (protocolPercentage * 0.10)
      : corePercentage;
  
    const overallPercentage = Math.round(finalScore);

    setSummaryData((prev) => {
      const currentAiSummary = prev?.aiSummary;
      const keepExisting = currentAiSummary && currentAiSummary !== "Tap below to generate your AI weekly journal synthesis and performance verdict.";

      return {
        isSunday,
        isMonday,
        isOverdue: isMonday && !isFinalised,
        evaluationDateStr,
        isPhotoWeek,
        totalPossible: totalPossibleChecks,
        totalCompleted: totalCompletedChecks,
        overallPercentage: Math.min(100, Math.max(0, overallPercentage)),
        habitBreakdown: finalizedBreakdown,
        weeklyProtocolGoals,
        weightHistory,
        journals,
        hevyWorkouts,
        aiSummary: keepExisting ? currentAiSummary : "Tap below to generate your AI weekly journal synthesis and performance verdict.",
        hasRequiredWeighIn,
        isFinalised,
      };
    });
  }, [userId]);

  useEffect(() => {
    calculateWeekData();
  }, [calculateWeekData]);

  const generateAiSummary = async () => {
    if (!summaryData) return;
    
    const apiKey = localStorage.getItem("p35_gemini_api_key");
    if (!apiKey) {
      toast.error("Add your Gemini API key first.");
      setLoadingAi(false);
      return;
    }

    setLoadingAi(true);
    try {
      const journalText = summaryData.journals.length > 0 ? summaryData.journals.join("\n") : "No daily journal notes recorded this week.";
      const hevyText = summaryData.hevyWorkouts.length > 0 ? summaryData.hevyWorkouts.join("\n") : "No Hevy workouts logged this week.";
      const breakdownText = summaryData.habitBreakdown
        .map((h) => `- ${h.label}: ${h.completed}/${h.total}`)
        .join("\n");
        
      const protocolText = summaryData.weeklyProtocolGoals.length > 0
        ? summaryData.weeklyProtocolGoals
            .map((g) => {
              const countText = (g.targetCount && g.targetCount > 0) ? ` (${g.completedCount || 0}/${g.targetCount})` : "";
              const notesText = g.notes ? ` - Notes/Reason: ${g.notes}` : "";
              return `- "${g.text}" [Status: ${(g.status || (g.completed ? "completed" : "pending")).toUpperCase()}${countText}]${notesText}`;
            })
            .join("\n")
        : "No weekly execution focus targets logged.";

      const weightText = summaryData.weightHistory.length > 0
        ? summaryData.weightHistory.map((w) => `- ${w.date}: ${w.weight} lbs`).join("\n")
        : "No weigh-ins logged recently.";

      const contextBundle = `Weekly Adherence: ${summaryData.overallPercentage}% (${summaryData.totalCompleted}/${summaryData.totalPossible} total checks).\nHabit Breakdown:\n${breakdownText}\n\nRecent Bodyweight Log:\n${weightText}\n\nWeekly Execution Protocol Targets:\n${protocolText}\n\nLifting Sessions (Hevy):\n${hevyText}\n\nDaily Journal Notes:\n${journalText}`;
      
      const userPrompt = `Review my completed week based on the performance data, bodyweight trend, protocol targets, journal notes, and workout logs.

You MUST structure your response EXACTLY with these four markdown headers and nothing else:

**The Numbers**
(Provide a concise, hard-hitting coaching narrative on my scale weight, habit adherence, and protocol execution. Do not just blindly list the stats—interpret what my completion rates actually mean for my momentum and discipline.)

**The Standard**
(Your uncompromising narrative on my execution and lifestyle discipline. Weave the journal entries in. Strictly enforce my goals if I am slacking. If I am missing the early alarm, negotiating with myself, or compliance is off, tell me to sort my shit out.)

**The Iron**
(Do not list every exercise like a receipt. Analyze progressive overload, volume, and consistency across the week based on the Hevy logs. Highlight one specific lift I need to push heavier on next week.)

**Next Action**
(A single, highly specific directive for tomorrow's execution.)

Do NOT output any empty bullet points. Do NOT alter the headers.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: `${getCoachSystemPrompt()}\n\nATHLETE PROFILE & LIVE METRICS:\n${contextBundle}` }],
          },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini request failed (${res.status})`);
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) throw new Error("No response generated by Gemini.");

      setHasGenerated(true);
      setSummaryData((prev) => (prev ? { ...prev, aiSummary: reply.trim() } : null));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate AI weekly summary.");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleLockInWeek = async () => {
    if (!summaryData || !summaryData.hasRequiredWeighIn) {
      return;
    }

    const lockDateStr = summaryData.evaluationDateStr;
    const weekKey = `p35_finalised_week_${lockDateStr}`;
    const overallPct = summaryData.overallPercentage ?? 0;
    
    const { activePhase, activeBlock } = getActiveBlockDetails();
    const mondayKey = getMondayKeyForDate(lockDateStr);
    const formatShortDate = (dStr: string) => new Date(dStr).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
    const dateRangeStr = `${formatShortDate(mondayKey)} - ${formatShortDate(lockDateStr)}`;

    const fullBackupData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("p35_")) {
        fullBackupData[key] = localStorage.getItem(key) || "";
      }
    }

    const weekArchiveRecord = {
      date: lockDateStr,
      dateRange: dateRangeStr,
      phaseTitle: `Phase ${activePhase.id}: ${activePhase.title}`,
      blockName: activeBlock.name,
      overallPercentage: overallPct,
      totalCompleted: summaryData.totalCompleted ?? 0,
      totalPossible: summaryData.totalPossible ?? 0,
      breakdown: summaryData.habitBreakdown ?? [],
      weeklyProtocolGoals: summaryData.weeklyProtocolGoals ?? [],
      aiSynthesis: summaryData.aiSummary.includes("Tap below to generate") ? "" : summaryData.aiSummary,
      fullLocalStorageSnapshot: fullBackupData,
    };

    try {
      localStorage.setItem(weekKey, JSON.stringify(weekArchiveRecord));
      localStorage.setItem("p35_last_locked_week", lockDateStr);
      await triggerFridayBackup(lockDateStr);
    } catch (err) {
      console.error("Failed to save weekly archive or trigger backup", err);
    }
    
    setIsOpen(false);
    calculateWeekData();

    window.dispatchEvent(new Event("p35-week-finalised"));

    if (overallPct < 50) {
      toast.error(`Week locked in at ${overallPct}%. Absolute shambles. Sort your shit out.`);
    } else if (overallPct < 80) {
      toast.error(`Week locked in at ${overallPct}%. Decent base, but you left meat on the bone.`);
    } else if (overallPct === 100) {
      toast.success(`Week locked in at 100%. Absolute clinic. Flawless execution.`);
    } else {
      toast.success(`Week locked in at ${overallPct}%. Smashing it. Standard held.`);
    }
  };

  // Only render on Sundays OR if it's Monday and they haven't locked in yet.
  if (!summaryData) return null;
  if (!summaryData.isSunday && !summaryData.isOverdue) return null;

  return (
    <div className={`panel p-4 space-y-3 ${summaryData.isOverdue ? "border-amber-500/50 bg-amber-500/10" : summaryData.isFinalised ? "border-emerald-500/40 bg-emerald-500/10" : "border-primary/40 bg-primary/10"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${summaryData.isOverdue ? "bg-amber-500/20 text-amber-500" : summaryData.isFinalised ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary"}`}>
            {summaryData.isOverdue ? <AlertCircle className="size-5" /> : summaryData.isFinalised ? <Check className="size-5" /> : <CalendarCheck className="size-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {summaryData.isOverdue ? "Overdue: Finalise Last Week" : summaryData.isFinalised ? "Sunday: Week Finalised & Locked" : "Sunday: Finalise Week"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {summaryData.isOverdue 
                ? "You missed Sunday's check-in. Review and lock in your week now." 
                : summaryData.isFinalised 
                  ? "Weekly audit complete and backed up. Refinalise anytime if adjustments are needed." 
                  : "Review metrics, protocol targets, synthesize journals, and lock in."}
            </p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (open) {
            calculateWeekData();
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant={summaryData.isOverdue ? "default" : summaryData.isFinalised ? "outline" : "default"} 
              className={`gap-1.5 shrink-0 ${summaryData.isOverdue ? "bg-amber-500 text-black hover:bg-amber-600" : ""}`}
            >
              {summaryData.isOverdue ? "Finalise Now" : summaryData.isFinalised ? "Review" : "Finalise"}
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="size-5 text-primary" />
                Week in Review
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {!summaryData.hasRequiredWeighIn && (
                <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 p-3 flex items-start gap-2.5 text-rose-400">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold">Missing Weigh-in</p>
                    <p className="mt-0.5 text-rose-300">You must log a bodyweight entry for {summaryData.evaluationDateStr} before locking in the week.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-center">
                  <p className="stat-label">Adherence</p>
                  <p className="font-display text-2xl font-bold text-primary">{summaryData.overallPercentage}%</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-center">
                  <p className="stat-label">Check-ins</p>
                  <p className="font-display text-2xl font-bold text-primary">{summaryData.totalCompleted}/{summaryData.totalPossible}</p>
                </div>
              </div>

              {summaryData.isPhotoWeek && (
                <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <Camera className="size-4" />
                  End of Block: Mandatory Physique Update Required
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Coach Synthesis</h4>
                {summaryData.aiSummary.includes("Tap below to generate") ? (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary" 
                    onClick={generateAiSummary}
                    disabled={loadingAi}
                  >
                    {loadingAi ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {loadingAi ? "Analyzing Week..." : "Generate Performance Verdict"}
                  </Button>
                ) : (
                  <div className="rounded-lg border border-primary/30 bg-surface-2/40 p-4">
                    <FormattedSynthesis text={summaryData.aiSummary} />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 w-full gap-2 text-xs" 
                      onClick={generateAiSummary}
                      disabled={loadingAi}
                    >
                      {loadingAi ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                      Regenerate Synthesis
                    </Button>
                  </div>
                )}
              </div>
              
              <Button 
                className="w-full font-bold" 
                size="lg" 
                onClick={handleLockInWeek}
                disabled={!summaryData.hasRequiredWeighIn || loadingAi || summaryData.aiSummary.includes("Tap below to generate")}
              >
                {summaryData.isFinalised ? "Update Locked Week" : "Lock In Week"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
