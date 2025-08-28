import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';

interface UserStats {
  totalGames: number;
  totalWins: number;
  totalScore: number;
  winRate: number;
  bestScore: number;
}

const LobbyContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
  color: white;
`;

const Title = styled.h1`
  font-size: 3rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  margin: 10px 0 0 0;
  opacity: 0.9;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
  }
`;

const UserInfoCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  text-align: center;
  margin-bottom: 30px;
  min-width: 300px;
  
  @media (max-width: 768px) {
    padding: 20px;
    min-width: 280px;
  }
`;

const UserAvatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
  font-weight: bold;
`;

const UserName = styled.h2`
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-top: 20px;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #666;
  margin-top: 5px;
`;

const GameOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  max-width: 800px;
  width: 100%;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 15px;
  }
`;

const GameOptionCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
  }
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const OptionIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 20px;
`;

const OptionTitle = styled.h3`
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1.3rem;
`;

const OptionDescription = styled.p`
  margin: 0;
  color: #666;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const BottomActions = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
    align-items: center;
  }
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50px;
  padding: 12px 24px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    padding: 10px 20px;
    font-size: 0.9rem;
  }
`;

const MainLobby: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [userStats, setUserStats] = useState<UserStats>({
    totalGames: 0,
    totalWins: 0,
    totalScore: 0,
    winRate: 0,
    bestScore: 0
  });

  // 从localStorage加载用户数据
  useEffect(() => {
    const savedStats = localStorage.getItem('userStats');
    if (savedStats) {
      setUserStats(JSON.parse(savedStats));
    }
  }, []);

  const handleQuickStart = () => {
    // 设置默认游戏设置
    const defaultSettings = {
      aiDifficulty: 'medium',
      timeLimit: 60,
      showHints: true,
      soundEnabled: true
    };
    localStorage.setItem('gameSettings', JSON.stringify(defaultSettings));
    navigate('/game');
  };

  const handleCustomGame = () => {
    navigate('/game-settings');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleViewStats = () => {
    navigate('/statistics');
  };

  return (
    <LobbyContainer>
      <Header>
        <Title>{t('game.title')}</Title>
        <Subtitle>{t('game.description')}</Subtitle>
      </Header>

      <UserInfoCard>
        <UserAvatar>👤</UserAvatar>
        <UserName>{t('player.player')}</UserName>
        <StatsGrid>
          <StatItem>
            <StatValue>{userStats.totalGames}</StatValue>
            <StatLabel>{t('statistics.totalGames')}</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{userStats.totalWins}</StatValue>
            <StatLabel>{t('statistics.totalWins')}</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{userStats.winRate.toFixed(1)}%</StatValue>
            <StatLabel>{t('statistics.winRate')}</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{userStats.bestScore}</StatValue>
            <StatLabel>{t('statistics.bestScore')}</StatLabel>
          </StatItem>
        </StatsGrid>
      </UserInfoCard>

      <GameOptions>
        <GameOptionCard onClick={handleQuickStart}>
          <OptionIcon>🚀</OptionIcon>
          <OptionTitle>{t('game.quickStart')}</OptionTitle>
          <OptionDescription>
            {t('game.quickStartDesc')}
          </OptionDescription>
        </GameOptionCard>

        <GameOptionCard onClick={handleCustomGame}>
          <OptionIcon>⚙️</OptionIcon>
          <OptionTitle>{t('game.customGame')}</OptionTitle>
          <OptionDescription>
            {t('game.customGameDesc')}
          </OptionDescription>
        </GameOptionCard>
      </GameOptions>

      <BottomActions>
        <ActionButton onClick={handleViewStats}>
          {t('statistics.viewDetails')}
        </ActionButton>
        <ActionButton onClick={handleSettings}>
          {t('menu.settings')}
        </ActionButton>
      </BottomActions>
    </LobbyContainer>
  );
};

export default MainLobby;
