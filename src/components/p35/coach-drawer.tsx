import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Key,
  Loader2,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { HevyWorkout } from "@/lib/hevy.functions";
import { useCoachMessages } from "@/lib/p35-cloud";

// ============================================================
// TYPES
// ============================================================

type CoachMsg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type CoachDrawerProps = {
  workout?: HevyWorkout | null;
  entries?: any[];
  userId?: string;
};

// ============================================================
// GEMINI MODELS
// ============================================================

const GEMINI_MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

// ============================================================
// SYSTEM INSTRUCTIONS
// ============================================================

const SYSTEM_INSTRUCTIONS = `
You are Coach Clive, the AI strength and progression coach inside Project 35.

Your job is to analyse the user's actual training data, identify trends, explain progression, and give practical recommendations.

IMPORTANT DATA RULES:

1. The workout data supplied in LIVE WORKOUT CONTEXT is authoritative.
2. Do not invent workouts, sets, weights, reps, dates, RPEs or progression.
3. Do not assume that a workout is the same as another workout merely because the exercises or title look similar.
4. A workout is considered previously analysed ONLY when the exact SESSION ID is explicitly listed in PREVIOUSLY ANALYSED SESSION IDS.
5. Never say "we've already checked this", "we've already gone through this", "we discussed this workout before", or equivalent merely because:
   - the exercises are similar;
   - the workout title is similar;
   - the weights are similar;
   - an older workout appears in the conversation;
   - you remember a previous recommendation.
6. If the exact current SESSION ID is not listed as previously analysed, treat the current workout as NEW.
7. Never claim to have seen data that is not included in the current request.
8. When information is missing, say that it is missing rather than filling the gap with an assumption.

WORKOUT ANALYSIS:

When analysing a workout:
- Analyse the exact session supplied.
- Compare it with previous sessions only when previous session data has actually been supplied.
- Look at exercise performance, reps, load, volume, RPE where available, and progression.
- Distinguish genuine progression from changes caused by different rep ranges or exercise selection.
- Do not call something progression simply because the exercise name is the same.
- Be honest about uncertainty.

CONVERSATION MEMORY:

Normal coaching conversation may contain previous messages.

However, old conversation messages do NOT prove that the current workout has previously been analysed.

For a workout-analysis request, the CURRENT SESSION ID and CURRENT WORKOUT DATA take priority over any previous conversational discussion.

DATES:

Use UK date format:
DD/MM/YYYY.

STYLE:

Be direct, practical and conversational.

Do not excessively repeat the user's data.

When discussing progression, give the user a clear explanation of what happened and what they should do next.
`;

// ============================================================
// HELPERS
// ============================================================

