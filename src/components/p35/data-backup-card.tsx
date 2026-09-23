import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { getAscensionProfile } from "@/lib/project35";

export function DataBackupCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    try {
      setExporting(true);
      const backupData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Grab the core app keys AND the new dynamic profile keys
        if (key && (key.startsWith("p35_") || key.startsWith("ascension_"))) {
          backupData[key] = localStorage.getItem(key) || "";
        }
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Dynamically name the backup file based on his project name
      const profile = getAscensionProfile();
      const safeProjectName = (profile?.projectName || "project-ascension")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");

      link.download = `${safeProjectName}-backup-${new Date().toISOString().slice(0, 10)}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Backup downloaded successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export data.");
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const backupData = JSON.parse(content);

        if (typeof backupData !== "object" || backupData === null) {
          throw new Error("Invalid backup file format.");
        }

        let count = 0;
        for (const [key, value] of Object.entries(backupData)) {
          // Allow restoring both key types
          if ((key.startsWith("p35_") || key.startsWith("ascension_")) && typeof value === "string") {
            localStorage.setItem(key, value);
            count++;
          }
        }

        toast.success(`Successfully restored ${count} keys. Reloading...`);
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to parse backup file.");
      } finally {
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="panel flex items-center justify-between w-full p-4 gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Download className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 w-full">
          <p className="text-sm font-bold truncate text-foreground">Local Storage & Backups</p>
          <p className="text-xs text-muted-foreground truncate w-full">Export or restore data</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleImportClick}
          className="gap-1.5 h-8 text-xs"
          title="Import Backup"
        >
          <Upload className="size-3.5" />
          <span>Import</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          className="gap-1.5 h-8 text-xs"
          title="Export Backup"
        >
          <Download className="size-3.5" />
          <span>Export</span>
        </Button>
      </div>
    </div>
  );
}
