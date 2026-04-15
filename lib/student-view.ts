export interface NormalizedStudentViewInput {
  studyStartDate: string;
  universityName: string;
  studyDurationYears: number;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_START_YEAR = 1950;
const MAX_START_YEAR = 2100;
const MIN_DURATION_YEARS = 1;
const MAX_DURATION_YEARS = 10;
const MAX_UNIVERSITY_NAME_LENGTH = 80;

function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_PATTERN.test(value)) return null;

  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (year < MIN_START_YEAR || year > MAX_START_YEAR) {
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

function sanitizeUniversityName(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeStudentViewInput(input: {
  studyStartDate: string;
  universityName: string;
  studyDurationYears: number | string;
}): { ok: true; value: NormalizedStudentViewInput } | { ok: false; error: string } {
  const studyStartDate = String(input.studyStartDate || '').trim();
  const universityName = sanitizeUniversityName(String(input.universityName || ''));
  const duration = typeof input.studyDurationYears === 'number'
    ? input.studyDurationYears
    : Number.parseInt(String(input.studyDurationYears || '').trim(), 10);

  if (!parseIsoDate(studyStartDate)) {
    return { ok: false, error: 'Invalid studyStartDate. Use YYYY-MM-DD.' };
  }

  if (!universityName) {
    return { ok: false, error: 'University name is required.' };
  }

  if (universityName.length > MAX_UNIVERSITY_NAME_LENGTH) {
    return { ok: false, error: `University name must be ${MAX_UNIVERSITY_NAME_LENGTH} characters or fewer.` };
  }

  if (!Number.isInteger(duration) || duration < MIN_DURATION_YEARS || duration > MAX_DURATION_YEARS) {
    return { ok: false, error: `studyDurationYears must be an integer between ${MIN_DURATION_YEARS} and ${MAX_DURATION_YEARS}.` };
  }

  return {
    ok: true,
    value: {
      studyStartDate,
      universityName,
      studyDurationYears: duration,
    },
  };
}

export function getAcademicGraduationDate(startDate: Date, durationYears: number): Date {
  return new Date(startDate.getFullYear() + durationYears, 6, 31, 23, 59, 59, 999);
}

export function isSafeWallpaperDimension(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
