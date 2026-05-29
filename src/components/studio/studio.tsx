"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Download, Loader2, RotateCcw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Dropzone } from "./dropzone";
import { EngineCard } from "./engine-card";
import { ALL_ENGINE_IDS, ENGINE_CATALOG, getRecommendedEngine } from "@/lib/engines/catalog";
import type { EngineId, AspectRatio, Lang } from "@/lib/engines/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Step = "upload" | "review" | "result";

interface Analysis {
  productName: string;
  category: string;
  features: string[];
  targetAudience: string;
  mood: string;
  colors: string[];
}
interface Script {
  hook: string;
  narration: string;
  videoPrompt: string;
  durationSeconds: number;
  lang: Lang;
}
interface EngineRun {
  engine: EngineId;
  status: "pending" | "processing" | "succeeded" | "failed";
  videoUrl?: string;
  error?: string;
}
interface Job {
  id: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  engines: EngineId[];
  runs: Record<string, EngineRun>;
}

const DURATIONS = [8, 12, 15] as const;
const ASPECTS: { v: AspectRatio; label: string }[] = [
  { v: "9:16", label: "縦 9:16" },
  { v: "16:9", label: "横 16:9" },
  { v: "1:1", label: "正方 1:1" },
];
const LANGS: { v: Lang; label: string }[] = [
  { v: "ja", label: "日本語" },
  { v: "en", label: "English" },
  { v: "zh", label: "中文" },
];

