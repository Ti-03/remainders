'use client';

interface GoalWallpaperPreviewProps {
  previewUrl: string;
}

export default function GoalWallpaperPreview({
  previewUrl,
}: GoalWallpaperPreviewProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {previewUrl ? (
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-[14px] border border-white/5 bg-[#0d0d0f] px-4 py-2 text-center text-[13px] font-medium tracking-[0.01em] text-slate-400 transition-colors hover:text-white"
        >
          Preview Wallpaper
        </a>
      ) : (
        <div className="rounded-[14px] border border-white/5 bg-[#0d0d0f] px-4 py-2 text-center text-[13px] font-medium tracking-[0.01em] text-slate-400">
          Preview Wallpaper
        </div>
      )}
    </div>
  );
}