function formatUKDate(value?: string | null): string {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function normalise(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Creates a deterministic ID from the actual workout contents.
 *
 * This means two sessions with the same exercise names but different
 * sets/weights/reps will normally have different IDs.
 */
function getWorkoutSessionId(workout: HevyWorkout | null | undefined): string {
  if (!workout) return "no-workout";

  const fingerprint = {
    title: normalise(workout.title),
    startTime: normalise(workout.startTime),
    exercises: (workout.exercises ?? []).map((exercise) => ({
      title: normalise(exercise.title),
      notes: normalise(exercise.notes),
      sets: (exercise.sets ?? []).map((set) => ({
        weightKg: set.weightKg ?? null,
        weightLbs: set.weightLbs ?? null,
        reps: set.reps ?? null,
        rpe: set.rpe ?? null,
        distance_meters: set.distance_meters ?? null,
        duration_seconds: set.duration_seconds ?? null,
      })),
    })),
  };

  const input = JSON.stringify(fingerprint);

  // Small deterministic browser-safe hash.
  let hash = 2166136261;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return `workout-${(hash >>> 0).toString(16)}`;
}

// ============================================================
// WORKOUT CONTEXT
// ============================================================

function buildWorkoutContext(
  workout: HevyWorkout | null,
  entries: any[] = [],
) {
  if (!workout) {
    return `
CURRENT WORKOUT:
No workout is currently loaded.

Do not pretend that a workout is available.
`;
  }

  const sessionId = getWorkoutSessionId(workout);

  const lines: string[] = [];

  lines.push("============================================================");
  lines.push("CURRENT WORKOUT — THIS IS THE SESSION TO ANALYSE");
  lines.push("============================================================");

  lines.push(`SESSION ID: ${sessionId}`);
  lines.push(`TITLE: ${workout.title || "Untitled workout"}`);
  lines.push(`DATE: ${formatUKDate(workout.startTime)}`);
  lines.push(`RAW START TIME: ${workout.startTime || "Unknown"}`);
  lines.push("");

  for (const exercise of workout.exercises ?? []) {
    lines.push(`EXERCISE: ${exercise.title}`);

    if (exercise.notes) {
      lines.push(`NOTES: ${exercise.notes}`);
    }

    for (let i = 0; i < (exercise.sets ?? []).length; i++) {
      const set = exercise.sets[i];

      const weight =
        set.weightKg != null
          ? `${set.weightKg} kg`
          : set.weightLbs != null
            ? `${set.weightLbs} lb`
            : "bodyweight / no load recorded";

      const reps =
        set.reps != null ? `${set.reps} reps` : "reps not recorded";

      const rpe =
        set.rpe != null ? ` | RPE ${set.rpe}` : "";

      const distance =
        set.distance_meters != null
          ? ` | ${set.distance_meters} m`
          : "";

      const duration =
        set.duration_seconds != null
          ? ` | ${set.duration_seconds}s`
          : "";

      lines.push(
        `  Set ${i + 1}: ${weight} × ${reps}${rpe}${distance}${duration}`,
      );
    }

    lines.push("");
  }

  if (entries.length > 0) {
    lines.push("============================================================");
    lines.push("PROJECT 35 CONTEXT");
    lines.push("============================================================");

    lines.push(`Relevant entries available: ${entries.length}`);
    lines.push("");
  }

  lines.push("============================================================");
  lines.push("ANALYSIS IDENTITY RULE");
  lines.push("============================================================");
  lines.push(
    `The exact current session is "${sessionId}".`,
  );
  lines.push(
    "Treat this workout as NEW unless this exact session ID appears in the explicit previously-analysed list supplied with the request.",
  );

  return lines.join("\n");
}

// ============================================================
// FULL AI CONTEXT
// ============================================================

function buildContext(
  workout: HevyWorkout | null,
  entries: any[] = [],
) {
  return `
${SYSTEM_INSTRUCTIONS}

============================================================
LIVE PROJECT 35 CONTEXT
============================================================

Current coaching context is supplied by the application.

${buildWorkoutContext(workout, entries)}
`;
}

// ============================================================
// GEMINI CALL
// ============================================================

async function callGemini(
  apiKey: string,
  history: CoachMsg[],
  newPrompt: string,
  systemContext: string,
  includeHistory: boolean,
) {
  let lastError = "";

  /*
   * IMPORTANT:
   *
   * For workout analysis we deliberately DO NOT send the old
   * conversation history.
   *
   * Gemini's generateContent API treats the contents array as
   * conversation context. Sending previous analysis messages can
   * therefore make a new workout appear to have been discussed.
   *
   * Normal chat still receives the recent conversation.
   */
  const recentHistory = includeHistory ? history.slice(-10) : [];

  const contents = [
    ...recentHistory.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),

    {
      role: "user",
      parts: [{ text: newPrompt }],
    },
  ];

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: systemContext,
                },
              ],
            },
            contents,
            generationConfig: {
              temperature: 0.35,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();

        lastError = `${model}: ${response.status} ${errorText}`;

        continue;
      }

      const data = await response.json();

      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((part: any) => part?.text ?? "")
          .join("")
          .trim() || "";

      if (!text) {
        lastError = `${model}: Gemini returned an empty response`;
        continue;
      }

      return {
        text,
        model,
      };
    } catch (error) {
      lastError =
        `${model}: ` +
        (error instanceof Error ? error.message : String(error));

      continue;
    }
  }

  throw new Error(
    lastError || "Unable to get a response from Gemini.",
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function CoachDrawer({
  workout,
  entries = [],
  userId,
}: CoachDrawerProps) {
  const {
    messages,
    add,
    clear,
  } = useCoachMessages(userId);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  /*
   * Keep a local copy of the workout so the Coach can immediately
   * pick up a newly imported/manual workout.
   */
  const [activeWorkout, setActiveWorkout] =
    useState<HevyWorkout | null>(workout ?? null);

  // ============================================================
  // API KEY
  // ============================================================

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem("p35_gemini_api_key");

    if (saved) {
      setApiKey(saved);
    }
  }, []);

  // ============================================================
  // PROP -> LOCAL WORKOUT
  // ============================================================

  useEffect(() => {
    if (workout) {
      setActiveWorkout(workout);
    }
  }, [workout]);

  // ============================================================
  // LOAD CACHED WORKOUT
  // ============================================================

  useEffect(() => {
    if (typeof window === "undefined") return;

    /*
     * If the parent hasn't supplied a workout yet, use the latest
     * cached workout from the Hevy importer/manual parser.
     */
    if (!workout) {
      try {
        const cached = localStorage.getItem(
          "p35_cached_workout",
        );

        if (cached) {
          const parsed = JSON.parse(cached);

          if (parsed) {
            setActiveWorkout(parsed);
          }
        }
      } catch {
        // Ignore malformed cache.
      }
    }
  }, [workout]);

  // ============================================================
  // LIVE WORKOUT UPDATE EVENT
  // ============================================================

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleWorkoutUpdate = (event: Event) => {
      const customEvent =
        event as CustomEvent<HevyWorkout>;

      if (!customEvent.detail) return;

      setActiveWorkout(customEvent.detail);
    };

    window.addEventListener(
      "p35:workout-updated",
      handleWorkoutUpdate,
    );

    return () => {
      window.removeEventListener(
        "p35:workout-updated",
        handleWorkoutUpdate,
      );
    };
  }, []);

  // ============================================================
  // CURRENT SESSION ID
  // ============================================================

  const currentSessionId = useMemo(
    () => getWorkoutSessionId(activeWorkout),
    [activeWorkout],
  );

  // ============================================================
  // SAVE API KEY
  // ============================================================

  const saveApiKey = () => {
    const trimmed = apiKey.trim();

    if (!trimmed) {
      toast.error("Enter your Gemini API key.");
      return;
    }

    localStorage.setItem(
      "p35_gemini_api_key",
      trimmed,
    );

    setApiKey(trimmed);
    setShowKeyInput(false);

    toast.success("Gemini API key saved.");
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async (
    textOverride?: string,
    workoutAnalysis = false,
  ) => {
    const trimmed = (
      textOverride ?? input
    ).trim();

    if (!trimmed || loading) return;

    if (!apiKey.trim()) {
      setShowKeyInput(true);
      toast.error(
        "Add your Gemini API key before using Coach Clive.",
      );
      return;
    }

    setLoading(true);

    const currentHistory = [...messages];

    try {
      /*
       * For workout analysis we create a completely isolated
       * request.
       *
       * This is the important fix.
       *
       * The current workout is supplied explicitly and previous
       * Coach messages are NOT sent to Gemini.
       */
      const prompt = workoutAnalysis
        ? `
WORKOUT ANALYSIS REQUEST

CURRENT SESSION ID:
${currentSessionId}

IMPORTANT:
Analyse ONLY the current workout contained in LIVE PROJECT 35 CONTEXT.

This is a fresh analysis request.

Do NOT assume this workout has previously been analysed.

Only say that it was previously analysed if the exact current SESSION ID is explicitly present in a supplied previously-analysed session list.

User request:
${trimmed}
`
        : trimmed;

      /*
       * Workout analysis = isolated context.
       *
       * Normal chat = normal recent conversation.
       */
      const result = await callGemini(
        apiKey.trim(),
        currentHistory,
        prompt,
        buildContext(activeWorkout, entries),
        !workoutAnalysis,
      );

      await add.mutateAsync({
        role: "user",
        content: trimmed,
      });

      await add.mutateAsync({
        role: "assistant",
        content: result.text,
      });

      if (!textOverride) {
        setInput("");
      }

      if (workoutAnalysis) {
        toast.success(
          `Workout analysed: ${currentSessionId}`,
        );
      }
    } catch (error) {
      console.error("Coach Gemini error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Coach could not respond.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // KEYBOARD
  // ============================================================

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      void sendMessage();
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="w-full">
      <div className="rounded-xl border bg-card shadow-sm">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>

            <div>
              <div className="font-semibold">
                Coach Clive
              </div>

              <div className="text-xs text-muted-foreground">
                AI training & progression coach
              </div>
            </div>
          </div>

          {open ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>

        {/* ======================================================
            BODY
        ====================================================== */}

        {open && (
          <div className="border-t">
            {/* ==================================================
                CURRENT WORKOUT
            ================================================== */}

            <div className="border-b bg-muted/30 p-4">
              {activeWorkout ? (
                <>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Current workout
                  </div>

                  <div className="font-semibold">
                    {activeWorkout.title}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {formatUKDate(
                      activeWorkout.startTime,
                    )}
                  </div>

                  <div className="mt-2 rounded-md bg-background p-2 font-mono text-[10px] text-muted-foreground">
                    Session ID: {currentSessionId}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No Hevy workout currently loaded.
                </div>
              )}
            </div>

            {/* ==================================================
                API KEY
            ================================================== */}

            {showKeyInput && (
              <div className="border-b p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Key className="h-4 w-4" />
                  Gemini API key
                </div>

                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) =>
                    setApiKey(event.target.value)
                  }
                  placeholder="Paste your Gemini API key"
                  className="mb-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />

                <Button
                  type="button"
                  size="sm"
                  onClick={saveApiKey}
                >
                  Save key
                </Button>
              </div>
            )}

            {/* ==================================================
                MESSAGES
            ================================================== */}

            <div className="max-h-[500px] overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Sparkles className="mx-auto mb-3 h-6 w-6" />

                  <p className="font-medium">
                    Coach Clive is ready.
                  </p>

                  <p className="mt-1">
                    Ask about your training, progression or
                    recovery.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message: CoachMsg, index: number) => (
                    <div
                      key={
                        message.id ??
                        `${message.role}-${index}`
                      }
                      className={
                        message.role === "user"
                          ? "ml-auto max-w-[85%] rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground"
                          : "mr-auto max-w-[90%] rounded-xl bg-muted px-4 py-3 text-sm"
                      }
                    >
                      {message.content}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ==================================================
                ACTIONS
            ================================================== */}

            <div className="border-t p-4">
              <div className="mb-3 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  disabled={
                    loading ||
                    !activeWorkout ||
                    !apiKey.trim()
                  }
                  onClick={() =>
                    void sendMessage(
                      "Analyse this workout in detail. Tell me what went well, what didn't, what has progressed, what has regressed, and what I should do next session.",
                      true,
                    )
                  }
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}

                  Analyse Workout
                </Button>

                {messages.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Clear coach conversation"
                    disabled={loading}
                    onClick={async () => {
                      try {
                        await clear.mutateAsync();
                        toast.success(
                          "Coach conversation cleared.",
                        );
                      } catch {
                        toast.error(
                          "Could not clear the conversation.",
                        );
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* ==================================================
                  INPUT
              ================================================== */}

              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  rows={2}
                  placeholder="Ask Coach Clive..."
                  className="min-h-[52px] flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />

                <Button
                  type="button"
                  size="icon"
                  disabled={
                    loading ||
                    !input.trim() ||
                    !apiKey.trim()
                  }
                  onClick={() => void sendMessage()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setShowKeyInput((value) => !value)
                  }
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {apiKey
                    ? "Change Gemini API key"
                    : "Add Gemini API key"}
                </button>

                <span className="text-[10px] text-muted-foreground">
                  Enter to send · Shift+Enter for newline
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}