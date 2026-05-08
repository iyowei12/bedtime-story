import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { bus } from '../core/bus';
import { AppConfig, StoryItem } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Monitor auth state and emit to the global event bus
onAuthStateChanged(auth, (user) => {
  bus.emit('auth:state_changed', user);
});

export const loginWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  // Optional: add scopes if needed, e.g. provider.addScope('profile');
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export interface SyncPayload {
  stories: StoryItem[];
  deletedIds: (string | number)[];
  cfg: Partial<AppConfig>;
  updatedAt?: number;
}

export const saveUserData = async (uid: string, payload: SyncPayload): Promise<void> => {
  const userRef = doc(db, 'users', uid, 'backup', 'data');
  await setDoc(userRef, {
    ...payload,
    updatedAt: Date.now()
  }, { merge: true });
};

export const getUserData = async (uid: string): Promise<SyncPayload | null> => {
  const userRef = doc(db, 'users', uid, 'backup', 'data');
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    return snapshot.data() as SyncPayload;
  }
  return null;
};
