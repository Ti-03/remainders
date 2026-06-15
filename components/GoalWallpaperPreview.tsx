'use client';

interface GoalWallpaperPreviewProps {
  previewUrl: string;
}

export default function GoalWallpaperPreview({
  previewUrl,
}: GoalWallpaperPreviewProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
      {previewUrl ? (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-neutral-500 uppercase tracking-wider transition-colors hover:text-white"
        >
          Preview Wallpaper
        </a>
      ) : (
        <div className="inline-block text-xs text-neutral-500 uppercase tracking-wider">
          Preview Wallpaper
        </div>
      )}
    </div>
  );
}
