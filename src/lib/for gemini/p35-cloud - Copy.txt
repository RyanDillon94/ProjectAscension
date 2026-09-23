import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HevyWorkout } from "./hevy.functions";

export type WeightEntry = {
  date: string;
  weight: number;
};

export type UserSettings = {
  hevyApiKey: string;
  workout: HevyWorkout | null;
};

export type HabitKey = string;
export type HabitsState = Record<string, boolean>;

export type PhotoAngle = "front" | "side" | "back";
export type PhotoSlot = "baseline" | "current";
export type AnglePhotos = Record<PhotoSlot, string | null>;
export type PhotosState = Record<PhotoAngle, AnglePhotos>;

export type ArchivedBlockPhotos = {
  blockId: string;
  blockName: string;
  dateClosed: string;
  front: { baseline: string | null; final: string | null };
  side: { baseline: string | null; final: string | null };
  back: { baseline: string | null; final: string | null };
};

export const DEFAULT_PHOTOS: PhotosState = {
  front: { baseline: null, current: null },
  side: { baseline: null, current: null },
  back: { baseline: null, current: null },
};

export type CoachMsg = {
  role: "user" | "assistant";
  content: string;
};

function getLocal<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

function getAllLocalHabits(): Record<string, HabitsState> {
  const habits: Record<string, HabitsState> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("p35_habits_")) {
        const day = key.replace("p35_habits_", "");
        habits[day] = getLocal<HabitsState>(key, {});
      }
    }
  } catch (err) {
    console.error("Failed to read habits from localStorage:", err);
  }
  return habits;
}

function getAllLocalJournals(): Record<string, string> {
  const journals: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("p35_journal_")) {
        const day = key.replace("p35_journal_", "");
        journals[day] = localStorage.getItem(key) || "";
      }
    }
  } catch (err) {
    console.error("Failed to read journals from localStorage:", err);
  }
  return journals;
}

function getStoredPhotos(): PhotosState {
  const stored = getLocal<any>("p35_photos", DEFAULT_PHOTOS);
  if (stored && "baseline" in stored && !("front" in stored)) {
    return {
      front: { baseline: stored.baseline ?? null, current: stored.current ?? null },
      side: { baseline: null, current: null },
      back: { baseline: null, current: null },
    };
  }
  return {
    front: { ...DEFAULT_PHOTOS.front, ...(stored?.front || {}) },
    side: { ...DEFAULT_PHOTOS.side, ...(stored?.side || {}) },
    back: { ...DEFAULT_PHOTOS.back, ...(stored?.back || {}) },
  };
}

export function buildFullBackup() {
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    weighIns: getLocal("p35_weigh_ins", []),
    hevyApiKey: localStorage.getItem("p35_hevy_api_key") || "",
    geminiApiKey: localStorage.getItem("p35_gemini_api_key") || "",
    workout: getLocal("p35_cached_workout", null),
    photos: getStoredPhotos(),
    archivedPhotos: getLocal<ArchivedBlockPhotos[]>("p35_archived_photos", []),
    coachMessages: getLocal("p35_coach_messages", []),
    habits: getAllLocalHabits(),
    journals: getAllLocalJournals(),
  };
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1000;
        let { width, height } = img;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 1. HABITS HOOK
