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

  const matchesKeyword = cardioKeywords.some((k) => title.includes(k));

  const hasCardioMetrics = sets.some(
    (s) =>
      s.distance_meters != null ||
      s.distanceMeters != null ||
      s.duration_seconds != null ||
      s.durationSeconds != null ||
      s.km != null ||
      (s.weightKg == null &&
        s.weight_kg == null &&
        s.weightLbs == null &&
        s.reps == null)
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
    meters != null ? `${(meters / 1000).toFixed(2)} km` : null;

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

  return parts.length > 0 ? parts.join(" • ") : "Completed";
}

function formatWeight(
  weightKg: number | null | undefined,
  weightLbs: number | null | undefined,
  exerciseTitle: string
): string {
  const titleLower = exerciseTitle.toLowerCase();

  const isCableOrLbs =
    titleLower.includes("cable") ||
    titleLower.includes("pushdown") ||
    titleLower.includes("fly");

  // If the source explicitly gave us lbs, keep it as lbs.
  if (weightLbs != null) {
    const roundedLbs = Number.isInteger(weightLbs)
      ? weightLbs
      : Math.round(weightLbs * 10) / 10;

    return `${roundedLbs}lbs`;
  }

  if (weightKg == null) {
    return "BW";
  }

  // This preserves your existing behaviour for exercises where you
  // specifically want kg converted/displayed as lbs.
  if (isCableOrLbs) {
    const convertedLbs = weightKg * 2.20462;
    const roundedLbs = Math.round(convertedLbs * 2) / 2;

    return `${roundedLbs}lbs`;
  }

  const roundedKg = Number.isInteger(weightKg)
    ? weightKg
    : Math.round(weightKg * 10) / 10;

  return `${roundedKg}kg`;
}

/**
 * Converts Hevy's:
 *
 * Monday, Sep 21, 2026 at 12:50pm
 *
 * into:
 *
 * 21/09/2026 12:50
 */
