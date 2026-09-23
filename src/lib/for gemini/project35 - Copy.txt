import { getCurrentDate, getDeloadOffset } from "../utils/dateUtils";

export type AscensionUserProfile = {
  projectName?: string;
  tagline?: string;
  footerQuote?: string;
  startingWeight?: number;
  goalWeight?: number;
  targetDate?: string;
  dailyTargets?: {
    caloriesMin: number;
    caloriesMax: number;
    protein: number;
    steps: number;
    routine: string;
  };
  habits?: {
    key: string;
    label: string;
    sublabel: string;
  }[];
  phases?: PhaseDef[];
};

export function getAscensionProfile(): AscensionUserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ascension_user_profile");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Dynamic Daily Targets with reactive getters
export const DAILY_TARGETS = {
  get caloriesMin(): number {
    return getAscensionProfile()?.dailyTargets?.caloriesMin ?? 2200;
  },
  get caloriesMax(): number {
    return getAscensionProfile()?.dailyTargets?.caloriesMax ?? 2500;
  },
  get protein(): number {
    return getAscensionProfile()?.dailyTargets?.protein ?? 180;
  },
  get steps(): number {
    return getAscensionProfile()?.dailyTargets?.steps ?? 10000;
  },
  get routine(): string {
    return (
      getAscensionProfile()?.dailyTargets?.routine ??
      "Morning Routine → Athletic Training Session"
    );
  },
};

export const getGoalWeight = (): number => getAscensionProfile()?.goalWeight ?? 185.0;
export const getStartWeight = (): number => getAscensionProfile()?.startingWeight ?? 210.0;

// Universal numerical proxies so existing calculations (e.g. goal - current) work smoothly
export const GOAL_WEIGHT: any = new Proxy(Number, {
  get(_, prop) {
    const val = getGoalWeight();
    if (prop === Symbol.toPrimitive) return (hint: string) => (hint === "string" ? String(val) : val);
    if (prop === "valueOf") return () => val;
    if (prop === "toString") return () => String(val);
    const target = val as any;
    return typeof target[prop] === "function" ? target[prop].bind(val) : target[prop];
  },
});

export const START_WEIGHT: any = new Proxy(Number, {
  get(_, prop) {
    const val = getStartWeight();
    if (prop === Symbol.toPrimitive) return (hint: string) => (hint === "string" ? String(val) : val);
    if (prop === "valueOf") return () => val;
    if (prop === "toString") return () => String(val);
    const target = val as any;
    return typeof target[prop] === "function" ? target[prop].bind(val) : target[prop];
  },
});

export const TARGET_DATE = new Date(
  getAscensionProfile()?.targetDate || "2027-09-01T00:00:00Z"
);

export type HabitDefinition = {
  key: string;
  label: string;
  sublabel: string;
};

export type BlockDef = {
  name: string;
  window: string;
  start: string;
  end: string;
  focus: string[];
  bullets: string[];
  blockHabits?: HabitDefinition[];
};

export type PhaseDef = {
  id: number;
  title: string;
  window: string;
  status: "active" | "upcoming";
  summary: string;
  badges: string[];
  blocks: BlockDef[];
};

