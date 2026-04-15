'use client';

interface StudentDetailsInputProps {
  studyStartDate: string;
  universityName: string;
  studyDurationYears: string;
  onStudyStartDateChange: (date: string) => void;
  onUniversityNameChange: (name: string) => void;
  onStudyDurationYearsChange: (years: string) => void;
}

export default function StudentDetailsInput({
  studyStartDate,
  universityName,
  studyDurationYears,
  onStudyStartDateChange,
  onUniversityNameChange,
  onStudyDurationYearsChange,
}: StudentDetailsInputProps) {
  const today = new Date();
  const minDate = new Date();
  minDate.setFullYear(today.getFullYear() - 50);

  const maxDate = new Date();
  maxDate.setFullYear(today.getFullYear() + 10);

  return (
    <div className="space-y-6">
      <div className="w-full group">
        <label
          htmlFor="studyStartDate"
          className="text-xs uppercase tracking-widest text-neutral-500 mb-1 block group-focus-within:text-white transition-colors"
        >
          Study Start Date
        </label>
        <input
          id="studyStartDate"
          type="date"
          value={studyStartDate}
          onChange={(e) => onStudyStartDateChange(e.target.value)}
          min={minDate.toISOString().split('T')[0]}
          max={maxDate.toISOString().split('T')[0]}
          className="input-minimal text-white placeholder:text-neutral-700 bg-black/30 border border-white/20 [color-scheme:dark]"
          style={{ colorScheme: 'dark' }}
        />
      </div>

      <div className="w-full group">
        <label
          htmlFor="universityName"
          className="text-xs uppercase tracking-widest text-neutral-500 mb-1 block group-focus-within:text-white transition-colors"
        >
          University
        </label>
        <input
          id="universityName"
          type="text"
          value={universityName}
          onChange={(e) => onUniversityNameChange(e.target.value)}
          placeholder="University of Jordan"
          maxLength={60}
          className="input-minimal text-white placeholder:text-neutral-700"
        />
      </div>

      <div className="w-full group">
        <label
          htmlFor="studyDurationYears"
          className="text-xs uppercase tracking-widest text-neutral-500 mb-1 block group-focus-within:text-white transition-colors"
        >
          Study Duration (Years)
        </label>
        <input
          id="studyDurationYears"
          type="number"
          inputMode="numeric"
          min="1"
          max="10"
          step="1"
          value={studyDurationYears}
          onChange={(e) => onStudyDurationYearsChange(e.target.value)}
          placeholder="4"
          className="input-minimal text-white placeholder:text-neutral-700"
        />
      </div>
    </div>
  );
}
