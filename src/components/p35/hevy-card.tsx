import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Activity, ClipboardPaste, Save } from "lucide-react";
import { toast } from "sonner";

// We keep the HevyWorkout type locally so we don't break CoachDrawer's expectations
export type HevyWorkout = {
  title: string;
  startTime: string;
  exercises: {
    title: string;
    notes?: string;
    sets: {
      weightKg?: number;
      weightLbs?: number;
      reps?: number;
      rpe?: number;
      distance_meters?: number;
      duration_seconds?: number;
    }[];
  }[];
};

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

function formatWeight(weight: number | null | undefined, exerciseTitle: string) {
  if (weight == null) return "BW";

  const titleLower = exerciseTitle.toLowerCase();
  const isCableOrLbs =
    titleLower.includes("cable") ||
    titleLower.includes("pushdown") ||
    titleLower.includes("fly");

  if (isCableOrLbs) {
    const weightLbs = weight * 2.20462;
    const roundedLbs = Math.round(weightLbs * 2) / 2;
    return `${roundedLbs}lbs`;
  }

  const roundedKg = Number.isInteger(weight) ? weight : Math.round(weight * 10) / 10;
  return `${roundedKg}kg`;
}

// The Intelligence Engine: Parses unstructured copy-paste text into structured workout data
function parseManualWorkout(raw: string): HevyWorkout {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error("No text provided.");

  const title = lines[0];
  const exercises: any[] = [];
  let currentEx: any = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip generic headers usually found in app copy-paste exports
    if (/^(workout|duration|volume|date|time)\b/i.test(line) && /\d/.test(line)) continue;
    if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(line)) continue;

    // Match standard sets: "100kg x 8", "BW x 15", "100 x 8 @ 8"
    const setRegex = /(?:Set\s*\d+[:\-]?\s*)?(?:-\s*)?(?:(\d+(?:\.\d+)?)\s*(kg|lbs)?|BW)\s*[xX×]\s*(\d+)(?:\s*@\s*(?:RPE\s*)?(\d+(?:\.\d+)?))?/i;
    const setMatch = line.match(setRegex);

    // Match cardio/duration: "60 mins", "5 km"
    const cardioRegex = /(?:-\s*)?(\d+(?:\.\d+)?)\s*(km|mi|mins?|secs?|hours?|hr|m|s)\b/i;
    const cardioMatch = line.match(cardioRegex);

    if (setMatch) {
      if (!currentEx) {
        currentEx = { title: "Exercise", sets: [] };
        exercises.push(currentEx);
      }
      const weightStr = setMatch[1];
      const unitStr = setMatch[2]?.toLowerCase();
      const repsStr = setMatch[3];
      const rpeStr = setMatch[4];

      const setObj: any = { reps: parseInt(repsStr, 10) };
      if (weightStr) {
        const w = parseFloat(weightStr);
        if (unitStr === 'lbs') setObj.weightLbs = w;
        else setObj.weightKg = w;
      }
      if (rpeStr) setObj.rpe = parseFloat(rpeStr);
      currentEx.sets.push(setObj);
    } else if (cardioMatch && !/[xX×]/.test(line)) {
      if (!currentEx) {
        currentEx = { title: "Conditioning", sets: [] };
        exercises.push(currentEx);
      }
      const val = parseFloat(cardioMatch[1]);
      const unit = cardioMatch[2].toLowerCase();

      const setObj: any = {};
      if (unit.startsWith('km') || unit.startsWith('mi')) {
        setObj.distance_meters = unit.startsWith('mi') ? val * 1609.34 : val * 1000;
      } else {
        setObj.duration_seconds = unit.startsWith('h') ? val * 3600 : unit.startsWith('m') ? val * 60 : val;
      }
      currentEx.sets.push(setObj);
    } else {
      // It didn't match a set or duration, so it must be an exercise title
      currentEx = { title: line.replace(/^- /, ''), sets: [] };
      exercises.push(currentEx);
    }
  }

  const validExercises = exercises.filter(ex => ex.sets.length > 0);

  // Fallback: If no sets were parsed, wrap the raw text as a conditioning note so no data is lost
  if (validExercises.length === 0) {
    return {
      title: title || "Manual Session Log",
      startTime: new Date().toISOString(),
      exercises: [{
        title: "Session Details",
        notes: lines.slice(1).join("\n"),
        sets: [{ duration_seconds: 0 }] 
      }]
    };
  }

  return {
    title,
    startTime: new Date().toISOString(),
    exercises: validExercises
  };
}