function formatHevyDate(rawDate: string): string {
  const cleaned = rawDate
    .trim()
    .replace(/^Monday,\s*/i, "")
    .replace(/^Tuesday,\s*/i, "")
    .replace(/^Wednesday,\s*/i, "")
    .replace(/^Thursday,\s*/i, "")
    .replace(/^Friday,\s*/i, "")
    .replace(/^Saturday,\s*/i, "")
    .replace(/^Sunday,\s*/i, "");

  const match = cleaned.match(
    /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i
  );

  if (!match) {
    return rawDate.trim();
  }

  const [, monthName, dayStr, yearStr, hourStr, minuteStr, ampm] = match;

  const months: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };

  const month = months[monthName.toLowerCase()];

  if (month == null) {
    return rawDate.trim();
  }

  let hour = parseInt(hourStr, 10);

  if (ampm.toLowerCase() === "pm" && hour !== 12) {
    hour += 12;
  }

  if (ampm.toLowerCase() === "am" && hour === 12) {
    hour = 0;
  }

  const date = new Date(
    Number(yearStr),
    month,
    Number(dayStr),
    hour,
    Number(minuteStr)
  );

  if (isNaN(date.getTime())) {
    return rawDate.trim();
  }

  const day = String(date.getDate()).padStart(2, "0");
  const monthFormatted = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${monthFormatted}/${year} ${hours}:${minutes}`;
}

function parseManualWorkout(raw: string): HevyWorkout {
  const lines = raw.split(/\r?\n/);

  if (lines.length === 0) {
    throw new Error("No text provided.");
  }

  // ============================================================
  // HEVY HEADER
  //
  // Hevy normally gives us:
  //
  // Monday
  // Monday, Sep 21, 2026 at 12:50pm
  //
  // Bench Press (Barbell)
  // ============================================================

  const firstLine = lines[0].trim();

  let title = firstLine || "Manual Session Log";
  let startTime = new Date().toISOString();

  let dateLineIndex = -1;

  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const l = lines[i].trim();

    if (
      /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(?:am|pm)\b/i.test(
        l
      )
    ) {
      startTime = formatHevyDate(l);
      dateLineIndex = i;
      break;
    }
  }

  // If the first line is simply "Monday", don't use that as the
  // workout title. Give the session a useful title instead.
  if (
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.test(
      firstLine
    )
  ) {
    if (startTime && !startTime.includes("T")) {
      title = `${firstLine} Session`;
    } else {
      title = "Workout";
    }
  }

  const exercises: any[] = [];
  let currentEx: any = null;
  let noteBuffer: string[] = [];

  const flushNotes = () => {
    if (noteBuffer.length > 0 && currentEx) {
      let noteStr = noteBuffer.join("\n").trim();

      // Remove wrapping quotation marks from Hevy notes.
      if (noteStr.startsWith('"') && noteStr.endsWith('"')) {
        noteStr = noteStr.slice(1, -1).trim();
      }

      if (noteStr.length > 0) {
        currentEx.notes = noteStr;
      }
    }

    noteBuffer = [];
  };

  // ============================================================
  // MAIN HEVY PARSER
  // ============================================================

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      if (noteBuffer.length > 0) {
        noteBuffer.push("");
      }

      continue;
    }

    // Ignore Hevy footer/link.
    if (line.startsWith("@hevyapp")) {
      continue;
    }

    if (line.startsWith("https://")) {
      continue;
    }

    // Ignore the Hevy date line.
    if (
      /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(?:am|pm)\b/i.test(
        line
      )
    ) {
      continue;
    }

    // Ignore a standalone weekday line.
    if (
      [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].includes(line.toLowerCase()) &&
      line.length < 12
    ) {
      continue;
    }

    // ==========================================================
    // NORMAL WEIGHTED SET
    //
    // Supports:
    //
    // Set 1: 60 kg x 10
    // Set 2: 67.5 kg x 10
    // Set 4: 67.5 kg x 10 @ 9 rpe
    // 67.5kg x 10 @ RPE 9
    // 52.5 lbs x 14 @ 8.5 rpe
    // BW x 10
    // ==========================================================

    const setMatch = line.match(
      /(?:Set\s*\d+[:\-]?\s*)?(?:-\s*)?(?:(\d+(?:\.\d+)?)\s*(kg|lbs)?|BW)\s*[xX×]\s*(\d+)(?:\s*@\s*(?:RPE\s*)?(\d+(?:\.\d+)?)\s*(?:RPE)?\s*)?/i
    );

    // ==========================================================
    // CARDIO
    //
    // Supports:
    //
    // 1.5 km - 18min 0s
    // 1.5 km
    // 18min
    // 18 mins
    // 30s
    // ==========================================================

    const cardioMatch = /(\d+(?:\.\d+)?)\s*(km|mi|mins?|secs?|hours?|hr|m|s)\b/i.test(
      line
    );

    const isSetLine =
      setMatch !== null ||
      (cardioMatch &&
        (line.toLowerCase().includes("km") ||
          line.toLowerCase().includes("min") ||
          line.toLowerCase().includes("mi") ||
          line.toLowerCase().includes("sec") ||
          line.toLowerCase().includes("hour")));

    if (isSetLine) {
      flushNotes();

      if (!currentEx) {
        currentEx = {
          title: "Exercise",
          sets: [],
        };

        exercises.push(currentEx);
      }

      // ========================================================
      // WEIGHTED SET
      // ========================================================

      if (setMatch) {
        const [, wStr, unit, repsStr, rpeStr] = setMatch;

        const setObj: any = {
          reps: parseInt(repsStr, 10),
        };

        if (wStr) {
          const weight = parseFloat(wStr);

          if (unit && unit.toLowerCase() === "lbs") {
            setObj.weightLbs = weight;
          } else {
            setObj.weightKg = weight;
          }
        }

        if (rpeStr) {
          setObj.rpe = parseFloat(rpeStr);
        }

        currentEx.sets.push(setObj);
      } else {
        // ======================================================
        // CARDIO SET
        // ======================================================

        const setObj: any = {};

        const kmMatch = line.match(
          /(\d+(?:\.\d+)?)\s*(km|mi)\b/i
        );

        const hourMatch = line.match(
          /(\d+(?:\.\d+)?)\s*(?:hours?|hr)\b/i
        );

        const minMatch = line.match(
          /(\d+(?:\.\d+)?)\s*(?:mins?|minutes?)\b/i
        );

        const secMatch = line.match(
          /(\d+(?:\.\d+)?)\s*(?:secs?|seconds?|s)\b/i
        );

        if (kmMatch) {
          const value = parseFloat(kmMatch[1]);
          const unit = kmMatch[2].toLowerCase();

          setObj.distance_meters =
            unit === "mi"
              ? value * 1609.34
              : value * 1000;
        }

        let totalSeconds = 0;

        if (hourMatch) {
          totalSeconds += parseFloat(hourMatch[1]) * 3600;
        }

        if (minMatch) {
          totalSeconds += parseFloat(minMatch[1]) * 60;
        }

        if (secMatch) {
          totalSeconds += parseFloat(secMatch[1]);
        }

        if (totalSeconds > 0) {
          setObj.duration_seconds = totalSeconds;
        }

        currentEx.sets.push(setObj);
      }
    }

    // ==========================================================
    // NOTES
    //
    // Hevy puts notes in quotation marks.
    //
    // "This was hard!"
    //
    // We also support multi-line notes.
    // ==========================================================

    else if (
      line.startsWith('"') ||
      line.endsWith('"') ||
      (currentEx &&
        currentEx.sets.length === 0 &&
        !/\d+\s*(kg|lbs|km|min|sec)/i.test(line))
    ) {
      noteBuffer.push(line);
    }

    // ==========================================================
    // NEW EXERCISE
    // ==========================================================

    else {
      flushNotes();

      const exerciseTitle = line
        .replace(/^-\s*/, "")
        .trim();

      currentEx = {
        title: exerciseTitle,
        sets: [],
      };

      exercises.push(currentEx);
    }
  }

  flushNotes();

  // ============================================================
  // REMOVE EMPTY EXERCISES
  // ============================================================

  const validExercises = exercises.filter(
    (ex) =>
      ex.sets.length > 0 ||
      (ex.notes && ex.notes.length > 0)
  );

  // ============================================================
  // FALLBACK
  // ============================================================

  if (validExercises.length === 0) {
    return {
      title: title || "Manual Session Log",
      startTime,
      exercises: [
        {
          title: "Session Details",
          notes: lines.slice(1).join("\n"),
          sets: [
            {
              duration_seconds: 0,
            },
          ],
        },
      ],
    };
  }

  return {
    title,
    startTime,
    exercises: validExercises,
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
  const [currentWorkout, setCurrentWorkout] =
    useState<HevyWorkout | null>(() => {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(
            "p35_cached_workout"
          );

          return cached
            ? JSON.parse(cached)
            : initialWorkout;
        } catch {
          return initialWorkout;
        }
      }

      return initialWorkout;
    });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualText, setManualText] = useState("");

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const handleParseAndSave = () => {
    if (!manualText.trim()) {
      toast.error("Paste your workout text first.");
      return;
    }

    try {
      const parsedWorkout =
        parseManualWorkout(manualText);

      setCurrentWorkout(parsedWorkout);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "p35_cached_workout",
          JSON.stringify(parsedWorkout)
        );
      }

      if (onWorkout) {
        onWorkout(parsedWorkout).catch(() => {});
      }

      setManualText("");
      setDialogOpen(false);

      toast.success("Workout parsed and locked in.");
    } catch (err) {
      toast.error(
        "Failed to parse workout format."
      );
    }
  };

  const handleCSVUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const text = evt.target?.result as string;

      const arr: string[][] = [];

      let quote = false;
      let row: string[] = [];
      let col = "";

      for (let c = 0; c < text.length; c++) {
        const cc = text[c];
        const nc = text[c + 1];

        if (
          cc === '"' &&
          quote &&
          nc === '"'
        ) {
          col += cc;
          c++;
          continue;
        }

        if (cc === '"') {
          quote = !quote;
          continue;
        }

        if (cc === "," && !quote) {
          row.push(col);
          col = "";
          continue;
        }

        if (cc === "\n" && !quote) {
          row.push(col);
          arr.push(row);
          row = [];
          col = "";
          continue;
        }

        if (cc === "\r" && !quote) {
          continue;
        }

        col += cc;
      }

      if (col) {
        row.push(col);
      }

      if (row.length) {
        arr.push(row);
      }

      if (arr.length < 2) {
        toast.error("Invalid CSV format.");
        return;
      }

      const headers = arr[0].map((h) =>
        h.trim().toLowerCase()
      );

      const iStart =
        headers.indexOf("start_time");

      const iTitle =
        headers.indexOf("title");

      const iExTitle =
        headers.indexOf("exercise_title");

      const iWeight =
        headers.indexOf("weight_kg");

      const iReps =
        headers.indexOf("reps");

      if (
        iStart === -1 ||
        iExTitle === -1
      ) {
        toast.error(
          "Missing required columns. Are you sure this is a Hevy export?"
        );

        return;
      }

      const workoutsMap: Record<
        string,
        any
      > = {};

      for (let i = 1; i < arr.length; i++) {
        const r = arr[i];

        if (r.length < headers.length) {
          continue;
        }

        const startTimeStr = r[iStart];

        const title =
          iTitle >= 0
            ? r[iTitle]
            : "Workout";

        const exTitle = r[iExTitle];

        const weight =
          iWeight >= 0
            ? parseFloat(r[iWeight])
            : NaN;

        const reps =
          iReps >= 0
            ? parseInt(r[iReps], 10)
            : NaN;

        if (
          !startTimeStr ||
          !exTitle ||
          isNaN(weight) ||
          isNaN(reps)
        ) {
          continue;
        }

        const datePart =
          startTimeStr
            .split(",")[0]
            .trim();

        const dObj = new Date(datePart);

        if (isNaN(dObj.getTime())) {
          continue;
        }

        const isoDate = new Date(
          dObj.getTime() -
            dObj.getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 10);

        const wKey = `${isoDate}_${title}`;

        if (!workoutsMap[wKey]) {
          workoutsMap[wKey] = {
            date: isoDate,
            title,
            exercises: [],
          };
        }

        let exObj =
          workoutsMap[wKey].exercises.find(
            (e: any) =>
              e.title === exTitle
          );

        if (!exObj) {
          exObj = {
            title: exTitle,
            sets: [],
          };

          workoutsMap[wKey].exercises.push(
            exObj
          );
        }

        exObj.sets.push({
          weightKg: weight,
          reps,
        });
      }

      const history =
        Object.values(workoutsMap);

      try {
        localStorage.setItem(
          "p35_hevy_workouts",
          JSON.stringify(history)
        );

        toast.success(
          `Imported ${history.length} historical workouts!`
        );

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        toast.error(
          "History is too large for local storage constraints."
        );
      }
    };

    reader.readAsText(file);
  };

  const displayWorkout =
    currentWorkout || initialWorkout;

  return (
    <section className="panel p-5 w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Activity className="size-5 shrink-0 text-primary" />

          <h2 className="text-lg font-bold truncate">
            Latest Session
          </h2>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Log Manual Workout"
              className="shrink-0"
            >
              <ClipboardPaste className="size-5" />
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Log Session Data
              </DialogTitle>

              <DialogDescription>
                Paste your workout summary directly
                from Strong, Hevy, or Apple Notes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 pt-2">
              <textarea
                rows={8}
                value={manualText}
                onChange={(e) =>
                  setManualText(e.target.value)
                }
                placeholder={`e.g.
