import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/verify-admin';
import { getAdminFirestore, getAdminApp } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const caller = await verifyAdminRequest(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await params;
  const body = await request.json() as {
    plan: 'free' | 'pro';
    username?: string;
    expiresAt?: string | null;
  };

  if (!userId || !body.plan) {
    return NextResponse.json({ error: 'userId and plan are required' }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const batch = db.batch();
  const userRef = db.collection('users').doc(userId);

  if (body.plan === 'pro') {
    const expiresAtTs = body.expiresAt
      ? admin.firestore.Timestamp.fromDate(new Date(body.expiresAt))
      : null;

    batch.update(userRef, {
      plan: 'pro',
      planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      planExpiresAt: expiresAtTs,
    });

    if (body.username) {
      const configRef = db.collection('configs').doc(body.username.toLowerCase());
      batch.update(configRef, { plan: 'pro', planExpiresAt: expiresAtTs });
    }
  } else {
    batch.update(userRef, {
      plan: 'free',
      planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      planExpiresAt: admin.firestore.FieldValue.delete(),
    });

    if (body.username) {
      const configRef = db.collection('configs').doc(body.username.toLowerCase());
      batch.update(configRef, {
        plan: 'free',
        planExpiresAt: admin.firestore.FieldValue.delete(),
        backgroundImage: admin.firestore.FieldValue.delete(),
      });
    }
  }

  try {
    await batch.commit();

    // Revoke the user's refresh tokens so the plan change takes effect immediately
    // rather than waiting up to 1 hour for the existing ID token to expire
    const app = getAdminApp();
    if (app) {
      await admin.auth(app).revokeRefreshTokens(userId);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
