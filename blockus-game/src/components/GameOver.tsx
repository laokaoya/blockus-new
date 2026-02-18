// 游戏结束界面组件

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { Player, GameState } from '../types/game';
import { PLAYER_COLORS } from '../constants/pieces';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface GameOverProps {
  players: Player[];
  gameState: GameState;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

// 动画效果
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-gradient);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding: 20px;
  padding-bottom: 60px;
  z-index: 1000;
  animation: ${css`${fadeIn} 0.8s ease-out`};
`;

const Title = styled.h1`
  color: var(--text-primary);
  font-size: 4rem;
  font-weight: 800;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  margin-bottom: 2rem;
  animation: ${css`${pulse} 2s ease-in-out infinite`};
  text-align: center;
  letter-spacing: -2px;
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  font-size: 1.5rem;
  margin-bottom: 3rem;
  text-align: center;
  animation: ${css`${fadeIn} 1s ease-out 0.3s both`};
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
    margin-bottom: 2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const Leaderboard = styled.div`
  background: var(--surface-color);
  backdrop-filter: var(--glass-effect);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-lg);
  margin-bottom: 3rem;
  min-width: 400px;
  animation: ${css`${slideIn} 1s ease-out 0.6s both`};
  
  @media (max-width: 768px) {
    min-width: 300px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  
  @media (max-width: 480px) {
    min-width: 280px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const LeaderboardTitle = styled.h2`
  color: var(--text-primary);
  font-size: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  font-weight: 700;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }
`;

const PlayerRow = styled.div<{ rank: number; isWinner: boolean }>`
  display: flex;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: var(--radius-md);
  background: ${props => props.isWinner 
    ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.2))' 
    : props.rank === 2 
    ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(169, 169, 169, 0.2))'
    : props.rank === 3
    ? 'linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(184, 134, 11, 0.2))'
    : 'rgba(255, 255, 255, 0.05)'
  };
  border: 1px solid ${props => props.isWinner 
    ? 'rgba(255, 215, 0, 0.5)' 
    : 'var(--surface-border)'
  };
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transform: ${props => props.isWinner ? 'scale(1.05)' : 'scale(1)'};
  transition: all 0.3s ease;
  
  &:hover {
    transform: ${props => props.isWinner ? 'scale(1.08)' : 'scale(1.02)'};
    background: ${props => props.isWinner 
      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 165, 0, 0.3))' 
      : 'rgba(255, 255, 255, 0.1)'
    };
  }
`;

const PlayerInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 1rem;
`;

const PlayerAvatar = styled.div<{ color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => PLAYER_COLORS[props.color]};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
  box-shadow: 0 0 10px ${props => PLAYER_COLORS[props.color]};
`;

const PlayerName = styled.div`
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
`;

const PlayerStatus = styled.div<{ isCurrentTurn: boolean; isSettled: boolean; isThinking: boolean }>`
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 500;
`;

const Score = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-left: auto;
  padding-left: 1rem;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 20px;
  animation: ${css`${fadeIn} 1s ease-out 1.2s both`};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 15px;
  }
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 15px 30px;
  border: none;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  
  background: ${props => props.variant === 'primary' 
    ? 'var(--primary-gradient)' 
    : 'rgba(255, 255, 255, 0.1)'
  };
  color: white;
  border: ${props => props.variant === 'secondary' ? '1px solid var(--surface-border)' : 'none'};
  box-shadow: ${props => props.variant === 'primary' ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.variant === 'primary' 
      ? '0 6px 20px rgba(99, 102, 241, 0.5)' 
      : '0 4px 15px rgba(0, 0, 0, 0.2)'
    };
    background: ${props => props.variant === 'secondary' ? 'rgba(255, 255, 255, 0.15)' : 'var(--primary-gradient)'};
  }
  
  @media (max-width: 768px) {
    padding: 12px 24px;
    font-size: 1rem;
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
    
    const humanPlayer = players[0]; // 人类玩家是第一个
    const playerScore = humanPlayer.score;
    const maxScore = Math.max(...players.map(p => p.score));
    const isWinner = playerScore === maxScore;

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

    // 同时保存到独立的 userStats（向后兼容）
    const savedStats = localStorage.getItem('userStats');
    const currentStats = savedStats ? JSON.parse(savedStats) : {
      totalGames: 0, totalWins: 0, totalScore: 0, winRate: 0, bestScore: 0, totalPlayTime: 0
    };
    const newStats = {
      totalGames: currentStats.totalGames + 1,
      totalWins: currentStats.totalWins + (isWinner ? 1 : 0),
      totalScore: currentStats.totalScore + playerScore,
      winRate: ((currentStats.totalWins + (isWinner ? 1 : 0)) / (currentStats.totalGames + 1)) * 100,
      bestScore: Math.max(currentStats.bestScore, playerScore),
      totalPlayTime: currentStats.totalPlayTime + 300,
    };
    localStorage.setItem('userStats', JSON.stringify(newStats));

    // 保存游戏记录
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
  }, [players, gameState, user, updateStats]);
  
  const handleBackToLobby = () => {
    navigate('/', { state: { showTransition: true } });
  };
  
  const handlePlayAgain = () => {
    onPlayAgain();
  };

  // 计算排名
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <Container>
      <Title>{t('gameOver.title')}</Title>
      <Subtitle>{t('gameOver.congratulations').replace('{winner}', winner.name)}</Subtitle>
      
      <Leaderboard>
        <LeaderboardTitle>{t('gameOver.finalRanking')}</LeaderboardTitle>
        {sortedPlayers.map((player, index) => (
          <PlayerRow key={player.color} rank={index + 1} isWinner={index === 0}>
            <PlayerAvatar color={player.color}>
              {player.color.charAt(0).toUpperCase()}
            </PlayerAvatar>
            <PlayerInfo>
              <PlayerName>{player.name}</PlayerName>
              <PlayerStatus 
                isCurrentTurn={false} 
                isSettled={player.isSettled} 
                isThinking={false}
              >
                {index === 0 ? t('gameOver.champion') : `${t('gameOver.rankPrefix')}${index + 1}${t('gameOver.rankSuffix')}`}
              </PlayerStatus>
            </PlayerInfo>
            <Score>{player.score} {t('gameOver.points')}</Score>
          </PlayerRow>
        ))}
      </Leaderboard>
      
      <ActionButtons>
        <Button variant="secondary" onClick={handleBackToLobby}>
          {t('gameOver.backToLobby')}
        </Button>
        <Button variant="primary" onClick={handlePlayAgain}>
          {t('gameOver.playAgain')}
        </Button>
      </ActionButtons>
    </Container>
  );
};

export default GameOver;
