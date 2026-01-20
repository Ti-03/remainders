
import { NextRequest, NextResponse } from 'next/server';
import { exchangeToken, saveToken } from '@/lib/strava';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/dashboard?error=strava_auth_failed', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard?error=missing_params', request.url));
  }

  try {
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = decodedState.userId;

    if (!userId) {
      throw new Error('Invalid state');
    }

    const token = await exchangeToken(code);
    await saveToken(userId, token);

    return NextResponse.redirect(new URL('/dashboard?success=strava_connected', request.url));
  } catch (err) {
    console.error('Strava callback error:', err);
    return NextResponse.redirect(new URL('/dashboard?error=internal_error', request.url));
  }
}
