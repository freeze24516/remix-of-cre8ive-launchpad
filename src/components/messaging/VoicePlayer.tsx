import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Play, Pause, Download } from "lucide-react";
import { getAttachmentUrl } from "@/lib/attachments.functions";

export function VoicePlayer({
  path,
  name,
  mine,
}: {
  path: string;
  name: string;
  mine: boolean;
}) {
  const getUrlFn = useServerFn(getAttachmentUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function ensureUrl() {
    if (url) return url;
    const { url: u } = await getUrlFn({ data: { path } });
    setUrl(u);
    return u;
  }

  async function toggle() {
    const u = await ensureUrl();
    if (!audioRef.current) {
      const a = new Audio(u);
      audioRef.current = a;
      a.addEventListener("loadedmetadata", () => setDuration(a.duration || 0));
      a.addEventListener("timeupdate", () => setPosition(a.currentTime || 0));
      a.addEventListener("ended", () => setPlaying(false));
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      await audioRef.current.play();
      setPlaying(true);
    }
  }

  useEffect(() => () => {
    audioRef.current?.pause();
  }, []);

  async function download() {
    const u = await ensureUrl();
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
  }

  const pct = duration ? (position / duration) * 100 : 0;
  const borderClass = mine ? "border-primary-foreground/30" : "border-border";

  return (
    <div className={`flex w-[240px] items-center gap-2 rounded-lg border px-2 py-1.5 ${borderClass}`}>
      <button type="button" onClick={toggle} className="grid h-7 w-7 place-items-center rounded-full bg-background/40 hover:bg-background/60">
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1 overflow-hidden rounded-full bg-background/30">
          <div className="h-full bg-current opacity-70 transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] opacity-70">
          <span>{fmt(position)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
      <button type="button" onClick={download} title="Download" className="opacity-70 hover:opacity-100">
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function fmt(s: number) {
  if (!isFinite(s)) return "0:00";
  const n = Math.floor(s);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
