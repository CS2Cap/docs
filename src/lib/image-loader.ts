export default function loader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // CDN images are already served optimally — skip server-side fetch/resize
  if (src.startsWith("https://cdn.cs2c.app/")) {
    return `${src}?w=${width}`;
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
