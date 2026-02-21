// 游戏结束界面组件

import React, { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { Player, GameState } from '../types/game';
import { PLAYER_COLORS } from '../constants/pieces';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import soundManager from '../utils/soundManager';

interface GameOverProps {
  players: Player[];
  gameState: GameState;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

// --- Animations ---

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const scaleIn = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const backgroundShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// --- Styled Components ---

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-gradient);
  background-size: 400% 400%;
  animation: ${backgroundShift} 15s ease infinite;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2000;
  font-family: 'Rajdhani', sans-serif;
  overflow-y: auto; /* Enable scrolling */
  overflow-x: hidden;
  padding: 40px 20px;
  
  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: var(--surface-border);
  }
  &::-webkit-scrollbar-thumb {
    background: var(--surface-highlight);
    border-radius: 4px;
  }
`;

const ContentWrapper = styled.div`
  max-width: 800px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: auto 0; /* Center vertically if content is short */
  animation: ${fadeIn} 0.8s ease-out;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
  animation: ${scaleIn} 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -15px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 4px;
    background: var(--primary-gradient);
    border-radius: 2px;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 30px;
  }
`;

const Title = styled.h1`
  font-family: 'Orbitron', sans-serif;
  font-size: 4rem;
  font-weight: 900;
  margin: 0;
  letter-spacing: 6px;
  text-transform: uppercase;
  background: linear-gradient(to bottom, var(--text-primary), var(--primary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
    letter-spacing: 3px;
  }
`;

const Subtitle = styled.div`
  font-size: 1.2rem;
  color: var(--text-secondary);
  margin-top: 10px;
  text-transform: uppercase;
  letter-spacing: 3px;
  font-weight: 600;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

// --- Podium Section ---

const PodiumContainer = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 15px;
  margin-bottom: 40px;
  height: 320px;
  width: 100%;
  max-width: 800px;
  padding: 0 10px;
  
  @media (max-width: 768px) {
    height: auto;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    margin-bottom: 30px;
  }
`;

const PodiumStep = styled.div<{ rank: number; color: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: ${props => props.rank === 1 ? '200px' : '160px'};
  order: ${props => props.rank === 1 ? 2 : props.rank === 2 ? 1 : 3};
  animation: ${slideUp} 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${props => props.rank * 0.1}s both;
  
  /* Floating animation for avatars */
  & > div:first-child {
    animation: ${floatAnimation} 3s ease-in-out infinite;
    animation-delay: ${props => props.rank * 0.5}s;
  }

  @media (max-width: 768px) {
    width: 100%;
    order: ${props => props.rank}; /* 1, 2, 3 order on mobile */
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    background: var(--surface-highlight);
    padding: 12px 20px;
    border-radius: 12px;
    border: 1px solid var(--surface-border);
    
    & > div:first-child {
      animation: none;
      margin-right: 20px;
      margin-bottom: 0;
    }
  }
`;

const AvatarWrapper = styled.div<{ color: string; rank: number }>`
  width: ${props => props.rank === 1 ? '110px' : '90px'};
  height: ${props => props.rank === 1 ? '110px' : '90px'};
  border-radius: 50%;
  background: ${props => PLAYER_COLORS[props.color]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.rank === 1 ? '2.8rem' : '2.2rem'};
  font-weight: bold;
  color: white;
  box-shadow: 0 0 ${props => props.rank === 1 ? '40px' : '25px'} ${props => PLAYER_COLORS[props.color]};
  border: 4px solid var(--surface-border);
  margin-bottom: 15px;
  position: relative;
  z-index: 2;
  flex-shrink: 0;

  &::before {
    content: '${props => props.rank}';
    position: absolute;
    bottom: -8px;
    background: var(--surface-color);
    color: var(--text-primary);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    border: 2px solid ${props => PLAYER_COLORS[props.color]};
    font-family: 'Orbitron', sans-serif;
  }
  
  ${props => props.rank === 1 && css`
    &::after {
      content: '👑';
      position: absolute;
      top: -35px;
      font-size: 3rem;
      filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
      animation: ${scaleIn} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.5s both;
    }
  `}

  @media (max-width: 768px) {
    width: 50px;
    height: 50px;
    font-size: 1.4rem;
    margin-bottom: 0;
    border-width: 2px;
    box-shadow: 0 0 15px ${props => PLAYER_COLORS[props.color]};
    
    &::after {
      font-size: 1.8rem;
      top: -22px;
    }
    
    &::before {
      width: 20px;
      height: 20px;
      font-size: 0.7rem;
      bottom: -5px;
      border-width: 1px;
    }
  }
`;

const PodiumBase = styled.div<{ rank: number }>`
  width: 100%;
  height: ${props => props.rank === 1 ? '160px' : props.rank === 2 ? '110px' : '70px'};
  background: linear-gradient(to bottom, var(--surface-highlight), var(--surface-color));
  border-top: 1px solid var(--surface-border);
  border-left: 1px solid var(--surface-border);
  border-right: 1px solid var(--surface-border);
  border-radius: 12px 12px 0 0;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 15px;
  position: relative;
  
  @media (max-width: 768px) {
    display: none; /* Hide base on mobile */
  }
`;

const PlayerInfo = styled.div`
  text-align: center;
  z-index: 3;
  width: 100%;
  padding: 0 10px;
  
  @media (max-width: 768px) {
    text-align: left;
    flex: 1;
    padding: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
`;

const PlayerName = styled.div`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 0;
  }
`;

const PlayerScoreLarge = styled.div`
  font-size: 1.4rem;
  color: var(--text-primary);
  font-weight: 800;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

const PlayerStats = styled.div`
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 4px;
  display: flex;
  gap: 10px;
  justify-content: center;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

// --- Buttons ---

const ButtonGroup = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 20px;
  animation: ${slideUp} 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
  width: 100%;
  justify-content: center;
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 12px;
  }
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 16px 40px;
  border-radius: 4px;
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  position: relative;
  overflow: hidden;
  min-width: 180px;
  
  /* Cyberpunk corner cuts */
  clip-path: polygon(
    12px 0, 100% 0, 
    100% calc(100% - 12px), calc(100% - 12px) 100%, 
    0 100%, 0 12px
  );

  ${props => props.variant === 'primary' ? `
    background: var(--primary-gradient);
    color: white;
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);

    &::before {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      transition: 0.5s;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 40px rgba(99, 102, 241, 0.6);
      
      &::before {
        left: 100%;
      }
    }
  ` : `
    background: var(--surface-highlight);
    color: var(--text-secondary);
    border: 1px solid var(--surface-border); // Fallback if clip-path fails
    box-shadow: inset 0 0 0 1px var(--surface-border);

    &:hover {
      background: var(--surface-border);
      color: var(--text-primary);
      box-shadow: inset 0 0 0 1px var(--surface-border);
    }
  `}

  &:active {
    transform: translateY(1px);
  }
  
  @media (max-width: 480px) {
    width: 100%;
    padding: 14px 20px;
  }
