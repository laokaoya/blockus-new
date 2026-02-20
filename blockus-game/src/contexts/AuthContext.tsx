import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile as fbUpdateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { User, UserProfile, UserStats } from '../types/game';
import socketService from '../services/socketService';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  registerWithEmail: (email: string, password: string, nickname: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginAsGuest: (profile: UserProfile) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateStats: (stats: Partial<UserStats>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const DEFAULT_STATS: UserStats = {
  totalGames: 0, totalWins: 0, totalScore: 0,
  winRate: 0, bestScore: 0, averageScore: 0, totalPlayTime: 0,
};

function loadMergedStats(): UserStats {
  try {
    const saved = localStorage.getItem('user');
    if (saved) {
      const prev = JSON.parse(saved);
      if (prev.stats) return { ...DEFAULT_STATS, ...prev.stats };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_STATS };
}

function saveUserToStorage(userData: User) {
  localStorage.setItem('user', JSON.stringify(userData));
}

async function connectSocket(nickname: string, avatar?: string, token?: string) {
  try {
    await socketService.connect(token);
    const result = await socketService.login(nickname, avatar);
    return result;
  } catch (err) {
    console.warn('Socket connect failed, offline mode:', err);
    return null;
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Firebase user signed in — build local user state
        const idToken = await fbUser.getIdToken();
        setToken(idToken);
        setIsGuest(false);

        const stats = loadMergedStats();
        const newUser: User = {
          profile: {
            id: fbUser.uid,
            nickname: fbUser.displayName || fbUser.email?.split('@')[0] || 'Player',
            email: fbUser.email || undefined,
            isGuest: false,
            avatar: fbUser.photoURL || undefined,
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
          },
          stats,
        };

        // Merge saved profile extras (age, gender, bio, location, avatar)
        try {
          const saved = localStorage.getItem('user');
          if (saved) {
            const prev = JSON.parse(saved);
            if (prev.profile) {
              newUser.profile.age = prev.profile.age;
              newUser.profile.gender = prev.profile.gender;
              newUser.profile.bio = prev.profile.bio;
              newUser.profile.location = prev.profile.location;
              if (prev.profile.avatar && !newUser.profile.avatar) {
                newUser.profile.avatar = prev.profile.avatar;
              }
              if (prev.profile.nickname && prev.profile.nickname !== 'Player') {
                newUser.profile.nickname = prev.profile.nickname;
              }
            }
          }
        } catch { /* ignore */ }

        setUser(newUser);
        saveUserToStorage(newUser);

        // Connect socket with Firebase ID token
        const socketResult = await connectSocket(newUser.profile.nickname, newUser.profile.avatar, idToken);
        if (socketResult?.success && socketResult.token) {
          localStorage.setItem('authToken', socketResult.token);
        }
      } else if (!isGuest) {
        // Not signed in and not a guest — try restoring guest session
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            const prev = JSON.parse(savedUser);
            if (prev.profile?.isGuest) {
              setUser(prev);
              setIsGuest(true);
              const savedToken = localStorage.getItem('authToken');
              if (savedToken) setToken(savedToken);
              await connectSocket(prev.profile.nickname, prev.profile.avatar, savedToken || undefined);
            }
          } catch { /* ignore */ }
        }
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string, nickname: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await fbUpdateProfile(cred.user, { displayName: nickname });
    // onAuthStateChanged will handle the rest
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
  }, []);

  const loginAsGuest = useCallback(async (profile: UserProfile): Promise<boolean> => {
    const stats = loadMergedStats();
    const guestProfile: UserProfile = {
      ...profile,
      id: profile.id || `guest_${Date.now()}`,
      isGuest: true,
      createdAt: profile.createdAt || Date.now(),
      lastLoginAt: Date.now(),
    };

    const newUser: User = { profile: guestProfile, stats };

    try {
      await socketService.connect();
      const result = await socketService.login(guestProfile.nickname, guestProfile.avatar);
      if (result.success && result.token && result.userId) {
        guestProfile.id = result.userId;
        newUser.profile = guestProfile;
        setToken(result.token);
        localStorage.setItem('authToken', result.token);
      }
    } catch {
      console.warn('Guest login: socket unavailable, offline mode');
    }

    setUser(newUser);
    setIsGuest(true);
    saveUserToStorage(newUser);
    return true;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const logout = useCallback(() => {
    signOut(auth).catch(() => {});
    socketService.disconnect();
    setUser(null);
    setFirebaseUser(null);
    setToken(null);
    setIsGuest(false);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  }, []);

  const updateProfile = useCallback((profile: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updatedUser = {
        ...prev,
        profile: { ...prev.profile, ...profile, lastLoginAt: Date.now() },
      };
      saveUserToStorage(updatedUser);
      return updatedUser;
    });
  }, []);

  const updateStats = useCallback((stats: Partial<UserStats>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updatedUser = {
        ...prev,
        stats: { ...prev.stats, ...stats },
      };
      saveUserToStorage(updatedUser);
      return updatedUser;
    });
  }, []);

  const value: AuthContextType = {
    user,
    firebaseUser,
    token,
    isAuthenticated: !!user,
    isLoading,
    isGuest,
    registerWithEmail,
    loginWithEmail,
    loginAsGuest,
    resetPassword,
    logout,
    updateProfile,
    updateStats,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
