import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GOAL_WEIGHT, START_WEIGHT, lastSundayKey } from "@/lib/project35";
import { Plus, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export type WeightEntry = { date: string; weight: number };

const STORAGE_KEY = "p35_weigh_ins";

export function WeightCard({
  entries: propEntries = [],
  onSave,
}: {
  entries?: WeightEntry[];
  onSave?: (entry: WeightEntry) => Promise<void>;
  saving?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(lastSundayKey());
  const [weight, setWeight] = useState("");
  const [localEntries, setLocalEntries] = useState<WeightEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : propEntries;
    } catch {
      return propEntries;
    }
  });

  useEffect(() => {
    if (propEntries && propEntries.length > 0 && localEntries.length === 0) {
      setLocalEntries(propEntries);
    }
  }, [propEntries]);

  const sorted = useMemo(
    () => [...localEntries].sort((a, b) => a.date.localeCompare(b.date)),
    [localEntries]
  );
  const latest = sorted[sorted.length - 1]?.weight;
  const dropped = latest != null ? +(START_WEIGHT - latest).toFixed(1) : 0;
  const toGoal = latest != null ? +(latest - GOAL_WEIGHT).toFixed(1) : null;

  const chartData = sorted.map((e) => {
    const [y, m, d] = e.date.split("-");
    return {
      label: `${d}/${m}`,
      weight: e.weight,
    };
  });

  const handleWeightChange = (rawValue: string) => {
    const cleaned = rawValue.replace(/\D/g, "");
    let formattedValue = cleaned;

    if (cleaned.length === 4) {
      formattedValue = `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    } else if (cleaned.length > 4) {
      formattedValue = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 4)}`;
    }

    setWeight(formattedValue);
  };

  const save = async () => {
    const value = Number(weight);
    if (!Number.isFinite(value) || value < 80 || value > 500) {
      toast.error("Enter a weight between 80 and 500 lbs.");
      return;
    }

    try {
      const newEntry: WeightEntry = { date, weight: value };
      const existingIndex = localEntries.findIndex((e) => e.date === date);
      let updated: WeightEntry[];
      if (existingIndex >= 0) {
        updated = [...localEntries];
        updated[existingIndex] = newEntry;
      } else {
        updated = [...localEntries, newEntry];
      }

      setLocalEntries(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (onSave) {
        onSave(newEntry).catch(() => {});
      }

      toast.success("Sunday average saved locally.");
      setWeight("");
      setOpen(false);
    } catch {
      toast.error("Could not save entry.");
    }
  };

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Weight Progression</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9">
              <Plus className="size-4" /> Log Sunday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Sunday Weight</DialogTitle>
              <DialogDescription>
                Enter your Sunday weekly average. Goal line is {GOAL_WEIGHT} lbs.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sunday-date">Sunday date</Label>
                <Input
                  id="sunday-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sunday-weight">Weekly average (lbs)</Label>
                <Input
                  id="sunday-weight"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 218.4"
                  value={weight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                />
              </div>
              {Number(weight) > 0 && (
                <p className="text-sm text-muted-foreground">
                  Pounds dropped from start ({START_WEIGHT} lbs):{" "}
                  <span className="font-semibold text-primary">
                    {(START_WEIGHT - Number(weight)).toFixed(1)} lbs
                  </span>
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => void save()} className="w-full sm:w-auto">
                Save entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Current", value: latest != null ? `${latest} lb` : "—" },
          { label: "Dropped", value: dropped ? `${dropped} lb` : "—" },
          { label: "To goal", value: toGoal != null ? `${Math.max(0, toGoal)} lb` : "—" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-surface-2/60 p-3 text-center"
          >
            <p className="font-display text-lg font-bold text-primary">{s.value}</p>
            <p className="stat-label">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 h-56 w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            Log your first Sunday average to start the trend.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[GOAL_WEIGHT - 6, "auto"]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  color: "var(--foreground)",
                }}
              />
              <ReferenceLine
                y={GOAL_WEIGHT}
                stroke="var(--gold)"
                strokeDasharray="5 4"
                label={{
                  value: `Goal ${GOAL_WEIGHT}`,
                  fill: "var(--gold)",
                  fontSize: 11,
                  position: "insideTopRight",
                }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--primary)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
