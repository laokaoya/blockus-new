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

const TimeSlider = styled.div`
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

const TimeValue = styled.span`
  font-weight: bold;
  color: #667eea;
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

const RulesSection = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  height: fit-content;
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const RulesList = styled.ul`
  margin: 0;
  padding-left: 20px;
  color: #333;
  line-height: 1.6;
`;

const RuleItem = styled.li`
  margin-bottom: 12px;
  
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
