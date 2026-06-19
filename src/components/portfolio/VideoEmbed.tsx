function getEmbedUrl(url: string): { src: string; provider: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    // YouTube
    if (host === "youtu.be") {
      return { src: `https://www.youtube.com/embed/${u.pathname.slice(1)}`, provider: "youtube" };
    }
    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return { src: `https://www.youtube.com/embed/${v}`, provider: "youtube" };
      if (u.pathname.startsWith("/embed/")) return { src: url, provider: "youtube" };
      if (u.pathname.startsWith("/shorts/"))
        return { src: `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`, provider: "youtube" };
    }
    // Vimeo
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return { src: `https://player.vimeo.com/video/${id}`, provider: "vimeo" };
    }
    // Loom
    if (host.endsWith("loom.com")) {
      const id = u.pathname.split("/").pop();
      if (id) return { src: `https://www.loom.com/embed/${id}`, provider: "loom" };
    }
  } catch {}
  return null;
}

export function VideoEmbed({ url, title }: { url: string; title?: string }) {
  const embed = getEmbedUrl(url);
  if (!embed) return null;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/70 bg-black shadow-[var(--shadow-card)]">
      <iframe
        src={embed.src}
        title={title ?? "Video"}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

export function VideoGrid({ urls }: { urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {urls.map((u, i) => (
        <VideoEmbed key={u + i} url={u} />
      ))}
    </div>
  );
}
