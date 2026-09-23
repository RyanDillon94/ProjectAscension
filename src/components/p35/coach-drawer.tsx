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
import { DAILY_TARGETS, GOAL_WEIGHT, getActiveBlockCountdown } from "@/lib/project35";
import { useCoachMessages, type CoachMsg } from "@/lib/p35-cloud";
import { KeyRound, Loader2, MessageSquare, RefreshCw, Send, Sparkles, Cpu } from "lucide-react";
import { toast } from "sonner";

type Msg = CoachMsg;

const SYSTEM_INSTRUCTIONS = `You are the Project Ascension performance coach: direct, knowledgeable, conversational, and technically sharp.

CONTEXT & TONE:
- Your name is Coach Clive.
- You are my coach. You can call me Chief, Boss or mate but only if it really calls for it. in general conversation refrain from using a name just keep it precise to the point you are making and only use names if it explicitly needs it.
- You are an expert strength and conditioning partner helping the athlete progress across their current macrocycle toward their target peak date.
- Match the user's intent. If they greet you ("hey", "hello"), respond naturally and ask what they want to tackle today.
- If they ask general questions about exercise swaps, pain management, recovery, upcoming phases, or pacing, provide direct, intelligent advice grounded in their current block targets without forcing rigid templates.
- Strictly respect the exact unit logged by the user for lifts (whether lbs or kg) and pounds for bodyweight. Never convert or translate their logged weight units. Keep responses crisp and actionable.

WORKOUT ANALYSIS MODE:
Trigger this specific structured format ONLY when the user explicitly asks to analyse, review, or evaluate a workout/session:
- For resistance exercises:
  * Evaluate the final set RPE:
    - RPE < 7.0: PROMOTE (+ load next session).
    - RPE 7.0–8.0: PROGRESS REPS (+1 rep next session).
    - RPE 8.5–9.0: STICK (Consolidate weight/form).
    - RPE 9.5–10.0: HOLD OR DROP (-1 rep).
    - Pain flag: SWAP OR DELOAD (-20% or neutral grip alternative).
  * Never assume an initial heavier set with fewer reps is an "adjustment" or warm-up. Treat decreasing weight across sets as intentional reverse pyramid or load drops.
- For cardio/conditioning/martial arts (walking, treadmill, elliptical, bjj, grappling, etc.):
  * Evaluate pace, duration, and distance against daily step and aerobic recovery goals.
  * Next session call should focus on maintaining baseline, increasing duration, or managing joint impact.
- For each exercise, use the exact label format:
- **Logged:** [details]
- **Assessment:** [details]
- **Next Session Call:** [details]
- **Athlete Notes Feedback:** [details]

- Conclude ONLY workout analyses with a 3-bullet "Next Session Battle Plan".`;

function isCardioExercise(exerciseTitle: string, sets: any[]): boolean {
  const title = exerciseTitle.toLowerCase();
  const cardioKeywords = ["walk", "run", "treadmill", "elliptical", "cycle", "bike", "rowing", "stair", "bjj", "grappling", "wrestling", "mat"];
  const matchesKeyword = cardioKeywords.some((k) => title.includes(k));
  const hasCardioMetrics = sets.some(
    (s) =>
      s.distance_meters != null ||
      s.distanceMeters != null ||
      s.duration_seconds != null ||
      s.durationSeconds != null ||
      s.km != null ||
      (s.weightKg == null && s.weight_kg == null && s.weightLbs == null && s.reps == null)
  );
  return matchesKeyword || hasCardioMetrics;
}

function formatCardio(s: any): string {
  const meters =
    s.distance_meters ??
    s.distanceMeters ??
    s.distance ??
    (s.km != null ? s.km * 1000 : null);

  const kmString = meters != null ? `${(meters / 1000).toFixed(2)} km` : null;

  const totalSec =
    s.duration_seconds ??
    s.durationSeconds ??
    s.duration ??
    s.time;

  let timeString: string | null = null;
  if (typeof totalSec === "number") {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      timeString = `${hrs}h ${mins}min`;
    } else if (mins > 0) {
      timeString = `${mins}min`;
    } else {
      timeString = `${secs}s`;
    }
  } else if (typeof totalSec === "string") {
    timeString = totalSec;
  }

  const parts = [timeString, kmString].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : "Completed";
}

