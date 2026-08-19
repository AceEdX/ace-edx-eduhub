/** Derive a preview thumbnail for a media URL (YouTube / Vimeo / direct file). */
export function deriveThumbnail(url: string): string | null {
  const value = url.trim();
  if (!value) return null;

  const yt =
    value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt?.[1]) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;

  const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo?.[1]) return `https://vumbnail.com/${vimeo[1]}.jpg`;

  if (/\.(png|jpe?g|webp|gif)$/i.test(value)) return value;

  return null;
}
