import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/p35/header";
import { NonNegotiables } from "@/components/p35/non-negotiables";
import { WeeklyProtocolCard } from "@/components/p35/WeeklyProtocolCard";
import { PhotoCheckpoint } from "@/components/p35/photo-checkpoint";
import { WeightCard } from "@/components/p35/weight-card";
import { HevyCard } from "@/components/p35/hevy-card";
import { CoachDrawer } from "@/components/p35/coach-drawer";
import { Roadmap } from "@/components/p35/roadmap";
import { DataBackupCard } from "@/components/p35/data-backup-card";
import { DeloadCard } from "@/components/p35/deload-card";
import { FinaliseWeekBanner } from "@/components/p35/finalise-week-banner";
import { useUserSettings, useWeighIns } from "@/lib/p35-cloud";
import { WeeklyTrendsAnalytics } from "@/components/p35/weekly-trends-analytics";
import { MissionArchiveCard } from "@/components/p35/mission-archive-card";
import { todayKey } from "@/lib/project35";
import { TestModePanel } from '../components/TestModePanel';


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project 35: The Undeniable Standard" },
      {
        name: "description",
        content:
          "Dark fitness command centre: daily non-negotiables, Friday weight trend, Hevy sync, AI coach and a 3-year phase roadmap to November 2029.",
      },
      { property: "og:title", content: "Project 35: The Undeniable Standard" },
      {
        property: "og:description",
        content:
          "Track the cut, the 6:00 AM habit, weekly weight averages and every training phase on the road to 35.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Dashboard userId="local-user" />;
}

function Dashboard({ userId }: { userId: string }) {
  const { entries, save } = useWeighIns(userId);
  const { hevyApiKey, workout, update } = useUserSettings(userId);
  const [isFinalised, setIsFinalised] = useState(false);
  
  // Track the currently viewed date from local storage/navigator
  const [currentDate, setCurrentDate] = useState(() => localStorage.getItem("p35_active_date") || todayKey());

  // 1. Boot Sequence & Aggressive Thaw Checker
  useEffect(() => {
    // 1. On first mount, snap to today
    const appBootDay = todayKey();
    localStorage.setItem("p35_active_date", appBootDay);
    setCurrentDate(appBootDay);
    window.dispatchEvent(new Event("p35-date-changed"));

    // 2. The "Thaw" Handler
    // If you swipe the app closed, the phone often just freezes the webview.
    // When you open it the next morning, it unfreezes. This instantly catches 
    // the unfreeze event and forces a reload to today if a new day has started.
    const handleWakeUp = () => {
      if (document.visibilityState === "visible") {
        if (todayKey() !== appBootDay) {
          localStorage.setItem("p35_active_date", todayKey());
          window.location.reload();
        }
      }
    };

    // Listen for the app coming back to the foreground
    document.addEventListener("visibilitychange", handleWakeUp);
    window.addEventListener("focus", handleWakeUp);

    // 3. Fallback interval for midnight rollovers if the screen is actively on
    const checkMidnight = setInterval(() => {
      if (todayKey() !== appBootDay) {
        localStorage.setItem("p35_active_date", todayKey());
        window.location.reload();
      }
    }, 5000);

    return () => {
      document.removeEventListener("visibilitychange", handleWakeUp);
      window.removeEventListener("focus", handleWakeUp);
      clearInterval(checkMidnight);
    };
  }, []);

  // 2. Existing Hook: State and event tracking for date/finalise changes
  useEffect(() => {
    const updateDateAndStatus = () => {
      const active = localStorage.getItem("p35_active_date") || todayKey();
      setCurrentDate(active);

      const weekKey = `p35_finalised_week_${active}`;
      setIsFinalised(localStorage.getItem(weekKey) !== null);
    };

    updateDateAndStatus();

    window.addEventListener("p35-week-finalised", updateDateAndStatus);
    window.addEventListener("storage", updateDateAndStatus);
    window.addEventListener("p35-date-changed", updateDateAndStatus as EventListener);
    
    const interval = setInterval(updateDateAndStatus, 300);

    return () => {
      window.removeEventListener("p35-week-finalised", updateDateAndStatus);
      window.removeEventListener("storage", updateDateAndStatus);
      window.removeEventListener("p35-date-changed", updateDateAndStatus as EventListener);
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 pt-5 pb-28">

      {/* Top Banner (Only if NOT finalised) */}
      {!isFinalised && <FinaliseWeekBanner userId={userId} key={`top-${currentDate}`} />}

      <DashboardHeader />
      <NonNegotiables userId={userId} />
      
      {/* Pass the active navigated date down to the protocol card */}
      <WeeklyProtocolCard currentDate={currentDate} />

      <HevyCard
        workout={workout}
        apiKey={hevyApiKey}
        onSaveKey={(key) => update.mutateAsync({ hevyApiKey: key })}
        onWorkout={(next) => update.mutateAsync({ workout: next })}
      />
      <WeightCard
        entries={entries}
        saving={save.isPending}
        onSave={(entry) => save.mutateAsync(entry)}
      />
      <PhotoCheckpoint userId={userId} />
      <Roadmap />

      {/* Footer Management Section */}
      <div className="flex flex-col items-center gap-2 pt-4 border-t border-border/40">
        <WeeklyTrendsAnalytics/>
        <MissionArchiveCard />
        <DeloadCard />
        <DataBackupCard />
      </div>

      {/* Bottom Banner (Only AFTER finalised) */}
      {isFinalised && <FinaliseWeekBanner userId={userId} key={`bot-${currentDate}`} />}

      <CoachDrawer workout={workout} entries={entries} userId={userId} />
      
   {/*   <TestModePanel /> */}
    </main>
  );
}