export function Studio({ liveEngines }: { liveEngines: EngineId[] }) {
  const [step, setStep] = useState<Step>("upload");
  const [busy, setBusy] = useState(false);

  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const [lang, setLang] = useState<Lang>("ja");
  const [duration, setDuration] = useState<number>(8);
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [productHint, setProductHint] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [selected, setSelected] = useState<EngineId[]>([]);

  const [job, setJob] = useState<Job | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const liveSet = new Set(liveEngines);
  const recommended = analysis ? getRecommendedEngine(analysis.category, false) : "sora2";

  const reset = () => {
    setStep("upload");
    setPreview(null);
    setImageBase64(null);
    setAnalysis(null);
    setScript(null);
    setSelected([]);
    setJob(null);
  };

  const analyze = async () => {
    if (!imageBase64) return;
    setBusy(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, lang, duration, productHint, customPrompt }),
      });
      if (!res.ok) throw new Error((await res.json()).detail ?? "解析に失敗しました");
      const data = await res.json();
      setAnalysis(data.analysis);
      setScript(data.script);
      setSelected([getRecommendedEngine(data.analysis.category, false)]);
      setStep("review");
    } catch (e) {
      toast.error(`解析エラー: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!script || selected.length === 0) {
      toast.error("エンジンを1つ以上選択してください");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engines: selected,
          prompt: script.videoPrompt,
          narration: script.narration,
          imageBase64,
          duration,
          aspectRatio: aspect,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail ?? "生成開始に失敗しました");
      const data = await res.json();
      setJob(data.job);
      setStep("result");
    } catch (e) {
      toast.error(`生成エラー: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  // Poll job status while any run is in flight.
  useEffect(() => {
    if (step !== "result" || !job) return;
    const inFlight = Object.values(job.runs).some(
      (r) => r.status === "processing" || r.status === "pending",
    );
    if (!inFlight) return;
    pollRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/jobs/${job.id}`);
        if (res.ok) setJob(await res.json());
      } catch {
        /* transient — retry on next tick */
      }
    }, 4000);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [step, job]);

  const toggleEngine = useCallback((id: EngineId) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <StepBar step={step} />
      <AnimatePresence mode="wait">
        {step === "upload" && (
          <Section key="upload">
            <div className="grid gap-6 md:grid-cols-2">
              <Dropzone
                previewUrl={preview}
                onFile={(dataUrl) => {
                  setPreview(dataUrl);
                  setImageBase64(dataUrl);
                }}
                onClear={() => {
                  setPreview(null);
                  setImageBase64(null);
                }}
              />
              <div className="flex flex-col gap-5">
                <Field label="商品名 / ヒント（任意）">
                  <Input
                    value={productHint}
                    onChange={(e) => setProductHint(e.target.value)}
                    placeholder="例: SILK THE RICH シャンプー"
                  />
                </Field>
                <Field label="演出の方向性（任意）">
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="例: 高級感のある朝のバスルーム。落ち着いた女性の声で。"
                    rows={3}
                  />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <ChoiceGroup label="言語" value={lang} options={LANGS} onChange={setLang} />
                  <ChoiceGroup
                    label="尺"
                    value={duration}
                    options={DURATIONS.map((d) => ({ v: d, label: `${d}秒` }))}
                    onChange={setDuration}
                  />
                  <ChoiceGroup label="比率" value={aspect} options={ASPECTS} onChange={setAspect} />
                </div>
                <Button size="lg" disabled={!imageBase64 || busy} onClick={analyze} className="mt-auto">
                  {busy ? <Loader2 className="animate-spin" /> : <Wand2 />}
                  AIで解析して台本を作る
                </Button>
              </div>
            </div>
          </Section>
        )}

        {step === "review" && analysis && script && (
          <Section key="review">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="flex flex-col gap-5">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="商品" className="aspect-square w-full rounded-xl object-cover" />
                )}
                <Card className="p-4">
                  <h3 className="mb-2 font-heading font-semibold">{analysis.productName}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{analysis.category}</Badge>
                    {analysis.features.slice(0, 4).map((f) => (
                      <Badge key={f} variant="outline">
                        {f}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    ターゲット: {analysis.targetAudience} ・ トーン: {analysis.mood}
                  </p>
                </Card>
              </div>

              <div className="flex flex-col gap-5">
                <Field label="フック（冒頭3秒）">
                  <Input value={script.hook} onChange={(e) => setScript({ ...script, hook: e.target.value })} />
                </Field>
                <Field label="ナレーション">
                  <Textarea
                    value={script.narration}
                    onChange={(e) => setScript({ ...script, narration: e.target.value })}
                    rows={3}
                  />
                </Field>
                <Field label="動画生成プロンプト（英語・編集可）">
                  <Textarea
                    value={script.videoPrompt}
                    onChange={(e) => setScript({ ...script, videoPrompt: e.target.value })}
                    rows={4}
                    className="font-mono text-xs"
                  />
                </Field>

                <div>
                  <Label className="mb-2 block">動画生成エンジン（複数選択で比較可）</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ALL_ENGINE_IDS.map((id) => (
                      <EngineCard
                        key={id}
                        info={ENGINE_CATALOG[id]}
                        selected={selected.includes(id)}
                        recommended={id === recommended}
                        live={liveSet.has(id)}
                        onToggle={() => toggleEngine(id)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("upload")}>
                    戻る
                  </Button>
                  <Button className="flex-1" size="lg" disabled={busy || selected.length === 0} onClick={generate}>
                    {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                    {selected.length}本のCMを生成
                  </Button>
                </div>
              </div>
            </div>
          </Section>
        )}

        {step === "result" && job && (
          <Section key="result">
            <div className="grid gap-5 sm:grid-cols-2">
              {Object.values(job.runs).map((run) => (
                <ResultCard key={run.engine} run={run} aspect={aspect} />
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={reset}>
                <RotateCcw /> 新しいCMを作る
              </Button>
            </div>
          </Section>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultCard({ run, aspect }: { run: EngineRun; aspect: AspectRatio }) {
  const info = ENGINE_CATALOG[run.engine];
  const pending = run.status === "processing" || run.status === "pending";
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="font-heading text-sm font-semibold">{info.name}</span>
        <StatusBadge status={run.status} />
      </div>
      <div
        className={cn(
          "relative flex items-center justify-center bg-muted/30",
          aspect === "16:9" ? "aspect-video" : aspect === "1:1" ? "aspect-square" : "aspect-[9/16]",
        )}
      >
        {pending && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="text-xs">生成中… ({info.estimatedTime})</span>
          </div>
        )}
        {run.status === "failed" && (
          <p className="px-4 text-center text-xs text-destructive">{run.error ?? "生成に失敗しました"}</p>
        )}
        {run.status === "succeeded" && run.videoUrl && (
          <video src={run.videoUrl} controls playsInline className="size-full object-contain" />
        )}
      </div>
      {run.status === "succeeded" && run.videoUrl && (
        <div className="p-3">
          <a
            href={run.videoUrl}
            download={`autocm-${run.engine}.mp4`}
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}
          >
            <Download className="size-4" /> ダウンロード
          </a>
        </div>
      )}
    </Card>
  );
}

function StatusBadge({ status }: { status: EngineRun["status"] }) {
  const map = {
    pending: { label: "待機", cls: "bg-muted text-muted-foreground" },
    processing: { label: "生成中", cls: "bg-primary/15 text-primary" },
    succeeded: { label: "完成", cls: "bg-green-500/15 text-green-500" },
    failed: { label: "失敗", cls: "bg-destructive/15 text-destructive" },
  }[status];
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", map.cls)}>{map.label}</span>;
}

function StepBar({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "upload", label: "アップロード" },
    { id: "review", label: "台本 & エンジン" },
    { id: "result", label: "生成結果" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors tabular-nums",
              i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {i + 1}
          </span>
          <span className={cn("text-sm", i <= idx ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border sm:w-10" />}
        </div>
      ))}
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
    >
      {children}
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ChoiceGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-col gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={cn(
              "rounded-md border px-2 py-1.5 text-xs transition-colors",
              value === o.v
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/50",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