Monday
Monday, Sep 21, 2026 at 12:50pm

Bench Press (Barbell)
"Good session today!"
Set 1: 60 kg x 10
Set 2: 67.5 kg x 10
Set 3: 67.5 kg x 10 @ 9 rpe`}
                className="w-full resize-none rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
              />
            </div>

            <DialogFooter>
              <Button
                onClick={handleParseAndSave}
                className="w-full gap-2"
              >
                <Save className="size-4" />
                Parse & Save Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {displayWorkout ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border bg-surface-2/60 p-3">
            <p className="text-sm font-semibold text-primary break-words">
              {displayWorkout.title}
            </p>

            <p className="text-xs text-muted-foreground">
              {displayWorkout.startTime
                ? displayWorkout.startTime
                : "Date unknown"}
            </p>
          </div>

          <div className="space-y-2">
            {displayWorkout.exercises.map(
              (ex, i) => {
                const lastSet =
                  ex.sets[ex.sets.length - 1];

                const isCardio =
                  isCardioExercise(
                    ex.title,
                    ex.sets
                  );

                return (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-surface-2/40 p-3 space-y-1.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground break-words flex-1">
                        {ex.title}
                      </p>

                      <span className="stat-label shrink-0">
                        {ex.sets.length > 0 &&
                        ex.sets[0]
                          .duration_seconds ===
                          0
                          ? "Notes"
                          : `${ex.sets.length} ${
                              ex.sets.length ===
                              1
                                ? "set"
                                : "sets"
                            }`}
                      </span>
                    </div>

                    {ex.notes && (
                      <p className="text-xs text-muted-foreground italic leading-relaxed break-words whitespace-pre-wrap">
                        {ex.notes}
                      </p>
                    )}

                    {isCardio ? (
                      <div className="space-y-1 pt-1">
                        {ex.sets.map(
                          (
                            s: any,
                            sIdx: number
                          ) => (
                            <p
                              key={sIdx}
                              className="text-xs font-medium text-primary"
                            >
                              {s.duration_seconds ===
                                0 &&
                              !s.distance_meters
                                ? "Details Logged"
                                : formatCardio(
                                    s
                                  )}
                            </p>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pt-0.5">
                        {ex.sets.map(
                          (s, sIdx) => {
                            const weightDisplay =
                              formatWeight(
                                s.weightKg,
                                s.weightLbs,
                                ex.title
                              );

                            return (
                              <div
                                key={sIdx}
                                className="flex items-center gap-2"
                              >
                                {sIdx > 0 && (
                                  <span className="size-1 rounded-full bg-primary/60 shrink-0" />
                                )}

                                <span>
                                  {`${weightDisplay} × ${
                                    s.reps ??
                                    "?"
                                  }`}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}

                    {!isCardio &&
                      lastSet?.rpe != null && (
                        <p className="text-xs font-medium text-primary pt-0.5">
                          Final set RPE:{" "}
                          {lastSet.rpe}
                        </p>
                      )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No workout logged yet. Paste your latest
          session details to sync.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          className="w-full gap-2"
          onClick={() => setDialogOpen(true)}
        >
          <ClipboardPaste className="size-4" />
          Log Manual Session
        </Button>

        <Button
          variant="outline"
          className="shrink-0 gap-2 px-3 border-border bg-surface-2/40 hover:bg-surface-2"
          onClick={() =>
            fileInputRef.current?.click()
          }
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