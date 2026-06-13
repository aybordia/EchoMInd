"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import {
  createSpeechRecognition,
  extractTranscript,
  isSpeechRecognitionSupported,
  type EchoSpeechRecognition,
  type EchoSpeechRecognitionEvent,
} from "@/lib/speech";

interface AskBarProps {
  onSubmit: (question: string) => void;
  loading?: boolean;
  placeholder?: string;
  initialValue?: string;
}

function subscribeNever() {
  return () => {};
}

function getServerSnapshotFalse() {
  return false;
}

export function AskBar({ onSubmit, loading, placeholder, initialValue = "" }: AskBarProps) {
  const [value, setValue] = useState(initialValue);
  const [listening, setListening] = useState(false);
  const [syncedValue, setSyncedValue] = useState(initialValue);
  const recognitionRef = useRef<EchoSpeechRecognition | null>(null);
  // Server always renders "unsupported"; the real check only runs once hydrated on the client.
  const supported = useSyncExternalStore(
    subscribeNever,
    isSpeechRecognitionSupported,
    getServerSnapshotFalse
  );

  if (initialValue !== syncedValue) {
    setSyncedValue(initialValue);
    setValue(initialValue);
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  function toggleListening() {
    if (!supported || loading) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = createSpeechRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    recognition.onresult = (event: EchoSpeechRecognitionEvent) => {
      const { text, isFinal } = extractTranscript(event);
      setValue(text);
      if (isFinal) recognition.stop();
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    setListening(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = value.trim();
    if (!question || loading) return;
    onSubmit(question);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel-strong flex items-center gap-2 p-2 sm:gap-3 sm:p-3"
    >
      <button
        type="button"
        onClick={toggleListening}
        disabled={!supported || loading}
        title={supported ? "Ask with your voice" : "Voice input isn't supported in this browser"}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
          listening
            ? "animate-pulse-glow border-accent/50 bg-accent/20 text-accent-soft"
            : "border-white/10 bg-white/5 text-foreground-muted hover:border-white/20 hover:text-foreground"
        }`}
      >
        {supported ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? 'Ask EchoMind anything… "What if I jumped on every planet?"'}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none sm:text-base"
        disabled={loading}
      />

      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="flex h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40 sm:px-5"
      >
        <Send className="h-4 w-4" />
        <span className="hidden sm:inline">{loading ? "Thinking…" : "Ask"}</span>
      </button>
    </form>
  );
}
