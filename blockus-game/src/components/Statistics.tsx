import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';
import { TrashIcon } from './Icons';

interface GameRecord {
  id: string;
  date: string;
  duration: number;
  players: {
    name: string;
    color: string;
    score: number;
    isWinner: boolean;
  }[];
  settings: {
    aiDifficulty: string;
    timeLimit: number;
  };
  moves: GameMove[];
  finalBoard: number[][];
}

interface GameMove {
  playerColor: string;
  pieceType: number;
  shapeIndex: number;
  position: { x: number; y: number };
  timestamp: number;
  boardChanges: { x: number; y: number; color: number }[];
}

interface UserStats {
  totalGames: number;
  totalWins: number;
  totalScore: number;
  winRate: number;
  bestScore: number;
  averageScore: number;
  totalPlayTime: number;
  averageGameTime: number;
}

const StatisticsContainer = styled.div`
  height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding-bottom: 60px;
  background: var(--bg-gradient);
  color: var(--text-primary);
`;

const ContentWrapper = styled.div`
  width: 90%;
  max-width: 1260px;
  transform: scale(0.95);
  transform-origin: top center;
  margin-bottom: 40px;
  
  @media (max-width: 768px) {
    width: 100%;
    transform: scale(1);
  }
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
  background: linear-gradient(to right, var(--text-primary), var(--text-secondary));
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
  max-width: 1400px;
  width: 100%;
  
  @media (max-width: 1200px) {
    flex-direction: column;
    gap: 20px;
  }
`;

const LeftPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const StatsCard = styled.div`
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

const CardTitle = styled.h2`
  margin: 0 0 20px 0;
  color: var(--text-primary);
  font-size: 1.5rem;
  text-align: center;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 15px;
  background: var(--surface-highlight);
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border);
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: var(--primary-color);
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
`;

const HistoryList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--surface-border);
    border-radius: 3px;
  }
`;

const ClearHistoryButton = styled.button`
  background: transparent;
  color: var(--text-secondary);
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--surface-highlight);
    color: var(--text-primary);
  }
`;

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const ConfirmModal = styled.div`
  background: var(--surface-color);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: var(--shadow-lg);
`;

const ConfirmTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
`;

const ConfirmText = styled.div`
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 20px;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ConfirmBtn = styled.button<{ $primary?: boolean }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid ${p => p.$primary ? 'transparent' : 'var(--surface-border)'};
  background: ${p => p.$primary ? 'rgba(239, 68, 68, 0.2)' : 'var(--surface-highlight)'};
  color: ${p => p.$primary ? '#fca5a5' : 'var(--text-primary)'};
  &:hover {
    background: ${p => p.$primary ? 'rgba(239, 68, 68, 0.3)' : 'var(--surface-border)'};
  }
`;

const HistoryItem = styled.div<{ isSelected: boolean }>`
  padding: 15px;
  margin-bottom: 10px;
  background: ${props => props.isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface-color)'};
  color: var(--text-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid ${props => props.isSelected ? 'var(--primary-color)' : 'var(--surface-border)'};
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    background: var(--surface-highlight);
    border-color: var(--primary-color);
  }
`;

const GameInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const GameDate = styled.div`
  font-weight: bold;
  font-size: 1.1rem;
  color: var(--text-primary);
`;

const GameMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const ResultBadge = styled.span<{ isWin: boolean }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
  background: ${props => props.isWin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  color: ${props => props.isWin ? '#10b981' : '#ef4444'};
  border: 1px solid ${props => props.isWin ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
`;

const PlayersInfo = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
`;

const PlayerInfo = styled.div<{ isWinner: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  background: ${props => props.isWinner ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-highlight)'};
  color: ${props => props.isWinner ? '#10b981' : 'var(--text-secondary)'};
  border-radius: 15px;
  font-size: 0.9rem;
  font-weight: ${props => props.isWinner ? 'bold' : 'normal'};
  border: 1px solid ${props => props.isWinner ? 'rgba(16, 185, 129, 0.2)' : 'transparent'};
`;