function formatWeight(s: any, exerciseTitle: string) {
  const rawWeight = s.weightLbs ?? s.weight_lbs ?? s.weightKg ?? s.weight_kg;
  if (rawWeight == null) return "BW";

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

  const roundedKg = Number.isInteger(rawWeight) ? rawWeight : Math.round(rawWeight * 10) / 10;
  return `${roundedKg}kg`;
}

function buildContext(workout: HevyWorkout | null, entries: WeightEntry[]) {
  const block = getActiveBlockCountdown();
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const trend =
    sorted.slice(-6).map((e) => `${e.date}: ${e.weight} lb`).join(", ") ||
    "no weigh-ins logged yet";
  const latest = sorted[sorted.length - 1]?.weight;

  const lines = [
    `CURRENT BLOCK: ${block.phaseTitle} • ${block.blockName} (Week ${block.currentWeek} of ${block.totalWeeks})`,
    `Block Focus: ${block.goal}`,
    `Bodyweight Target: ${GOAL_WEIGHT} lbs (Latest logged: ${latest ?? "unknown"} lbs | Trend: ${trend})`,
    `Daily Nutrition/Habit Standards: ${DAILY_TARGETS.caloriesMin}–${DAILY_TARGETS.caloriesMax} kcal, ${DAILY_TARGETS.protein}g+ protein, ${DAILY_TARGETS.steps} steps daily.`,
  ];

  if (workout) {
    lines.push(
      `LATEST WORKOUT LOGGED IN HEVY: "${workout.title}" on ${workout.startTime ?? "recent"}.`,
      ...workout.exercises.map((ex) => {
        const isCardio = isCardioExercise(ex.title, ex.sets);
        const lastSet = ex.sets[ex.sets.length - 1];

        if (isCardio) {
          const cardioSummary = ex.sets.map((s: any) => formatCardio(s)).join(", ");
          const notesStr = ex.notes ? ` | Notes: "${ex.notes}"` : "";
          return `- ${ex.title} (Cardio/Conditioning): ${cardioSummary}${notesStr}`;
        }

        const setStr = ex.sets
          .map((s: any) => {
            const weightDisplay = formatWeight(s, ex.title);
            return `${weightDisplay} x ${s.reps ?? "?"}${
              s.rpe != null ? ` @RPE${s.rpe}` : ""
            }`;
          })
          .join(", ");
        const rpeStr = lastSet?.rpe != null ? ` | Final set RPE: ${lastSet.rpe}` : "";
        const notesStr = ex.notes ? ` | Notes: "${ex.notes}"` : "";
        const setNotesStr = lastSet?.notes ? ` | Set notes: "${lastSet.notes}"` : "";
        return `- ${ex.title}: ${setStr}${rpeStr}${notesStr}${setNotesStr}`;
      }),
    );
  } else {
    lines.push("No Hevy workout synced yet.");
  }
  return lines.join("\n");
}

const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-2-flash",
];

async function callGemini(
  apiKey: string,
  history: CoachMsg[],
  newPrompt: string,
  systemContext: string,
): Promise<{ text: string; model: string }> {
  const recentHistory = history.slice(-10);

  const contents = [
    ...recentHistory.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: newPrompt }] },
  ];

  const payload = {
    systemInstruction: {
      parts: [
        {
          text: `${SYSTEM_INSTRUCTIONS}\n\nATHLETE PROFILE & LIVE METRICS:\n${systemContext}`,
        },
      ],
    },
    contents,
  };

  let lastErrorMsg = "Gemini request failed.";

  for (const model of FALLBACK_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { text, model };
      }

      lastErrorMsg = data.error?.message || `HTTP ${res.status} on ${model}`;
      console.warn(`Model ${model} failed (${lastErrorMsg}). Cascading to next fallback...`);
    } catch (err) {
      lastErrorMsg = err instanceof Error ? err.message : "Network error";
    }
  }

  throw new Error(`All models failed: ${lastErrorMsg}`);
}

