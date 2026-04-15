/**
 * ViewModeToggle Component
 * Minimalist Redesign
 */

'use client';

import { ViewMode } from '@/lib/types';

interface ViewModeToggleProps {
  selectedMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewModeToggle({ selectedMode, onChange }: ViewModeToggleProps) {
  return (
    <div className="w-full flex p-1 bg-white/5 rounded-lg border border-white/5 gap-1">
      <button
        onClick={() => onChange('life')}
        className={`
          flex-1 py-2 text-xs uppercase tracking-widest font-medium rounded transition-all
          ${selectedMode === 'life'
            ? 'bg-white text-black shadow-sm'
            : 'text-neutral-500 hover:text-neutral-300'
          }
        `}
      >
        Life View
      </button>
      <button
        onClick={() => onChange('student')}
        className={`
          flex-1 py-2 text-xs uppercase tracking-widest font-medium rounded transition-all
          ${selectedMode === 'student'
            ? 'bg-white text-black shadow-sm'
            : 'text-neutral-500 hover:text-neutral-300'
          }
        `}
      >
        Student View
      </button>
      <button
        onClick={() => onChange('year')}
        className={`
          flex-1 py-2 text-xs uppercase tracking-widest font-medium rounded transition-all
          ${selectedMode === 'year'
            ? 'bg-white text-black shadow-sm'
            : 'text-neutral-500 hover:text-neutral-300'
          }
        `}
      >
        Year View
      </button>
    </div>
  );
}
