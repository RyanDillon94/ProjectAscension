import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PHASES, getAscensionProfile } from "@/lib/project35";
import { getDeloadOffset } from "@/utils/dateUtils";
import { Calendar, Map } from "lucide-react";
import { RecalibrateModal } from "@/components/p35/recalibrate-modal";

function getShiftedBlockDates(blockStart: string, blockEnd: string, offsetDays: number) {
  const [sy, sm, sd] = blockStart.split("-").map(Number);
  const [ey, em, ed] = blockEnd.split("-").map(Number);

  const start = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  start.setUTCDate(start.getUTCDate() + offsetDays);
  end.setUTCDate(end.getUTCDate() + offsetDays);

  return { start, end };
}

function formatBlockWindow(startIso: string, endIso: string, offsetDays: number): string {
  const { start, end } = getShiftedBlockDates(startIso, endIso, offsetDays);

  const startStr = start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const endStr = end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return `${startStr} – ${endStr}`;
}

function getPhaseWindow(phase: any, offsetDays: number): string {
  if (!phase?.blocks?.length) return "";
  
  const firstBlock = phase.blocks[0];
  const lastBlock = phase.blocks[phase.blocks.length - 1];
  
  const { start } = getShiftedBlockDates(firstBlock.start, firstBlock.end, offsetDays);
  const { end } = getShiftedBlockDates(lastBlock.start, lastBlock.end, offsetDays);

  const startStr = start.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  const endStr = end.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

  return `${startStr} – ${endStr}`;
}

export function Roadmap() {
  const offsetDays = getDeloadOffset();
  
  // DEFENSIVE CHECKS: Fallback to empty objects/arrays if local storage is empty
  const profile = getAscensionProfile() || {};
  const safePhases = PHASES || [];

  // If no phases exist yet (pre-onboarding), render a safe empty state
  if (safePhases.length === 0) {
    return (
      <section className="panel p-5 text-center">
        <Map className="size-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">Roadmap Initializing</p>
        <p className="text-xs text-muted-foreground mt-1">Complete setup to generate your timeline.</p>
      </section>
    );
  }

  const totalPhases = safePhases.length;
  const blocksPerPhase = safePhases[0]?.blocks?.length || 0;
  
  const lastPhase = safePhases[totalPhases - 1];
  const lastBlock = lastPhase?.blocks?.[lastPhase.blocks.length - 1];
  
  let endMonthYear = "";
  if (lastBlock) {
    const { end } = getShiftedBlockDates(lastBlock.start, lastBlock.end, offsetDays);
    endMonthYear = end.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  }

  return (
    <section className="panel p-5">
      <div className="flex items-center gap-2">
        <Map className="size-5 text-primary" />
        <h2 className="text-lg font-bold">Macro Roadmap</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {totalPhases} phases. {blocksPerPhase} blocks each. {endMonthYear ? `Culminating ${endMonthYear}.` : ""}
      </p>

      <Accordion type="single" collapsible defaultValue={`phase-${safePhases[0]?.id}`} className="mt-4">
        {safePhases.map((phase: any) => (
          <AccordionItem key={phase.id} value={`phase-${phase.id}`} className="border-border">
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="flex w-full flex-col items-start gap-1.5 pr-2 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold">
                    Phase {phase.id}: {phase.title}
                  </span>
                  <Badge
                    className={
                      phase.status === "active"
                        ? "bg-primary/20 text-primary hover:bg-primary/25"
                        : "bg-muted text-muted-foreground hover:bg-muted"
                    }
                  >
                    {phase.status === "active" ? "Active" : "Upcoming"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {getPhaseWindow(phase, offsetDays)} &mdash; {phase.summary}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {phase.badges?.map((b: string) => (
                    <Badge key={b} variant="outline" className="border-primary/40 text-[11px] text-primary">
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Tabs defaultValue="block-0">
                <TabsList className="grid w-full grid-cols-2">
                  {phase.blocks?.map((block: any, i: number) => (
                    <TabsTrigger key={block.name} value={`block-${i}`} className="text-xs">
                      Block {i + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {phase.blocks?.map((block: any, i: number) => (
                  <TabsContent key={block.name} value={`block-${i}`} className="mt-3 space-y-3">
                    <div>
                      <p className="text-sm font-semibold">{block.name}</p>
                      <p className="stat-label mt-0.5">{block.window || "N/A"}</p>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <Calendar className="size-3.5 shrink-0" />
                      {formatBlockWindow(block.start, block.end, offsetDays)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {block.focus?.map((f: string) => (
                        <Badge key={f} className="bg-surface-2 text-[11px] text-foreground hover:bg-surface-2">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    <ul className="space-y-1.5">
                      {block.bullets?.map((line: string) => (
                        <li key={line} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                ))}
              </Tabs>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
      {/* RECALIBRATE BUTTON */}
      <div className="pt-4 pb-2 flex justify-center border-t border-border/40 mt-6">
        <RecalibrateModal />
      </div>

      {/* FOOTER QUOTE */}
      {profile?.footerQuote && (
        <div className="pt-4 text-center space-y-1.5">
          <p className="text-sm font-bold text-primary italic">
            "{profile.footerQuote}"
          </p>
        </div>
      )}
    </section>
  );
}
