// 游戏结束界面组件

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Player } from '../types/game';
import { PLAYER_COLORS } from '../constants/pieces';

interface GameOverProps {
  players: Player[];
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
  }
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.5rem;
  margin-bottom: 3rem;
  text-align: center;
  animation: ${css`${fadeIn} 1s ease-out 0.3s both`};
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
  }
`;

const LeaderboardTitle = styled.h2`
  color: #333;
  font-size: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  font-weight: bold;
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

const RankBadge = styled.div<{ rank: number; isWinner: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.5rem;
  color: white;
  margin-right: 1rem;
  background: ${props => props.isWinner 
    ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
    : props.rank === 2 
    ? 'linear-gradient(135deg, #C0C0C0, #A9A9A9)'
    : props.rank === 3
    ? 'linear-gradient(135deg, #CD7F32, #B8860B)'
    : 'linear-gradient(135deg, #6c757d, #495057)'
  };
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  
  ${props => props.isWinner && css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}
`;

const PlayerInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
`;

const PlayerAvatar = styled.div<{ color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => PLAYER_COLORS[props.color]};
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const PlayerDetails = styled.div`
  flex: 1;
`;

const PlayerName = styled.div`
  font-weight: bold;
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 0.25rem;
`;

const PlayerScore = styled.div`
  font-size: 1rem;
  color: #666;
`;

const ScoreDisplay = styled.div<{ isWinner: boolean }>`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.isWinner ? '#8B4513' : '#333'};
  text-shadow: ${props => props.isWinner ? '1px 1px 2px rgba(0, 0, 0, 0.3)' : 'none'};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 2rem;
  animation: ${css`${fadeIn} 1s ease-out 1.2s both`};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 1rem 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  
  background: ${props => props.variant === 'primary' 
    ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)' 
    : 'linear-gradient(135deg, #4ECDC4, #44A08D)'
  };
  color: white;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const GameOver: React.FC<GameOverProps> = ({ players, onPlayAgain, onBackToMenu }) => {
  // 按分数排序玩家
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <Container>
      <Title>🎉 游戏结束 🎉</Title>
      <Subtitle>恭喜 {winner.name} 获得胜利！</Subtitle>
      
      <Leaderboard>
        <LeaderboardTitle>🏆 最终排名</LeaderboardTitle>
        {sortedPlayers.map((player, index) => (
          <PlayerRow 
            key={player.id} 
            rank={index + 1} 
            isWinner={index === 0}
          >
            <RankBadge rank={index + 1} isWinner={index === 0}>
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
            </RankBadge>
            
            <PlayerInfo>
              <PlayerAvatar color={player.color}>
                {player.name.charAt(0)}
              </PlayerAvatar>
              <PlayerDetails>
                <PlayerName>{player.name}</PlayerName>
                <PlayerScore>
                  {player.isSettled ? '已结算' : '游戏中'}
                </PlayerScore>
              </PlayerDetails>
            </PlayerInfo>
            
            <ScoreDisplay isWinner={index === 0}>
              {player.score} 分
            </ScoreDisplay>
          </PlayerRow>
        ))}
      </Leaderboard>
      
      <ButtonGroup>
        <Button variant="primary" onClick={onPlayAgain}>
          🎮 再来一局
        </Button>
        <Button variant="secondary" onClick={onBackToMenu}>
          🏠 返回菜单
        </Button>
      </ButtonGroup>
    </Container>
  );
};

export default GameOver;
