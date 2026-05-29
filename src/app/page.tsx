import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { StudioLauncher } from "@/components/dashboard/studio-launcher";
import { RecentProjects } from "@/components/dashboard/recent-projects";
import { GenerationResults } from "@/components/dashboard/generation-results";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ALL_ENGINE_IDS, isEngineLive, mockMode } from "@/lib/engines";
import type { EngineId } from "@/lib/engines/types";

export default function Home() {
  const liveEngines: EngineId[] = ALL_ENGINE_IDS.filter((id) => isEngineLive(id));
  const demo = mockMode() || liveEngines.length === 0;

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-5 sm:px-6">
          <StudioLauncher liveEngines={liveEngines} demo={demo} />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
            <RecentProjects />
            <GenerationResults />
          </div>

          <StatCards />

          <footer className="pt-2 text-center text-xs text-muted-foreground">
            auto-cm · Powered by Next.js + Vercel
          </footer>
        </main>
      </div>
    </div>
  );
}
