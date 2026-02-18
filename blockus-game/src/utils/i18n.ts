import { zh } from '../locales/zh';
import { en } from '../locales/en';

export type Language = 'zh' | 'en';

export const languages = {
  zh,
  en,
};

class I18nManager {
  private currentLanguage: Language = 'zh';

  constructor() {
    const userExplicitlySet = localStorage.getItem('languageSetByUser');
    const savedLanguage = localStorage.getItem('language') as Language;
    if (userExplicitlySet === 'true' && savedLanguage && (savedLanguage === 'zh' || savedLanguage === 'en')) {
      this.currentLanguage = savedLanguage;
    } else {
      this.currentLanguage = 'zh';
    }
  }

  // 获取当前语言
  getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  // 设置语言
  setLanguage(language: Language) {
    this.currentLanguage = language;
    localStorage.setItem('language', language);
  }

  // 获取翻译文本
  t(key: string): string {
    const keys = key.split('.');
    let value: any = languages[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // 如果找不到翻译，返回key本身
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }

  // 获取翻译文本（支持数组）
  tArray(key: string): string[] {
    const keys = key.split('.');
    let value: any = languages[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return [key];
      }
    }

    return Array.isArray(value) ? value : [key];
  }

  // 获取所有可用语言
  getAvailableLanguages(): { code: Language; name: string }[] {
    return [
      { code: 'zh', name: '中文' },
      { code: 'en', name: 'English' },
    ];
  }
}

// 创建全局国际化管理器实例
export const i18n = new I18nManager();

// 导出便捷的翻译函数
export const t = (key: string): string => i18n.t(key);
export const tArray = (key: string): string[] => i18n.tArray(key);

export default I18nManager;
