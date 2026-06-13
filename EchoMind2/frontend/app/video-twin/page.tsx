"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileVideo, RotateCcw, Sparkles, UploadCloud } from "lucide-react";
import { AgentTimeline } from "@/components/AgentTimeline";
import { AuthGate } from "@/components/AuthGate";
import { FeedbackModal } from "@/components/FeedbackModal";
import { NavBar } from "@/components/NavBar";
import { TutorPanel } from "@/components/TutorPanel";
import { VideoTwinCompare } from "@/components/VideoTwinCompare";
import { resolveAssetUrl, uploadVideoTwin } from "@/lib/api";
import { VIDEO_TWIN_STAGES } from "@/lib/constants";
import { hasCompletedOnboarding, useEchoSession } from "@/lib/session";
import type { VideoTwinUploadResponse } from "@/lib/types";

type ViewState = "idle" | "running" | "result";

const ACCEPTED_TYPES = ".mp4,.mov,.avi,.webm,.mkv";

export default function VideoTwinPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <AuthGate>
        <VideoTwinContent />
      </AuthGate>
    </div>
  );
}

function VideoTwinContent() {
  const router = useRouter();
  const { sessionId, userId, authUserId } = useEchoSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<ViewState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<VideoTwinUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultReady, setResultReady] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (authUserId && !hasCompletedOnboarding(authUserId)) {
      router.replace("/onboarding");
    }
  }, [authUserId, router]);

  function handleFiles(files: FileList | null) {
    const next = files?.[0];
    if (next) setFile(next);
  }

  async function handleUpload() {
    if (!file || !sessionId || !userId) return;
    setError(null);
    setResult(null);
    setResultReady(false);
    setShowFeedback(false);
    setTimelineKey((k) => k + 1);
    setView("running");

    try {
      const res = await uploadVideoTwin(file, {
        session_id: sessionId,
        user_id: userId,
        description,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setResultReady(true);
    }
  }

  function handleTimelineComplete() {
    setView(error ? "idle" : "result");
  }

  function handleReset() {
    setView("idle");
    setResult(null);
    setError(null);
    setFile(null);
    setDescription("");
  }

  function handleFollowup(question: string) {
    router.push(`/ask?q=${encodeURIComponent(question)}`);
  }

  const videoUrl = result ? resolveAssetUrl(result.original_video_url) : null;

  return (
    <>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Video <span className="text-gradient-cool">Digital Twin</span>
          </h1>
          <p className="text-sm text-foreground-muted">
            Upload a short clip of a box sliding down a ramp — EchoMind tracks the motion and
            rebuilds it as an interactive 3D physics twin, side-by-side with your footage.
          </p>
        </div>

        {view === "idle" && (
          <div className="glass-panel-strong space-y-5 p-6 sm:p-8">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                dragOver
                  ? "border-accent/50 bg-accent/5"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {file ? (
                <>
                  <FileVideo className="h-8 w-8 text-accent-soft" />
                  <div className="text-sm font-medium text-foreground">{file.name}</div>
                  <div className="text-xs text-foreground-subtle">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB — click or drop to replace
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-foreground-subtle" />
                  <div className="text-sm font-medium text-foreground">
                    Drop a video here, or click to choose a file
                  </div>
                  <div className="text-xs text-foreground-subtle">
                    MP4, MOV, AVI, WebM, or MKV — up to 50 MB
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
                Describe the setup (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. A wooden block sliding down a cardboard ramp"
                rows={2}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-accent/30 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || !sessionId}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" />
              Build digital twin
            </button>

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>
        )}

        {view === "running" && (
          <div className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-md space-y-4">
              <p className="truncate text-center text-sm text-foreground-muted">{file?.name}</p>
              <AgentTimeline
                key={timelineKey}
                stages={VIDEO_TWIN_STAGES}
                waitingForResult={!resultReady}
                onComplete={handleTimelineComplete}
              />
            </div>
          </div>
        )}

        {view === "result" && result && videoUrl && (
          <>
            <VideoTwinCompare videoUrl={videoUrl} payload={result.digital_twin_payload} />

            <TutorPanel
              teaching={result.teaching}
              simulation={result.digital_twin_payload}
              onFollowup={handleFollowup}
              onGiveFeedback={() => setShowFeedback(true)}
            />

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground-muted transition-colors hover:border-white/20 hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Try another video
            </button>
          </>
        )}
      </main>
      {showFeedback && result && sessionId && userId && (
        <FeedbackModal
          jobId={result.job_id}
          sessionId={sessionId}
          userId={userId}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </>
  );
}
