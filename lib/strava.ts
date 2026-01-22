
import crypto from 'crypto';
import { db } from './firebase-admin';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const ENCRYPTION_KEY = process.env.STRAVA_ENCRYPTION_KEY;

const ALGORITHM = 'aes-256-cbc';

// --- Encryption Helpers ---

function encrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('STRAVA_ENCRYPTION_KEY must be exactly 32 characters');
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Store as "iv:encryptedContent"
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('STRAVA_ENCRYPTION_KEY must be exactly 32 characters');
  }
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// --- Types ---

export interface StravaToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
  athleteId: number;
}

// What we store in Firestore (encrypted)
interface EncryptedStravaToken {
  accessToken: string; // encrypted
  refreshToken: string; // encrypted
  expiresAt: number;
  athleteId: number;
}

// --- Auth URL ---

export function getAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID!,
    redirect_uri: `${BASE_URL}/api/auth/strava/callback`,
    response_type: 'code',
    scope: 'activity:read_all',
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

// --- Token Exchange ---

export async function exchangeToken(code: string): Promise<StravaToken> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Strava token');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athleteId: data.athlete.id,
  };
}

// --- Token Refresh ---

export async function refreshAccessToken(token: StravaToken): Promise<StravaToken> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: token.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Strava token');
  }

  const data = await response.json();
  return {
    ...token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
}

// --- Token Storage (Encrypted) ---

export async function saveToken(userId: string, token: StravaToken) {
  const encryptedToken: EncryptedStravaToken = {
    accessToken: encrypt(token.accessToken),
    refreshToken: encrypt(token.refreshToken),
    expiresAt: token.expiresAt,
    athleteId: token.athleteId,
  };
  await db.collection('users').doc(userId).collection('integrations').doc('strava').set(encryptedToken);
}

export async function getValidToken(userId: string): Promise<StravaToken | null> {
  try {
    const doc = await db.collection('users').doc(userId).collection('integrations').doc('strava').get();
    
    if (!doc.exists) return null;

    const encryptedToken = doc.data() as EncryptedStravaToken;
    
    // Decrypt
    let token: StravaToken = {
      accessToken: decrypt(encryptedToken.accessToken),
      refreshToken: decrypt(encryptedToken.refreshToken),
      expiresAt: encryptedToken.expiresAt,
      athleteId: encryptedToken.athleteId,
    };

    // Check if expired (buffer of 5 minutes)
    if (Date.now() / 1000 > token.expiresAt - 300) {
      console.log('Refreshing Strava token for user', userId);
      token = await refreshAccessToken(token);
      await saveToken(userId, token);
    }

    return token;
  } catch (error) {
    console.error('Error getting Strava token:', error);
    return null;
  }
}

// --- Fetch Activities ---

export async function getActivities(userId: string, after?: number) {
  const token = await getValidToken(userId);
  if (!token) return [];

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime() / 1000;
  const afterTimestamp = after || startOfYear;

  const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&per_page=200`, {
    headers: {
      'Authorization': `Bearer ${token.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error('Failed to fetch activities');
    return [];
  }

  return await response.json();
}
