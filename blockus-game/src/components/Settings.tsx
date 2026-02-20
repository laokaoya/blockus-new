import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import soundManager from '../utils/soundManager';

interface AppSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  language: 'zh' | 'en';
  notifications: boolean;
}

const SettingsContainer = styled.div`
  height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding-bottom: 60px;
  background: var(--bg-gradient);
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 30px;
  color: var(--text-primary);
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-weight: 800;
  letter-spacing: -1px;
  background: linear-gradient(to right, var(--text-primary), var(--text-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  margin: 10px 0 0 0;
  color: var(--text-secondary);
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ContentContainer = styled.div`
  display: flex;
  gap: 30px;
  max-width: 1200px;
  width: 100%;
  
  @media (max-width: 1024px) {
    flex-direction: column;
    gap: 20px;
  }
  
  @media (max-width: 768px) {
    gap: 15px;
  }
`;

const LeftPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  
  @media (max-width: 1024px) {
    order: 1;
  }
`;

const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  
  @media (max-width: 1024px) {
    order: 2;
  }
`;

const SettingsCard = styled.div`
  background: var(--surface-color);
  backdrop-filter: var(--glass-effect);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 30px;
  box-shadow: var(--shadow-lg);
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const SectionTitle = styled.h2`
  margin: 0 0 20px 0;
  color: var(--text-primary);
  font-size: 1.5rem;
  text-align: center;
`;

const SettingItem = styled.div`
  margin-bottom: 25px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SettingLabel = styled.label`
  display: block;
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 1rem;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  
  &:checked + span {
    background-color: var(--primary-color);
  }
  
  &:checked + span:before {
    transform: translateX(26px);
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--surface-border);
  border: 1px solid var(--surface-border);
  transition: 0.4s;
  border-radius: 34px;
  
  &:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 3px;
    bottom: 3px;
    background-color: var(--bg-color);
    transition: 0.4s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
  }
`;

const VolumeSlider = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const Slider = styled.input`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--surface-border);
  outline: none;
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary-color);
    cursor: pointer;
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary-color);
    cursor: pointer;
    border: none;
  }
`;

const VolumeValue = styled.span`
  font-weight: bold;
  color: var(--primary-color);
  min-width: 60px;
  text-align: center;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  background: var(--surface-highlight);
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  option {
    background: var(--surface-color);
    color: var(--text-primary);
  }
