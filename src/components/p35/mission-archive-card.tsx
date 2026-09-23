import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Archive,
  Trophy,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  Trash2,
  ChevronDown,
  AlertTriangle,
  X,
} from "lucide-react";
import { getActiveBlockCountdown } from "@/lib/project35";

type ArchivedWeek = {
  date: string;
  dateRange?: string;
  phaseTitle?: string;
  blockName?: string;
  overallPercentage: number;
  weeklyProtocolGoals: any[];
  aiSynthesis: string;
};

function FormattedSynthesis({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-xs text-muted-foreground leading-relaxed not-italic">
      {text.split("\n").map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Catches **The Numbers** and turns them into green bold text
        if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("**")) {
          return (
            <p key={i} className="font-bold text-primary pt-3 first:pt-0 text-sm">
              {trimmed.slice(2, -2)}
            </p>
          );
        }

        const formattedLine = trimmed.replace(/\*\*(.*?)\*\*/g, "$1");
        const isBullet = formattedLine.startsWith("*") || formattedLine.startsWith("-");
        const cleanText = isBullet ? formattedLine.replace(/^[*-\s]+/, "• ") : formattedLine;

        return (
          <p key={i} className={isBullet ? "pl-2 font-medium text-foreground/90" : ""}>
            {cleanText}
          </p>
        );
      })}
    </div>
  );
}

