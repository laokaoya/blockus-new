import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UserProfile, UserStats } from '../types/game';
import socketService from '../services/socketService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (profile: UserProfile) => Promise<boolean>;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从localStorage加载用户数据和token，并自动重连Socket
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('authToken');
    let parsedUser: User | null = null;

    if (savedUser) {
      try {
        parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        localStorage.removeItem('user');
      }
    }
    if (savedToken) {
      setToken(savedToken);
    }

    // 自动重连：如果有已保存的用户和token，自动连接Socket
    if (parsedUser && savedToken) {
      socketService.connect(savedToken)
        .then(() => {
          // 连接成功后重新认证（token 可能已过期，需要重新登录获取新身份）
          return socketService.login(parsedUser!.profile.nickname, parsedUser!.profile.avatar);
        })
        .then((result) => {
          if (result.success && result.token && result.userId) {
            // 更新为服务端分配的新 userId 和 token
            const updatedUser: User = {
              ...parsedUser!,
              profile: { ...parsedUser!.profile, id: result.userId, lastLoginAt: Date.now() }
            };
            setUser(updatedUser);
            setToken(result.token);
            saveUserToStorage(updatedUser);
            localStorage.setItem('authToken', result.token);
          }
        })
        .catch((err) => {
          console.warn('Socket auto-reconnect failed, running in offline mode:', err.message);
        });
    }

    setIsLoading(false);
  }, []);

  // 保存用户数据到localStorage
  const saveUserToStorage = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const login = useCallback(async (profile: UserProfile): Promise<boolean> => {
    const defaultStats: UserStats = {
      totalGames: 0,
      totalWins: 0,
      totalScore: 0,
      winRate: 0,
      bestScore: 0,
      averageScore: 0,
      totalPlayTime: 0
    };

    try {
      // 先连接到服务器
      await socketService.connect();

      // 通过 Socket 进行登录认证
      const result = await socketService.login(profile.nickname, profile.avatar);
      
      if (result.success && result.token && result.userId) {
        const newUser: User = {
          profile: {
            ...profile,
            id: result.userId,
            createdAt: profile.createdAt || Date.now(),
            lastLoginAt: Date.now()
          },
          stats: defaultStats
        };

        // 尝试合并已有的统计数据
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            const prev = JSON.parse(savedUser);
            if (prev.stats) {
              newUser.stats = prev.stats;
            }
          } catch { /* ignore */ }
        }

        setUser(newUser);
        setToken(result.token);
        saveUserToStorage(newUser);
        localStorage.setItem('authToken', result.token);
        return true;
      } else {
        console.error('Login failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Login error, falling back to local mode:', error);
      
      // 降级：服务器不可用时使用本地模式
      const newUser: User = {
        profile: {
          ...profile,
          id: profile.id || `local_${Date.now()}`,
          createdAt: profile.createdAt || Date.now(),
          lastLoginAt: Date.now()
        },
        stats: defaultStats
      };

      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const prev = JSON.parse(savedUser);
          if (prev.stats) {
            newUser.stats = prev.stats;
          }
        } catch { /* ignore */ }
      }

      setUser(newUser);
      saveUserToStorage(newUser);
      return true;
    }
  }, []);

  const logout = useCallback(() => {
    socketService.disconnect();
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  }, []);

  const updateProfile = useCallback((profile: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updatedUser = {
        ...prev,
        profile: {
          ...prev.profile,
          ...profile,
          lastLoginAt: Date.now()
        }
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
        stats: {
          ...prev.stats,
          ...stats
        }
      };
      saveUserToStorage(updatedUser);
      return updatedUser;
    });
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateProfile,
    updateStats
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
