import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getDeloadOffset, toggleDeloadWeek } from "@/utils/dateUtils";
import { Palmtree, Umbrella } from "lucide-react";
import { toast } from "sonner";

export function DeloadCard() {
  const isDeloadActive = getDeloadOffset() > 0;

  useEffect(() => {
    const pendingMsg = localStorage.getItem("p35_toast_msg");
    if (pendingMsg) {
      localStorage.removeItem("p35_toast_msg");
      toast.success(pendingMsg);
    }
  }, []);

  const handleToggle = () => {
    const willBeActive = !(getDeloadOffset() > 0);
    toggleDeloadWeek();

    const msg = willBeActive
      ? "Deload Week Activated"
      : "Deload Week Deactivated";
    localStorage.setItem("p35_toast_msg", msg);

    window.location.reload();
  };

  return (
    <div className="panel flex items-center justify-between w-full p-4 gap-2">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Palmtree className={`size-5 shrink-0 ${isDeloadActive ? "text-amber-500 animate-pulse" : "text-primary"}`} />
        <div className="min-w-0 w-full">
          <p className="text-sm font-bold truncate text-foreground">Deload / Holiday Mode</p>
          <p className="text-xs text-muted-foreground truncate w-full">
            {isDeloadActive ? "Active (+7d Roadmap Shift)" : "Standard Execution"}
          </p>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleToggle}
        className={
          isDeloadActive
            ? "gap-1.5 h-8 text-xs bg-amber-500 text-black border-amber-600 hover:bg-amber-600 font-semibold shrink-0"
            : "gap-1.5 h-8 text-xs shrink-0"
        }
      >
        <Umbrella className="size-3.5" />
        <span>{isDeloadActive ? "Active" : "Enable"}</span>
      </Button>
    </div>
  );
}
