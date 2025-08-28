// 游戏结束界面组件

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { Player, GameState } from '../types/game';
import { PLAYER_COLORS } from '../constants/pieces';

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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${css`${fadeIn} 0.8s ease-out`};
`;

const Title = styled.h1`
  color: white;
  font-size: 4rem;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  margin-bottom: 2rem;
  animation: ${css`${pulse} 2s ease-in-out infinite`};
  text-align: center;
  
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
  color: rgba(255, 255, 255, 0.9);
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
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
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
  color: #333;
  font-size: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  font-weight: bold;
  
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
  border-radius: 15px;
  background: ${props => props.isWinner 
    ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
    : props.rank === 2 
    ? 'linear-gradient(135deg, #C0C0C0, #A9A9A9)'
    : props.rank === 3
    ? 'linear-gradient(135deg, #CD7F32, #B8860B)'
    : 'linear-gradient(135deg, #f8f9fa, #e9ecef)'
  };
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transform: ${props => props.isWinner ? 'scale(1.05)' : 'scale(1)'};
  transition: all 0.3s ease;
  
  &:hover {
    transform: ${props => props.isWinner ? 'scale(1.08)' : 'scale(1.02)'};
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const PlayerName = styled.div`
  font-weight: bold;
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 0.25rem;
`;

const PlayerStatus = styled.div<{ isCurrentTurn: boolean; isSettled: boolean; isThinking: boolean }>`
  font-size: 1rem;
  color: #666;
  font-weight: 500;
`;

const Score = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-left: auto;
  padding-left: 1rem;
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
  
  // 更新用户统计数据和保存游戏记录
  const hasProcessed = useRef(false);
  
  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const updateUserStats = () => {
      const savedStats = localStorage.getItem('userStats');
      const currentStats = savedStats ? JSON.parse(savedStats) : {
        totalGames: 0,
        totalWins: 0,
        totalScore: 0,
        winRate: 0,
        bestScore: 0,
        totalPlayTime: 0
      };
      
      // 计算新的统计数据
      const player = players[0]; // 假设玩家是第一个
      const playerScore = player.score;
      const isWinner = playerScore === Math.max(...players.map(p => p.score));
      
      const newStats = {
        totalGames: currentStats.totalGames + 1,
        totalWins: currentStats.totalWins + (isWinner ? 1 : 0),
        totalScore: currentStats.totalScore + playerScore,
        winRate: ((currentStats.totalWins + (isWinner ? 1 : 0)) / (currentStats.totalGames + 1)) * 100,
        bestScore: Math.max(currentStats.bestScore, playerScore),
        totalPlayTime: currentStats.totalPlayTime + 300 // 假设平均游戏时长5分钟
      };
      
      localStorage.setItem('userStats', JSON.stringify(newStats));
    };

    const saveGameRecord = () => {
      const gameSettings = localStorage.getItem('gameSettings');
      const settings = gameSettings ? JSON.parse(gameSettings) : {
        aiDifficulty: 'medium',
        timeLimit: 60
      };

      // 创建游戏记录
      const gameRecord = {
        id: `game_${Date.now()}`,
        date: new Date().toISOString(),
        duration: 300, // 假设游戏时长5分钟
        players: players.map(player => ({
          name: `玩家${player.color}`,
          color: player.color,
          score: player.score,
          isWinner: player.score === Math.max(...players.map(p => p.score))
        })),
        settings: {
          aiDifficulty: settings.aiDifficulty,
          timeLimit: settings.timeLimit
        },
        moves: gameState.moves, // 从游戏状态中获取移动记录
        finalBoard: gameState.board // 从游戏状态中获取最终棋盘
      };

      // 保存到游戏历史
      const savedHistory = localStorage.getItem('gameHistory');
      const history = savedHistory ? JSON.parse(savedHistory) : [];
      history.unshift(gameRecord); // 添加到开头
      
      // 只保留最近50局游戏记录
      if (history.length > 50) {
        history.splice(50);
      }
      
      localStorage.setItem('gameHistory', JSON.stringify(history));
    };
    
    updateUserStats();
    saveGameRecord();
  }, [players, gameState]);
  
  const handleBackToLobby = () => {
    navigate('/');
  };
  
  const handlePlayAgain = () => {
    onPlayAgain();
  };

  // 计算排名
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <Container>
      <Title>游戏结束</Title>
      <Subtitle>恭喜 玩家{winner.color} 获得胜利！</Subtitle>
      
      <Leaderboard>
        <LeaderboardTitle>最终排名</LeaderboardTitle>
        {sortedPlayers.map((player, index) => (
          <PlayerRow key={player.color} rank={index + 1} isWinner={index === 0}>
            <PlayerAvatar color={player.color}>
              {player.color.charAt(0).toUpperCase()}
            </PlayerAvatar>
            <PlayerInfo>
              <PlayerName>玩家{player.color}</PlayerName>
              <PlayerStatus 
                isCurrentTurn={false} 
                isSettled={player.isSettled} 
                isThinking={false}
              >
                {index === 0 ? '🏆 冠军' : `第${index + 1}名`}
              </PlayerStatus>
            </PlayerInfo>
            <Score>{player.score} 分</Score>
          </PlayerRow>
        ))}
      </Leaderboard>
      
      <ActionButtons>
        <Button variant="secondary" onClick={handleBackToLobby}>
          返回大厅
        </Button>
        <Button variant="primary" onClick={handlePlayAgain}>
          再来一局
        </Button>
      </ActionButtons>
    </Container>
  );
};

export default GameOver;
