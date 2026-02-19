import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currentTheme: 'light' | 'dark'; // 实际生效的主题（解析 auto 后）
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return parsed.theme || 'dark';
      } catch (e) {
        return 'dark';
      }
    }
    return 'dark';
  });

  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark');

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateCurrentTheme = () => {
      if (theme === 'auto') {
        setCurrentTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setCurrentTheme(theme);
      }
    };

    updateCurrentTheme();
    mediaQuery.addEventListener('change', updateCurrentTheme);
    
    return () => mediaQuery.removeEventListener('change', updateCurrentTheme);
  }, [theme]);

  // 应用主题到 HTML 根元素
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // 更新主题并保存到 localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // 更新 localStorage 中的 appSettings
    const savedSettings = localStorage.getItem('appSettings');
    let settings = {};
    if (savedSettings) {
      try {
        settings = JSON.parse(savedSettings);
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    
    localStorage.setItem('appSettings', JSON.stringify({
      ...settings,
      theme: newTheme
    }));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