export function MissionArchiveCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [archives, setArchives] = useState<ArchivedWeek[]>([]);

  // Controls whether each individual week is expanded.
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>(
    {}
  );

  // Controls whether each week's AI synthesis is expanded.
  const [expandedAI, setExpandedAI] = useState<Record<string, boolean>>({});

  // Controls whether individual protocol-goal notes are expanded.
  // The key is `${weekDate}-${goalId}` so notes remain independent.
  const [expandedNotes, setExpandedNotes] = useState<
    Record<string, boolean>
  >({});

  // Controls the first stage of the two-step delete confirmation.
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loaded: ArchivedWeek[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key?.startsWith("p35_finalised_week_")) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || "{}");

          if (parsed.date) {
            loaded.push(parsed);
          }
        } catch (e) {
          console.error("Failed to parse archived week", e);
        }
      }
    }

    loaded.sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setArchives(loaded);

    // Start with everything collapsed when the archive is opened.
    setExpandedWeeks({});
    setExpandedAI({});
    setExpandedNotes({});
    setDeleteConfirm(null);
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);

    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getWeekRange = (dateString: string) => {
    const end = new Date(dateString);
    const start = new Date(end);

    start.setDate(end.getDate() - 6);

    const formatStr = (d: Date) =>
      d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });

    return `${formatStr(start)} - ${formatStr(end)}`;
  };

  const toggleWeek = (date: string) => {
    // Don't allow the week to be expanded while deletion confirmation
    // is active.
    if (deleteConfirm === date) return;

    setExpandedWeeks((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const toggleAI = (date: string) => {
    setExpandedAI((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const toggleNote = (weekDate: string, goalId: string | number) => {
    const noteKey = `${weekDate}-${goalId}`;

    setExpandedNotes((prev) => ({
      ...prev,
      [noteKey]: !prev[noteKey],
    }));
  };

  // First stage of deletion:
  // Show the warning directly inside the card.
  const startDelete = (date: string) => {
    setDeleteConfirm(date);
  };

  // Cancel the first-stage warning.
  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // Second stage of deletion:
  // Show the browser's native confirmation dialog.
  const confirmDelete = (dateKey: string) => {
    const confirmed = window.confirm(
      `FINAL CONFIRMATION\n\nAre you absolutely sure you want to permanently delete the archive for the week ending ${formatDate(
        dateKey
      )}?\n\nThis cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(`p35_finalised_week_${dateKey}`);

    setArchives((prev) =>
      prev.filter((a) => a.date !== dateKey)
    );

    setExpandedWeeks((prev) => {
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });

    setExpandedAI((prev) => {
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });

    setExpandedNotes((prev) => {
      const next = { ...prev };

      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${dateKey}-`)) {
          delete next[key];
        }
      });

      return next;
    });

    setDeleteConfirm(null);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div className="panel flex items-center justify-between p-4 cursor-pointer hover:border-primary/50 transition-colors w-full gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Archive className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 w-full text-left">
              <p className="text-sm font-bold truncate text-foreground">
                Mission Archive
              </p>
              <p className="text-xs text-muted-foreground truncate w-full">
                Historical weekly reviews & protocols
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="pointer-events-none gap-1.5 h-8 text-xs shrink-0 min-w-[84px] justify-center"
          >
            <Archive className="size-3.5" />
            <span>View</span>
          </Button>
        </div>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="flex h-[85vh] flex-col gap-0 p-0"
      >
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <SheetTitle>Mission Archive</SheetTitle>
          </div>

          <SheetDescription>
            Your complete history of locked-in weeks, protocol execution,
            and AI debriefs.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 bg-background">
          {archives.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-2/20 p-6 text-center">
              <p className="text-sm font-semibold text-muted-foreground">
                No Archives Found
              </p>

              <p className="text-xs text-muted-foreground/80 mt-1">
                Your historical weeks will appear here once you finalise
                them on Sundays.
              </p>
            </div>
          ) : (
            archives.map((archive) => {
              const hasValidSynthesis =
                archive.aiSynthesis &&
                !archive.aiSynthesis.includes(
                  "Tap below to generate"
                );

              const targetDate = new Date(archive.date);
              const block = getActiveBlockCountdown(targetDate);

              const phaseTitle =
                archive.phaseTitle ||
                block.phaseTitle ||
                "Project Ascension";

              const blockName =
                archive.blockName ||
                block.blockName ||
                "Execution Phase";

              const dateRange =
                archive.dateRange ||
                getWeekRange(archive.date);

              const isExpanded = !!expandedWeeks[archive.date];
              const isAIExpanded = !!expandedAI[archive.date];
              const isDeleting = deleteConfirm === archive.date;

              return (
                <div
                  key={archive.date}
                  className={`rounded-xl border overflow-hidden relative group transition-colors ${
                    isDeleting
                      ? "border-rose-500/60 bg-rose-500/5"
                      : "border-border bg-surface-2/40"
                  }`}
                >
                  {/* WEEK HEADER */}
                  <div
                    className={`px-4 py-3.5 transition-colors ${
                      !isDeleting
                        ? "hover:bg-surface-2/60"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* TITLE / WEEK DETAILS */}
                      <button
                        type="button"
                        onClick={() => toggleWeek(archive.date)}
                        disabled={isDeleting}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-sm leading-tight text-foreground truncate">
                            {phaseTitle}
                          </span>

                          <span className="text-xs text-muted-foreground font-medium leading-tight mt-0.5 truncate">
                            {blockName}
                          </span>

                          <span className="text-[11px] text-muted-foreground/70 font-normal leading-tight mt-1">
                            {dateRange}
                          </span>
                        </div>
                      </button>

                      {/* RIGHT SIDE */}
                      {!isDeleting ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* SCORE */}
                          <div
                            className={`min-w-[52px] h-7 px-2 flex items-center justify-center rounded-full text-[11px] font-bold ${
                              archive.overallPercentage >= 80
                                ? "bg-emerald-500/20 text-emerald-400"
                                : archive.overallPercentage >= 50
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {archive.overallPercentage}%
                          </div>

                          {/* DELETE */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                            onClick={() =>
                              startDelete(archive.date)
                            }
                            title="Delete Archive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>

                          {/* EXPAND WEEK */}
                          <button
                            type="button"
                            onClick={() => toggleWeek(archive.date)}
                            className="size-7 flex items-center justify-center rounded-md hover:bg-surface-2 transition-colors"
                            title={
                              isExpanded
                                ? "Collapse week"
                                : "Expand week"
                            }
                          >
                            <ChevronDown
                              className={`size-4 text-muted-foreground transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </div>
                      ) : (
                        /* FIRST DELETE CONFIRMATION */
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 text-rose-400 mr-1">
                            <AlertTriangle className="size-4" />

                            <span className="text-xs font-bold whitespace-nowrap">
                              Are you sure?
                            </span>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 hover:text-white"
                            onClick={() =>
                              confirmDelete(archive.date)
                            }
                          >
                            Delete
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={cancelDelete}
                            title="Cancel"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EXPANDED WEEK CONTENT */}
                  {isExpanded && !isDeleting && (
                    <div className="border-t border-border/50 px-4 py-4 space-y-4">
                      {/* PROTOCOL EXECUTION */}
                      {archive.weeklyProtocolGoals?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Protocol Execution
                          </p>

                          <div className="space-y-1.5">
                            {archive.weeklyProtocolGoals.map((g) => {
                              const isDone =
                                g.completed ||
                                g.status === "completed";

                              const countText =
                                g.targetCount &&
                                g.targetCount > 0
                                  ? ` (${g.completedCount || 0}/${g.targetCount})`
                                  : "";

                              const hasNotes =
                                !!g.notes &&
                                g.notes.trim().length > 0;

                              const noteKey = `${archive.date}-${g.id}`;
                              const isNoteExpanded =
                                !!expandedNotes[noteKey];

                              return (
                                <div
                                  key={g.id}
                                  className="flex items-start gap-2.5 text-xs"
                                >
                                  {/* STATUS ICON */}
                                  {isDone ? (
                                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                                  ) : (
                                    <XCircle className="size-4 text-rose-500 shrink-0 mt-0.5" />
                                  )}

                                  {/* GOAL + NOTE */}
                                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                    <div className="flex items-start gap-1.5">
                                      <span
                                        className={`font-medium flex-1 ${
                                          isDone
                                            ? "text-foreground"
                                            : "text-muted-foreground line-through opacity-80"
                                        }`}
                                      >
                                        {g.text}
                                        {countText}
                                      </span>

                                      {/* NOTE TOGGLE */}
                                      {hasNotes && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleNote(
                                              archive.date,
                                              g.id
                                            )
                                          }
                                          className="size-5 shrink-0 flex items-center justify-center rounded hover:bg-surface-2 transition-colors text-muted-foreground"
                                          title={
                                            isNoteExpanded
                                              ? "Hide note"
                                              : "Show note"
                                          }
                                        >
                                          <ChevronDown
                                            className={`size-3.5 transition-transform duration-200 ${
                                              isNoteExpanded
                                                ? "rotate-180"
                                                : ""
                                            }`}
                                          />
                                        </button>
                                      )}
                                    </div>

                                    {/* COLLAPSIBLE NOTE */}
                                    {hasNotes && isNoteExpanded && (
                                      <div className="mt-1 mr-1 text-[10px] italic text-muted-foreground/70 bg-surface-2/40 border border-border/40 rounded-md px-2.5 py-2 leading-relaxed">
                                        {g.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* AI SYNTHESIS */}
                      {hasValidSynthesis && (
                        <div className="border-t border-border/30 pt-3">
                          <button
                            type="button"
                            onClick={() =>
                              toggleAI(archive.date)
                            }
                            className="w-full flex items-center justify-between gap-2 text-left hover:text-foreground transition-colors"
                          >
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                              <BrainCircuit className="size-3.5 text-primary" />
                              AI Coach Synthesis
                            </p>

                            <ChevronDown
                              className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                                isAIExpanded
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          </button>

                          {isAIExpanded && (
                            <div className="mt-2 bg-surface-2/60 p-3 rounded-lg border border-border/50">
                              <FormattedSynthesis text={archive.aiSynthesis} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