`;

const OptionGroup = styled.div`
  display: flex;
  gap: 10px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const OptionButton = styled.button<{ isSelected: boolean }>`
  flex: 1;
  padding: 12px 20px;
  border: 1px solid ${props => props.isSelected ? 'var(--primary-color)' : 'var(--surface-border)'};
  border-radius: var(--radius-md);
  background: ${props => props.isSelected ? 'rgba(99, 102, 241, 0.2)' : 'var(--surface-highlight)'};
  color: ${props => props.isSelected ? 'var(--primary-color)' : 'var(--text-secondary)'};
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: ${props => props.isSelected ? 'bold' : 'normal'};
  
  &:hover {
    border-color: var(--primary-color);
    background: ${props => props.isSelected ? 'rgba(99, 102, 241, 0.3)' : 'var(--surface-border)'};
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    padding: 10px 16px;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 30px;
  justify-content: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
    align-items: center;
  }
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 18px 40px;
  border: none;
  border-radius: 50px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  
  background: ${props => props.variant === 'primary' 
    ? 'var(--primary-gradient)' 
    : 'var(--surface-highlight)'
  };
  color: ${props => props.variant === 'primary' ? 'white' : 'var(--text-primary)'};
  border: ${props => props.variant === 'secondary' ? '1px solid var(--surface-border)' : 'none'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    background: ${props => props.variant === 'secondary' ? 'var(--surface-border)' : 'var(--primary-gradient)'};
  }
  
  @media (max-width: 768px) {
    padding: 15px 30px;
    font-size: 1.1rem;
  }
`;

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: soundManager.isEnabled(),
    musicEnabled: true,
    soundVolume: Math.round(soundManager.getVolume() * 100),
    musicVolume: 60,
    language: currentLanguage,
    notifications: true,
  });

  // 从localStorage加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(prev => ({
        ...prev,
        ...parsedSettings,
        language: currentLanguage, // 始终使用当前语言设置
      }));
    }
  }, [currentLanguage]);

  // 保存设置到localStorage
  const saveSettings = (newSettings: AppSettings) => {
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
    setSettings(newSettings);
  };

  // 处理语言切换
  const handleLanguageChange = (language: 'zh' | 'en') => {
    setLanguage(language);
    const newSettings = { ...settings, language };
    saveSettings(newSettings);
  };

  // 处理开关切换
  const handleToggleChange = (key: keyof AppSettings) => {
    const newValue = !settings[key as keyof AppSettings];
    const newSettings = { ...settings, [key]: newValue };
    saveSettings(newSettings);
    
    // 同步到 soundManager
    if (key === 'soundEnabled') {
      soundManager.setEnabled(newValue as boolean);
    }
  };

  // 处理音量变化
  const handleVolumeChange = (key: 'soundVolume' | 'musicVolume', value: number) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
    
    // 同步到 soundManager
    if (key === 'soundVolume') {
      soundManager.setVolume(value / 100);
    }
  };

  // 处理主题变化
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
  };

  // 重置设置
  const handleResetSettings = () => {
    const defaultSettings: AppSettings = {
      soundEnabled: true,
      musicEnabled: true,
      soundVolume: 80,
      musicVolume: 60,
      language: currentLanguage,
      notifications: true,
    };
    saveSettings(defaultSettings);
    setTheme('dark');
    soundManager.setEnabled(true);
    soundManager.setVolume(0.8);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <SettingsContainer>
      <Header>
        <Title>{t('settings.title')}</Title>
        <Subtitle>{t('common.settings')}</Subtitle>
      </Header>

      <ContentContainer>
        <LeftPanel>
          <SettingsCard>
            <SectionTitle>{t('settings.sound')}</SectionTitle>
            
            <SettingItem>
              <SettingLabel>{t('settings.sound')}</SettingLabel>
              <ToggleSwitch>
                <ToggleInput
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={() => handleToggleChange('soundEnabled')}
                />
                <ToggleSlider />
              </ToggleSwitch>
            </SettingItem>

            <SettingItem>
              <SettingLabel>{t('settings.music')}</SettingLabel>
              <ToggleSwitch>
                <ToggleInput
                  type="checkbox"
                  checked={settings.musicEnabled}
                  onChange={() => handleToggleChange('musicEnabled')}
                />
                <ToggleSlider />
              </ToggleSwitch>
            </SettingItem>
          </SettingsCard>
        </LeftPanel>

        <RightPanel>
          <SettingsCard>
            <SectionTitle>{t('settings.interface')}</SectionTitle>
            
            <SettingItem>
              <SettingLabel>{t('settings.language')}</SettingLabel>
              <Select
                value={settings.language}
                onChange={(e) => handleLanguageChange(e.target.value as 'zh' | 'en')}
              >
                <option value="zh">{t('settings.chinese')}</option>
                <option value="en">{t('settings.english')}</option>
              </Select>
            </SettingItem>

            <SettingItem>
              <SettingLabel>{t('settings.theme')}</SettingLabel>
              <OptionGroup>
                <OptionButton
                  isSelected={theme === 'light'}
                  onClick={() => handleThemeChange('light')}
                >
                  {t('settings.light')}
                </OptionButton>
                <OptionButton
                  isSelected={theme === 'dark'}
                  onClick={() => handleThemeChange('dark')}
                >
                  {t('settings.dark')}
                </OptionButton>
                <OptionButton
                  isSelected={theme === 'auto'}
                  onClick={() => handleThemeChange('auto')}
                >
                  {t('settings.auto')}
                </OptionButton>
              </OptionGroup>
            </SettingItem>

          </SettingsCard>

          <SettingsCard>
            <SectionTitle>{t('settings.notifications')}</SectionTitle>
            
            <SettingItem>
              <SettingLabel>{t('settings.gameNotifications')}</SettingLabel>
              <ToggleSwitch>
                <ToggleInput
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={() => handleToggleChange('notifications')}
                />
                <ToggleSlider />
              </ToggleSwitch>
            </SettingItem>
          </SettingsCard>
        </RightPanel>
      </ContentContainer>

      <ActionButtons>
        <Button variant="secondary" onClick={handleResetSettings}>
          {t('common.reset')}
        </Button>
        <Button variant="secondary" onClick={handleBack}>
          {t('common.back')}
        </Button>
      </ActionButtons>
    </SettingsContainer>
  );
};

export default Settings;
