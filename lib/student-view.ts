export interface NormalizedStudentViewInput {
  studyStartDate: string;
  universityName: string;
  goalEndDate: string;
  studyDurationYears: number;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_START_YEAR = 1950;
const MAX_GOAL_YEAR = 2110;
const MAX_DURATION_YEARS = 10;
const MAX_UNIVERSITY_NAME_LENGTH = 80;
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_PATTERN.test(value)) return null;

  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (year < MIN_START_YEAR || year > MAX_GOAL_YEAR) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizeUniversityName(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeStudentViewInput(input: {
  studyStartDate: string;
  universityName: string;
  goalEndDate?: string;
  studyDurationYears?: number | string;
}): { ok: true; value: NormalizedStudentViewInput } | { ok: false; error: string } {
  const studyStartDate = String(input.studyStartDate || '').trim();
  const universityName = sanitizeUniversityName(String(input.universityName || ''));
  const goalEndDate = String(input.goalEndDate || '').trim();
  const duration = typeof input.studyDurationYears === 'number'
    ? input.studyDurationYears
    : Number.parseInt(String(input.studyDurationYears || '').trim(), 10);

  const parsedStartDate = parseIsoDate(studyStartDate);

  if (!parsedStartDate) {
    return { ok: false, error: 'Invalid studyStartDate. Use YYYY-MM-DD.' };
  }

  if (!universityName) {
    return { ok: false, error: 'University name is required.' };
  }

  if (universityName.length > MAX_UNIVERSITY_NAME_LENGTH) {
    return { ok: false, error: `University name must be ${MAX_UNIVERSITY_NAME_LENGTH} characters or fewer.` };
  }

  let parsedGoalEndDate = goalEndDate ? parseIsoDate(goalEndDate) : null;

  if (goalEndDate && !parsedGoalEndDate) {
    return { ok: false, error: 'Invalid goalEndDate. Use YYYY-MM-DD.' };
  }

  if (!parsedGoalEndDate) {
    if (!Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_YEARS) {
      return { ok: false, error: `Provide a valid goalEndDate or a studyDurationYears value between 1 and ${MAX_DURATION_YEARS}.` };
    }

    parsedGoalEndDate = getAcademicGraduationDate(parsedStartDate, duration);
  }

  if (parsedGoalEndDate.getTime() <= parsedStartDate.getTime()) {
    return { ok: false, error: 'goalEndDate must be after studyStartDate.' };
  }

  const spanYears = getGoalSpanYears(parsedStartDate, parsedGoalEndDate);
  if (spanYears > MAX_DURATION_YEARS) {
    return { ok: false, error: `Goal range must be ${MAX_DURATION_YEARS} years or less.` };
  }

  return {
    ok: true,
    value: {
      studyStartDate,
      universityName,
      goalEndDate: formatIsoDate(parsedGoalEndDate),
      studyDurationYears: spanYears,
    },
  };
}

export function getAcademicGraduationDate(startDate: Date, durationYears: number): Date {
  return new Date(Date.UTC(startDate.getUTCFullYear() + durationYears, 6, 31));
}

export function deriveGoalEndDateFromDuration(
  studyStartDate: string,
  studyDurationYears?: number | string
): string {
  const parsedStartDate = parseIsoDate(String(studyStartDate || '').trim());
  const duration = typeof studyDurationYears === 'number'
    ? studyDurationYears
    : Number.parseInt(String(studyDurationYears || '').trim(), 10);

  if (!parsedStartDate || !Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_YEARS) {
    return '';
  }

  return formatIsoDate(getAcademicGraduationDate(parsedStartDate, duration));
}

export function getGoalSpanYears(startDate: Date, goalEndDate: Date): number {
  const diffMs = goalEndDate.getTime() - startDate.getTime();
  const spanYears = Math.ceil(diffMs / YEAR_MS);
  return Math.max(spanYears, 1);
}

export function isSafeWallpaperDimension(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
