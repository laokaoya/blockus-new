import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { i18n, Language } from '../utils/i18n';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  tArray: (key: string) => string[];
  onLanguageChange: (callback: (language: Language) => void) => (() => void);
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(i18n.getCurrentLanguage());
  const [languageChangeCallbacks, setLanguageChangeCallbacks] = useState<((language: Language) => void)[]>([]);

  // 当语言改变时，更新i18n管理器
  const handleLanguageChange = (language: Language) => {
    i18n.setLanguage(language);
    setCurrentLanguage(language);
    localStorage.setItem('languageSetByUser', 'true');
    
    // 通知所有注册的回调
    languageChangeCallbacks.forEach(callback => callback(language));
  };

  // 注册语言改变回调
  const registerLanguageChangeCallback = (callback: (language: Language) => void) => {
    setLanguageChangeCallbacks(prev => [...prev, callback]);
    
    // 返回取消注册的函数
    return () => {
      setLanguageChangeCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  };

  // 从localStorage加载语言设置
  useEffect(() => {
    const userExplicitlySet = localStorage.getItem('languageSetByUser');
    const savedLanguage = localStorage.getItem('language') as Language;
    
    if (userExplicitlySet === 'true' && savedLanguage && (savedLanguage === 'zh' || savedLanguage === 'en')) {
      setCurrentLanguage(savedLanguage);
      i18n.setLanguage(savedLanguage);
    } else {
      // 用户从未手动选择过语言，强制使用中文
      setCurrentLanguage('zh');
      i18n.setLanguage('zh');
      localStorage.setItem('language', 'zh');
    }
  }, []);

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage: handleLanguageChange,
    t: (key: string) => i18n.t(key),
    tArray: (key: string) => i18n.tArray(key),
    onLanguageChange: registerLanguageChangeCallback,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// 自定义Hook，用于在组件中使用语言上下文
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
