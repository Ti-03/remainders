'use client';

import { useRouter } from 'next/navigation';

export default function PluginSubmissionPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
      <div className="text-white text-center space-y-4">
        <p className="text-sm tracking-widest uppercase">Plugin submission is disabled in single-user mode</p>
        <p className="text-xs text-neutral-500">Built-in plugins are available from the dashboard.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2 bg-white text-black hover:bg-neutral-200 transition-colors text-xs uppercase tracking-widest"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
