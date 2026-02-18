import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import GameRulesModal from './GameRulesModal';
import RoomList from './RoomList';
import soundManager from '../utils/soundManager';

interface UserStats {
  totalGames: number;
  totalWins: number;
  totalScore: number;
  winRate: number;
  bestScore: number;
}

const LobbyContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: radial-gradient(circle at 50% 0%, rgba(30, 41, 59, 0.3) 0%, transparent 70%);
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 16px;
    overflow-y: auto;
  }
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 0 10px;
`;

const LogoSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const Logo = styled.h1`
  font-family: 'Orbitron', sans-serif;
  font-size: 2.5rem;
  font-weight: 900;
  margin: 0;
  letter-spacing: 2px;
  background: linear-gradient(to right, #fff, #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const SubLogo = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  color: var(--text-secondary);
  letter-spacing: 4px;
  text-transform: uppercase;
  opacity: 0.8;
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const UserProfileCompact = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  padding: 6px 16px 6px 6px;
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const AvatarSmall = styled.div<{ image?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.image ? `url(${props.image}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: white;
  font-weight: 600;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
`;

const UserInfoCompact = styled.div`
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const UserNameCompact = styled.span`
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.9rem;
`;

const UserStatsCompact = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: 'Rajdhani', sans-serif;
`;

const IconButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 30px;
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  height: calc(100vh - 120px); /* Subtract header height */
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    height: auto;
  }
`;

const MenuPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const MenuButton = styled.button<{ $primary?: boolean }>`
  background: ${props => props.$primary 
    ? 'var(--primary-gradient)' 
    : 'rgba(30, 41, 59, 0.6)'};
  border: 1px solid ${props => props.$primary ? 'transparent' : 'rgba(255, 255, 255, 0.1)'};
  padding: 20px 24px;
  border-radius: 16px;
  color: white;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 16px;
  backdrop-filter: blur(10px);
  
  &:hover {
    transform: translateX(5px);
    background: ${props => props.$primary 
      ? 'var(--primary-gradient)' 
      : 'rgba(30, 41, 59, 0.8)'};
    border-color: ${props => props.$primary ? 'transparent' : 'var(--primary-color)'};
    box-shadow: ${props => props.$primary 
      ? '0 0 30px rgba(99, 102, 241, 0.4)' 
      : '0 0 20px rgba(0, 0, 0, 0.2)'};
  }
`;

const ButtonIcon = styled.span`
  font-size: 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ButtonContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const ButtonTitle = styled.span`
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 1px;
`;

const ButtonDesc = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
`;

const RoomListWrapper = styled.div`
  height: 100%;
  overflow: hidden;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  
  /* Make RoomList take full height */
  & > div {
    height: 100%;
    margin: 0;
    border: none;
    background: transparent;
    box-shadow: none;
  }
`;

const MainLobby: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { currentRoom } = useRoom();
  
  const [userStats, setUserStats] = useState<UserStats>({
    totalGames: 0,
    totalWins: 0,
    totalScore: 0,
    winRate: 0,
    bestScore: 0
  });

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // 从用户数据加载统计信息
  useEffect(() => {
    if (user) {
      setUserStats({
        totalGames: user.stats.totalGames,
        totalWins: user.stats.totalWins,
        totalScore: user.stats.totalScore,
        winRate: user.stats.winRate,
        bestScore: user.stats.bestScore
      });
    }
  }, [user]);

  // 如果用户未登录，重定向到欢迎页面
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/welcome');
    }
  }, [isAuthenticated, navigate]);

  // 如果用户在房间中，重定向到房间页面
  useEffect(() => {
    if (currentRoom && currentRoom.id) {
      if (currentRoom.status === 'playing') {
        navigate(`/game?roomId=${currentRoom.id}`);
      } else {
        navigate(`/room/${currentRoom.id}`);
      }
    }
  }, [currentRoom, navigate]);

  const handleQuickStart = () => {
    soundManager.buttonClick();
    const defaultSettings = {
      aiDifficulty: 'medium',
      timeLimit: 60,
      showHints: true,
      soundEnabled: true
    };
    localStorage.setItem('gameSettings', JSON.stringify(defaultSettings));
    navigate('/game', { state: { showTransition: true } });
  };

  const handleCustomGame = () => {
    soundManager.buttonClick();
    navigate('/game-settings');
  };

  const handleViewProfile = () => {
    soundManager.buttonClick();
    navigate('/profile');
  };

  const handleSettings = () => {
    soundManager.buttonClick();
    navigate('/settings');
  };

  const handleViewRules = () => {
    soundManager.buttonClick();
    setIsRulesModalOpen(true);
  };

  const handleCloseRules = () => {
    soundManager.buttonClick();
    setIsRulesModalOpen(false);
  };

  return (
    <LobbyContainer>
      <TopBar>
        <LogoSection>
          <Logo>{t('game.gameName')}</Logo>
          <SubLogo>{t('game.description')}</SubLogo>
        </LogoSection>
        
        <UserSection>
          <UserProfileCompact onClick={handleViewProfile} onMouseEnter={() => soundManager.buttonHover()}>
            <AvatarSmall image={user?.profile.avatar}>
              {!user?.profile.avatar && user?.profile.nickname?.charAt(0).toUpperCase()}
            </AvatarSmall>
            <UserInfoCompact>
              <UserNameCompact>{user?.profile.nickname || t('player.player')}</UserNameCompact>
              <UserStatsCompact>
                {t('statistics.totalWins')}: {userStats.totalWins} | {t('statistics.winRate')}: {userStats.winRate.toFixed(0)}%
              </UserStatsCompact>
            </UserInfoCompact>
          </UserProfileCompact>
          
          <IconButton onClick={handleSettings} onMouseEnter={() => soundManager.buttonHover()} title={t('menu.settings')}>
            ⚙️
          </IconButton>
        </UserSection>
      </TopBar>

      <ContentGrid>
        <MenuPanel>
          <MenuButton onClick={handleQuickStart} $primary onMouseEnter={() => soundManager.buttonHover()}>
            <ButtonIcon>🚀</ButtonIcon>
            <ButtonContent>
              <ButtonTitle>{t('lobby.singlePlayer')}</ButtonTitle>
              <ButtonDesc>{t('lobby.singlePlayerDesc')}</ButtonDesc>
            </ButtonContent>
          </MenuButton>

          <MenuButton onClick={handleCustomGame} onMouseEnter={() => soundManager.buttonHover()}>
            <ButtonIcon>⚔️</ButtonIcon>
            <ButtonContent>
              <ButtonTitle>{t('lobby.customGame')}</ButtonTitle>
              <ButtonDesc>{t('lobby.customGameDesc')}</ButtonDesc>
            </ButtonContent>
          </MenuButton>

          <MenuButton onClick={handleViewRules} onMouseEnter={() => soundManager.buttonHover()}>
            <ButtonIcon>📖</ButtonIcon>
            <ButtonContent>
              <ButtonTitle>{t('menu.viewRules')}</ButtonTitle>
              <ButtonDesc>{t('help.objective')}</ButtonDesc>
            </ButtonContent>
          </MenuButton>
        </MenuPanel>

        <RoomListWrapper>
          <RoomList />
        </RoomListWrapper>
      </ContentGrid>

      <GameRulesModal 
        isOpen={isRulesModalOpen} 
        onClose={handleCloseRules} 
      />
    </LobbyContainer>
  );
};

export default MainLobby;