export function HevyCard({
  workout: initialWorkout,
  onWorkout,
}: {
  workout: HevyWorkout | null;
  apiKey?: string; // Kept to prevent breaking index.tsx props
  onSaveKey?: (key: string) => Promise<void>; // Kept to prevent breaking index.tsx props
  onWorkout?: (workout: HevyWorkout) => Promise<void>;
}) {
  // SSR Safe initialization
  const [currentWorkout, setCurrentWorkout] = useState<HevyWorkout | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("p35_cached_workout");
        return cached ? JSON.parse(cached) : initialWorkout;
      } catch {
        return initialWorkout;
      }
    }
    return initialWorkout;
  });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualText, setManualText] = useState("");

  const handleParseAndSave = () => {
    if (!manualText.trim()) {
      toast.error("Paste your workout text first.");
      return;
    }

    try {
      const parsedWorkout = parseManualWorkout(manualText);
      setCurrentWorkout(parsedWorkout);
      
      if (typeof window !== "undefined") {
        localStorage.setItem("p35_cached_workout", JSON.stringify(parsedWorkout));
      }
      
      if (onWorkout) {
        onWorkout(parsedWorkout).catch(() => {});
      }
      
      setManualText("");
      setDialogOpen(false);
      toast.success("Workout parsed and locked in.");
    } catch (err) {
      toast.error("Failed to parse workout format.");
    }
  };

  const displayWorkout = currentWorkout || initialWorkout;

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Latest Session</h2>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Log Manual Workout">
              <ClipboardPaste className="size-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Session Data</DialogTitle>
              <DialogDescription>
                Paste your workout summary directly from Strong, Hevy, or Apple Notes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 pt-2">
              <textarea
                rows={8}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="e.g.&#10;BJJ Class&#10;60 mins&#10;&#10;OR&#10;&#10;Push Day&#10;Bench Press&#10;100kg x 8&#10;100kg x 8"
                className="w-full resize-none rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleParseAndSave} className="w-full gap-2">
                <Save className="size-4" /> Parse & Save Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {displayWorkout ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border bg-surface-2/60 p-3">
            <p className="text-sm font-semibold text-primary">{displayWorkout.title}</p>
            <p className="text-xs text-muted-foreground">
              {displayWorkout.startTime ? new Date(displayWorkout.startTime).toLocaleString() : "Date unknown"}
            </p>
          </div>
          <div className="space-y-2">
            {displayWorkout.exercises.map((ex, i) => {
              const lastSet = ex.sets[ex.sets.length - 1];
              const isCardio = isCardioExercise(ex.title, ex.sets);

              return (
                <div key={i} className="rounded-lg border border-border bg-surface-2/40 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{ex.title}</p>
                    <span className="stat-label shrink-0">
                      {ex.sets.length > 0 && ex.sets[0].duration_seconds === 0 ? "Notes" : `${ex.sets.length} ${ex.sets.length === 1 ? "set" : "sets"}`}
                    </span>
                  </div>

                  {isCardio ? (
                    <div className="mt-1.5 space-y-1">
                      {ex.sets.map((s: any, sIdx: number) => (
                        <p key={sIdx} className="text-xs font-medium text-primary">
                          {s.duration_seconds === 0 ? "Details Logged" : formatCardio(s)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {ex.sets.map((s, sIdx) => {
                        const weightDisplay = formatWeight(s.weightKg, ex.title);
                        return (
                          <div key={sIdx} className="flex items-center gap-2">
                            {sIdx > 0 && <span className="size-1 rounded-full bg-primary/60 shrink-0" />}
                            <span>{`${weightDisplay} \u00d7 ${s.reps ?? "?"}`}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isCardio && lastSet?.rpe != null && (
                    <p className="mt-1.5 text-xs font-medium text-primary">
                      Final set RPE: {lastSet.rpe}
                    </p>
                  )}
                  {ex.notes && (
                    <p className="mt-1.5 text-xs text-muted-foreground italic leading-relaxed whitespace-pre-wrap">
                      {ex.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No workout logged yet. Paste your latest session details to sync.
        </p>
      )}

      <Button className="mt-4 w-full gap-2" onClick={() => setDialogOpen(true)}>
        <ClipboardPaste className="size-4" />
        Log Manual Session
      </Button>
    </section>
  );
}