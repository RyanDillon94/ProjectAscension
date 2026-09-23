export type MuscleGroup = "Chest" | "Back" | "Shoulders" | "Biceps" | "Triceps" | "Legs";

export const MUSCLE_GROUPS: MuscleGroup[] = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs"];

export const EXERCISE_MUSCLE_MAP: Record<string, MuscleGroup> = {
  // Chest
  "bench press": "Chest",
  "barbell bench press": "Chest",
  "dumbbell bench press": "Chest",
  "incline barbell bench press": "Chest",
  "incline dumbbell bench press": "Chest",
  "decline barbell bench press": "Chest",
  "decline dumbbell bench press": "Chest",
  "chest press": "Chest",
  "chest press (machine)": "Chest",
  "incline chest press (machine)": "Chest",
  "iso-lateral chest press (machine)": "Chest",
  "vertical chest press": "Chest",
  "weighted dip": "Chest",
  "ring dips": "Chest",
  "chest dip": "Chest",
  "chest fly": "Chest",
  "cable fly": "Chest",
  "chest fly (dumbbell)": "Chest",
  "incline chest fly": "Chest",
  "seated chest flys": "Chest",
  "cable crossover": "Chest",
  "low cable fly": "Chest",
  "push up": "Chest",
  "ring push up": "Chest",

  // Back
  "lat pulldown": "Back",
  "lat pulldown (cable)": "Back",
  "barbell row": "Back",
  "dumbbell row": "Back",
  "bent over row": "Back",
  "bent over plate row": "Back",
  "bent over row smith machine": "Back",
  "seated cable row": "Back",
  "seated row (machine)": "Back",
  "seated cable row - bar wide grip": "Back",
  "seated cable row - v grip (cable)": "Back",
  "seated cable row - bar grip": "Back",
  "standing cable row": "Back",
  "upwards cable row": "Back",
  "single arm cable row": "Back",
  "seal row": "Back",
  "t bar row": "Back",
  "t bar wide grip": "Back",
  "chest supported t bar row": "Back",
  "chest supported barbell row": "Back",
  "chest supported incline row": "Back",
  "gorilla row": "Back",
  "iso-lateral low row": "Back",
  "iso-lateral row": "Back",
  "landmine row": "Back",
  "meadows rows": "Back",
  "pendlay row": "Back",
  "renegade row": "Back",
  "inverted row": "Back",
  "low row": "Back",
  "pull-up": "Back",
  "chin-up": "Back",
  "scapular pull ups": "Back",
  "dead hang": "Back",
  "trap bar deadlift": "Back",
  "deadlift": "Back",
  "rack pull": "Back",
  "back extension": "Back",
  "back extension (machine)": "Back",
  "back extension (hyperextension)": "Back",
  "back extension (weighted hyperextension)": "Back",
  "superman": "Back",
  "reverse fly double cable": "Back",

  // Shoulders
  "shoulder press": "Shoulders",
  "dumbbell shoulder press": "Shoulders",
  "barbell overhead press": "Shoulders",
  "overhead press": "Shoulders",
  "seated overhead press": "Shoulders",
  "seated shoulder press": "Shoulders",
  "shoulder press (machine)": "Shoulders",
  "shoulder press (machine plates)": "Shoulders",
  "v bar shoulder press": "Shoulders",
  "seated shoulder press inside": "Shoulders",
  "lateral raise": "Shoulders",
  "lateral raise (machine)": "Shoulders",
  "lateral raise (dumbbell)": "Shoulders",
  "lateral raise (cable)": "Shoulders",
  "lateral raise (band)": "Shoulders",
  "single arm lateral raise": "Shoulders",
  "front raise": "Shoulders",
  "plate front raise": "Shoulders",
  "face pull": "Shoulders",
  "arnold press": "Shoulders",
  "rear delt fly": "Shoulders",
  "reverse fly": "Shoulders",
  "rear delt": "Shoulders",
  "chest supported reverse fly": "Shoulders",
  "upright row": "Shoulders",
  "standing y raise": "Shoulders",
  "shrug": "Shoulders",

  // Biceps
  "bicep curl": "Biceps",
  "barbell curl": "Biceps",
  "dumbbell curl": "Biceps",
  "bicep curl (barbell)": "Biceps",
  "bicep curl (dumbbell)": "Biceps",
  "bicep curl (machine)": "Biceps",
  "bicep curl (suspension)": "Biceps",
  "hammer curl": "Biceps",
  "hammer curl (dumbbell)": "Biceps",
  "hammer curl (band)": "Biceps",
  "hammer curl (cable)": "Biceps",
  "hammer spider curls": "Biceps",
  "preacher curl": "Biceps",
  "preacher curl (dumbbell)": "Biceps",
  "preacher curl (machine)": "Biceps",
  "preacher curl (barbell)": "Biceps",
  "preacher bicep curl outside": "Biceps",
  "concentration curl": "Biceps",
  "spider curl": "Biceps",
  "spider curl (barbell)": "Biceps",
  "spider curl (dumbbell)": "Biceps",
  "spider curl inside": "Biceps",
  "waiter curl": "Biceps",
  "zottman curl": "Biceps",
  "kettlebell curl": "Biceps",
  "overhead curl": "Biceps",
  "pinwheel curl": "Biceps",
  "plate curl": "Biceps",
  "reverse curl": "Biceps",
  "reverse curl (barbell)": "Biceps",
  "reverse curl (cable)": "Biceps",
  "reverse curl (dumbbell)": "Biceps",
  "reverse grip concentration curl": "Biceps",
  "rope cable curl": "Biceps",
  "seated incline curl": "Biceps",
  "seated incline hammer curl": "Biceps",
  "standing bicep cable curl": "Biceps",
  "ez bar biceps curl": "Biceps",
  "21s bicep curl": "Biceps",
  "behind the back curl": "Biceps",
  "cross body hammer curl": "Biceps",
  "drag curl": "Biceps",
  "single arm curl": "Biceps",

  // Triceps
  "tricep pushdown": "Triceps",
  "triceps pushdown": "Triceps",
  "triceps rope pushdown": "Triceps",
  "v bar pushdown": "Triceps",
  "skull crusher": "Triceps",
  "skullcrusher": "Triceps",
  "overhead triceps extension": "Triceps",
  "close grip bench press": "Triceps",
  "tricep dip": "Triceps",
  "tricep extension": "Triceps",
  "single arm tricep pushdown": "Triceps",
  "triceps kickback": "Triceps",

  // Legs
  "squat": "Legs",
  "barbell squat": "Legs",
  "front squat": "Legs",
  "leg press": "Legs",
  "leg curl": "Legs",
  "romanian deadlift": "Legs",
  "leg extension": "Legs",
  "lying leg curl": "Legs",
  "calf raise": "Legs",
  "hip thrust": "Legs",
};

