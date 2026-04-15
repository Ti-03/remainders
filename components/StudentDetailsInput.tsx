'use client';

import { useState } from 'react';
import { getAcademicGraduationDate } from '@/lib/student-view';

interface StudentDetailsInputProps {
  studyStartDate: string;
  universityName: string;
  studyDurationYears: string;
  selectedDeviceLabel?: string;
  onStudyStartDateChange: (date: string) => void;
  onUniversityNameChange: (name: string) => void;
  onStudyDurationYearsChange: (years: string) => void;
}

const PREVIEW_DOTS = 48;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateParts(date: Date | null): [string, string, string] {
  if (!date) return ['Year', 'Month', 'Day'];
  return [
    String(date.getFullYear()),
    MONTHS[date.getMonth()],
    String(date.getDate()).padStart(2, '0'),
  ];
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
  studyDurationYears,
  selectedDeviceLabel,
  onStudyStartDateChange,
  onUniversityNameChange,
  onStudyDurationYearsChange,
}: StudentDetailsInputProps) {
  const [today] = useState(() => new Date());

  const minDate = new Date(today);
  minDate.setFullYear(today.getFullYear() - 50);

  const maxDate = new Date(today);
  maxDate.setFullYear(today.getFullYear() + 10);

  const startDate = parseDate(studyStartDate);
  const durationYears = clamp(parseInt(studyDurationYears || '0', 10) || 0, 0, 10);
  const graduationDate = startDate && durationYears > 0
    ? getAcademicGraduationDate(startDate, durationYears)
    : null;

  const totalDays = startDate && graduationDate
    ? Math.max(1, Math.ceil((graduationDate.getTime() - startDate.getTime()) / DAY_MS))
    : null;
  const elapsedDays = startDate && totalDays
    ? clamp(Math.floor((today.getTime() - startDate.getTime()) / DAY_MS), 0, totalDays)
    : null;
  const progressRatio = totalDays && elapsedDays !== null ? elapsedDays / totalDays : 0;
  const completedDots = Math.round(progressRatio * PREVIEW_DOTS);
  const remainingDays = totalDays && elapsedDays !== null ? Math.max(totalDays - elapsedDays, 0) : null;

  const [startYear, startMonth, startDay] = formatDateParts(startDate);
  const [gradYear, gradMonth, gradDay] = formatDateParts(graduationDate);
  const title = universityName.trim() || 'Your University';
  const previewDeviceLabel = selectedDeviceLabel || 'Select device below';

  return (
    <div className="space-y-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.98)_0%,rgba(8,8,10,0.98)_100%)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-6">
      <div className="mx-auto h-1.5 w-20 rounded-full bg-white/10" />

      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-base font-semibold text-black shadow-sm">
          1
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-white">
            Define your Wallpaper
          </h3>
          <p className="text-sm text-neutral-500">
            Build a goal countdown that ends with your graduation deadline.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="universityName" className="text-sm font-medium text-neutral-400">
            University
          </label>
          <input
            id="universityName"
            type="text"
            value={universityName}
            onChange={(e) => onUniversityNameChange(e.target.value)}
            placeholder="e.g. Jordan University of Science and Technology"
            maxLength={60}
            className="w-full rounded-2xl border border-white/10 bg-[#111215] px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-white/30 focus:bg-[#15161a]"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="studyStartDate" className="text-sm font-medium text-neutral-400">
            Start Date
          </label>
          <input
            id="studyStartDate"
            type="date"
            value={studyStartDate}
            onChange={(e) => onStudyStartDateChange(e.target.value)}
            min={minDate.toISOString().split('T')[0]}
            max={maxDate.toISOString().split('T')[0]}
            className="w-full rounded-2xl border border-white/10 bg-[#111215] px-4 py-3 text-base text-white outline-none transition-colors [color-scheme:dark] focus:border-white/30 focus:bg-[#15161a]"
            style={{ colorScheme: 'dark' }}
          />
          <div className="grid grid-cols-3 gap-2">
            {[startYear, startMonth, startDay].map((part, index) => (
              <div
                key={`${part}-${index}`}
                className="rounded-2xl border border-white/10 bg-[#101114] px-3 py-3 text-center text-sm text-neutral-300"
              >
                {part}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,160px)_1fr]">
          <div className="space-y-2">
            <label htmlFor="studyDurationYears" className="text-sm font-medium text-neutral-400">
              Years
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
              placeholder="5"
              className="w-full rounded-2xl border border-white/10 bg-[#111215] px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-white/30 focus:bg-[#15161a]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">
              Graduation
            </label>
            <div className="rounded-2xl border border-white/10 bg-[#101114] p-3">
              <div className="grid grid-cols-3 gap-2">
                {[gradYear, gradMonth, gradDay].map((part, index) => (
                  <div
                    key={`${part}-${index}`}
                    className="rounded-2xl border border-white/10 bg-[#141519] px-3 py-3 text-center text-sm text-neutral-300"
                  >
                    {part}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Calculated from your July graduation timeline
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#101114] p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-neutral-500">
            Preview Setup
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {previewDeviceLabel}
            </span>
            <span className="rounded-full border border-[#FF6B35]/30 bg-[#FF6B35]/10 px-3 py-1 text-[#FF6B35]">
              {durationYears > 0 ? `${durationYears} year${durationYears === 1 ? '' : 's'}` : 'Set duration'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-white/8 bg-[#0b0b0d] px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="text-center">
          <h4 className="text-[28px] font-semibold tracking-tight text-white">
            Goal Calendar
          </h4>
          <p className="mt-2 text-sm text-neutral-500">
            Count down to your graduation deadline
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="relative h-[420px] w-[210px] rounded-[38px] border border-white/10 bg-[radial-gradient(circle_at_top,#202124_0%,#131416_48%,#0b0b0d_100%)] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
            <div className="mx-auto h-5 w-24 rounded-full bg-black/70" />

            <div className="mt-8 flex h-full flex-col items-center text-center">
              <div className="text-[10px] uppercase tracking-[0.28em] text-neutral-600">
                {graduationDate ? formatCompactDate(graduationDate) : 'Graduation Deadline'}
              </div>
              <div className="mt-10 text-sm text-neutral-500">
                {title}
              </div>

              <div className="mt-5 grid grid-cols-8 gap-1.5">
                {Array.from({ length: PREVIEW_DOTS }).map((_, index) => {
                  const isCurrent = completedDots > 0 && index === completedDots - 1 && progressRatio < 1;
                  const isCompleted = index < completedDots;

                  return (
                    <span
                      key={index}
                      className={`h-2.5 w-2.5 rounded-full ${
                        isCurrent
                          ? 'bg-[#FF6B35]'
                          : isCompleted
                            ? 'bg-white'
                            : 'bg-neutral-700'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="mt-5 text-[11px] uppercase tracking-[0.24em] text-neutral-600">
                {startDate ? formatCompactDate(startDate) : 'Choose a start date'}
              </div>

              <div className="mt-2 text-[11px] text-neutral-500">
                {remainingDays !== null && graduationDate
                  ? `${remainingDays} days left until ${formatCompactDate(graduationDate)}`
                  : 'Set your timeline to preview progress'}
              </div>

              <div className="mt-auto w-full pb-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  Install
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
