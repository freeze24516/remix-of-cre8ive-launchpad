import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VoiceRecorder({
  onRecorded,
  disabled,
}: {
  onRecorded: (file: File, durationMs: number) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewFileRef = useRef<{ file: File; duration: number } | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const duration = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: mime });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: mime });
        previewFileRef.current = { file, duration };
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = rec;
      startedAtRef.current = Date.now();
      setElapsed(0);
      rec.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current);
      }, 200) as unknown as number;
    } catch {
      alert("Microphone permission denied");
    }
  }

  function stop() {
    mediaRef.current?.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRecording(false);
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewFileRef.current = null;
    setPreviewUrl(null);
    setElapsed(0);
  }

  function confirm() {
    if (previewFileRef.current) {
      onRecorded(previewFileRef.current.file, previewFileRef.current.duration);
    }
    discard();
  }

  if (previewUrl) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-2 py-1">
        <audio src={previewUrl} controls className="h-8 max-w-[200px]" />
        <Button type="button" size="icon" variant="ghost" onClick={discard} title="Discard">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" onClick={confirm} title="Send voice">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-2 py-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
        <span className="font-mono text-xs tabular-nums">{formatMs(elapsed)}</span>
        <Button type="button" size="icon" variant="ghost" onClick={stop} title="Stop">
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" size="icon" variant="outline" onClick={start} disabled={disabled} title="Record voice">
      <Mic className="h-4 w-4" />
    </Button>
  );
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
