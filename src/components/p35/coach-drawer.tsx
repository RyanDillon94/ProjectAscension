import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HevyWorkout } from "@/lib/hevy.functions";
import type { WeightEntry } from "@/components/p35/weight-card";
import {
  DAILY_TARGETS,
  GOAL_WEIGHT,
  getActiveBlockCountdown,
} from "@/lib/project35";
import {
  useCoachMessages,
  type CoachMsg,
} from "@/lib/p35-cloud";
import {
  KeyRound,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";

type Msg = CoachMsg;

type StoredHevyWorkout = HevyWorkout & {
  id?: string;
};

/* ============================================================
   COACH SYSTEM INSTRUCTIONS
   ============================================================ */

const SYSTEM_INSTRUCTIONS = `
You are the Project Ascension performance coach: direct, knowledgeable, conversational, and technically sharp.

CONTEXT & TONE:
 * Your name is Coach Clive.
 * You are my coach. You can call me Chief, Boss or mate but only if it really calls for it. In general conversation refrain from using a name just keep it precise to the point you are making and only use names if it explicitly needs it.
 * You are an expert strength and conditioning partner helping the athlete progress across their current macrocycle toward their target peak date.
 * Match the user's intent. If they greet you ("hey", "hello"), respond naturally and ask what they want to tackle today.
 * If they ask general questions about exercise swaps, pain management, recovery, upcoming phases, or pacing, provide direct, intelligent advice grounded in their current block targets without forcing rigid templates.
 * Strictly respect the exact unit logged by the user for lifts (whether lbs or kg) and pounds for bodyweight. Never convert or translate their logged weight units. Keep responses crisp and actionable.

WORKOUT ANALYSIS MODE:
Trigger this specific structured format ONLY when the user explicitly asks to analyse, review, or evaluate a workout/session:

 * For resistance exercises:
   * Evaluate the final set RPE:
     * RPE < 7.0: PROMOTE (+ load next session).
     * RPE 7.0–8.0: PROGRESS REPS (+1 rep next session).
     * RPE 8.5–9.0: STICK (Consolidate weight/form).
     * RPE 9.5–10.0: HOLD OR DROP (-1 rep).
     * Pain flag: SWAP OR DELOAD (-20% or neutral grip alternative).

 * Never assume an initial heavier set with fewer reps is an "adjustment" or warm-up. Treat decreasing weight across sets as intentional reverse pyramid or load drops.

 * For cardio/conditioning/martial arts (walking, treadmill, elliptical, bjj, grappling, etc.):
   * Evaluate pace, duration, and distance against daily step and aerobic recovery goals.
   * Next session call should focus on maintaining baseline, increasing duration, or managing joint impact.

 * For each exercise, use the exact label format:
   * Logged: [details]
   * Assessment: [details]
   * Next Session Call: [details]
   * Athlete Notes Feedback: [details]

 * Conclude ONLY workout analyses with a 3-bullet "Next Session Battle Plan".

WORKOUT HISTORY RULES:
 * Every stored Hevy workout is a separate session.
 * Use the supplied WORKOUT ID and date/time to distinguish sessions.
 * Never assume two workouts are the same session merely because they contain the same exercises or similar weights.
 * Never claim that a workout has already been analysed simply because an older workout in the history looks similar.
 * When analysing a workout, analyse the specific workout identified as the CURRENT WORKOUT.
 * Historical workouts are provided for comparison and progression context only.
 * If an older workout was analysed previously in the conversation, that does NOT mean the current workout has already been analysed.
 * Do not invent RPE values when none were logged.
 * Do not invent exercises, sets, weights, distances, durations or notes.
`;

/* ============================================================
   HELPERS
   ============================================================ */

function isCardioExercise(
  exerciseTitle: string,
  sets: any[],
): boolean {
  const title = exerciseTitle.toLowerCase();

  const cardioKeywords = [
    "walk",
    "run",
    "treadmill",
    "elliptical",
    "cycle",
    "bike",
    "rowing",
    "stair",
    "bjj",
    "grappling",
    "wrestling",
    "mat",
  ];

  const matchesKeyword = cardioKeywords.some((k) =>
    title.includes(k),
  );

  const hasCardioMetrics = sets.some(
    (s) =>
      s.distance_meters != null ||
      s.distanceMeters != null ||
      s.km != null ||
      s.duration_seconds != null ||
      s.durationSeconds != null ||
      (s.weightKg == null &&
        s.weight_kg == null &&
        s.weightLbs == null &&
        s.weight_lbs == null &&
        s.reps == null),
  );

  return matchesKeyword || hasCardioMetrics;
}

function formatCardio(s: any): string {
  const meters =
    s.distance_meters ??
    s.distanceMeters ??
    s.distance ??
    (s.km != null ? s.km * 1000 : null);

  const kmString =
    meters != null
      ? `${(meters / 1000).toFixed(2)} km`
      : null;

  const totalSec =
    s.duration_seconds ??
    s.durationSeconds ??
    s.duration ??
    s.time;

  let timeString: string | null = null;

  if (typeof totalSec === "number") {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = Math.round(totalSec % 60);

    if (hrs > 0) {
      timeString = `${hrs}h ${mins}min`;
    } else if (mins > 0) {
      timeString = `${mins}min`;

      if (secs > 0) {
        timeString += ` ${secs}s`;
      }
    } else {
      timeString = `${secs}s`;
    }
  } else if (typeof totalSec === "string") {
    timeString = totalSec;
  }

  const parts = [timeString, kmString].filter(Boolean);

  return parts.length > 0
    ? parts.join(" • ")
    : "Completed";
}

function formatWeight(
  s: any,
  exerciseTitle: string,
): string {
  const rawWeight =
    s.weightLbs ??
    s.weight_lbs ??
    s.weightKg ??
    s.weight_kg;

  if (rawWeight == null) {
    return "BW";
  }

  const titleLower = exerciseTitle.toLowerCase();

  const isCableOrLbs =
    titleLower.includes("cable") ||
    titleLower.includes("pushdown") ||
    titleLower.includes("fly");

  if (s.weightLbs != null || s.weight_lbs != null) {
    const val = s.weightLbs ?? s.weight_lbs;
    const snapped = Math.round(val * 2) / 2;

    return `${snapped}lbs`;
  }

  if (isCableOrLbs) {
    const rawLbs = rawWeight * 2.20462;
    const snappedLbs = Math.round(rawLbs * 2) / 2;

    return `${snappedLbs}lbs`;
  }

  const roundedKg = Number.isInteger(rawWeight)
    ? rawWeight
    : Math.round(rawWeight * 10) / 10;

  return `${roundedKg}kg`;
}

/* ============================================================
   WORKOUT ID
   ============================================================ */

function hashString(input: string): string {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0)
    .toString(16)
    .padStart(8, "0");
}

