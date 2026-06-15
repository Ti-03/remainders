/**
 * Wallpaper Generation API Route
 * Minimalist Dot-Grid Redesign
 */

import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { YearView } from './year-view';
import { LifeView } from './life-view';
import { StudentView } from './student-view';
import { logWallpaperEvent } from '@/lib/firebase-server';
import { isSafeWallpaperDimension, normalizeStudentViewInput } from '@/lib/student-view';

export const runtime = 'edge';

const MIN_WIDTH = 300;
const MAX_WIDTH = 3000;
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 5000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 45;
const anonymousRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getClientKey(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'anonymous';
}

function checkAnonymousRateLimit(clientKey: string): boolean {
  const now = Date.now();
  const existing = anonymousRateLimitMap.get(clientKey);

  if (!existing || now > existing.resetTime) {
    anonymousRateLimitMap.set(clientKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    return false;
  }

  existing.count += 1;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const clientKey = getClientKey(request);
    if (!checkAnonymousRateLimit(clientKey)) {
      return new Response('Rate limit exceeded. Please try again later.', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }

    const { searchParams } = request.nextUrl;
    const width = parseInt(searchParams.get('width') || '1170');
    const height = parseInt(searchParams.get('height') || '2532');
    const isMondayFirst = searchParams.get('isMondayFirst') === 'true' || searchParams.get('isMondayFirst') === '1';
    const yearViewLayout = searchParams.get('yearViewLayout') === 'days' ? 'days' : 'months';
    const daysLayoutMode = searchParams.get('daysLayoutMode') === 'calendar' ? 'calendar' : 'continuous';
    const viewMode = searchParams.get('viewMode') || 'year';
    const birthDate = searchParams.get('birthDate') || '';
    const rawStudyStartDate = searchParams.get('studyStartDate') || '';
    const rawUniversityName = searchParams.get('universityName') || '';
    const rawGoalEndDate = searchParams.get('goalEndDate') || '';
    const rawStudyDurationYears = searchParams.get('studyDurationYears') || '';

    if (!isSafeWallpaperDimension(width, MIN_WIDTH, MAX_WIDTH) || !isSafeWallpaperDimension(height, MIN_HEIGHT, MAX_HEIGHT)) {
      return new Response(`Invalid dimensions. Width must be ${MIN_WIDTH}-${MAX_WIDTH}px and height must be ${MIN_HEIGHT}-${MAX_HEIGHT}px.`, {
        status: 400,
      });
    }

    let studentInput:
      | { studyStartDate: string; universityName: string; goalEndDate: string; studyDurationYears: number }
      | null = null;

    if (viewMode === 'student') {
      const normalized = normalizeStudentViewInput({
        studyStartDate: rawStudyStartDate,
        universityName: rawUniversityName,
        goalEndDate: rawGoalEndDate,
        studyDurationYears: rawStudyDurationYears,
      });

      if (!normalized.ok) {
        return new Response(normalized.error, { status: 400 });
      }

      studentInput = normalized.value;
    }

    let content;

    if (viewMode === 'life' && birthDate) {
      content = <LifeView width={width} height={height} birthDate={birthDate} />;
    } else if (viewMode === 'student' && studentInput) {
      content = (
        <StudentView
          width={width}
          height={height}
          studyStartDate={studentInput.studyStartDate}
          universityName={studentInput.universityName}
          goalEndDate={studentInput.goalEndDate}
        />
      );
    } else {
      // Default to Year View
      content = <YearView width={width} height={height} isMondayFirst={isMondayFirst} yearViewLayout={yearViewLayout} daysLayoutMode={daysLayoutMode} />;
    }

    // Compute seconds remaining until midnight UTC so the cache expires
    // when the "current day" dot would change. Minimum 60s to avoid zero TTL.
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const secondsUntilMidnight = Math.max(60, Math.floor((midnight.getTime() - now.getTime()) / 1000));

    const imageResponse = new ImageResponse(content, { width, height });

    // Fire-and-forget analytics
    logWallpaperEvent('anonymous', null, viewMode);

    return new Response(imageResponse.body, {
      headers: {
        'Content-Type': 'image/png',
        // Cache until midnight UTC — the image changes when the current-day dot moves.
        // URL params form the cache key naturally (different configs = different URLs).
        'Cache-Control': `public, s-maxage=${secondsUntilMidnight}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    console.error('Error generating wallpaper:', error);
    return new Response('Error generating wallpaper', { status: 500 });
  }
}