function CoachText({ text }: { text: string }) {
  const cleanedText = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*-]\s+/gm, "• ");

  return (
    <div className="space-y-1.5 whitespace-pre-wrap">
      {cleanedText.split("\n").map((line, idx) => {
        const isHeader = /^[A-Z\s]{4,}:?$/.test(line.trim()) || line.trim().startsWith("WORKOUT ANALYSIS");

        if (isHeader) {
          return (
            <p key={idx} className="font-bold text-primary mt-2">
              {line.trim()}
            </p>
          );
        }

        return (
          <p key={idx}>
            {line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={i} className="text-primary font-semibold">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

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
  const { messages, add } = useCoachMessages(userId);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  
  // Initialize completely empty to prevent hydration mismatch
  const [apiKey, setApiKey] = useState("");
  const [draftApiKey, setDraftApiKey] = useState("");
  
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load the saved key immediately after the first safe render
  useEffect(() => {
    const savedKey = localStorage.getItem("p35_gemini_api_key") || "";
    setApiKey(savedKey);
    setDraftApiKey(savedKey);
  }, []);

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "auto" });
    }, 50);
    return () => clearTimeout(timer);
  }, [open, messages.length]);

  useEffect(() => {
    if (typeof document === "undefined" || !document.body || !endRef.current) return;
    endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const saveGeminiKey = (key: string) => {
    const clean = key.trim();
    if (typeof window !== "undefined") {
      localStorage.setItem("p35_gemini_api_key", clean);
    }
    setApiKey(clean);
    setKeyDialogOpen(false);
    toast.success(clean ? "Gemini key saved." : "Gemini key removed.");
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!apiKey) {
      setKeyDialogOpen(true);
      toast.error("Add your Gemini API key first.");
      return;
    }

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);
    setLastFailedPrompt(null);

    try {
      const currentHistory = [...messages];
      await add.mutateAsync({ role: "user", content: trimmed });
      const { text: reply, model } = await callGemini(
        apiKey,
        currentHistory,
        trimmed,
        buildContext(workout, entries),
      );
      setActiveModel(model);
      await add.mutateAsync({ role: "assistant", content: reply });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Coach is unavailable.";
      toast.error(errorMessage);
      setLastFailedPrompt(trimmed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            aria-label="Open Coach AI"
            className="glow-ring fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 size-14 rounded-full"
          >
            <MessageSquare className="size-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="flex h-[88vh] flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-5 py-4 text-left">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" /> Coach Clive 
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setKeyDialogOpen(true)}
                aria-label="Gemini API Key Settings"
              >
                <KeyRound className="size-5" />
              </Button>
            </div>
            <SheetDescription>Direct, no-fluff accountability on your numbers.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.length === 0 && !loading && (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Ask anything about your lifts, exercise swaps, upcoming phases, or tap the button below for a full session breakdown.
              </p>
            )}
            {messages.map((m, i) => {
              const isLastAssistant = m.role === "assistant" && i === messages.length - 1;
              return (
                <div key={i} className="space-y-1">
                  <div
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                        : "mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-surface-2/70 px-4 py-2.5 text-sm whitespace-pre-wrap"
                    }
                  >
                    {m.role === "assistant" ? <CoachText text={m.content} /> : m.content}
                  </div>
                  {isLastAssistant && activeModel && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 pl-2">
                      <Cpu className="size-2.5" />
                      <span>{activeModel}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl border border-border bg-surface-2/70 px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Thinking...
              </div>
            )}
            {lastFailedPrompt && !loading && (
              <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                <span>Request failed. Tap retry when ready.</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 border-rose-500/40 hover:bg-rose-500/20 text-rose-300"
                  onClick={() => void send(lastFailedPrompt)}
                >
                  <RefreshCw className="size-3.5" /> Retry
                </Button>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="space-y-2 border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-surface-2/40">
            <Button
              variant="secondary"
              className="w-full"
              disabled={loading}
              onClick={() =>
                send("Please analyse my last Hevy workout against current block targets. Evaluate RPE for each exercise, provide promote/stick/deload calls, and build my next session plan.")
              }
            >
              <Sparkles className="size-4" /> Analyse Workout & Progression
            </Button>
            <form
              className="flex items-end gap-2 bg-surface-2 border border-border rounded-xl p-2 focus-within:border-primary transition-colors"
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
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none max-h-32 py-1.5 px-1 leading-relaxed"
              />
              <Button
                type="submit"
                size="icon"
                className="size-10 shrink-0 mb-0.5"
                disabled={loading || !input.trim()}
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gemini API Key</DialogTitle>
            <DialogDescription>
              Stored locally on your device. Get a free API key from Google AI Studio
              (aistudio.google.com).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="gemini-key">API Key</Label>
            <Input
              id="gemini-key"
              type="password"
              placeholder="Paste AI Studio API key"
              value={draftApiKey}
              onChange={(e) => setDraftApiKey(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            {apiKey && (
              <Button variant="ghost" onClick={() => saveGeminiKey("")}>
                Remove key
              </Button>
            )}
            <Button onClick={() => saveGeminiKey(draftApiKey)}>Save key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}