function getWorkoutId(
  workout: HevyWorkout,
): string {
  const fingerprint = JSON.stringify({
    title: workout.title?.trim().toLowerCase() ?? "",
    startTime: workout.startTime ?? "",
    exercises: workout.exercises.map((ex) => ({
      title: ex.title?.trim().toLowerCase() ?? "",
      notes: ex.notes ?? "",
      sets: ex.sets.map((s: any) => ({
        weightKg:
          s.weightKg ??
          s.weight_kg ??
          null,
        weightLbs:
          s.weightLbs ??
          s.weight_lbs ??
          null,
        reps: s.reps ?? null,
        rpe: s.rpe ?? null,
        distance_meters:
          s.distance_meters ??
          s.distanceMeters ??
          null,
        duration_seconds:
          s.duration_seconds ??
          s.durationSeconds ??
          null,
      })),
    })),
  });

  return `hevy_${hashString(fingerprint)}`;
}

/* ============================================================
   DATE SORTING
   ============================================================ */

function parseWorkoutDate(
  rawDate: string | undefined,
): number {
  if (!rawDate) {
    return 0;
  }

  const value = rawDate.trim();

  // UK display format: dd/mm/yyyy HH:mm
  const ukMatch = value.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/,
  );

  if (ukMatch) {
    const [, day, month, year, hour = "0", minute = "0"] =
      ukMatch;

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    );

    return date.getTime();
  }

  const native = new Date(value);

  return Number.isNaN(native.getTime())
    ? 0
    : native.getTime();
}