export function useHabitDay(userId: string | null, dayKey: string) {
  const qc = useQueryClient();
  const queryKey = ["p35-habits", userId || "local", dayKey];
  const defaultHabits: HabitsState = {};

  const { data: habits = defaultHabits } = useQuery<HabitsState>({
    queryKey,
    queryFn: () => getLocal<HabitsState>(`p35_habits_${dayKey}`, defaultHabits),
    staleTime: Infinity,
  });

  const toggle = useMutation({
    mutationFn: async (key: HabitKey) => {
      const current = getLocal<HabitsState>(`p35_habits_${dayKey}`, defaultHabits);
      const updated = { ...current, [key]: !current[key] };
      setLocal(`p35_habits_${dayKey}`, updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
    },
  });

  return { habits, toggle };
}

// 2. WEIGH-INS HOOK
export function useWeighIns(userId: string | null) {
  const qc = useQueryClient();
  const queryKey = ["p35-weigh-ins", userId || "local"];

  const { data: entries = [] } = useQuery<WeightEntry[]>({
    queryKey,
    queryFn: () => getLocal<WeightEntry[]>("p35_weigh_ins", []),
    staleTime: Infinity,
  });

  const save = useMutation({
    mutationFn: async (entry: WeightEntry) => {
      const current = getLocal<WeightEntry[]>("p35_weigh_ins", []);
      const index = current.findIndex((e) => e.date === entry.date);
      let updated: WeightEntry[];
      if (index >= 0) {
        updated = [...current];
        updated[index] = entry;
      } else {
        updated = [...current, entry];
      }
      setLocal("p35_weigh_ins", updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
    },
  });

  return { entries, save };
}

// 3. USER SETTINGS HOOK
export function useUserSettings(userId: string | null) {
  const qc = useQueryClient();
  const queryKey = ["p35-settings", userId || "local"];

  const { data = { hevyApiKey: "", workout: null } } = useQuery<UserSettings>({
    queryKey,
    queryFn: () => ({
      hevyApiKey: localStorage.getItem("p35_hevy_api_key") || "",
      workout: getLocal<HevyWorkout | null>("p35_cached_workout", null),
    }),
    staleTime: Infinity,
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      if (patch.hevyApiKey !== undefined) {
        localStorage.setItem("p35_hevy_api_key", patch.hevyApiKey);
      }
      if (patch.workout !== undefined) {
        setLocal("p35_cached_workout", patch.workout);
      }
      return {
        hevyApiKey: localStorage.getItem("p35_hevy_api_key") || "",
        workout: getLocal<HevyWorkout | null>("p35_cached_workout", null),
        ...patch,
      };
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
    },
  });

  return {
    hevyApiKey: data.hevyApiKey,
    workout: data.workout,
    update,
  };
}

// 4. MULTI-ANGLE PHOTOS & ARCHIVE HOOK
export function usePhotos(userId: string | null) {
  const qc = useQueryClient();
  const photosQueryKey = ["p35-photos", userId || "local"];
  const archiveQueryKey = ["p35-archived-photos", userId || "local"];

  const { data: photos = DEFAULT_PHOTOS } = useQuery<PhotosState>({
    queryKey: photosQueryKey,
    queryFn: getStoredPhotos,
    staleTime: Infinity,
  });

  const { data: archive = [] } = useQuery<ArchivedBlockPhotos[]>({
    queryKey: archiveQueryKey,
    queryFn: () => getLocal<ArchivedBlockPhotos[]>("p35_archived_photos", []),
    staleTime: Infinity,
  });

  const upload = useMutation({
    mutationFn: async ({
      angle,
      slot,
      file,
    }: {
      angle: PhotoAngle;
      slot: PhotoSlot;
      file: File;
    }) => {
      const dataUrl = await compressImage(file);
      const currentPhotos = getStoredPhotos();
      const updated: PhotosState = {
        ...currentPhotos,
        [angle]: {
          ...(currentPhotos[angle] || { baseline: null, current: null }),
          [slot]: dataUrl,
        },
      };
      setLocal("p35_photos", updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(photosQueryKey, updated);
    },
  });

  const removePhoto = useMutation({
    mutationFn: async ({ angle, slot }: { angle: PhotoAngle; slot: PhotoSlot }) => {
      const currentPhotos = getStoredPhotos();
      const updated: PhotosState = {
        ...currentPhotos,
        [angle]: {
          ...(currentPhotos[angle] || { baseline: null, current: null }),
          [slot]: null,
        },
      };
      setLocal("p35_photos", updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(photosQueryKey, updated);
    },
  });

  const closeAndArchiveBlock = useMutation({
    mutationFn: async ({ blockId, blockName }: { blockId: string; blockName: string }) => {
      const currentPhotos = getStoredPhotos();
      const currentArchive = getLocal<ArchivedBlockPhotos[]>("p35_archived_photos", []);

      const newArchiveRecord: ArchivedBlockPhotos = {
        blockId,
        blockName,
        dateClosed: new Date().toISOString().slice(0, 10),
        front: { baseline: currentPhotos.front?.baseline ?? null, final: currentPhotos.front?.current ?? null },
        side: { baseline: currentPhotos.side?.baseline ?? null, final: currentPhotos.side?.current ?? null },
        back: { baseline: currentPhotos.back?.baseline ?? null, final: currentPhotos.back?.current ?? null },
      };

      const updatedArchive = [newArchiveRecord, ...currentArchive];
      setLocal("p35_archived_photos", updatedArchive);

      const nextBlockPhotos: PhotosState = {
        front: { baseline: currentPhotos.front?.current ?? currentPhotos.front?.baseline ?? null, current: null },
        side: { baseline: currentPhotos.side?.current ?? currentPhotos.side?.baseline ?? null, current: null },
        back: { baseline: currentPhotos.back?.current ?? currentPhotos.back?.baseline ?? null, current: null },
      };

      setLocal("p35_photos", nextBlockPhotos);
      return { photos: nextBlockPhotos, archive: updatedArchive };
    },
    onSuccess: ({ photos: newPhotos, archive: newArchive }) => {
      qc.setQueryData(photosQueryKey, newPhotos);
      qc.setQueryData(archiveQueryKey, newArchive);
    },
  });

  return { photos, archive, upload, removePhoto, closeAndArchiveBlock };
}

// 5. BACKUP EXPORT & IMPORT UTILITIES
export function exportDashboardBackup() {
  const backup = buildFullBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `project35-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importDashboardBackup(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.weighIns) setLocal("p35_weigh_ins", data.weighIns);
        if (data.hevyApiKey) localStorage.setItem("p35_hevy_api_key", data.hevyApiKey);
        if (data.geminiApiKey) localStorage.setItem("p35_gemini_api_key", data.geminiApiKey);
        if (data.workout) setLocal("p35_cached_workout", data.workout);
        if (data.coachMessages) setLocal("p35_coach_messages", data.coachMessages);
        if (data.archivedPhotos) setLocal("p35_archived_photos", data.archivedPhotos);

        if (data.photos) {
          if ("front" in data.photos) {
            setLocal("p35_photos", data.photos);
          } else if ("baseline" in data.photos) {
            setLocal("p35_photos", {
              front: { baseline: data.photos.baseline ?? null, current: data.photos.current ?? null },
              side: { baseline: null, current: null },
              back: { baseline: null, current: null },
            });
          }
        }

        if (data.habits && typeof data.habits === "object") {
          for (const [dayKey, state] of Object.entries(data.habits)) {
            setLocal(`p35_habits_${dayKey}`, state);
          }
        }

        if (data.journals && typeof data.journals === "object") {
          for (const [dayKey, text] of Object.entries(data.journals)) {
            localStorage.setItem(`p35_journal_${dayKey}`, String(text));
          }
        }

        resolve(true);
      } catch {
        resolve(false);
      }
    };
    reader.readAsText(file);
  });
}

// 6. COACH MESSAGES HOOK
export function useCoachMessages(userId: string | null) {
  const qc = useQueryClient();
  const queryKey = ["p35-coach-msgs", userId || "local"];

  const { data: messages = [] } = useQuery<CoachMsg[]>({
    queryKey,
    queryFn: () => getLocal<CoachMsg[]>("p35_coach_messages", []),
    staleTime: Infinity,
  });

  const add = useMutation({
    mutationFn: async (msg: CoachMsg) => {
      const current = getLocal<CoachMsg[]>("p35_coach_messages", []);
      const updated = [...current, msg];
      setLocal("p35_coach_messages", updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(queryKey, updated);
    },
  });

  return { messages, add };
}

// 7. FRIDAY WEIGH-IN AUTO BACKUP
export async function triggerFridayBackup(date: string): Promise<void> {
  const backup = buildFullBackup();
  const jsonStr = JSON.stringify(backup, null, 2);
  const fileName = `p35-backup-${date}.json`;
  const file = new File([jsonStr], fileName, { type: "application/json" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Project 35 Backup (${date})`,
        text: `Complete snapshot for ${date}`,
      });
      return;
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }
  }

  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
