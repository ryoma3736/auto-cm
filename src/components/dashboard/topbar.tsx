import { Bell, HelpCircle, Megaphone, ChevronDown } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
      {/* Center info pill */}
      <div className="hidden flex-1 justify-center md:flex">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground card-soft">
          <Megaphone className="size-4 text-primary" />
          商品画像1枚から！ AIが5つのエンジンで同時にCMを生成します
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 md:ml-auto">
        <button className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground" aria-label="通知">
          <Bell className="size-4.5" />
        </button>
        <button className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground" aria-label="ヘルプ">
          <HelpCircle className="size-4.5" />
        </button>
        <button className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 card-soft">
          <span className="bg-gradient-primary grid size-7 place-items-center rounded-full text-xs font-bold text-white">CC</span>
          <span className="hidden text-sm font-semibold sm:block">Customer Cloud</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