`;

const GameOver: React.FC<GameOverProps> = ({ 
  players, 
  gameState,
  onPlayAgain, 
  onBackToMenu 
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, updateStats } = useAuth();
  
  // 更新用户统计数据和保存游戏记录
  const hasProcessed = useRef(false);
  
  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const humanPlayer = players.find(p => p.id === user?.profile.id) || players.find(p => !p.isAI) || players[0];
    const playerScore = humanPlayer?.score ?? 0;
    const maxScore = players.length > 0 ? Math.max(...players.map(p => p.score)) : 0;
    const isWinner = players.length > 0 && playerScore === maxScore;

    // 同步更新到 AuthContext（会自动持久化到 localStorage）
    if (user) {
      const prevStats = user.stats;
      const newTotalGames = prevStats.totalGames + 1;
      const newTotalWins = prevStats.totalWins + (isWinner ? 1 : 0);

      updateStats({
        totalGames: newTotalGames,
        totalWins: newTotalWins,
        totalScore: prevStats.totalScore + playerScore,
        winRate: (newTotalWins / newTotalGames) * 100,
        bestScore: Math.max(prevStats.bestScore, playerScore),
        averageScore: Math.round((prevStats.totalScore + playerScore) / newTotalGames),
        totalPlayTime: prevStats.totalPlayTime + 5, // 约5分钟
      });
    }

    try {
      const savedStats = localStorage.getItem('userStats');
      const currentStats = savedStats ? JSON.parse(savedStats) : {
        totalGames: 0, totalWins: 0, totalScore: 0, winRate: 0, bestScore: 0, totalPlayTime: 0
      };
      const newStats = {
        totalGames: (currentStats.totalGames ?? 0) + 1,
        totalWins: (currentStats.totalWins ?? 0) + (isWinner ? 1 : 0),
        totalScore: (currentStats.totalScore ?? 0) + playerScore,
        winRate: (((currentStats.totalWins ?? 0) + (isWinner ? 1 : 0)) / ((currentStats.totalGames ?? 0) + 1)) * 100,
        bestScore: Math.max(currentStats.bestScore ?? 0, playerScore),
        totalPlayTime: (currentStats.totalPlayTime ?? 0) + 300,
      };
      localStorage.setItem('userStats', JSON.stringify(newStats));

      const gameSettingsStr = localStorage.getItem('gameSettings');
      const settings = gameSettingsStr ? JSON.parse(gameSettingsStr) : {
        aiDifficulty: 'medium', timeLimit: 60
      };
      const gameRecord = {
        id: `game_${Date.now()}`,
        date: new Date().toISOString(),
        duration: 300,
        players: players.map(p => ({
          name: p.name,
          color: p.color,
          score: p.score,
          isWinner: p.score === maxScore
        })),
        settings: { aiDifficulty: settings.aiDifficulty, timeLimit: settings.timeLimit },
        moves: gameState.moves,
        finalBoard: gameState.board
      };
      const savedHistory = localStorage.getItem('gameHistory');
      const history = savedHistory ? JSON.parse(savedHistory) : [];
      history.unshift(gameRecord);
      if (history.length > 50) history.splice(50);
      localStorage.setItem('gameHistory', JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to persist game data to localStorage:', e);
    }
  }, [players, gameState, user, updateStats]);
  
  const handleBackToLobby = () => {
    soundManager.buttonClick();
    if (onBackToMenu) onBackToMenu();
    else navigate('/', { state: { showTransition: true } });
  };
  
  const handlePlayAgain = () => {
    soundManager.buttonClick();
    onPlayAgain();
  };

  // 计算排名
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score);
  }, [players]);

  return (
    <Container>
      <ContentWrapper>
        <Header>
          <Title>{t('gameOver.title')}</Title>
          <Subtitle>MATCH COMPLETED</Subtitle>
        </Header>

        {/* Podium Section for Top 3 */}
        <PodiumContainer>
          {sortedPlayers.slice(0, 3).map((player, index) => {
            const rank = index + 1;
            const piecesLeft = player.pieces.filter(p => !p.isUsed).length;
            
            return (
              <PodiumStep key={player.color} rank={rank} color={player.color}>
                <AvatarWrapper color={player.color} rank={rank}>
                  {player.name.charAt(0).toUpperCase()}
                </AvatarWrapper>
                
                <PodiumBase rank={rank}>
                  <PlayerInfo>
                    <PlayerName>{player.name}</PlayerName>
                    <PlayerScoreLarge>{player.score}</PlayerScoreLarge>
                    <PlayerStats>
                      <span>{piecesLeft} Pieces Left</span>
                    </PlayerStats>
                  </PlayerInfo>
                </PodiumBase>

                {/* Mobile View Info (Base is hidden on mobile) */}
                <div style={{display: window.innerWidth <= 768 ? 'contents' : 'none'}}>
                  <PlayerInfo>
                    <PlayerName>{player.name}</PlayerName>
                    <PlayerScoreLarge>{player.score} PTS</PlayerScoreLarge>
                  </PlayerInfo>
                </div>
              </PodiumStep>
            );
          })}
        </PodiumContainer>
        
        {/* Remaining Players List (if more than 3) */}
        {sortedPlayers.length > 3 && (
          <div style={{ width: '100%', maxWidth: '600px', marginBottom: '30px' }}>
            {sortedPlayers.slice(3).map((player, index) => (
              <div key={player.color} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 20px',
                background: 'var(--surface-highlight)',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid var(--surface-border)'
              }}>
                <div style={{ 
                  fontFamily: "'Orbitron', sans-serif", 
                  color: 'var(--text-secondary)', 
                  width: '30px',
                  fontWeight: 'bold'
                }}>#{index + 4}</div>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: PLAYER_COLORS[player.color], marginRight: '15px'
                }} />
                <div style={{ flex: 1, fontWeight: 600, color: 'var(--text-primary)' }}>{player.name}</div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, color: 'var(--text-primary)' }}>
                  {player.score} PTS
                </div>
              </div>
            ))}
          </div>
        )}
        
        <ButtonGroup>
          <ActionButton variant="secondary" onClick={handleBackToLobby}>
            {t('gameOver.backToLobby')}
          </ActionButton>
          <ActionButton variant="primary" onClick={handlePlayAgain}>
            {t('gameOver.playAgain')}
          </ActionButton>
        </ButtonGroup>
      </ContentWrapper>
    </Container>
  );
};

export default GameOver;