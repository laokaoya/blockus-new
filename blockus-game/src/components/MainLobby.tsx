import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import GameRulesModal from './GameRulesModal';
import RoomList from './RoomList';
import soundManager from '../utils/soundManager';
import { SettingsIcon, UserIcon, BookIcon, RocketIcon } from './Icons';

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
  flex-direction: row;
  background: #0f172a;
  overflow: hidden;
  position: relative;
  
  /* 动态背景 */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%);
    animation: rotate 60s linear infinite;
    z-index: 0;
    pointer-events: none;
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const Sidebar = styled.div`
  width: 80px;
  height: 100%;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 0;
  gap: 30px;
  z-index: 100;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    width: 60px;
    padding: 20px 0;
  }
`;

const SidebarIcon = styled.button<{ $active?: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${props => props.$active ? 'rgba(99, 102, 241, 0.2)' : 'transparent'};
  border: 1px solid ${props => props.$active ? 'rgba(99, 102, 241, 0.4)' : 'transparent'};
  color: ${props => props.$active ? '#a5b4fc' : 'var(--text-secondary)'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  svg { width: 24px; height: 24px; }
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
    transform: scale(1.05);
  }
  
  /* Tooltip */
  &::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 60px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    white-space: nowrap;
    backdrop-filter: blur(4px);
  }
  
  &:hover::after {
    opacity: 1;
  }
`;

const UserAvatar = styled.div<{ image?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.image ? `url(${props.image}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)'};
  border: 2px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    border-color: #a5b4fc;
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
  }
`;

const MainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
  overflow: hidden;
`;

const HeroSection = styled.div`
  height: 180px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 40px 30px 40px;
  position: relative;
  
  /* 巨大背景文字 */
  &::before {
    content: 'BLOCKUS';
    position: absolute;
    top: -20px;
    left: 20px;
    font-family: 'Orbitron', sans-serif;
    font-size: 12rem;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.03);
    pointer-events: none;
    z-index: -1;
    letter-spacing: 10px;
  }
`;

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PageTitle = styled.h1`
  font-family: 'Rajdhani', sans-serif;
  font-size: 3rem;
  font-weight: 700;
  margin: 0;
  color: white;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
  letter-spacing: 2px;
`;

const SubTitle = styled.div`
  color: #94a3b8;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 10px;
  
  &::before {
    content: '';
    width: 30px;
    height: 2px;
    background: #6366f1;
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 16px;
`;

const ActionCard = styled.button<{ $gradient: string }>`
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-width: 180px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => props.$gradient};
  }
  
  &:hover {
    transform: translateY(-4px);
    background: rgba(30, 41, 59, 0.8);
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  svg {
    width: 24px;
    height: 24px;
    color: white;
    opacity: 0.8;
  }
`;

const ActionText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const ActionLabel = styled.span`
  color: white;
  font-weight: 700;
  font-size: 1rem;
  font-family: 'Rajdhani', sans-serif;
`;

const ActionSub = styled.span`
  color: var(--text-secondary);
  font-size: 0.75rem;
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 0 40px 40px 40px;
  overflow: hidden;
`;

const RoomListWrapper = styled.div`
  height: 100%;
  overflow: hidden;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.05);
  
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
    totalGames: 0, totalWins: 0, totalScore: 0, winRate: 0, bestScore: 0,
  });
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setUserStats({
        totalGames: user.stats.totalGames,
        totalWins: user.stats.totalWins,
        totalScore: user.stats.totalScore,
        winRate: user.stats.winRate,
        bestScore: user.stats.bestScore,
      });
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) navigate('/welcome');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (currentRoom && currentRoom.id) {
      if (currentRoom.status === 'playing') {
        navigate(`/game?roomId=${currentRoom.id}`);
      } else {
        navigate(`/room/${currentRoom.id}`);
      }
    }
  }, [currentRoom, navigate]);

  const handleQuickClassic = () => {
    soundManager.buttonClick();
    localStorage.setItem('gameSettings', JSON.stringify({
      aiDifficulty: 'medium', timeLimit: 60, showHints: true, soundEnabled: true,
    }));
    navigate('/game', { state: { showTransition: true } });
  };

  const handleQuickCreative = () => {
    soundManager.buttonClick();
    localStorage.setItem('gameSettings', JSON.stringify({
      aiDifficulty: 'medium', timeLimit: 60, showHints: true, soundEnabled: true,
    }));
    navigate('/creative', { state: { showTransition: true } });
  };

  return (
    <LobbyContainer>
      <Sidebar>
        <SidebarIcon $active>
          <RocketIcon />
        </SidebarIcon>
        <SidebarIcon 
          onClick={() => { soundManager.buttonClick(); navigate('/profile'); }}
          data-tooltip={t('lobby.profile')}
        >
          <UserAvatar image={user?.profile.avatar}>
            {!user?.profile.avatar && (user?.profile.nickname ? user.profile.nickname.charAt(0).toUpperCase() : <UserIcon />)}
          </UserAvatar>
        </SidebarIcon>
        <SidebarIcon 
          onClick={() => { soundManager.buttonClick(); navigate('/settings'); }}
          data-tooltip={t('menu.settings')}
        >
          <SettingsIcon />
        </SidebarIcon>
        <SidebarIcon 
          onClick={() => { soundManager.buttonClick(); setIsRulesModalOpen(true); }}
          data-tooltip={t('menu.viewRules')}
        >
          <BookIcon />
        </SidebarIcon>
      </Sidebar>

      <MainArea>
        <HeroSection>
          <TitleGroup>
            <PageTitle>{t('game.gameName')}</PageTitle>
            <SubTitle>STRATEGY • CREATIVITY • BATTLE</SubTitle>
          </TitleGroup>
          
          <QuickActions>
            <ActionCard 
              $gradient="linear-gradient(135deg, #6366f1, #a855f7)"
              onClick={handleQuickClassic}
              onMouseEnter={() => soundManager.buttonHover()}
            >
              <RocketIcon />
              <ActionText>
                <ActionLabel>{t('lobby.classicMode')}</ActionLabel>
                <ActionSub>Quick Match</ActionSub>
              </ActionText>
            </ActionCard>
            
            <ActionCard 
              $gradient="linear-gradient(135deg, #f59e0b, #f97316)"
              onClick={handleQuickCreative}
              onMouseEnter={() => soundManager.buttonHover()}
            >
              <RocketIcon />
              <ActionText>
                <ActionLabel>{t('lobby.creativeMode')}</ActionLabel>
                <ActionSub>New Gameplay</ActionSub>
              </ActionText>
            </ActionCard>
          </QuickActions>
        </HeroSection>

        <ContentArea>
          <RoomListWrapper>
            <RoomList />
          </RoomListWrapper>
        </ContentArea>
      </MainArea>

      <GameRulesModal isOpen={isRulesModalOpen} onClose={() => { soundManager.buttonClick(); setIsRulesModalOpen(false); }} />
    </LobbyContainer>
  );
};

export default MainLobby;