const PlayerColor = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => {
    const colorMap: { [key: string]: string } = {
      red: '#ef4444',
      yellow: '#f59e0b',
      blue: '#3b82f6',
      green: '#10b981'
    };
    return colorMap[props.color] || '#64748b';
  }};
  box-shadow: 0 0 5px ${props => {
    const colorMap: { [key: string]: string } = {
      red: 'rgba(239, 68, 68, 0.5)',
      yellow: 'rgba(245, 158, 11, 0.5)',
      blue: 'rgba(59, 130, 246, 0.5)',
      green: 'rgba(16, 185, 129, 0.5)'
    };
    return colorMap[props.color] || 'transparent';
  }};
`;

const ReplayContainer = styled.div`
  background: var(--surface-color);
  backdrop-filter: var(--glass-effect);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 30px;
  box-shadow: var(--shadow-lg);
`;

const ReplayBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(20, 1fr);
  gap: 1px;
  background: var(--surface-highlight);
  padding: 15px;
  border-radius: 15px;
  margin: 20px auto;
  width: 500px;
  height: 500px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  border: 2px solid var(--surface-border);
  
  @media (max-width: 768px) {
    width: 350px;
    height: 350px;
  }
`;

const BoardCell = styled.div<{ color: number }>`
  width: 100%;
  height: 100%;
  background: ${props => {
    if (props.color === 0) {
      return 'var(--surface-highlight)';
    }
    const colors = ['transparent', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
    return colors[props.color] || 'var(--surface-highlight)';
  }};
  border: 1px solid var(--surface-border);
  border-radius: 2px;
  transition: all 0.2s ease;
  
  ${props => props.color !== 0 && `
    box-shadow: 0 0 8px ${
      ['transparent', 'rgba(239, 68, 68, 0.4)', 'rgba(245, 158, 11, 0.4)', 'rgba(59, 130, 246, 0.4)', 'rgba(16, 185, 129, 0.4)'][props.color]
    };
  `}
`;

const ReplayControls = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 20px 0;
  flex-wrap: wrap;
`;

const ControlButton = styled.button<{ active?: boolean }>`
  padding: 8px 16px;
  border: 1px solid var(--surface-border);
  border-radius: 20px;
  background: ${props => props.active ? 'var(--primary-color)' : 'var(--surface-highlight)'};
  color: ${props => props.active ? 'white' : 'var(--text-primary)'};
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? 'var(--primary-hover)' : 'var(--surface-border)'};
    transform: translateY(-2px);
  }
  
  &:disabled {
    background: var(--surface-highlight);
    color: var(--text-muted);
    cursor: not-allowed;
    transform: none;
    opacity: 0.5;
  }
`;

const FinalBoardButton = styled(ControlButton)`
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
  
  &:hover {
    background: rgba(16, 185, 129, 0.3);
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: var(--surface-border);
  border-radius: 3px;
  overflow: hidden;
  margin: 15px 0;
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  background: var(--primary-gradient);
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
`;

const StepInfo = styled.div`
  text-align: center;
  margin-bottom: 15px;
  color: var(--text-secondary);
  font-size: 0.95rem;
`;

const SpeedControl = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 15px;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const SpeedButton = styled.button<{ isActive: boolean }>`
  padding: 4px 12px;
  border: 1px solid ${props => props.isActive ? 'var(--primary-color)' : 'var(--surface-border)'};
  border-radius: 15px;
  background: ${props => props.isActive ? 'rgba(99, 102, 241, 0.2)' : 'var(--surface-highlight)'};
  color: ${props => props.isActive ? 'var(--primary-color)' : 'var(--text-secondary)'};
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: ${props => props.isActive ? 'bold' : 'normal'};
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--primary-color);
    background: ${props => props.isActive ? 'rgba(99, 102, 241, 0.2)' : 'var(--surface-border)'};
  }