/* ============================================================
   LOAD HEVY HISTORY
   ============================================================ */

function getStoredHevyHistory(): StoredHevyWorkout[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(
      "p35_hevy_workouts",
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is StoredHevyWorkout =>
        item &&
        typeof item === "object" &&
        typeof item.title === "string" &&
        Array.isArray(item.exercises),
    );
  } catch {
    return [];
  }
}

/* ============================================================
   CONTEXT BUILDER
   ============================================================ */

function buildContext(
  workout: HevyWorkout | null,
  entries: WeightEntry[],
) {
  const block = getActiveBlockCountdown();

  const sortedWeights = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date),
  );

  const trend =
    sortedWeights
      .slice(-6)
      .map(
        (e) =>
          `${e.date}: ${e.weight} lb`,
      )
      .join(", ") ||
    "no weigh-ins logged yet";

  const latestWeight =
    sortedWeights[sortedWeights.length - 1]?.weight;

  const lines: string[] = [
    `CURRENT BLOCK: ${block.phaseTitle} • ${block.blockName} (Week ${block.currentWeek} of ${block.totalWeeks})`,
    `Block Focus: ${block.goal}`,
    `Bodyweight Target: ${GOAL_WEIGHT} lbs (Latest logged: ${latestWeight ?? "unknown"} lbs | Trend: ${trend})`,
    `Daily Nutrition/Habit Standards: ${DAILY_TARGETS.caloriesMin}–${DAILY_TARGETS.caloriesMax} kcal, ${DAILY_TARGETS.protein}g+ protein, ${DAILY_TARGETS.steps} steps daily.`,
  ];

  const history = getStoredHevyHistory();

  const historyWithIds = history.map((item) => ({
    ...item,
    id: item.id ?? getWorkoutId(item),
  }));

  const sortedHistory = [...historyWithIds].sort(
    (a, b) =>
      parseWorkoutDate(a.startTime) -
      parseWorkoutDate(b.startTime),
  );

  let currentWorkoutId: string | null = null;

  if (workout) {
    currentWorkoutId = getWorkoutId(workout);

    const currentStoredIndex =
      sortedHistory.findIndex(
        (item) => item.id === currentWorkoutId,
      );

    if (currentStoredIndex === -1) {
      sortedHistory.push({
        ...workout,
        id: currentWorkoutId,
      });
    }
  }

  const recentHistory = sortedHistory.slice(-10);

  lines.push(
    "",
    `HEVY WORKOUT HISTORY: ${recentHistory.length} stored session(s).`,
  );

  if (recentHistory.length === 0) {
    lines.push("No Hevy workout history stored yet.");
  }

  for (const historyWorkout of recentHistory) {
    const id =
      historyWorkout.id ??
      getWorkoutId(historyWorkout);

    const isCurrent =
      currentWorkoutId === id;

    lines.push(
      "",
      `${isCurrent ? "CURRENT WORKOUT" : "HISTORICAL WORKOUT"} — ID: ${id}`,
      `Title: "${historyWorkout.title}"`,
      `Date/time: ${historyWorkout.startTime ?? "unknown"}`,
    );

    for (const ex of historyWorkout.exercises) {
      const isCardio = isCardioExercise(
        ex.title,
        ex.sets,
      );

      if (isCardio) {
        const cardioSummary = ex.sets
          .map((s: any) => formatCardio(s))
          .join(", ");

        const notesStr = ex.notes
          ? ` | Notes: "${ex.notes}"`
          : "";

        lines.push(
          `- ${ex.title} (Cardio/Conditioning): ${cardioSummary}${notesStr}`,
        );

        continue;
      }

      const setStr = ex.sets
        .map((s: any) => {
          const weightDisplay = formatWeight(
            s,
            ex.title,
          );

          const reps =
            s.reps != null
              ? s.reps
              : "?";

          const rpe =
            s.rpe != null
              ? ` @RPE${s.rpe}`
              : "";

          return `${weightDisplay} x ${reps}${rpe}`;
        })
        .join(", ");

      const lastSet =
        ex.sets[ex.sets.length - 1];

      const rpeStr =
        lastSet?.rpe != null
          ? ` | Final set RPE: ${lastSet.rpe}`
          : "";

      const notesStr = ex.notes
        ? ` | Notes: "${ex.notes}"`
        : "";

      const setNotesStr =
        lastSet?.notes
          ? ` | Set notes: "${lastSet.notes}"`
          : "";

      lines.push(
        `- ${ex.title}: ${setStr}${rpeStr}${notesStr}${setNotesStr}`,
      );
    }
  }

  if (workout && currentWorkoutId) {
    lines.push(
      "",
      `IMPORTANT: The CURRENT WORKOUT for this request is ID ${currentWorkoutId}.`,
      "Analyse this exact session when the user requests workout analysis. Historical sessions are comparison data only.",
    );
  }

  return lines.join("\n");
}

