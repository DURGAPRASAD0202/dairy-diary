'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { showToast } from '@/components/Toast';

export const DEMO_MODE = !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'dairy-tracker-demo';

// ─── Local owner profile ──────────────────────────────────
export interface OwnerProfile {
  uid: string;
  name: string;
  dairyName: string;
  email: string;
  password?: string; // only stored in demo mode
  createdAt: string;
}

// ─── Sub-users (family/staff) ─────────────────────────────
export interface SubUser {
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'viewer';
  createdAt: string;
}

// ─── Context type ─────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  profile: OwnerProfile | null;
  currentUid: string | null;    // the effective UID to namespace data under
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, dairyName: string, email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  resendVerification: () => Promise<void>;
  // Sub-user management (within an owner's account)
  subUsers: SubUser[];
  addSubUser: (u: Omit<SubUser, 'createdAt'>) => void;
  removeSubUser: (email: string) => void;
  updateSubUser: (email: string, updates: Partial<SubUser>) => void;
  updateProfile_: (updates: Partial<OwnerProfile>) => Promise<void>;
  emailVerified: boolean;
  verifyDemoAccount: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// ─── Helpers ──────────────────────────────────────────────
function ls<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(val));
}

function getAllOwners(): OwnerProfile[] {
  return ls<OwnerProfile[]>('dairy-owners', []);
}
function saveOwners(owners: OwnerProfile[]) { lsSet('dairy-owners', owners); }

function getSubUsers(uid: string): SubUser[] {
  return ls<SubUser[]>(`dairy-subusers-${uid}`, []);
}
function saveSubUsers(uid: string, users: SubUser[]) { lsSet(`dairy-subusers-${uid}`, users); }

// ─── Provider ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [demoVerified, setDemoVerified] = useState(true);

  useEffect(() => {
    // Safety timeout: force loading to false after 3 seconds
    const timer = setTimeout(() => {
      setLoading(prev => {
        if (prev) console.warn('Auth loading timed out, forcing false');
        return false;
      });
    }, 3000);

    if (DEMO_MODE) {
      // Restore last session
      const savedUid = localStorage.getItem('dairy-session-uid');
      if (savedUid) {
        const owners = getAllOwners();
        const found = owners.find(o => o.uid === savedUid);
        if (found) {
          setProfile(found);
          setSubUsers(getSubUsers(savedUid));
          setDemoVerified(localStorage.getItem(`demo-verified-${savedUid}`) === 'true');
        }
      }
      setLoading(false);
      clearTimeout(timer);
      return;
    }

    // Firebase auth listener
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, 'owners', u.uid));
        if (snap.exists()) {
          const data = snap.data() as OwnerProfile;
          setProfile(data);
          setSubUsers(getSubUsers(u.uid));
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      clearTimeout(timer);
    });

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);

  // ── Register ─────────────────────────────────────────────
  const register = async (name: string, dairyName: string, email: string, password: string) => {
    if (DEMO_MODE) {
      const owners = getAllOwners();
      if (owners.find(o => o.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists. Please sign in.');
      }
      const uid = `owner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newOwner: OwnerProfile = { uid, name, dairyName, email, password, createdAt: new Date().toISOString() };
      saveOwners([...owners, newOwner]);
      localStorage.setItem('dairy-session-uid', uid);
      localStorage.setItem(`demo-verified-${uid}`, 'false');
      setProfile(newOwner);
      setSubUsers([]);
      setDemoVerified(false);
      return;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    
    // Send verification email
    try {
      await sendEmailVerification(cred.user);
    } catch (e) {
      console.error('Failed to send verification email on register:', e);
    }

    const newOwner: OwnerProfile = { uid: cred.user.uid, name, dairyName, email, createdAt: new Date().toISOString() };
    await setDoc(doc(db, 'owners', cred.user.uid), newOwner);
    setProfile(newOwner);
    setUser(cred.user);
  };

  // ── Resend Verification ──────────────────────────────────
  const resendVerification = async () => {
    if (DEMO_MODE && profile) {
      showToast('📩 Verification email (simulated) resent!');
      return;
    }
    if (user && !user.emailVerified) {
      await sendEmailVerification(user);
    }
  };

  const verifyDemoAccount = () => {
    if (DEMO_MODE && profile) {
      localStorage.setItem(`demo-verified-${profile.uid}`, 'true');
      setDemoVerified(true);
    }
  };

  // ── Sign In ───────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    if (DEMO_MODE) {
      const owners = getAllOwners();
      // Check owner accounts
      const owner = owners.find(o => o.email.toLowerCase() === email.toLowerCase() && o.password === password);
      if (owner) {
        localStorage.setItem('dairy-session-uid', owner.uid);
        setProfile(owner);
        setSubUsers(getSubUsers(owner.uid));
        return;
      }
      // Check sub-users across all owners
      for (const o of owners) {
        const subs = getSubUsers(o.uid);
        const sub = subs.find(s => s.email.toLowerCase() === email.toLowerCase() && s.password === password);
        if (sub) {
          localStorage.setItem('dairy-session-uid', o.uid);
          setProfile(o);
          setSubUsers(subs);
          return;
        }
      }
      throw new Error('Incorrect email or password.');
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  // ── Log Out ───────────────────────────────────────────────
  const logOut = async () => {
    if (DEMO_MODE) {
      localStorage.removeItem('dairy-session-uid');
      setProfile(null);
      setSubUsers([]);
      return;
    }
    await signOut(auth);
    setProfile(null);
  };

  // ── Update Owner Profile ──────────────────────────────────
  const updateProfile_ = async (updates: Partial<OwnerProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    if (DEMO_MODE) {
      const owners = getAllOwners().map(o => o.uid === profile.uid ? updated : o);
      saveOwners(owners);
      setProfile(updated);
      return;
    }
    await setDoc(doc(db, 'owners', profile.uid), updated, { merge: true });
    setProfile(updated);
  };

  // ── Sub-user management ───────────────────────────────────
  const addSubUser = (u: Omit<SubUser, 'createdAt'>) => {
    if (!profile) return;
    const subs = getSubUsers(profile.uid);
    if (subs.find(s => s.email.toLowerCase() === u.email.toLowerCase())) {
      throw new Error('A sub-user with this email already exists.');
    }
    const updated = [...subs, { ...u, createdAt: new Date().toISOString() }];
    saveSubUsers(profile.uid, updated);
    setSubUsers(updated);
  };

  const removeSubUser = (email: string) => {
    if (!profile) return;
    const updated = getSubUsers(profile.uid).filter(s => s.email.toLowerCase() !== email.toLowerCase());
    saveSubUsers(profile.uid, updated);
    setSubUsers(updated);
  };

  const updateSubUser = (email: string, updates: Partial<SubUser>) => {
    if (!profile) return;
    const updated = getSubUsers(profile.uid).map(s =>
      s.email.toLowerCase() === email.toLowerCase() ? { ...s, ...updates } : s
    );
    saveSubUsers(profile.uid, updated);
    setSubUsers(updated);
  };

  const currentUid = profile?.uid || user?.uid || null;
  const isAuthenticated = !!profile || !!user;
  const emailVerified = DEMO_MODE ? demoVerified : (user?.emailVerified || false);

  return (
    <AuthContext.Provider value={{
      user, profile, currentUid, loading, isAuthenticated, emailVerified,
      signIn, register, logOut, updateProfile_,
      resendVerification, verifyDemoAccount,
      subUsers, addSubUser, removeSubUser, updateSubUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
