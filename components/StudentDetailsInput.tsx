'use client';

interface StudentDetailsInputProps {
  studyStartDate: string;
  universityName: string;
  goalEndDate: string;
  selectedDeviceLabel?: string;
  onStudyStartDateChange: (date: string) => void;
  onUniversityNameChange: (name: string) => void;
  onGoalEndDateChange: (date: string) => void;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCompactDate(date: Date | null): string {
  if (!date) return 'Not set';
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function StudentDetailsInput({
  studyStartDate,
  universityName,
  goalEndDate,
  selectedDeviceLabel,
  onStudyStartDateChange,
  onUniversityNameChange,
  onGoalEndDateChange,
}: StudentDetailsInputProps) {
  const today = new Date();

  const minDate = new Date(today);
  minDate.setFullYear(today.getFullYear() - 50);

  const maxDate = new Date(today);
  maxDate.setFullYear(today.getFullYear() + 15);

  const startDate = parseDate(studyStartDate);
  const endDate = parseDate(goalEndDate);
  const hasValidTimeline = Boolean(startDate && endDate && endDate.getTime() > startDate.getTime());

  const totalDays = hasValidTimeline && startDate && endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_MS))
    : null;
  const elapsedDays = startDate && totalDays
    ? clamp(Math.floor((today.getTime() - startDate.getTime()) / DAY_MS), 0, totalDays)
    : null;
  const remainingDays = totalDays && elapsedDays !== null ? Math.max(totalDays - elapsedDays, 0) : null;
  const progressLabel = totalDays && elapsedDays !== null
    ? `${Math.round((elapsedDays / totalDays) * 100)}%`
    : '0%';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm uppercase tracking-widest text-neutral-500">Goal View</h3>
        <p className="text-sm text-neutral-500 leading-6">
          Add a title, your start date, and the date you want the goal to end.
        </p>
      </div>

      <div className="space-y-5">
        <div className="w-full group">
          <label
            htmlFor="universityName"
            className="mb-1 block text-xs uppercase tracking-widest text-neutral-500 transition-colors group-focus-within:text-white"
          >
            Goal Title
          </label>
          <input
            id="universityName"
            type="text"
            value={universityName}
            onChange={(e) => onUniversityNameChange(e.target.value)}
            placeholder="e.g. JUST Computer Engineering"
            maxLength={60}
            className="input-minimal bg-black/30 text-white placeholder:text-neutral-700"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="w-full group">
            <label
              htmlFor="studyStartDate"
              className="mb-1 block text-xs uppercase tracking-widest text-neutral-500 transition-colors group-focus-within:text-white"
            >
              Start Date
            </label>
            <input
              id="studyStartDate"
              type="date"
              value={studyStartDate}
              onChange={(e) => onStudyStartDateChange(e.target.value)}
              min={minDate.toISOString().split('T')[0]}
              max={maxDate.toISOString().split('T')[0]}
              className="input-minimal bg-black/30 text-white [color-scheme:dark]"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <div className="w-full group">
            <label
              htmlFor="goalEndDate"
              className="mb-1 block text-xs uppercase tracking-widest text-neutral-500 transition-colors group-focus-within:text-white"
            >
              End Date
            </label>
            <input
              id="goalEndDate"
              type="date"
              value={goalEndDate}
              onChange={(e) => onGoalEndDateChange(e.target.value)}
              min={studyStartDate || minDate.toISOString().split('T')[0]}
              max={maxDate.toISOString().split('T')[0]}
              className="input-minimal bg-black/30 text-white [color-scheme:dark]"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="text-xs uppercase tracking-widest text-neutral-500">Timeline Summary</div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-600">Start</div>
            <div className="mt-1 text-sm text-white">{formatCompactDate(startDate)}</div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-600">End</div>
            <div className="mt-1 text-sm text-white">
              {endDate ? formatCompactDate(endDate) : 'Choose an end date'}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-600">Progress</div>
            <div className="mt-1 text-sm text-white">
              {remainingDays !== null ? `${progressLabel} complete` : 'Waiting for a valid timeline'}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-600">Remaining</div>
            <div className="mt-1 text-sm text-white">
              {remainingDays !== null ? `${remainingDays} days left` : 'Waiting for a valid timeline'}
            </div>
          </div>
        </div>

        {selectedDeviceLabel && (
          <div className="border-t border-white/10 pt-3 text-xs uppercase tracking-widest text-neutral-600">
            Device: <span className="text-neutral-300">{selectedDeviceLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
