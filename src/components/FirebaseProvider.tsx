import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  User,
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { Team } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  handle?: string;
  favTeam?: Team;
  language?: string;
  victories: number;
  defeats: number;
  totalGames: number;
  friends?: string[]; // Array of UIDs
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  addFriend: (friendUid: string) => Promise<void>;
  removeFriend: (friendUid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      // Initialize global stats if they don't exist
      try {
        const globalRef = doc(db, 'stats', 'global');
        const globalSnap = await getDoc(globalRef);
        if (!globalSnap.exists()) {
          await setDoc(globalRef, { argVictories: 0, ukVictories: 0 });
        }
      } catch (e: any) {
        if (e.code === 'permission-denied') {
          handleFirestoreError(e, OperationType.WRITE, 'stats/global');
        }
        console.error("Failed to init global stats", e);
      }

      setUser(u);
      
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (u) {
        const userDoc = doc(db, 'users', u.uid);
        
        // Ensure user doc exists
        try {
          const snap = await getDoc(userDoc);
          if (!snap.exists()) {
              const newProfile: UserProfile = {
                uid: u.uid,
                displayName: u.displayName || 'Comandante',
                photoURL: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`,
                handle: '',
                language: 'es',
                victories: 0,
                defeats: 0,
                totalGames: 0
              };
            await setDoc(userDoc, { ...newProfile, createdAt: serverTimestamp() });
          }
        } catch (e) {
             console.error("Error checking user doc", e);
        }

        // Set up listener for real-time profile updates
        profileUnsub = onSnapshot(userDoc, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
            setLoading(false);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Error on Login:', err);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const addFriend = async (friendUid: string) => {
    if (!profile || !user) return;
    const friends = profile.friends || [];
    if (friends.includes(friendUid)) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friends: [...friends, friendUid]
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const removeFriend = async (friendUid: string) => {
    if (!profile || !user) return;
    const friends = profile.friends || [];
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friends: friends.filter(id => id !== friendUid)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, updateProfile, addFriend, removeFriend }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within FirebaseProvider');
  return context;
}
