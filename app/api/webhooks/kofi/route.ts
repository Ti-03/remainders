/**
 * Ko-fi Webhook Handler
 *
 * Ko-fi sends a form POST with a `data` field containing JSON when someone donates.
 * We verify the token, find the user by email, and grant them Pro access.
 * Every event (success, pending, error) is logged to /kofi_events in Firestore.
 *
 * Set up in Ko-fi: Account → API → Webhook URL → https://yourdomain.com/api/webhooks/kofi
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

interface KofiPayload {
  verification_token: string;
  message_id: string;
  timestamp: string;
  type: 'Donation' | 'Subscription' | 'Shop Order' | 'Commission';
  from_name: string;
  message: string | null;
  amount: string;
  url: string;
  email: string;
  currency: string;
  is_subscription_payment: boolean;
  is_first_subscription_payment: boolean;
  kofi_transaction_id: string;
  tier_name: string | null;
}

interface KofiEvent {
  type: string;
  email: string;
  fromName: string;
  amount: string;
  currency: string;
  message: string | null;
  kofiTransactionId: string;
  tierName: string | null;
  isSubscription: boolean;
  isFirstSubscription: boolean;
  receivedAt: admin.firestore.FieldValue;
  status: 'success' | 'pending_signup' | 'error';
  errorDetails?: string;
  userId?: string;
  username?: string;
}

export async function POST(request: NextRequest) {
  const db = getAdminFirestore();

  const logEvent = async (event: Omit<KofiEvent, 'receivedAt'>) => {
    if (!db) return;
    try {
      await db.collection('kofi_events').add({
        ...event,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('Ko-fi: failed to write event log:', err);
    }
  };

  let payload: KofiPayload | null = null;

  try {
    // Ko-fi sends application/x-www-form-urlencoded with a `data` field
    const formData = await request.formData();
    const raw = formData.get('data');

    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'Missing data field' }, { status: 400 });
    }

    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in data field' }, { status: 400 });
    }

    // Verify Ko-fi token — fail loudly if not configured
    const expectedToken = process.env.KOFI_VERIFICATION_TOKEN;
    if (!expectedToken) {
      console.error('Ko-fi webhook: KOFI_VERIFICATION_TOKEN is not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    // Use timing-safe comparison to prevent timing attacks
    const receivedToken = payload!.verification_token || '';
    const tokenBuffer = Buffer.from(receivedToken);
    const expectedBuffer = Buffer.from(expectedToken);
    if (tokenBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(tokenBuffer, expectedBuffer)) {
      console.warn('Ko-fi webhook: invalid verification token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const p = payload!;
    const donorEmail = p.email?.toLowerCase();
    if (!donorEmail) {
      return NextResponse.json({ error: 'No email in payload' }, { status: 400 });
    }

    const baseEvent = {
      type: p.type,
      email: donorEmail,
      fromName: p.from_name,
      amount: p.amount,
      currency: p.currency,
      message: p.message ?? null,
      kofiTransactionId: p.kofi_transaction_id,
      tierName: p.tier_name ?? null,
      isSubscription: p.is_subscription_payment,
      isFirstSubscription: p.is_first_subscription_payment,
    };

    if (!db) {
      console.error('Ko-fi webhook: Admin Firestore not available');
      return NextResponse.json({ ok: true, note: 'Admin SDK not configured' });
    }

    // Find the user by email in /users collection
    const usersSnapshot = await db.collection('users').where('email', '==', donorEmail).get();

    if (usersSnapshot.empty) {
      // Pro expires 30 days from now (clock starts from donation, not signup)
      const pendingExpiresAt = new Date();
      pendingExpiresAt.setDate(pendingExpiresAt.getDate() + 30);

      await db.collection('kofi_grants').doc(donorEmail).set({
        email: donorEmail,
        from_name: p.from_name,
        amount: p.amount,
        currency: p.currency,
        type: p.type,
        kofi_transaction_id: p.kofi_transaction_id,
        grantedAt: admin.firestore.FieldValue.serverTimestamp(),
        planExpiresAt: admin.firestore.Timestamp.fromDate(pendingExpiresAt),
        applied: false,
      });

      await logEvent({ ...baseEvent, status: 'pending_signup' });
      return NextResponse.json({ ok: true, status: 'pending_signup' });
    }

    // Pro expires 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const expiresAtTs = admin.firestore.Timestamp.fromDate(expiresAt);

    // Grant Pro to all matching users (should be exactly one)
    const batch = db.batch();
    let grantedUserId: string | undefined;
    let grantedUsername: string | undefined;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const username = userData.username as string | undefined;
      grantedUserId = userDoc.id;
      grantedUsername = username;

      batch.update(userDoc.ref, {
        plan: 'pro',
        planGrantedBy: 'kofi',
        planGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
        planExpiresAt: expiresAtTs,
      });

      if (username) {
        const configRef = db.collection('configs').doc(username.toLowerCase());
        batch.update(configRef, { plan: 'pro', planExpiresAt: expiresAtTs });
      }
    }
    await batch.commit();

    // Mark any pending grant as applied
    const pendingGrant = await db.collection('kofi_grants').doc(donorEmail).get();
    if (pendingGrant.exists) {
      await pendingGrant.ref.update({ applied: true });
    }

    await logEvent({
      ...baseEvent,
      status: 'success',
      userId: grantedUserId,
      username: grantedUsername,
    });

    return NextResponse.json({ ok: true, status: 'pro_granted' });

  } catch (error: any) {
    console.error('Ko-fi webhook error:', error);

    await logEvent({
      type: payload?.type ?? 'unknown',
      email: payload?.email?.toLowerCase() ?? 'unknown',
      fromName: payload?.from_name ?? 'unknown',
      amount: payload?.amount ?? '0',
      currency: payload?.currency ?? 'USD',
      message: payload?.message ?? null,
      kofiTransactionId: payload?.kofi_transaction_id ?? 'unknown',
      tierName: payload?.tier_name ?? null,
      isSubscription: payload?.is_subscription_payment ?? false,
      isFirstSubscription: payload?.is_first_subscription_payment ?? false,
      status: 'error',
      errorDetails: error.message,
    });

    // Always return 200 to prevent Ko-fi from retrying on server errors
    // Never expose internal error details to external callers
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
