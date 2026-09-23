export type HevySet = {
  weightKg: number | null;
  reps: number | null;
  type?: string | undefined;
  rpe?: number | null;
  notes?: string | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
};

export type HevyExercise = {
  title: string;
  notes?: string | null;
  sets: HevySet[];
};

export type HevyWorkout = {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  exercises: HevyExercise[];
};

export async function fetchLatestHevyWorkout({
  data,
}: {
  data: { apiKey: string };
}): Promise<{ workout: HevyWorkout | null; workouts: HevyWorkout[] }> {
  const cleanKey = data.apiKey.trim();
  if (!cleanKey) {
    throw new Error("Missing Hevy API key.");
  }

  const endpoint =
    window.location.hostname === "localhost"
      ? "https://api.hevyapp.com/v1/workouts?page=1&pageSize=10"
      : "/hevy-api/workouts?page=1&pageSize=10";

  const res = await fetch(endpoint, {
    headers: {
      "api-key": cleanKey,
      accept: "application/json",
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Hevy rejected that API key. Check it in settings.");
  }
  if (!res.ok) {
    throw new Error(`Hevy request failed (${res.status}).`);
  }

  const json = (await res.json()) as {
    workouts?: Array<{
      id?: string;
      title?: string;
      start_time?: string;
      end_time?: string;
      exercises?: Array<{
        title?: string;
        notes?: string | null;
        sets?: Array<{
          weight_kg?: number | null;
          reps?: number | null;
          type?: string;
          rpe?: number | null;
          notes?: string | null;
          distance_meters?: number | null;
          duration_seconds?: number | null;
        }>;
      }>;
    }>;
  };

  const rawWorkouts = json.workouts ?? [];

  const workouts: HevyWorkout[] = rawWorkouts.map((raw) => ({
    id: raw.id ?? "unknown",
    title: raw.title ?? "Untitled workout",
    startTime: raw.start_time ?? null,
    endTime: raw.end_time ?? null,
    exercises: (raw.exercises ?? []).map((ex) => ({
      title: ex.title ?? "Exercise",
      notes: ex.notes ?? null,
      sets: (ex.sets ?? []).map((s) => ({
        weightKg: s.weight_kg ?? null,
        reps: s.reps ?? null,
        type: s.type,
        rpe: s.rpe ?? null,
        notes: s.notes ?? null,
        distanceMeters: s.distance_meters ?? null,
        durationSeconds: s.duration_seconds ?? null,
      })),
    })),
  }));

  const latestWorkout = workouts[0] ?? null;

  try {
    if (latestWorkout) {
      localStorage.setItem("p35_cached_workout", JSON.stringify(latestWorkout));
    }

    if (workouts.length > 0) {
      const existingRaw = localStorage.getItem("p35_hevy_workouts");
      const existingWorkouts: HevyWorkout[] = existingRaw ? JSON.parse(existingRaw) : [];

      const workoutMap = new Map<string, HevyWorkout>();
      existingWorkouts.forEach((w) => workoutMap.set(w.id, w));
      workouts.forEach((w) => workoutMap.set(w.id, w));

      const mergedWorkouts = Array.from(workoutMap.values()).sort((a, b) => {
        const timeA = new Date(a.startTime || "").getTime();
        const timeB = new Date(b.startTime || "").getTime();
        return timeB - timeA;
      });

      localStorage.setItem("p35_hevy_workouts", JSON.stringify(mergedWorkouts));

      return {
        workout: latestWorkout,
        workouts: mergedWorkouts,
      };
    }
  } catch (e) {
    console.error("Failed to merge/save workouts to localStorage", e);
  }

  return {
    workout: latestWorkout,
    workouts,
  };
}
