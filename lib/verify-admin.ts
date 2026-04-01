/**
 * Server-side admin request verification.
 * Validates the Firebase ID token from the Authorization header
 * and confirms the caller has role === 'admin' in Firestore.
 */

import { NextRequest } from 'next/server';
import { getAdminApp, getAdminFirestore } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export interface AdminCaller {
  uid: string;
}

export async function verifyAdminRequest(request: NextRequest): Promise<AdminCaller | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const app = getAdminApp();
  if (!app) return null;

  try {
    const decoded = await admin.auth(app).verifyIdToken(token, true);
    const db = getAdminFirestore();
    if (!db) return null;

    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') return null;

    return { uid: decoded.uid };
  } catch {
    return null;
  }
}
