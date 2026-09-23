import { Badge } from "@/components/ui/badge";
import { getActiveBlockCountdown } from "@/lib/project35";
import { Calendar, Flame, ShieldHalf, Target } from "lucide-react";

export function DashboardHeader() {
  const {
    phaseId,
    blockName,
    goal,
    dateRange,
    currentWeek,
    totalWeeks,
    daysLeft,
    progress,
  } = getActiveBlockCountdown();

  return (
    <header className="panel glow-ring relative overflow-hidden p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <ShieldHalf className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="stat-label">Character sheet</p>
          <h1 className="text-2xl leading-tight font-bold">
            Project 35: <span className="text-primary">The Undeniable Standard</span>
          </h1>
        </div>
      </div>

      <p className="border-l-2 border-primary/60 pl-3 text-sm text-muted-foreground italic">
        Built over years. Ready for everything. Arrive at 35 in undeniable shape.
      </p>

      {/* Clean Phase Badge: Phase 1 • Block 1: The Clock */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="gap-1.5 bg-primary/15 text-primary hover:bg-primary/20">
          <Flame className="size-3.5" />
          Phase {phaseId} &bull; {blockName}
        </Badge>
      </div>

      {/* Block Date Range & Objective Callout */}
      <div className="rounded-lg border border-border bg-surface-2/50 p-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Calendar className="size-3.5 text-primary" /> {dateRange}
          </span>
          <span className="font-semibold text-primary">{progress}% Completed</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Target className="size-3.5 text-primary shrink-0" />
          <span>Goal: {goal}</span>
        </div>
      </div>

      {/* 2 Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface-2/60 p-3.5 text-center">
          <p className="font-display text-2xl font-bold text-primary">Week {currentWeek}</p>
          <p className="stat-label mt-0.5">Of {totalWeeks}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2/60 p-3.5 text-center">
          <p className="font-display text-2xl font-bold text-primary">{daysLeft}</p>
          <p className="stat-label mt-0.5">Days Left</p>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="space-y-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </header>
  );
}
