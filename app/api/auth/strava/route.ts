
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/strava';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  // In a real app, verify the session/token here to ensure the requester owns this userId.
  
  // Encode userId in state to retrieve it in callback
  // Adding a timestamp or random nonce would be better for security
  const state = Buffer.from(JSON.stringify({ userId, nonce: Date.now() })).toString('base64');
  
  const url = getAuthUrl(state);
  
  return NextResponse.redirect(url);
}