/* ============================================================
   GEMINI MODELS
   ============================================================ */

const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-2-flash",
];

/* ============================================================
   GEMINI REQUEST
   ============================================================ */

async function callGemini(
  apiKey: string,
  history: CoachMsg[],
  newPrompt: string,
  systemContext: string,
): Promise<{
  text: string;
  model: string;
}> {
  const recentHistory = history.slice(-10);

  const contents = [
    ...recentHistory.map((m) => ({
      role:
        m.role === "assistant"
          ? "model"
          : "user",
      parts: [
        {
          text: m.content,
        },
      ],
    })),
    {
      role: "user",
      parts: [
        {
          text: newPrompt,
        },
      ],
    },
  ];

  const payload = {
    systemInstruction: {
      parts: [
        {
          text: `${SYSTEM_INSTRUCTIONS}

ATHLETE PROFILE & LIVE METRICS:

${systemContext}`,
        },
      ],
    },
    contents,
  };

  let lastErrorMsg =
    "Gemini request failed.";

  for (const model of FALLBACK_MODELS) {
    try {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res
        .json()
        .catch(() => ({}));

      if (res.ok) {
        const text =
          data.candidates?.[0]?.content
            ?.parts?.[0]?.text;

        if (text) {
          return {
            text,
            model,
          };
        }
      }

      lastErrorMsg =
        data.error?.message ||
        `HTTP ${res.status} on ${model}`;

      console.warn(
        `Model ${model} failed (${lastErrorMsg}). Cascading to next fallback...`,
      );
    } catch (err) {
      lastErrorMsg =
        err instanceof Error
          ? err.message
          : "Network error";
    }
  }

  throw new Error(
    `All models failed: ${lastErrorMsg}`,
  );
}

/* ============================================================
   COACH MESSAGE RENDERER
   ============================================================ */

function CoachText({
  text,
}: {
  text: string;
}) {
  const cleanedText = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*-]\s+/gm, "• ");

  return (
    <div className="space-y-1.5 whitespace-pre-wrap">
      {cleanedText
        .split("\n")
        .map((line, idx) => {
          const trimmed = line.trim();

          const isHeader =
            /^[A-Z\s]{4,}:?$/.test(trimmed) ||
            trimmed.startsWith(
              "WORKOUT ANALYSIS",
            );

          if (isHeader) {
            return (
              <p
                key={idx}
                className="mt-2 font-bold text-primary"
              >
                {trimmed}
              </p>
            );
          }

          const parts = line.split(
            /(\*\*[^*]+\*\*)/g,
          );

          return (
            <p key={idx}>
              {parts.map((part, i) => {
                if (
                  part.startsWith("**") &&
                  part.endsWith("**")
                ) {
                  return (
                    <strong
                      key={i}
                      className="font-semibold text-primary"
                    >
                      {part.slice(2, -2)}
                    </strong>
                  );
                }

                return (
                  <span key={i}>
                    {part}
                  </span>
                );
              })}
            </p>
          );
        })}
    </div>
  );
}

/* ============================================================
   COACH DRAWER
   ============================================================ */

