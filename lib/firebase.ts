
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { stravaPlugin } from './plugins/strava-plugin';

// Firebase configuration from environment variables with fallbacks
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Check if Firebase is properly configured (not using demo values)
const isFirebaseConfigured = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && 
                              process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Initialize Firebase only in browser environment (singleton pattern)
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (typeof window !== 'undefined') {
  // Only initialize Firebase if properly configured
  if (isFirebaseConfigured) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      // Initialize Firestore with specific settings to avoid multiple tab conflicts
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } else {
      app = getApps()[0];
      db = getFirestore(app);
    }
    auth = getAuth(app);
  } else {
    console.warn('Firebase not configured - running in demo mode. Add .env.local with Firebase credentials for full functionality.');
  }
}

// Export Firebase services (will be undefined on server)
export { auth, db };

// Google Auth Provider (only initialized in browser)
let googleProvider: GoogleAuthProvider | undefined;
if (typeof window !== 'undefined' && auth) {
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
}

/**
 * Sign in with Google popup
 */
export async function signInWithGoogle() {
  if (!auth || !googleProvider) {
    const message = isFirebaseConfigured 
      ? 'Auth not initialized (server-side)' 
      : 'Firebase not configured - add .env.local with Firebase credentials to enable authentication';
    return { user: null, error: message };
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return { user: null, error: error.message };
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  if (!auth) {
    return { error: 'Auth not initialized (server-side)' };
  }
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return { error: error.message };
  }
}

/**
 * Subscribe to authentication state changes
 */
export function onAuthChange(callback: (user: User | null) => void) {
  if (!auth) {
    console.warn('Auth not initialized (server-side)');
    return () => {}; // Return empty unsubscribe function
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  if (!db) {
    if (!isFirebaseConfigured) {
      console.warn('Firebase not configured - running in demo mode');
    } else {
      console.error('Firestore not initialized');
    }
    return false;
  }
  try {
    const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
    return !usernameDoc.exists();
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { data: null, error: message };
  }
  try {
    const profileDoc = await getDoc(doc(db, 'users', userId));
    if (profileDoc.exists()) {
      return { data: profileDoc.data(), error: null };
    }
    return { data: null, error: 'Profile not found' };
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Get user config by username
 */
export async function getUserConfigByUsername(username: string) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { data: null, error: message };
  }
  try {
    const configDoc = await getDoc(doc(db, 'configs', username.toLowerCase()));
    if (configDoc.exists()) {
      return { data: configDoc.data(), error: null };
    }
    return { data: null, error: 'Config not found' };
  } catch (error: any) {
    console.error('Error fetching config:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Create or update user profile with username
 */
export async function saveUserProfile(userId: string, username: string, displayName: string, email: string) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { success: false, error: message };
  }
  try {
    const usernameLower = username.toLowerCase();
    
    // Check if username is available
    const isAvailable = await isUsernameAvailable(usernameLower);
    if (!isAvailable) {
      return { success: false, error: 'Username already taken' };
    }

    // Create username claim
    await setDoc(doc(db, 'usernames', usernameLower), {
      userId,
      createdAt: Timestamp.now()
    });

    // Create/update user profile
    await setDoc(doc(db, 'users', userId), {
      username: usernameLower,
      displayName,
      email,
      updatedAt: Timestamp.now()
    }, { merge: true });

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error saving profile:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save user wallpaper configuration
 */
export async function saveUserConfig(username: string, config: any) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { success: false, error: message };
  }
  try {
    const usernameLower = username.toLowerCase();
    
    await setDoc(doc(db, 'configs', usernameLower), {
      ...config,
      updatedAt: Timestamp.now()
    }, { merge: true });

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error saving config:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get available plugins from marketplace
 */
export async function getAvailablePlugins(userId?: string) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { data: [], error: message };
  }
  try {
    const pluginsQuery = query(
      collection(db, 'plugins'),
      where('approved', '==', true)
    );
    const snapshot = await getDocs(pluginsQuery);
    const plugins = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any)).filter((plugin: any) => {
      // Show all public plugins
      if (!plugin.isPrivate) return true;
      // Show private plugins only to their author
      return userId && plugin.authorId === userId;
    });
    
    // Add built-in Strava plugin if not present
    if (!plugins.find((p: any) => p.id === stravaPlugin.id)) {
      plugins.push(stravaPlugin);
    }
    
    return { data: plugins, error: null };
  } catch (error: any) {
    console.error('Error fetching plugins:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Get plugin by ID
 */
export async function getPlugin(pluginId: string) {
  if (!db) {
    const message = isFirebaseConfigured 
      ? 'Firestore not initialized (server-side)' 
      : 'Firebase not configured - running in demo mode';
    return { data: null, error: message };
  }
  try {
    const pluginDoc = await getDoc(doc(db, 'plugins', pluginId));
    if (pluginDoc.exists()) {
      return { data: { id: pluginDoc.id, ...pluginDoc.data() }, error: null };
    }
    return { data: null, error: 'Plugin not found' };
  } catch (error: any) {
    console.error('Error fetching plugin:', error);
    return { data: null, error: error.message };
  }
}
