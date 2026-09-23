import { useEffect, useRef, useState } from "react";
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
import { Activity, ClipboardPaste, Save, Upload } from "lucide-react";
import { toast } from "sonner";

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

function parseManualWorkout(raw: string): HevyWorkout {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error("No text provided.");

  const title = lines[0];
  const exercises: any[] = [];
  let currentEx: any = null;
  let pendingNote: string | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (/^(workout|duration|volume|date|time)\b/i.test(line) && /\d/.test(line)) continue;
    if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(line)) continue;
    if (/^@hevyapp/i.test(line) || /^https?:\/\//i.test(line)) continue;

    const setRegex = /(?:Set\s*\d+[:\-]?\s*)?(?:-\s*)?(?:(\d+(?:\.\d+)?)\s*(kg|lbs)?|BW)\s*[xX×]\s*(\d+)(?:\s*@\s*(?:RPE\s*)?(\d+(?:\.\d+)?))?/i;
    const setMatch = line.match(setRegex);

    const cardioRegex = /(?:-\s*)?(\d+(?:\.\d+)?)\s*(km|mi|mins?|secs?|hours?|hr|m|s)\b/i;
    const cardioMatch = line.match(cardioRegex);

    if (setMatch) {
      if (!currentEx) {
        currentEx = { title: "Exercise", sets: [] };
        exercises.push(currentEx);
      }
      if (pendingNote) {
        currentEx.notes = pendingNote;
        pendingNote = null;
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
      if (pendingNote) {
        currentEx.notes = pendingNote;
        pendingNote = null;
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
    } else if (line.startsWith('"') || line.endsWith('"') || (!currentEx && !setMatch)) {
      // If it looks like a note string or falls before an exercise header
      const cleanLine = line.replace(/^"|"$/g, '');
      if (currentEx && currentEx.sets.length === 0) {
        currentEx.notes = cleanLine;
      } else {
        pendingNote = cleanLine;
      }
    } else {
      currentEx = { title: line.replace(/^- /, ''), sets: [] };
      if (pendingNote) {
        currentEx.notes = pendingNote;
        pendingNote = null;
      }
      exercises.push(currentEx);
    }
  }

  const validExercises = exercises.filter(ex => ex.sets.length > 0);

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
  apiKey,
  onSaveKey,
  onWorkout,
}: {
  workout: HevyWorkout | null;
  apiKey?: string;
  onSaveKey?: (key: string) => Promise<void>;
  onWorkout?: (workout: HevyWorkout) => Promise<void>;
}) {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      
      const arr: string[][] = [];
      let quote = false;
      let row: string[] = [], col = '';
      for (let c = 0; c < text.length; c++) {
          const cc = text[c], nc = text[c+1];
          if (cc === '"' && quote && nc === '"') { col += cc; c++; continue; }
          if (cc === '"') { quote = !quote; continue; }
          if (cc === ',' && !quote) { row.push(col); col = ''; continue; }
          if (cc === '\n' && !quote) { row.push(col); arr.push(row); row = []; col = ''; continue; }
          if (cc === '\r' && !quote) continue;
          col += cc;
      }
      if (col) row.push(col);
      if (row.length) arr.push(row);

      if (arr.length < 2) {
        toast.error("Invalid CSV format.");
        return;
      }

      const headers = arr[0].map(h => h.trim().toLowerCase());
      const iStart = headers.indexOf("start_time");
      const iTitle = headers.indexOf("title");
      const iExTitle = headers.indexOf("exercise_title");
      const iWeight = headers.indexOf("weight_kg");
      const iReps = headers.indexOf("reps");

      if (iStart === -1 || iExTitle === -1) {
        toast.error("Missing required columns. Are you sure this is a Hevy export?");
        return;
      }

      const workoutsMap: Record<string, any> = {};

      for (let i = 1; i < arr.length; i++) {
        const r = arr[i];
        if (r.length < headers.length) continue;

        const startTimeStr = r[iStart];
        const title = iTitle >= 0 ? r[iTitle] : "Workout";
        const exTitle = r[iExTitle];
        const weight = parseFloat(r[iWeight]);
        const reps = parseInt(r[iReps], 10);

        if (!startTimeStr || !exTitle || isNaN(weight) || isNaN(reps)) continue;

        const datePart = startTimeStr.split(',')[0].trim();
        const dObj = new Date(datePart);
        if (isNaN(dObj.getTime())) continue;
        
        const isoDate = new Date(dObj.getTime() - dObj.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const wKey = `${isoDate}_${title}`;

        if (!workoutsMap[wKey]) {
          workoutsMap[wKey] = {
            date: isoDate,
            title: title,
            exercises: []
          };
        }

        let exObj = workoutsMap[wKey].exercises.find((e: any) => e.title === exTitle);
        if (!exObj) {
          exObj = { title: exTitle, sets: [] };
          workoutsMap[wKey].exercises.push(exObj);
        }

        exObj.sets.push({ weightKg: weight, reps: reps });
      }

      const history = Object.values(workoutsMap);
      
      try {
        localStorage.setItem("p35_hevy_workouts", JSON.stringify(history));
        toast.success(`Imported ${history.length} historical workouts!`);
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        toast.error("History is too large for local storage constraints.");
      }
    };
    
    reader.readAsText(file);
  };

  const displayWorkout = currentWorkout || initialWorkout;

  return (
    <section className="panel p-5 w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Activity className="size-5 shrink-0 text-primary" />
          <h2 className="text-lg font-bold truncate">Latest Session</h2>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Log Manual Workout" className="shrink-0">
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
            <p className="text-sm font-semibold text-primary break-words">{displayWorkout.title}</p>
            <p className="text-xs text-muted-foreground">
              {displayWorkout.startTime ? new Date(displayWorkout.startTime).toLocaleString() : "Date unknown"}
            </p>
          </div>
          <div className="space-y-2">
            {displayWorkout.exercises.map((ex, i) => {
              const lastSet = ex.sets[ex.sets.length - 1];
              const isCardio = isCardioExercise(ex.title, ex.sets);

              return (
                <div key={i} className="rounded-lg border border-border bg-surface-2/40 p-3 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground break-words flex-1">{ex.title}</p>
                    <span className="stat-label shrink-0">
                      {ex.sets.length > 0 && ex.sets[0].duration_seconds === 0 ? "Notes" : `${ex.sets.length} ${ex.sets.length === 1 ? "set" : "sets"}`}
                    </span>
                  </div>

                  {ex.notes && (
                    <p className="text-xs text-muted-foreground italic leading-relaxed break-words">
                      {ex.notes}
                    </p>
                  )}

                  {isCardio ? (
                    <div className="space-y-1 pt-1">
                      {ex.sets.map((s: any, sIdx: number) => (
                        <p key={sIdx} className="text-xs font-medium text-primary">
                          {s.duration_seconds === 0 ? "Details Logged" : formatCardio(s)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pt-0.5">
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
                    <p className="text-xs font-medium text-primary pt-0.5">
                      Final set RPE: {lastSet.rpe}
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

      <div className="mt-4 flex gap-2">
        <Button className="w-full gap-2" onClick={() => setDialogOpen(true)}>
          <ClipboardPaste className="size-4" />
          Log Manual Session
        </Button>
        
        <Button 
          variant="outline" 
          className="shrink-0 gap-2 px-3 border-border bg-surface-2/40 hover:bg-surface-2" 
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          Import
        </Button>
        <input 
          type="file" 
          accept=".csv" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleCSVUpload} 
        />
      </div>
    </section>
  );
}