export function CoachDrawer({
  workout,
  entries,
  userId,
}: {
  workout: HevyWorkout | null;
  entries: WeightEntry[];
  userId: string | null;
}) {
  const [open, setOpen] = useState(false);

  const {
    messages,
    add,
  } = useCoachMessages(userId);

  const [input, setInput] = useState("");
  const [loading, setLoading] =
    useState(false);

  const [
    lastFailedPrompt,
    setLastFailedPrompt,
  ] = useState<string | null>(null);

  const [apiKey, setApiKey] =
    useState("");

  const [draftApiKey, setDraftApiKey] =
    useState("");

  const [
    keyDialogOpen,
    setKeyDialogOpen,
  ] = useState(false);

  const [
    activeModel,
    setActiveModel,
  ] = useState<string | null>(null);

  /*
   * Keep a local workout reference so the Coach can
   * immediately react when HevyCard imports or saves
   * a new session without requiring a page reload.
   */
  const [
    liveWorkout,
    setLiveWorkout,
  ] = useState<HevyWorkout | null>(
    workout,
  );

  const endRef =
    useRef<HTMLDivElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  /* ==========================================================
     SYNC CURRENT WORKOUT
     ========================================================== */

  useEffect(() => {
    setLiveWorkout(workout);
  }, [workout]);

  useEffect(() => {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    const handleWorkoutUpdated = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<HevyWorkout>;

      if (customEvent.detail) {
        setLiveWorkout(
          customEvent.detail,
        );
      }
    };

    window.addEventListener(
      "p35:workout-updated",
      handleWorkoutUpdated,
    );

    return () => {
      window.removeEventListener(
        "p35:workout-updated",
        handleWorkoutUpdated,
      );
    };
  }, []);

  /* ==========================================================
     LOAD GEMINI KEY
     ========================================================== */

  useEffect(() => {
    const savedKey =
      localStorage.getItem(
        "p35_gemini_api_key",
      ) || "";

    setApiKey(savedKey);
    setDraftApiKey(savedKey);
  }, []);

  /* ==========================================================
     INPUT RESIZE
     ========================================================== */

  const handleInputResize = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInput(e.target.value);

    const target = e.target;

    target.style.height = "auto";
    target.style.height = `${Math.min(
      target.scrollHeight,
      120,
    )}px`;
  };

  /* ==========================================================
     AUTO SCROLL
     ========================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      endRef.current?.scrollIntoView({
        behavior: "auto",
      });
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [open, messages.length]);

  useEffect(() => {
    if (
      typeof document === "undefined" ||
      !document.body ||
      !endRef.current
    ) {
      return;
    }

    endRef.current.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  /* ==========================================================
     API KEY
     ========================================================== */

  const saveGeminiKey = (
    key: string,
  ) => {
    const clean = key.trim();

    if (
      typeof window !== "undefined"
    ) {
      localStorage.setItem(
        "p35_gemini_api_key",
        clean,
      );
    }

    setApiKey(clean);
    setDraftApiKey(clean);
    setKeyDialogOpen(false);

    toast.success(
      clean
        ? "Gemini key saved."
        : "Gemini key removed.",
    );
  };

  /* ==========================================================
     SEND MESSAGE
     ========================================================== */

  const send = async (
    text: string,
    options?: {
      freshConversation?: boolean;
    },
  ) => {
    const trimmed = text.trim();

    if (!trimmed || loading) {
      return;
    }

    if (!apiKey) {
      setKeyDialogOpen(true);
      toast.error(
        "Add your Gemini API key first.",
      );
      return;
    }

    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height =
        "auto";
    }

    setLoading(true);
    setLastFailedPrompt(null);

    try {
      /*
       * Normal questions retain recent conversation.
       *
       * Workout analysis deliberately starts with
       * a clean Gemini conversation so an old analysis
       * cannot be mistaken for analysis of today's
       * workout.
       */
      const currentHistory =
        options?.freshConversation
          ? []
          : [...messages];

      await add.mutateAsync({
        role: "user",
        content: trimmed,
      });

      const {
        text: reply,
        model,
      } = await callGemini(
        apiKey,
        currentHistory,
        trimmed,
        buildContext(
          liveWorkout,
          entries,
        ),
      );

      setActiveModel(model);

      await add.mutateAsync({
        role: "assistant",
        content: reply,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Coach is unavailable.";

      toast.error(errorMessage);
      setLastFailedPrompt(trimmed);
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <>
      <Sheet
        onOpenChange={setOpen}
        open={open}
      >
        <SheetTrigger asChild>
          <Button
            aria-label="Open Coach AI"
            className="glow-ring fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 size-14 rounded-full"
            size="icon"
          >
            <MessageSquare className="size-6" />
          </Button>
        </SheetTrigger>

        <SheetContent
          className="flex h-[88vh] flex-col gap-0 p-0"
          side="bottom"
        >
          <SheetHeader className="border-b border-border px-5 py-4 text-left">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                Coach Clive
              </SheetTitle>

              <Button
                onClick={() =>
                  setKeyDialogOpen(true)
                }
                aria-label="Gemini API Key Settings"
                size="icon"
                variant="ghost"
              >
                <KeyRound className="size-5" />
              </Button>
            </div>

            <SheetDescription>
              Direct, no-fluff accountability on your numbers.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.length === 0 &&
              !loading && (
                <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Ask anything about your lifts,
                  exercise swaps, upcoming phases,
                  or tap the button below for a
                  full session breakdown.
                </p>
              )}

            {messages.map((m, i) => {
              const isLastAssistant =
                m.role === "assistant" &&
                i === messages.length - 1;

              return (
                <div
                  key={i}
                  className="space-y-1"
                >
                  <div
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                        : "mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-surface-2/70 px-4 py-2.5 text-sm whitespace-pre-wrap"
                    }
                  >
                    {m.role ===
                    "assistant" ? (
                      <CoachText
                        text={m.content}
                      />
                    ) : (
                      m.content
                    )}
                  </div>

                  {isLastAssistant &&
                    activeModel && (
                      <div className="flex items-center gap-1 pl-2 text-[10px] text-muted-foreground/60">
                        <Cpu className="size-2.5" />
                        <span>
                          {activeModel}
                        </span>
                      </div>
                    )}
                </div>
              );
            })}

            {loading && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl border border-border bg-surface-2/70 px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Thinking...
              </div>
            )}

            {lastFailedPrompt &&
              !loading && (
                <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                  <span>
                    Request failed. Tap retry when
                    ready.
                  </span>

                  <Button
                    className="h-7 gap-1.5 border-rose-500/40 text-rose-300 hover:bg-rose-500/20"
                    onClick={() =>
                      void send(
                        lastFailedPrompt,
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className="size-3.5" />
                    Retry
                  </Button>
                </div>
              )}

            <div ref={endRef} />
          </div>

          <div className="space-y-2 border-t border-border bg-surface-2/40 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              className="w-full"
              disabled={loading}
              onClick={() =>
                void send(
                  "Please analyse my last Hevy workout against current block targets. Evaluate RPE for each exercise, provide promote/stick/deload calls, and build my next session plan.",
                  {
                    freshConversation: true,
                  },
                )
              }
              variant="secondary"
            >
              <Sparkles className="size-4" />
              Analyse Workout & Progression
            </Button>

            <form
              className="flex items-end gap-2 rounded-xl border border-border bg-surface-2 p-2 transition-colors focus-within:border-primary"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInputResize}
                placeholder="Ask about a lift, swap, or current phase..."
                className="max-h-32 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
              />

              <Button
                className="mb-0.5 size-10 shrink-0"
                disabled={
                  loading ||
                  !input.trim()
                }
                size="icon"
                type="submit"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        onOpenChange={setKeyDialogOpen}
        open={keyDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Gemini API Key
            </DialogTitle>

            <DialogDescription>
              Stored locally on your device.
              Get a free API key from Google AI
              Studio (aistudio.google.com).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="gemini-key">
              API Key
            </Label>

            <Input
              id="gemini-key"
              onChange={(e) =>
                setDraftApiKey(
                  e.target.value,
                )
              }
              placeholder="Paste AI Studio API key"
              type="password"
              value={draftApiKey}
            />
          </div>

          <DialogFooter className="gap-2">
            {apiKey && (
              <Button
                onClick={() =>
                  saveGeminiKey("")
                }
                variant="ghost"
              >
                Remove key
              </Button>
            )}

            <Button
              onClick={() =>
                saveGeminiKey(
                  draftApiKey,
                )
              }
            >
              Save key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}