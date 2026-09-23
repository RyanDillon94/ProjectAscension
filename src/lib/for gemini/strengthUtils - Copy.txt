import { getMuscleGroupForExercise, MuscleGroup, MUSCLE_GROUPS } from "./strengthMapping";

export type WorkoutSet = {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string; // YYYY-MM-DD
};

export type TopExercise = {
  exerciseName: string;
  currentE1RM: number;
  percentChange: number;
};

export type MuscleGroupSummary = {
  strengthChange: number;
  volumeChange: number;
  currentVolume: number;
  baselineVolume: number;
  topExercises: TopExercise[];
};

export type ProgressReport = {
  overallStrengthChange: number;
  overallVolumeChange: number;
  muscleGroups: Record<MuscleGroup, MuscleGroupSummary>;
  weeklyTrend: any[];
};

export function calculateE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function calculateTrainingProgress(sets: WorkoutSet[]): ProgressReport {
  const now = new Date().getTime();
  const MS_PER_DAY = 86_400_000;
  
  // Continuous 28-day rolling windows
  const currentWindowStart = now - (28 * MS_PER_DAY); // Days 0-28 (Current)
  const baselineWindowStart = now - (56 * MS_PER_DAY); // Days 29-56 (Baseline)

  const validSets = sets.filter(s => {
    if (!s || s.weight <= 0 || s.reps <= 0) return false;
    const time = new Date(s.date).getTime();
    return !isNaN(time) && time >= baselineWindowStart && time <= now;
  });

  if (validSets.length === 0) {
    const emptyGroups = {} as Record<MuscleGroup, MuscleGroupSummary>;
    MUSCLE_GROUPS.forEach(g => {
      emptyGroups[g] = { strengthChange: 0, volumeChange: 0, currentVolume: 0, baselineVolume: 0, topExercises: [] };
    });
    return { overallStrengthChange: 0, overallVolumeChange: 0, muscleGroups: emptyGroups, weeklyTrend: [] };
  }

  const exerciseComparison: Map<string, { 
    muscle: MuscleGroup; 
    baseE1rm: number; 
    recentE1rm: number; 
    baseVol: number; 
    recentVol: number; 
    baseSets: number; 
    recentSets: number 
  }> = new Map();

  validSets.forEach(s => {
    const muscle = getMuscleGroupForExercise(s.exerciseName);
    if (!muscle) return;

    const time = new Date(s.date).getTime();
    const e1rm = calculateE1RM(s.weight, s.reps);
    const vol = s.weight * s.reps;

    if (!exerciseComparison.has(s.exerciseName)) {
      exerciseComparison.set(s.exerciseName, {
        muscle,
        baseE1rm: 0,
        recentE1rm: 0,
        baseVol: 0,
        recentVol: 0,
        baseSets: 0,
        recentSets: 0,
      });
    }

    const entry = exerciseComparison.get(s.exerciseName)!;

    if (time >= currentWindowStart) {
      // It falls in the most recent 28 days
      entry.recentVol += vol;
      entry.recentSets += 1;
      if (e1rm > entry.recentE1rm) entry.recentE1rm = e1rm;
    } else {
      // It falls in the previous 28 days (baseline)
      entry.baseVol += vol;
      entry.baseSets += 1;
      if (e1rm > entry.baseE1rm) entry.baseE1rm = e1rm;
    }
  });

  const muscleVolumeCurrent: Record<MuscleGroup, number> = { Chest: 0, Back: 0, Shoulders: 0, Biceps: 0, Triceps: 0, Legs: 0 };
  const muscleVolumeBase: Record<MuscleGroup, number> = { Chest: 0, Back: 0, Shoulders: 0, Biceps: 0, Triceps: 0, Legs: 0 };
  let totalVolumeBase = 0;
  let totalVolumeCurrent = 0;

  const muscleStrengthChanges: Record<MuscleGroup, { totalWeightedChange: number; totalWeight: number; exercises: TopExercise[] }> = {
    Chest: { totalWeightedChange: 0, totalWeight: 0, exercises: [] },
    Back: { totalWeightedChange: 0, totalWeight: 0, exercises: [] },
    Shoulders: { totalWeightedChange: 0, totalWeight: 0, exercises: [] },
    Biceps: { totalWeightedChange: 0, totalWeight: 0, exercises: [] },
    Triceps: { totalWeightedChange: 0, totalWeight: 0, exercises: [] },
    Legs: { totalWeightedChange: 0, totalWeight: 0, exercises: [] },
  };

  exerciseComparison.forEach((data, exerciseName) => {
    muscleVolumeBase[data.muscle] += data.baseVol;
    muscleVolumeCurrent[data.muscle] += data.recentVol;
    totalVolumeBase += data.baseVol;
    totalVolumeCurrent += data.recentVol;

    let exChange = 0;
    if (data.baseE1rm > 0 && data.recentE1rm > 0) {
      exChange = ((data.recentE1rm - data.baseE1rm) / data.baseE1rm) * 100;
      const weight = data.recentSets + data.baseSets;

      muscleStrengthChanges[data.muscle].totalWeightedChange += exChange * weight;
      muscleStrengthChanges[data.muscle].totalWeight += weight;
    } else if (data.baseE1rm === 0 && data.recentE1rm > 0) {
      // New exercise introduced this month
      exChange = 100;
    }

    // Push to exercise list if it has current volume
    if (data.recentVol > 0) {
      muscleStrengthChanges[data.muscle].exercises.push({
        exerciseName,
        currentE1RM: data.recentE1rm,
        percentChange: Math.round(exChange * 10) / 10
      });
    }
  });

  // Safe percentage calculator
  const calcChange = (current: number, base: number) => {
    if (base === 0 && current === 0) return 0;
    if (base === 0 && current > 0) return 100; // Cap at 100% instead of infinity
    return Math.round(((current - base) / base) * 1000) / 10;
  };

  const overallVolumeChange = calcChange(totalVolumeCurrent, totalVolumeBase);

  const muscleGroupSummaries = {} as Record<MuscleGroup, MuscleGroupSummary>;
  let overallWeightedStrengthChange = 0;
  let overallStrengthWeight = 0;

  MUSCLE_GROUPS.forEach(group => {
    const mData = muscleStrengthChanges[group];
    const strengthChange = mData.totalWeight > 0 
      ? Math.round((mData.totalWeightedChange / mData.totalWeight) * 10) / 10 
      : 0;

    const vBase = muscleVolumeBase[group];
    const vCurrent = muscleVolumeCurrent[group];
    const volumeChange = calcChange(vCurrent, vBase);

    // Sort top exercises by the highest E1RM percent change, then slice to top 3
    const topExercises = mData.exercises
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 3);

    muscleGroupSummaries[group] = {
      strengthChange,
      volumeChange,
      currentVolume: vCurrent,
      baselineVolume: vBase,
      topExercises
    };

    // Global strength metric usually excludes small isolation muscles to prevent skewing
    if (mData.totalWeight > 0 && group !== "Biceps" && group !== "Triceps") {
      overallWeightedStrengthChange += mData.totalWeightedChange;
      overallStrengthWeight += mData.totalWeight;
    }
  });

  const overallStrengthChange = overallStrengthWeight > 0 
    ? Math.round((overallWeightedStrengthChange / overallStrengthWeight) * 10) / 10 
    : 0;

  return {
    overallStrengthChange,
    overallVolumeChange,
    muscleGroups: muscleGroupSummaries,
    weeklyTrend: [],
  };
}