`;

const BackButton = styled.button`
  position: absolute;
  left: 20px;
  top: 20px;
  background: var(--surface-highlight);
  color: var(--text-primary);
  border: 1px solid var(--surface-border);
  border-radius: 50px;
  padding: 10px 20px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
  
  &:hover {
    background: var(--surface-border);
    transform: translateX(-2px);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: var(--text-muted);
  padding: 40px 20px;
  
  & > div:first-child {
    font-size: 3rem;
    margin-bottom: 15px;
    opacity: 0.5;
  }
`;

const SPEED_MAP: Record<string, number> = {
  slow: 3000,
  normal: 1500,
  fast: 500,
};

const Statistics: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [userStats, setUserStats] = useState<UserStats>({
    totalGames: 0,
    totalWins: 0,
    totalScore: 0,
    winRate: 0,
    bestScore: 0,
    averageScore: 0,
    totalPlayTime: 0,
    averageGameTime: 0
  });
  const [gameHistory, setGameHistory] = useState<GameRecord[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 表示空棋盘
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayBoard, setReplayBoard] = useState<number[][]>(createEmptyBoard());
  const [replaySpeed, setReplaySpeed] = useState<string>('normal');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const isPlayingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function createEmptyBoard(): number[][] {
    return Array(20).fill(null).map(() => Array(20).fill(0));
  }

  // 获取指定步骤的棋盘状态（纯函数，不依赖 state）
  const getBoardAtStep = useCallback((game: GameRecord, stepIndex: number): number[][] => {
    const board = createEmptyBoard();
    for (let i = 0; i <= stepIndex; i++) {
      if (i < game.moves.length) {
        const move = game.moves[i];
        move.boardChanges.forEach(change => {
          if (change.x >= 0 && change.x < 20 && change.y >= 0 && change.y < 20) {
            board[change.y][change.x] = change.color;
          }
        });
      }
    }
    return board;
  }, []);

  // 加载用户统计数据和游戏历史
  useEffect(() => {
    const savedStats = localStorage.getItem('userStats');
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      setUserStats({
        ...stats,
        averageScore: stats.totalGames > 0 ? Math.round(stats.totalScore / stats.totalGames) : 0,
        averageGameTime: stats.totalGames > 0 ? Math.round(stats.totalPlayTime / stats.totalGames) : 0
      });
    }

    const savedHistory = localStorage.getItem('gameHistory');
    if (savedHistory) {
      setGameHistory(JSON.parse(savedHistory));
    }
  }, []);

  // 清除播放定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const clearGameHistory = () => {
    setShowClearConfirm(true);
  };

  const doClearGameHistory = () => {
    localStorage.removeItem('gameHistory');
    setGameHistory([]);
    setSelectedGame(null);
    setReplayBoard(createEmptyBoard());
    setCurrentMoveIndex(-1);
    stopReplay();
    setShowClearConfirm(false);
  };

  const handleGameSelect = (game: GameRecord) => {
    stopReplay();
    setSelectedGame(game);
    setCurrentMoveIndex(-1);
    setReplayBoard(createEmptyBoard());
  };

  const stopReplay = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const playReplay = () => {
    if (!selectedGame) return;
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    let moveIdx = currentMoveIndex;
    
    const playNextMove = () => {
      if (!isPlayingRef.current) return;
      
      if (moveIdx < selectedGame.moves.length - 1) {
        moveIdx++;
        const board = getBoardAtStep(selectedGame, moveIdx);
        setReplayBoard(board);
        setCurrentMoveIndex(moveIdx);
        timerRef.current = setTimeout(playNextMove, SPEED_MAP[replaySpeed] || 1500);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };
    
    playNextMove();
  };

  const pauseReplay = () => {
    stopReplay();
  };

  const resetReplay = () => {
    stopReplay();
    setCurrentMoveIndex(-1);
    setReplayBoard(createEmptyBoard());
  };

  const nextMove = () => {
    if (!selectedGame || currentMoveIndex >= selectedGame.moves.length - 1) return;
    const newIndex = currentMoveIndex + 1;
    setCurrentMoveIndex(newIndex);
    setReplayBoard(getBoardAtStep(selectedGame, newIndex));
  };

  const prevMove = () => {
    if (!selectedGame || currentMoveIndex < 0) return;
    const newIndex = currentMoveIndex - 1;
    setCurrentMoveIndex(newIndex);
    if (newIndex < 0) {
      setReplayBoard(createEmptyBoard());
    } else {
      setReplayBoard(getBoardAtStep(selectedGame, newIndex));
    }
  };

  const showFinalBoard = () => {
    if (!selectedGame) return;
    stopReplay();
    if (selectedGame.finalBoard && selectedGame.finalBoard.length > 0) {
      setReplayBoard(selectedGame.finalBoard);
      setCurrentMoveIndex(selectedGame.moves.length - 1);
    } else if (selectedGame.moves.length > 0) {
      const lastIndex = selectedGame.moves.length - 1;
      setReplayBoard(getBoardAtStep(selectedGame, lastIndex));
      setCurrentMoveIndex(lastIndex);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const currentLanguage = localStorage.getItem('language') || 'zh';
    return new Date(dateString).toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'en-US');
  };

  // 判断某条记录中人类玩家是否获胜
  const isHumanWin = (game: GameRecord): boolean => {
    const humanPlayer = game.players.find(p => p.color === 'red');
    return humanPlayer?.isWinner || false;
  };

  return (
    <StatisticsContainer>
      <BackButton onClick={() => navigate('/')}>← {t('common.back')}</BackButton>
      
      <Header>
        <Title>{t('statistics.title')}</Title>
        <Subtitle>{t('statistics.subtitle')}</Subtitle>
      </Header>

      <ContentWrapper>
        <ContentContainer>
          <LeftPanel>
            <StatsCard>
              <CardTitle>{t('statistics.overallStats')}</CardTitle>
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
                <StatItem>
                  <StatValue>{userStats.averageScore}</StatValue>
                  <StatLabel>{t('statistics.averageScore')}</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{formatDuration(userStats.averageGameTime)}</StatValue>
                  <StatLabel>{t('statistics.averageTime')}</StatLabel>
                </StatItem>
              </StatsGrid>
            </StatsCard>

            <StatsCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid var(--surface-border)' }}>
                <CardTitle style={{ margin: 0, fontSize: '1.2rem', textAlign: 'left' }}>{t('statistics.gameHistory')}</CardTitle>
                {gameHistory.length > 0 && (
                  <ClearHistoryButton onClick={clearGameHistory}>
                    {t('statistics.clearHistory')}
                  </ClearHistoryButton>
                )}
              </div>
              <HistoryList>
                {gameHistory.length === 0 ? (
                  <EmptyState>
                    <div>📊</div>
                    <div>{t('statistics.noHistory')}</div>
                  </EmptyState>
                ) : (
                  gameHistory.map((game) => (
                    <HistoryItem
                      key={game.id}
                      isSelected={selectedGame?.id === game.id}
                      onClick={() => handleGameSelect(game)}
                    >
                      <GameInfo>
                        <GameDate>{formatDate(game.date)}</GameDate>
                        <GameMeta>
                          <ResultBadge isWin={isHumanWin(game)}>
                            {isHumanWin(game) ? t('statistics.win') : t('statistics.lose')}
                          </ResultBadge>
                          <span>{game.moves?.length || 0} {t('statistics.totalMoves')}</span>
                        </GameMeta>
                      </GameInfo>
                      <PlayersInfo>
                        {game.players.map((player) => (
                          <PlayerInfo key={player.color} isWinner={player.isWinner}>
                            <PlayerColor color={player.color} />
                            {player.name}: {player.score}
                          </PlayerInfo>
                        ))}
                      </PlayersInfo>
                    </HistoryItem>
                  ))
                )}
              </HistoryList>
            </StatsCard>
          </LeftPanel>

          <RightPanel>
            <ReplayContainer>
              <CardTitle>{t('statistics.replay')}</CardTitle>
              {selectedGame ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: '0 0 5px 0' }}>{formatDate(selectedGame.date)}</h3>
                    <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                      {t('statistics.aiDifficulty')}: {selectedGame.settings.aiDifficulty} | {t('statistics.timeLimit')}: {selectedGame.settings.timeLimit}s
                    </p>
                  </div>
                  
                  <ReplayBoard>
                    {replayBoard.map((row, y) =>
                      row.map((cell, x) => (
                        <BoardCell key={`${x}-${y}`} color={cell} />
                      ))
                    )}
                  </ReplayBoard>

                  <ProgressBar>
                    <ProgressFill 
                      progress={selectedGame.moves.length > 0 
                        ? ((currentMoveIndex + 1) / selectedGame.moves.length) * 100 
                        : 0
                      } 
                    />
                  </ProgressBar>

                  <StepInfo>
                    {t('statistics.currentStep')} {currentMoveIndex + 1} {t('statistics.of')} {selectedGame.moves.length}
                  </StepInfo>

                  <ReplayControls>
                    <ControlButton onClick={resetReplay}>
                      {t('statistics.reset')}
                    </ControlButton>
                    <ControlButton onClick={prevMove} disabled={currentMoveIndex < 0}>
                      {t('statistics.previous')}
                    </ControlButton>
                    <ControlButton onClick={isPlaying ? pauseReplay : playReplay}>
                      {isPlaying ? t('statistics.pause') : t('statistics.play')}
                    </ControlButton>
                    <ControlButton onClick={nextMove} disabled={currentMoveIndex >= selectedGame.moves.length - 1}>
                      {t('statistics.next')}
                    </ControlButton>
                    <FinalBoardButton onClick={showFinalBoard}>
                      {t('statistics.showFinalBoard')}
                    </FinalBoardButton>
                  </ReplayControls>

                  <SpeedControl>
                    <span>{t('statistics.speed')}:</span>
                    <SpeedButton 
                      isActive={replaySpeed === 'slow'} 
                      onClick={() => setReplaySpeed('slow')}
                    >
                      {t('statistics.slow')}
                    </SpeedButton>
                    <SpeedButton 
                      isActive={replaySpeed === 'normal'} 
                      onClick={() => setReplaySpeed('normal')}
                    >
                      {t('statistics.normal')}
                    </SpeedButton>
                    <SpeedButton 
                      isActive={replaySpeed === 'fast'} 
                      onClick={() => setReplaySpeed('fast')}
                    >
                      {t('statistics.fast')}
                    </SpeedButton>
                  </SpeedControl>
                </>
              ) : (
                <EmptyState>
                  <div>🎮</div>
                  <div>{t('statistics.selectGame')}</div>
                </EmptyState>
              )}
            </ReplayContainer>
          </RightPanel>
        </ContentContainer>
      </ContentWrapper>

      {showClearConfirm && (
        <ConfirmOverlay onClick={() => setShowClearConfirm(false)}>
          <ConfirmModal onClick={e => e.stopPropagation()}>
            <ConfirmTitle>{t('statistics.clearHistory')}</ConfirmTitle>
            <ConfirmText>{t('statistics.clearConfirm')}</ConfirmText>
            <ConfirmButtons>
              <ConfirmBtn onClick={() => setShowClearConfirm(false)}>{t('common.cancel')}</ConfirmBtn>
              <ConfirmBtn $primary onClick={doClearGameHistory}>{t('common.confirm')}</ConfirmBtn>
            </ConfirmButtons>
          </ConfirmModal>
        </ConfirmOverlay>
      )}
    </StatisticsContainer>
  );
};

export default Statistics;
