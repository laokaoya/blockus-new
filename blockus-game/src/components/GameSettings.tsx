import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';

interface GameSettings {
  aiDifficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  showHints: boolean;
  soundEnabled: boolean;
}

const SettingsContainer = styled.div`
  height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding-bottom: 60px;
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
  background: linear-gradient(to right, #fff, #94a3b8);
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
  text-align: left;
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

const DifficultyOptions = styled.div`
  display: flex;
  gap: 10px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const DifficultyButton = styled.button<{ isSelected: boolean }>`
  flex: 1;
  padding: 12px 20px;
  border: 1px solid ${props => props.isSelected ? 'var(--primary-color)' : 'var(--surface-border)'};
  border-radius: var(--radius-md);
  background: ${props => props.isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.isSelected ? 'var(--primary-color)' : 'var(--text-secondary)'};
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: ${props => props.isSelected ? 'bold' : 'normal'};
  
  &:hover {
    border-color: var(--primary-color);
    background: ${props => props.isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    padding: 10px 16px;
  }
`;

const TimeSlider = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const Slider = styled.input`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
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

const TimeValue = styled.span`
  font-weight: bold;
  color: var(--primary-color);
  min-width: 60px;
  text-align: center;
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
  background-color: rgba(255, 255, 255, 0.1);
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
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;

const RulesSection = styled.div`
  background: var(--surface-color);
  backdrop-filter: var(--glass-effect);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 30px;
  box-shadow: var(--shadow-lg);
  height: fit-content;
  text-align: left;
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const RulesList = styled.ul`
  margin: 0;
  padding-left: 20px;
  color: var(--text-secondary);
  line-height: 1.6;
  text-align: left;
`;

const RuleItem = styled.li`
  margin-bottom: 12px;
  text-align: left;
  
  &:last-child {
    margin-bottom: 0;
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
    : 'rgba(255, 255, 255, 0.1)'
  };
  color: white;
  border: ${props => props.variant === 'secondary' ? '1px solid var(--surface-border)' : 'none'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    background: ${props => props.variant === 'secondary' ? 'rgba(255, 255, 255, 0.15)' : 'var(--primary-gradient)'};
  }
  
  @media (max-width: 768px) {
    padding: 15px 30px;
    font-size: 1.1rem;
  }
`;

const GameSettings: React.FC = () => {
  const navigate = useNavigate();
  const { t, tArray } = useLanguage();
  
  const [settings, setSettings] = useState<GameSettings>({
    aiDifficulty: 'medium',
    timeLimit: 60,
    showHints: true,
    soundEnabled: true
  });

  const handleDifficultyChange = (difficulty: 'easy' | 'medium' | 'hard') => {
    setSettings(prev => ({ ...prev, aiDifficulty: difficulty }));
  };

  const handleTimeLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, timeLimit: parseInt(event.target.value) }));
  };

  const handleToggleChange = (key: keyof GameSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStartGame = () => {
    // 保存设置到localStorage
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    navigate('/game');
  };

  const handleBackToLobby = () => {
    navigate('/');
  };

  return (
    <SettingsContainer>
      <Header>
        <Title>{t('game.customGame')}</Title>
        <Subtitle>{t('common.settings')}</Subtitle>
      </Header>

      <ContentContainer>
        <LeftPanel>
          <SettingsCard>
            <SectionTitle>{t('game.customGame')}</SectionTitle>
            
            <SettingItem>
              <SettingLabel>{t('settings.aiDifficulty')}</SettingLabel>
              <DifficultyOptions>
                <DifficultyButton
                  isSelected={settings.aiDifficulty === 'easy'}
                  onClick={() => handleDifficultyChange('easy')}
                >
                  {t('settings.easy')}
                </DifficultyButton>
                <DifficultyButton
                  isSelected={settings.aiDifficulty === 'medium'}
                  onClick={() => handleDifficultyChange('medium')}
                >
                  {t('settings.medium')}
                </DifficultyButton>
                <DifficultyButton
                  isSelected={settings.aiDifficulty === 'hard'}
                  onClick={() => handleDifficultyChange('hard')}
                >
                  {t('settings.hard')}
                </DifficultyButton>
              </DifficultyOptions>
            </SettingItem>

            <SettingItem>
              <SettingLabel>{t('settings.timeLimit')}: {settings.timeLimit}{t('settings.seconds')}</SettingLabel>
              <TimeSlider>
                <Slider
                  type="range"
                  min="15"
                  max="60"
                  value={settings.timeLimit}
                  onChange={handleTimeLimitChange}
                />
                <TimeValue>{settings.timeLimit}s</TimeValue>
              </TimeSlider>
            </SettingItem>

            <SettingItem>
              <SettingLabel>{t('settings.showHints')}</SettingLabel>
              <ToggleSwitch>
                <ToggleInput
                  type="checkbox"
                  checked={settings.showHints}
                  onChange={() => handleToggleChange('showHints')}
                />
                <ToggleSlider />
              </ToggleSwitch>
            </SettingItem>

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
          </SettingsCard>
        </LeftPanel>

        <RightPanel>
          <RulesSection>
            <SectionTitle>{t('help.rules')}</SectionTitle>
            <RulesList>
              {tArray('help.rulesDesc').map((rule, index) => (
                <RuleItem key={index}>{rule}</RuleItem>
              ))}
            </RulesList>
          </RulesSection>
        </RightPanel>
      </ContentContainer>

      <ActionButtons>
        <Button variant="secondary" onClick={handleBackToLobby}>
          {t('common.back')}
        </Button>
        <Button variant="primary" onClick={handleStartGame}>
          {t('game.start')}
        </Button>
      </ActionButtons>
    </SettingsContainer>
  );
};

export default GameSettings;
