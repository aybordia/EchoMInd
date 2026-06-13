/**
 * Thin wrappers around the browser Web Speech APIs.
 * Used as a free fallback for voice input/output when no
 * ElevenLabs audio is available from the backend.
 */
"use client";

export interface EchoSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: EchoSpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

export interface EchoSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: EchoSpeechRecognitionResultList;
}

interface EchoSpeechRecognitionResultList {
  length: number;
  [index: number]: EchoSpeechRecognitionResult;
}

interface EchoSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
}

type EchoSpeechRecognitionConstructor = new () => EchoSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: EchoSpeechRecognitionConstructor;
    webkitSpeechRecognition?: EchoSpeechRecognitionConstructor;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createSpeechRecognition(): EchoSpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  return recognition;
}

/** Collapse a recognition event into the best-effort transcript so far. */
export function extractTranscript(event: EchoSpeechRecognitionEvent): {
  text: string;
  isFinal: boolean;
} {
  let text = "";
  let isFinal = false;
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    text += result[0]?.transcript ?? "";
    if (result.isFinal) isFinal = true;
  }
  return { text, isFinal };
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(
  text: string,
  options?: { rate?: number; pitch?: number; onEnd?: () => void }
): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 1;
  utterance.pitch = options?.pitch ?? 1;
  if (options?.onEnd) utterance.onend = options.onEnd;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
