import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile as fbUpdateProfile,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { User, UserProfile, UserStats } from '../types/game';
import socketService from '../services/socketService';
import { registerWithServer } from '../services/authApi';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  registerWithEmail: (email: string, password: string, nickname: string, verificationCode: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginAsGuest: (profile: UserProfile) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => void;
  deleteAccount: (password: string) => Promise<void>;
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
  ladderPoints: 1000, // 初始积分 1000
};

function loadMergedStats(): UserStats {
  try {
    const saved = localStorage.getItem('user');
    if (saved) {
      const prev = JSON.parse(saved);
      if (prev.stats) {
        const merged = { ...DEFAULT_STATS, ...prev.stats };
        if (merged.ladderPoints == null) merged.ladderPoints = 1000;
        return merged;
      }
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_STATS };
}

function saveUserToStorage(userData: User) {
  localStorage.setItem('user', JSON.stringify(userData));
}

async function connectSocket(nickname: string, avatar?: string, token?: string | (() => Promise<string | undefined>)) {
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
        // Firebase 用户登录：先清除可能残留的 guest 数据，避免后续 null 回调误恢复 guest
        try {
          const saved = localStorage.getItem('user');
          if (saved) {
            const prev = JSON.parse(saved);
            if (prev.profile?.isGuest) {
              localStorage.removeItem('user');
              localStorage.removeItem('authToken');
            }
          }
        } catch { /* ignore */ }

        const idToken = await fbUser.getIdToken(true);
        setToken(idToken);
        setIsGuest(false);

        const stats = loadMergedStats();
        // 优先使用 Firebase displayName（注册/登录时的昵称），确保天梯和 profile 同步
        const firebaseNickname = fbUser.displayName?.trim() || fbUser.email?.split('@')[0] || 'Player';
        const newUser: User = {
          profile: {
            id: fbUser.uid,
            nickname: firebaseNickname,
            email: fbUser.email || undefined,
            isGuest: false,
            avatar: fbUser.photoURL || undefined,
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
          },
          stats,
        };

        // Merge saved profile extras (age, gender, bio, location, avatar) — 不覆盖 nickname，保持与 Firebase 同步
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
            }
          }
        } catch { /* ignore */ }

        setUser(newUser);
        saveUserToStorage(newUser);

        // Connect socket：传入 token 获取函数，重连时自动刷新避免 id-token-expired
        const tokenProvider = () => fbUser.getIdToken(true);
        const socketResult = await connectSocket(newUser.profile.nickname, newUser.profile.avatar, tokenProvider);
        if (socketResult?.success) {
          if (socketResult.token) localStorage.setItem('authToken', socketResult.token);
          if (socketResult.userId) {
            newUser.profile.id = socketResult.userId;
            setUser({ ...newUser });
            saveUserToStorage(newUser);
          }
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

  const registerWithEmail = useCallback(async (email: string, password: string, nickname: string, verificationCode: string) => {
    const { success, error } = await registerWithServer(email, password, nickname, verificationCode);
    if (!success) {
      const err = new Error(error || 'REGISTER_FAILED') as Error & { code?: string };
      err.code = error;
      throw err;
    }
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle the rest
  }, []);

  const loginAsGuest = useCallback(async (profile: UserProfile): Promise<boolean> => {
    if (firebaseUser) return false;
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
  }, [firebaseUser]);

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

  const deleteAccount = useCallback(async (password: string) => {
    if (!firebaseUser?.email) throw new Error('需要邮箱账号才能注销');
    const credential = EmailAuthProvider.credential(firebaseUser.email, password);
    await reauthenticateWithCredential(firebaseUser, credential);
    await deleteUser(firebaseUser);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('gameHistory');
    socketService.disconnect();
    setUser(null);
    setFirebaseUser(null);
    setToken(null);
    setIsGuest(false);
  }, [firebaseUser]);

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
    // 同步昵称到 Firebase displayName，确保下次登录时天梯/profile 正确显示
    if (profile.nickname && firebaseUser) {
      fbUpdateProfile(firebaseUser, { displayName: profile.nickname }).catch(() => {});
    }
  }, [firebaseUser]);

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
    deleteAccount,
    updateProfile,
    updateStats,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