// Default 12-Month Periodized Template (Used until AI onboarding generates custom phases)
const DEFAULT_12_MONTH_PHASES: PhaseDef[] = [
  {
    id: 1,
    title: "Phase 1: Setting Standards & Base Engine",
    window: "Sep 2026 – Nov 2026",
    status: "active",
    summary: "Lock in daily training consistency, dial in nutrition, and build aerobic capacity.",
    badges: ["Base Conditioning", "Discipline"],
    blocks: [
      {
        name: "Block 1: Baseline Architecture",
        window: "Weeks 1–6",
        start: "2026-09-07",
        end: "2026-10-18",
        focus: ["Routine", "Base Engine"],
        bullets: [
          "Establish uncompromised workout consistency",
          "Lock in daily hydration, steps, and protein threshold",
          "Weekly rolling average weight tracking",
        ],
        blockHabits: [
          { key: "steps", label: "Daily Steps Hit", sublabel: "Baseline Movement" },
        ],
      },
      {
        name: "Block 2: Work Capacity",
        window: "Weeks 7–12",
        start: "2026-10-19",
        end: "2026-11-29",
        focus: ["Volume", "Conditioning"],
        bullets: [
          "Introduce post-session conditioning circuits",
          "Reinforce rotational power and core stability",
          "Maintain weekly deficit or lean bulk targets",
        ],
        blockHabits: [
          { key: "conditioning", label: "Conditioning Circuit Hit", sublabel: "Capacity Builder" },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Phase 2: Hypertrophy & Kinetic Power",
    window: "Nov 2026 – Feb 2027",
    status: "upcoming",
    summary: "Heavy compound volume, kinetic chain endurance, and lean mass accumulation.",
    badges: ["Hypertrophy", "Strength"],
    blocks: [
      {
        name: "Block 1: Heavy Compounds",
        window: "Weeks 13–18",
        start: "2026-11-30",
        end: "2027-01-10",
        focus: ["Strength"],
        bullets: ["Progressive overload on prime compound movements", "Solidify joint resilience"],
      },
      {
        name: "Block 2: Density Build",
        window: "Weeks 19–24",
        start: "2027-01-11",
        end: "2027-02-21",
        focus: ["Hypertrophy"],
        bullets: ["Volume progression with clean RPE regulation", "Strict recovery compliance"],
      },
    ],
  },
  {
    id: 3,
    title: "Phase 3: Athletic Performance & Combat Prep",
    window: "Feb 2027 – May 2027",
    status: "upcoming",
    summary: "Explosive power output, sports-specific conditioning, and rate of force development.",
    badges: ["Power", "Performance"],
    blocks: [
      {
        name: "Block 1: Speed-Strength",
        window: "Weeks 25–30",
        start: "2027-02-22",
        end: "2027-04-04",
        focus: ["Speed", "Power"],
        bullets: ["Dynamic effort work paired with high-output anaerobic intervals"],
      },
      {
        name: "Block 2: Tournament Engine",
        window: "Weeks 31–36",
        start: "2027-04-05",
        end: "2027-05-16",
        focus: ["Peaking", "Grip & Core"],
        bullets: ["Sport-specific conditioning peaks and tactical taper"],
      },
    ],
  },
  {
    id: 4,
    title: "Phase 4: Peak Ascension",
    window: "May 2027 – Aug 2027",
    status: "upcoming",
    summary: "Peak aesthetic leanness, full functional power, and permanent standard execution.",
    badges: ["Peak Shape", "Mastery"],
    blocks: [
      {
        name: "Block 1: Final Sharpen",
        window: "Weeks 37–42",
        start: "2027-05-17",
        end: "2027-06-27",
        focus: ["Body Composition"],
        bullets: ["Dial down to target bodyweight while preserving top-end power"],
      },
      {
        name: "Block 2: The Standard",
        window: "Weeks 43–48",
        start: "2027-06-28",
        end: "2027-08-08",
        focus: ["Identity"],
        bullets: ["Lock in peak form indefinitely. Project Ascension complete."],
      },
    ],
  },
];

export function getPhases(): PhaseDef[] {
  const profile = getAscensionProfile();
  return profile?.phases && profile.phases.length > 0
    ? profile.phases
    : DEFAULT_12_MONTH_PHASES;
}

export const PHASES = new Proxy(DEFAULT_12_MONTH_PHASES, {
  get(_, prop) {
    const active = getPhases();
    const val = (active as any)[prop];
    return typeof val === "function" ? val.bind(active) : val;
  },
});

export function daysBetween(from: Date, to: Date) {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

export function getLongTermTarget(): string {
  const profile = getAscensionProfile();
  return profile?.tagline ? `Target: ${profile.tagline}` : "Project Ascension: 12-Month Peak";
}

export const LONG_TERM_TARGET = {
  toString: () => getLongTermTarget(),
  valueOf: () => getLongTermTarget(),
};

export function getActiveBlockDetails(now = getCurrentDate()) {
  const phases = getPhases();
  const offsetDays = getDeloadOffset();
  const adjustedNowMs = now.getTime() - offsetDays * 86_400_000;

  let activePhase = phases[0];
  let activeBlock = phases[0].blocks[0];

  for (const phase of phases) {
    for (const block of phase.blocks) {
      const startMs = new Date(`${block.start}T00:00:00Z`).getTime();
      const endMs = new Date(`${block.end}T23:59:59Z`).getTime() + offsetDays * 86_400_000;

      if (adjustedNowMs >= startMs && adjustedNowMs <= endMs) {
        activePhase = phase;
        activeBlock = block;
        break;
      }
    }
  }

  const lastPhase = phases[phases.length - 1];
  const lastBlock = lastPhase.blocks[lastPhase.blocks.length - 1];
  if (adjustedNowMs > new Date(`${lastBlock.end}T23:59:59Z`).getTime() + offsetDays * 86_400_000) {
    activePhase = lastPhase;
    activeBlock = lastBlock;
  }

  return { activePhase, activeBlock };
}

export function getActiveHabits(now = getCurrentDate()): HabitDefinition[] {
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const { activeBlock } = getActiveBlockDetails(now);
  const profile = getAscensionProfile();

  // If the user generated custom habits in setup, map them
  if (profile?.habits && profile.habits.length > 0) {
    return profile.habits.map((h) => ({
      key: h.key,
      label: h.label,
      sublabel: h.sublabel || "Ascension Standard",
    }));
  }

  // Default habit stack
  const workoutHabit: HabitDefinition = isWeekend
    ? { key: "weekend_workout_complete", label: "Active Recovery / Walk", sublabel: "Weekend Standard" }
    : { key: "workout_complete", label: "Workout Completed", sublabel: "Session Logged" };

  const timeHabit: HabitDefinition = isWeekend
    ? { key: "weekend_early_start", label: "Morning Routine As Planned", sublabel: "Weekend Standard" }
    : { key: "early_morning", label: "Morning Standard Held", sublabel: "The Early Standard" };

  const stepsHabit: HabitDefinition = {
    key: "steps",
    label: `${DAILY_TARGETS.steps.toLocaleString()} Steps Hit`,
    sublabel: "Daily Activity Base",
  };

  const proteinHabit: HabitDefinition = {
    key: "protein",
    label: `Protein Target Hit (${DAILY_TARGETS.protein}g+)`,
    sublabel: "Muscle Retention & Recovery",
  };

  const caloriesHabit: HabitDefinition = {
    key: "calories",
    label: `Calorie Target Hit (${DAILY_TARGETS.caloriesMin.toLocaleString()}–${DAILY_TARGETS.caloriesMax.toLocaleString()} kcal)`,
    sublabel: "Macro Discipline",
  };

  const blockSpecificHabits: HabitDefinition[] =
    activeBlock.blockHabits && activeBlock.blockHabits.length > 0
      ? activeBlock.blockHabits
      : [stepsHabit];

  return [workoutHabit, timeHabit, ...blockSpecificHabits, proteinHabit, caloriesHabit];
}

export function getActiveBlockCountdown(now = getCurrentDate()) {
  const { activePhase, activeBlock } = getActiveBlockDetails(now);
  const offsetDays = getDeloadOffset();

  const start = new Date(new Date(`${activeBlock.start}T00:00:00Z`).getTime());
  const end = new Date(new Date(`${activeBlock.end}T23:59:59Z`).getTime() + offsetDays * 86_400_000);

  const total = Math.max(1, daysBetween(start, end));
  const daysLeft = Math.max(0, daysBetween(now, end));
  const elapsed = Math.min(total, Math.max(0, total - daysLeft));

  const totalWeeks = Math.max(1, Math.round(total / 7));
  const currentWeek = Math.min(totalWeeks, Math.floor(elapsed / 7) + 1);
  const progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));

  const formatDate = (dateStr: string, addOffset = false) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    if (addOffset) {
      dateObj.setUTCDate(dateObj.getUTCDate() + offsetDays);
    }
    return dateObj.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  };

  return {
    phaseId: activePhase.id,
    phaseTitle: `Phase ${activePhase.id}`,
    blockName: activeBlock.name,
    window: activeBlock.window,
    goal: activeBlock.bullets[0] || activePhase.summary,
    dateRange: `${formatDate(activeBlock.start)} — ${formatDate(activeBlock.end, true)}`,
    currentWeek,
    totalWeeks,
    daysLeft,
    progress,
    longTermTarget: getLongTermTarget(),
  };
}

export function countdownTo(target: Date, now = getCurrentDate()) {
  const days = Math.max(0, daysBetween(now, target));
  return {
    days,
    weeks: Math.floor(days / 7),
    months: Math.max(0, Math.round(days / 30.44)),
  };
}

export function todayKey(now = getCurrentDate()) {
  if (typeof window !== "undefined") {
    const testDate = localStorage.getItem("ascension_test_date");
    if (testDate) return testDate;
  }
  return now.toISOString().slice(0, 10);
}

export function lastSundayKey(now = getCurrentDate()) {
  const d = new Date(now);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
