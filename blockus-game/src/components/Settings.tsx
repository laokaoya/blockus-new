import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';

interface AppSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  language: 'zh' | 'en';
  theme: 'light' | 'dark' | 'auto';
  quality: 'low' | 'medium' | 'high';
  notifications: boolean;
}

const SettingsContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 30px;
  color: white;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  margin: 10px 0 0 0;
  opacity: 0.9;
  
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
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const SectionTitle = styled.h2`
  margin: 0 0 20px 0;
  color: #333;
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
  color: #333;
  font-weight: bold;
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
    background-color: #667eea;
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
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 34px;
  
  &:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
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
  background: #ddd;
  outline: none;
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
  }
`;

const VolumeValue = styled.span`
  font-weight: bold;
  color: #667eea;
  min-width: 60px;
  text-align: center;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 10px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
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
  border: 2px solid ${props => props.isSelected ? '#667eea' : '#ddd'};
  border-radius: 10px;
  background: ${props => props.isSelected ? '#667eea' : 'white'};
  color: ${props => props.isSelected ? 'white' : '#333'};
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: ${props => props.isSelected ? 'bold' : 'normal'};
  
  &:hover {
    border-color: #667eea;
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
    ? 'linear-gradient(135deg, #667eea, #764ba2)' 
    : 'rgba(255, 255, 255, 0.2)'
  };
  color: white;
  border: ${props => props.variant === 'secondary' ? '2px solid rgba(255, 255, 255, 0.3)' : 'none'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }
  
  @media (max-width: 768px) {
    padding: 15px 30px;
    font-size: 1.1rem;
  }
`;

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage, setLanguage, t } = useLanguage();
  
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 80,
    musicVolume: 60,
    language: currentLanguage,
    theme: 'light',
    quality: 'medium',
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
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  // 处理音量变化
  const handleVolumeChange = (key: 'soundVolume' | 'musicVolume', value: number) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  // 处理主题变化
  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    const newSettings = { ...settings, theme };
    saveSettings(newSettings);
  };

  // 处理画质变化
  const handleQualityChange = (quality: 'low' | 'medium' | 'high') => {
    const newSettings = { ...settings, quality };
    saveSettings(newSettings);
  };

  // 重置设置
  const handleResetSettings = () => {
    const defaultSettings: AppSettings = {
      soundEnabled: true,
      musicEnabled: true,
      soundVolume: 80,
      musicVolume: 60,
      language: currentLanguage,
      theme: 'light',
      quality: 'medium',
      notifications: true,
    };
    saveSettings(defaultSettings);
  };

  // 返回主页面
  const handleBackToLobby = () => {
    navigate('/');
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
              <SettingLabel>{t('settings.sound')}: {settings.soundEnabled ? t('settings.on') : t('settings.off')}</SettingLabel>
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
              <SettingLabel>{t('settings.music')}: {settings.musicEnabled ? t('settings.on') : t('settings.off')}</SettingLabel>
              <ToggleSwitch>
                <ToggleInput
                  type="checkbox"
                  checked={settings.musicEnabled}
                  onChange={() => handleToggleChange('musicEnabled')}
                />
                <ToggleSlider />
              </ToggleSwitch>
            </SettingItem>

            <SettingItem>
              <SettingLabel>{t('settings.sound')} {t('settings.volume')}: {settings.soundVolume}%</SettingLabel>
              <VolumeSlider>
                <Slider
                  type="range"
                  min="0"
                  max="100"
                  value={settings.soundVolume}
                  onChange={(e) => handleVolumeChange('soundVolume', parseInt(e.target.value))}
                />
                <VolumeValue>{settings.soundVolume}%</VolumeValue>
              </VolumeSlider>
            </SettingItem>

            <SettingItem>
              <SettingLabel>{t('settings.music')} {t('settings.volume')}: {settings.musicVolume}%</SettingLabel>
              <VolumeSlider>
                <Slider
                  type="range"
                  min="0"
                  max="100"
                  value={settings.musicVolume}
                  onChange={(e) => handleVolumeChange('musicVolume', parseInt(e.target.value))}
                />
                <VolumeValue>{settings.musicVolume}%</VolumeValue>
              </VolumeSlider>
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
                  isSelected={settings.theme === 'light'}
                  onClick={() => handleThemeChange('light')}
                >
                  {t('settings.light')}
                </OptionButton>
                <OptionButton
                  isSelected={settings.theme === 'dark'}
                  onClick={() => handleThemeChange('dark')}
                >
                  {t('settings.dark')}
                </OptionButton>
                <OptionButton
                  isSelected={settings.theme === 'auto'}
                  onClick={() => handleThemeChange('auto')}
                >
                  {t('settings.auto')}
                </OptionButton>
              </OptionGroup>
            </SettingItem>

            <SettingItem>
              <SettingLabel>{t('settings.quality')}</SettingLabel>
              <OptionGroup>
                <OptionButton
                  isSelected={settings.quality === 'low'}
                  onClick={() => handleQualityChange('low')}
                >
                  {t('settings.low')}
                </OptionButton>
                <OptionButton
                  isSelected={settings.quality === 'medium'}
                  onClick={() => handleQualityChange('medium')}
                >
                  {t('settings.medium')}
                </OptionButton>
                <OptionButton
                  isSelected={settings.quality === 'high'}
                  onClick={() => handleQualityChange('high')}
                >
                  {t('settings.high')}
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
        <Button variant="secondary" onClick={handleBackToLobby}>
          {t('common.back')}
        </Button>
      </ActionButtons>
    </SettingsContainer>
  );
};

export default Settings;