export function getMuscleGroupForExercise(exerciseName: string): MuscleGroup | null {
  const normalized = exerciseName.trim().toLowerCase();
  if (EXERCISE_MUSCLE_MAP[normalized]) {
    return EXERCISE_MUSCLE_MAP[normalized];
  }
  
  for (const [key, group] of Object.entries(EXERCISE_MUSCLE_MAP)) {
    if (normalized.includes(key)) {
      return group;
    }
  }

  // Broad single-muscle category fallbacks conforming to specification
  if (
    normalized.includes("bench press") ||
    normalized.includes("chest press") ||
    normalized.includes("chest fly") ||
    normalized.includes("cable crossover") ||
    normalized.includes("pec deck") ||
    (normalized.includes("push up") && !normalized.includes("close grip")) ||
    (normalized.includes("dip") && !normalized.includes("tricep"))
  ) {
    return "Chest";
  }

  if (
    normalized.includes("lat") ||
    normalized.includes("row") ||
    normalized.includes("pulldown") ||
    normalized.includes("pull-up") ||
    normalized.includes("chin-up") ||
    normalized.includes("deadlift") ||
    normalized.includes("rack pull") ||
    normalized.includes("hyperextension") ||
    normalized.includes("superman") ||
    (normalized.includes("extension") && !normalized.includes("tricep") && !normalized.includes("leg"))
  ) {
    return "Back";
  }

  if (
    normalized.includes("shoulder") ||
    normalized.includes("lateral raise") ||
    normalized.includes("overhead press") ||
    normalized.includes("face pull") ||
    normalized.includes("rear delt") ||
    normalized.includes("reverse fly") ||
    normalized.includes("upright row") ||
    normalized.includes("shrug") ||
    normalized.includes("delt")
  ) {
    return "Shoulders";
  }

  if (
    (normalized.includes("curl") && !normalized.includes("leg") && !normalized.includes("wrist")) ||
    normalized.includes("21s")
  ) {
    return "Biceps";
  }

  if (
    normalized.includes("tricep") ||
    normalized.includes("pushdown") ||
    normalized.includes("skull") ||
    normalized.includes("close-grip")
  ) {
    return "Triceps";
  }

  if (
    normalized.includes("squat") ||
    normalized.includes("leg press") ||
    normalized.includes("leg extension") ||
    normalized.includes("thrust") ||
    normalized.includes("calf") ||
    normalized.includes("romanian") ||
    normalized.includes("leg curl")
  ) {
    return "Legs";
  }
  
  return null;
}